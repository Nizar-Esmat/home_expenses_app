import { HomeTransaction } from '@/types';
import { getDb } from './client';
import { tzMonthKey } from './helpers';

export async function getRecentTransactions(
  monthKey?: string,
  limit: number = 5,
): Promise<HomeTransaction[]> {
  const db = await getDb();

  const hasMonthFilter = monthKey !== undefined && monthKey !== 'ALL';

  const sql = `
    SELECT id, type, category, emoji, amount, note, createdAt, accountId, accountName, accountIcon FROM (
      SELECT
        t.id,
        'expense' AS type,
        c.name AS category,
        c.icon AS emoji,
        t.amountMinor / 100.0 AS amount,
        t.note,
        t.transactionDate AS createdAt,
        t.accountId,
        COALESCE(a.name, 'Deleted account') AS accountName,
        a.icon AS accountIcon
      FROM transactions t
      JOIN categories c ON c.id = t.categoryId
      LEFT JOIN accounts a ON a.id = t.accountId
      WHERE t.type = 'EXPENSE' AND t.deletedAt IS NULL
      ${hasMonthFilter ? `AND ${tzMonthKey('t.transactionDate')} = '${monthKey}'` : ''}
      UNION ALL
      SELECT
        t.id,
        'income' AS type,
        c.name AS category,
        c.icon AS emoji,
        t.amountMinor / 100.0 AS amount,
        t.note,
        t.transactionDate AS createdAt,
        t.accountId,
        COALESCE(a.name, 'Deleted account') AS accountName,
        a.icon AS accountIcon
      FROM transactions t
      JOIN categories c ON c.id = t.categoryId
      LEFT JOIN accounts a ON a.id = t.accountId
      WHERE t.type = 'INCOME' AND t.deletedAt IS NULL
      ${hasMonthFilter ? `AND ${tzMonthKey('t.transactionDate')} = '${monthKey}'` : ''}
      UNION ALL
      SELECT
        tr.id,
        'transfer' AS type,
        'Transfer' AS category,
        '🔄' AS emoji,
        tr.amountMinor / 100.0 AS amount,
        tr.note,
        tr.transferDate AS createdAt,
        NULL AS accountId,
        COALESCE(fromAcc.name, '?') || ' → ' || COALESCE(toAcc.name, '?') AS accountName,
        NULL AS accountIcon
      FROM transfers tr
      LEFT JOIN accounts fromAcc ON fromAcc.id = tr.fromAccountId
      LEFT JOIN accounts toAcc ON toAcc.id = tr.toAccountId
      WHERE tr.deletedAt IS NULL
      ${hasMonthFilter ? `AND ${tzMonthKey('tr.transferDate')} = '${monthKey}'` : ''}
    ) src
    ORDER BY src.createdAt DESC
    LIMIT ?
  `;

  return db.getAllAsync<HomeTransaction>(sql, [limit]);
}