import { Income, MonthSummary } from '@/types';
import { getDb } from './client';
import { nowIso, toMinorUnits, tzMonthKey } from './helpers';
import { recalculateBalance } from './accounts';

interface IncomeRow {
  id: number;
  amount: number;
  category: string;
  note: string | null;
  createdAt: string;
  monthKey: string;
  accountId: number | null;
}

const INCOME_SELECT = `
  SELECT
    t.id,
    t.amountMinor / 100.0 AS amount,
    c.name AS category,
    t.note,
    t.transactionDate AS createdAt,
    ${tzMonthKey('t.transactionDate')} AS monthKey,
    t.accountId
  FROM transactions t
  JOIN categories c ON c.id = t.categoryId
  WHERE t.type = 'INCOME' AND t.deletedAt IS NULL
`;

async function getCategoryIdByName(name: string): Promise<number> {
  const db = await getDb();
  const categoryName = name.trim() || 'Other';
  const row = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM categories WHERE type = 'INCOME' AND LOWER(name)=LOWER(?)",
    [categoryName],
  );
  if (row) return row.id;

  const fallback = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM categories WHERE type = 'INCOME' AND name = 'Other' LIMIT 1",
  );
  if (!fallback) throw new Error('Income category not found.');
  return fallback.id;
}

async function getTransactionAccountId(accountId?: number | null): Promise<number> {
  if (accountId != null) return accountId;
  const db = await getDb();
  const account = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM accounts WHERE isArchived = 0 ORDER BY CASE WHEN type = 'CASH' THEN 0 ELSE 1 END, createdAt ASC, id ASC LIMIT 1",
  );
  if (!account) throw new Error('No account available.');
  return account.id;
}

export async function getIncomeById(id: number): Promise<Income | null> {
  const db = await getDb();
  const rows = await db.getAllAsync<IncomeRow>(
    `${INCOME_SELECT} AND t.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function addIncome(
  amount: number,
  category: string,
  note: string | null,
  createdAt?: string,
  accountId?: number | null,
): Promise<void> {
  const db = await getDb();
  const timestamp = createdAt ?? nowIso();
  const categoryId = await getCategoryIdByName(category);
  const resolvedAccountId = await getTransactionAccountId(accountId);

  await db.runAsync(
    `INSERT INTO transactions
       (accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt, deletedAt)
     VALUES (?, ?, 'INCOME', ?, 'EGP', ?, ?, ?, ?, ?, NULL)`,
    [
      resolvedAccountId,
      categoryId,
      toMinorUnits(amount),
      category,
      note ?? null,
      timestamp,
      timestamp,
      timestamp,
    ],
  );

  await recalculateBalance(resolvedAccountId);
}

export async function updateIncome(
  id: number,
  amount: number,
  category: string,
  note: string | null,
  accountId?: number | null,
): Promise<void> {
  const db = await getDb();
  const categoryId = await getCategoryIdByName(category);
  const resolvedAccountId = await getTransactionAccountId(accountId);

  const old = await db.getFirstAsync<{ accountId: number | null }>(
    "SELECT accountId FROM transactions WHERE id = ? AND type = 'INCOME'",
    [id],
  );

  await db.runAsync(
    'UPDATE transactions SET amountMinor=?, categoryId=?, title=?, note=?, accountId=?, updatedAt=? WHERE id=? AND type=?',
    [toMinorUnits(amount), categoryId, category, note ?? null, resolvedAccountId, nowIso(), id, 'INCOME'],
  );

  const affected = new Set<number>();
  if (old?.accountId != null) affected.add(old.accountId);
  affected.add(resolvedAccountId);
  for (const accId of affected) await recalculateBalance(accId);
}

export async function deleteIncome(id: number): Promise<void> {
  const db = await getDb();

  const inc = await db.getFirstAsync<{ accountId: number | null }>(
    "SELECT accountId FROM transactions WHERE id = ? AND type = 'INCOME'",
    [id],
  );

  const now = nowIso();
  await db.runAsync(
    "UPDATE transactions SET deletedAt = ?, updatedAt = ? WHERE id = ? AND type = 'INCOME'",
    [now, now, id],
  );

  if (inc?.accountId != null) await recalculateBalance(inc.accountId);
}

export async function getIncomesByMonth(monthKey: string): Promise<Income[]> {
  const db = await getDb();
  return db.getAllAsync<IncomeRow>(
    `${INCOME_SELECT} AND ${tzMonthKey('t.transactionDate')}=? ORDER BY t.transactionDate DESC, t.id DESC`,
    [monthKey],
  );
}

export async function getIncomeTotalByMonth(monthKey: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT (
      (SELECT COALESCE(SUM(amountMinor), 0) FROM transactions
       WHERE type = 'INCOME' AND deletedAt IS NULL AND ${tzMonthKey('transactionDate')} = ?) +
      (SELECT COALESCE(SUM(l.amountMinor), 0) FROM loans l
       WHERE l.type = 'BORROWED' AND l.deletedAt IS NULL AND ${tzMonthKey('l.loanDate')} = ?) +
      (SELECT COALESCE(SUM(lr.amountMinor), 0) FROM loan_repayments lr JOIN loans l ON l.id = lr.loanId
       WHERE l.type = 'LENT' AND lr.deletedAt IS NULL AND l.deletedAt IS NULL
         AND ${tzMonthKey('lr.repaymentDate')} = ? AND ${tzMonthKey('l.loanDate')} != ?) -
      (SELECT COALESCE(SUM(lr.amountMinor), 0) FROM loan_repayments lr JOIN loans l ON l.id = lr.loanId
       WHERE l.type = 'BORROWED' AND lr.deletedAt IS NULL AND l.deletedAt IS NULL
         AND ${tzMonthKey('lr.repaymentDate')} = ? AND ${tzMonthKey('l.loanDate')} = ?)
    ) / 100.0 AS total`,
    [monthKey, monthKey, monthKey, monthKey, monthKey, monthKey],
  );
  return row?.total ?? 0;
}

export async function getIncomesByMonthPaged(
  monthKey: string,
  limit: number,
  offset: number,
): Promise<Income[]> {
  const db = await getDb();
  return db.getAllAsync<IncomeRow>(
    `${INCOME_SELECT} AND ${tzMonthKey('t.transactionDate')}=? ORDER BY t.transactionDate DESC, t.id DESC LIMIT ? OFFSET ?`,
    [monthKey, limit, offset],
  );
}

export async function getAllIncomes(): Promise<Income[]> {
  const db = await getDb();
  return db.getAllAsync<IncomeRow>(
    `${INCOME_SELECT} ORDER BY t.transactionDate DESC, t.id DESC`,
  );
}

export async function getIncomeTotalAll(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT (
      (SELECT COALESCE(SUM(amountMinor), 0) FROM transactions WHERE type = 'INCOME' AND deletedAt IS NULL) +
      (SELECT COALESCE(SUM(amountMinor), 0) FROM loans WHERE type = 'BORROWED' AND deletedAt IS NULL) +
      (SELECT COALESCE(SUM(lr.amountMinor), 0) FROM loan_repayments lr JOIN loans l ON l.id = lr.loanId
       WHERE l.type = 'LENT' AND lr.deletedAt IS NULL AND l.deletedAt IS NULL
         AND ${tzMonthKey('lr.repaymentDate')} != ${tzMonthKey('l.loanDate')}) -
      (SELECT COALESCE(SUM(lr.amountMinor), 0) FROM loan_repayments lr JOIN loans l ON l.id = lr.loanId
       WHERE l.type = 'BORROWED' AND lr.deletedAt IS NULL AND l.deletedAt IS NULL
         AND ${tzMonthKey('lr.repaymentDate')} = ${tzMonthKey('l.loanDate')})
    ) / 100.0 AS total`,
  );
  return row?.total ?? 0;
}

export async function getAllIncomesPaged(limit: number, offset: number): Promise<Income[]> {
  const db = await getDb();
  return db.getAllAsync<IncomeRow>(
    `${INCOME_SELECT} ORDER BY t.transactionDate DESC, t.id DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
}

export async function getAvailableMonthKeys(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ monthKey: string }>(
    `SELECT DISTINCT ${tzMonthKey('transactionDate')} AS monthKey
     FROM transactions
     WHERE deletedAt IS NULL
     ORDER BY monthKey DESC`,
  );
  return rows.map((r) => r.monthKey);
}

export async function getMonthHistory(): Promise<MonthSummary[]> {
  const db = await getDb();

  const txRows = await db.getAllAsync<{
    monthKey: string;
    totalSpent: number;
    totalIncome: number;
    count: number;
  }>(
    `SELECT
      ${tzMonthKey('transactionDate')} AS monthKey,
      COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amountMinor ELSE 0 END), 0) / 100.0 AS totalSpent,
      COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amountMinor ELSE 0 END), 0) / 100.0 AS totalIncome,
      SUM(CASE WHEN type = 'EXPENSE' THEN 1 ELSE 0 END) AS count
    FROM transactions
    WHERE deletedAt IS NULL
    GROUP BY ${tzMonthKey('transactionDate')}`,
  );

  const feeRows = await db.getAllAsync<{ monthKey: string; feeTotal: number }>(
    `SELECT
      ${tzMonthKey('transferDate')} AS monthKey,
      COALESCE(SUM(feeAmountMinor), 0) / 100.0 AS feeTotal
    FROM transfers
    WHERE deletedAt IS NULL
    GROUP BY ${tzMonthKey('transferDate')}`,
  );

  const feeMap = new Map<string, number>();
  for (const r of feeRows) feeMap.set(r.monthKey, r.feeTotal);

  return txRows.map((row) => ({
    monthKey: row.monthKey,
    totalSpent: row.totalSpent + (feeMap.get(row.monthKey) ?? 0),
    totalIncome: row.totalIncome,
    count: row.count,
  })).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}
