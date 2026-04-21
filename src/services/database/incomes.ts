import { Income, MonthSummary } from '@/types';
import { getDb } from './client';
import { nowIso, toMonthKey } from './helpers';

export async function addIncome(
  amount: number,
  category: string,
  note: string | null,
  createdAt?: string,
  accountId?: number | null,
): Promise<void> {
  const db = await getDb();
  const timestamp = createdAt ?? nowIso();

  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO incomes (amount, category, note, createdAt, monthKey, accountId) VALUES (?, ?, ?, ?, ?, ?)',
      [amount, category, note ?? null, timestamp, toMonthKey(timestamp), accountId ?? null],
    );

    if (accountId != null) {
      await db.runAsync(
        'UPDATE accounts SET currentBalance = currentBalance + ?, updatedAt = ? WHERE id = ?',
        [amount, nowIso(), accountId],
      );
    }
  });
}

export async function updateIncome(
  id: number,
  amount: number,
  category: string,
  note: string | null,
  accountId?: number | null,
): Promise<void> {
  const db = await getDb();

  const old = await db.getFirstAsync<{ amount: number; accountId: number | null }>(
    'SELECT amount, accountId FROM incomes WHERE id = ?',
    [id],
  );

  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE incomes SET amount=?, category=?, note=?, accountId=? WHERE id=?',
      [amount, category, note ?? null, accountId ?? null, id],
    );

    // Reverse old balance effect
    if (old?.accountId != null) {
      await db.runAsync(
        'UPDATE accounts SET currentBalance = currentBalance - ?, updatedAt = ? WHERE id = ?',
        [old.amount, nowIso(), old.accountId],
      );
    }
    // Apply new balance effect
    if (accountId != null) {
      await db.runAsync(
        'UPDATE accounts SET currentBalance = currentBalance + ?, updatedAt = ? WHERE id = ?',
        [amount, nowIso(), accountId],
      );
    }
  });
}

export async function deleteIncome(id: number): Promise<void> {
  const db = await getDb();

  const inc = await db.getFirstAsync<{ amount: number; accountId: number | null }>(
    'SELECT amount, accountId FROM incomes WHERE id = ?',
    [id],
  );

  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync('DELETE FROM incomes WHERE id=?', [id]);

    if (inc?.accountId != null) {
      await db.runAsync(
        'UPDATE accounts SET currentBalance = currentBalance - ?, updatedAt = ? WHERE id = ?',
        [inc.amount, nowIso(), inc.accountId],
      );
    }
  });
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
