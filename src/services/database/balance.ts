import * as SQLite from 'expo-sqlite';
import { nowIso } from './helpers';

export const DELTA_SQL = `
  SELECT
    (SELECT COALESCE(SUM(
      CASE
        WHEN type = 'INCOME' THEN amountMinor
        WHEN type = 'EXPENSE' THEN -amountMinor
        ELSE 0
      END
    ), 0) FROM transactions WHERE accountId = ? AND deletedAt IS NULL) +
    (SELECT COALESCE(SUM(amountMinor), 0) FROM transfers WHERE toAccountId = ? AND deletedAt IS NULL) -
    (SELECT COALESCE(SUM(amountMinor), 0) FROM transfers WHERE fromAccountId = ? AND deletedAt IS NULL) -
    (SELECT COALESCE(SUM(feeAmountMinor), 0) FROM transfers WHERE COALESCE(feeAccountId, fromAccountId) = ? AND deletedAt IS NULL) +
    (SELECT COALESCE(SUM(amountMinor), 0) FROM loans WHERE type = 'BORROWED' AND accountId = ? AND deletedAt IS NULL) -
    (SELECT COALESCE(SUM(amountMinor), 0) FROM loans WHERE type = 'LENT' AND accountId = ? AND deletedAt IS NULL) -
    (SELECT COALESCE(SUM(lr.amountMinor), 0) FROM loan_repayments lr JOIN loans l ON l.id = lr.loanId WHERE l.type = 'BORROWED' AND lr.accountId = ? AND lr.deletedAt IS NULL AND l.deletedAt IS NULL) +
    (SELECT COALESCE(SUM(lr.amountMinor), 0) FROM loan_repayments lr JOIN loans l ON l.id = lr.loanId WHERE l.type = 'LENT' AND lr.accountId = ? AND lr.deletedAt IS NULL AND l.deletedAt IS NULL)
  AS txDeltaMinor
`;

export async function recalculateBalanceOnDb(
  db: SQLite.SQLiteDatabase,
  accountId: number,
): Promise<void> {
  const acc = await db.getFirstAsync<{ openingBalanceMinor: number }>(
    'SELECT openingBalanceMinor FROM accounts WHERE id = ?',
    [accountId],
  );
  if (!acc) return;

  const txRow = await db.getFirstAsync<{ txDeltaMinor: number }>(DELTA_SQL, [
    accountId, accountId, accountId, accountId,
    accountId, accountId, accountId, accountId,
  ]);
  const newBalanceMinor = acc.openingBalanceMinor + (txRow?.txDeltaMinor ?? 0);
  await db.runAsync(
    'UPDATE accounts SET currentBalanceMinor = ?, updatedAt = ? WHERE id = ?',
    [newBalanceMinor, nowIso(), accountId],
  );
}
