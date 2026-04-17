import { Income, MonthSummary } from '@/types';
import { getDb } from './client';
import { nowIso, toMonthKey } from './helpers';

export async function addIncome(
  amount: number,
  category: string,
  note: string | null,
  createdAt?: string,
): Promise<void> {
  const db = await getDb();
  const timestamp = createdAt ?? nowIso();
  await db.runAsync(
    'INSERT INTO incomes (amount, category, note, createdAt, monthKey) VALUES (?, ?, ?, ?, ?)',
    [amount, category, note ?? null, timestamp, toMonthKey(timestamp)],
  );
}

export async function updateIncome(
  id: number,
  amount: number,
  category: string,
  note: string | null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE incomes SET amount=?, category=?, note=? WHERE id=?',
    [amount, category, note ?? null, id],
  );
}

export async function deleteIncome(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM incomes WHERE id=?', [id]);
}

export async function getIncomesByMonth(monthKey: string): Promise<Income[]> {
  const db = await getDb();
  return db.getAllAsync<Income>(
    'SELECT * FROM incomes WHERE monthKey=? ORDER BY createdAt DESC',
    [monthKey],
  );
}

export async function getAllIncomes(): Promise<Income[]> {
  const db = await getDb();
  return db.getAllAsync<Income>(
    'SELECT * FROM incomes ORDER BY createdAt DESC',
  );
}

export async function getAvailableMonthKeys(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ monthKey: string }>(
    `SELECT DISTINCT monthKey FROM expenses
     UNION
     SELECT DISTINCT monthKey FROM incomes
     ORDER BY monthKey DESC`,
  );
  return rows.map((r) => r.monthKey);
}

export async function getMonthHistory(): Promise<MonthSummary[]> {
  const db = await getDb();

  const months = await db.getAllAsync<{ monthKey: string }>(
    `SELECT DISTINCT monthKey FROM expenses
     UNION
     SELECT DISTINCT monthKey FROM incomes
     ORDER BY monthKey DESC`,
  );

  return Promise.all(
    months.map(async ({ monthKey }) => {
      const expRow = await db.getFirstAsync<{ total: number; cnt: number }>(
        'SELECT COALESCE(SUM(price),0) AS total, COUNT(*) AS cnt FROM expenses WHERE monthKey=?',
        [monthKey],
      );
      const incRow = await db.getFirstAsync<{ total: number }>(
        'SELECT COALESCE(SUM(amount),0) AS total FROM incomes WHERE monthKey=?',
        [monthKey],
      );
      return {
        monthKey,
        totalSpent: expRow?.total ?? 0,
        totalIncome: incRow?.total ?? 0,
        count: expRow?.cnt ?? 0,
      };
    }),
  );
}
