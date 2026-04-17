import { Expense, SubExpense, SubExpenseInput } from '@/types';
import { getDb } from './client';
import { nowIso, toMonthKey } from './helpers';

// ── Private helpers ───────────────────────────────────────────

async function attachSubExpenses(expenses: Expense[]): Promise<void> {
  if (expenses.length === 0) return;
  const db = await getDb();
  const ids = expenses.map((e) => e.id);
  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.getAllAsync<SubExpense>(
    `SELECT * FROM sub_expenses WHERE expenseId IN (${placeholders}) ORDER BY expenseId ASC, sortOrder ASC`,
    ids,
  );
  const byId = new Map<number, SubExpense[]>();
  for (const row of rows) {
    const arr = byId.get(row.expenseId) ?? [];
    arr.push(row);
    byId.set(row.expenseId, arr);
  }
  for (const exp of expenses) {
    exp.subExpenses = byId.get(exp.id) ?? [];
  }
}

// ── Sub-expenses ──────────────────────────────────────────────

export async function getSubExpenses(expenseId: number): Promise<SubExpense[]> {
  const db = await getDb();
  return db.getAllAsync<SubExpense>(
    'SELECT * FROM sub_expenses WHERE expenseId=? ORDER BY sortOrder ASC',
    [expenseId],
  );
}

// ── Expenses CRUD ─────────────────────────────────────────────

export async function addExpense(
  price: number,
  category: string,
  note: string | null,
  createdAt?: string,
  subExpenses?: SubExpenseInput[],
): Promise<number> {
  const db = await getDb();
  const timestamp = createdAt ?? nowIso();

  if (!subExpenses || subExpenses.length === 0) {
    const result = await db.runAsync(
      'INSERT INTO expenses (price, category, note, createdAt, monthKey) VALUES (?, ?, ?, ?, ?)',
      [price, category, note ?? null, timestamp, toMonthKey(timestamp)],
    );
    return result.lastInsertRowId;
  }

  let newId = 0;
  await db.withExclusiveTransactionAsync(async () => {
    const result = await db.runAsync(
      'INSERT INTO expenses (price, category, note, createdAt, monthKey) VALUES (?, ?, ?, ?, ?)',
      [price, category, note ?? null, timestamp, toMonthKey(timestamp)],
    );
    newId = result.lastInsertRowId;
    for (let i = 0; i < subExpenses.length; i++) {
      const sub = subExpenses[i]!;
      await db.runAsync(
        'INSERT INTO sub_expenses (expenseId, title, amount, sortOrder) VALUES (?, ?, ?, ?)',
        [newId, sub.title, sub.amount, i],
      );
    }
  });
  return newId;
}

export async function updateExpense(
  id: number,
  price: number,
  category: string,
  note: string | null,
  subExpenses?: SubExpenseInput[],
): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE expenses SET price=?, category=?, note=? WHERE id=?',
      [price, category, note ?? null, id],
    );
    await db.runAsync('DELETE FROM sub_expenses WHERE expenseId=?', [id]);
    if (subExpenses && subExpenses.length > 0) {
      for (let i = 0; i < subExpenses.length; i++) {
        const sub = subExpenses[i]!;
        await db.runAsync(
          'INSERT INTO sub_expenses (expenseId, title, amount, sortOrder) VALUES (?, ?, ?, ?)',
          [id, sub.title, sub.amount, i],
        );
      }
    }
  });
}

export async function deleteExpense(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sub_expenses WHERE expenseId=?', [id]);
  await db.runAsync('DELETE FROM expenses WHERE id=?', [id]);
}

export async function getExpensesByMonth(monthKey: string): Promise<Expense[]> {
  const db = await getDb();
  const expenses = await db.getAllAsync<Expense>(
    'SELECT * FROM expenses WHERE monthKey=? ORDER BY createdAt DESC',
    [monthKey],
  );
  await attachSubExpenses(expenses);
  return expenses;
}

export async function getAllExpenses(): Promise<Expense[]> {
  const db = await getDb();
  const expenses = await db.getAllAsync<Expense>(
    'SELECT * FROM expenses ORDER BY createdAt DESC',
  );
  await attachSubExpenses(expenses);
  return expenses;
}
