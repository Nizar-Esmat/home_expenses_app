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
  accountId?: number | null,
): Promise<number> {
  const db = await getDb();
  const timestamp = createdAt ?? nowIso();

  let newId = 0;
  await db.withExclusiveTransactionAsync(async () => {
    const result = await db.runAsync(
      'INSERT INTO expenses (price, category, note, createdAt, monthKey, accountId) VALUES (?, ?, ?, ?, ?, ?)',
      [price, category, note ?? null, timestamp, toMonthKey(timestamp), accountId ?? null],
    );
    newId = result.lastInsertRowId;

    if (subExpenses && subExpenses.length > 0) {
      for (let i = 0; i < subExpenses.length; i++) {
        const sub = subExpenses[i]!;
        await db.runAsync(
          'INSERT INTO sub_expenses (expenseId, title, amount, sortOrder) VALUES (?, ?, ?, ?)',
          [newId, sub.title, sub.amount, i],
        );
      }
    }

    // Subtract from account balance
    if (accountId != null) {
      await db.runAsync(
        'UPDATE accounts SET currentBalance = currentBalance - ?, updatedAt = ? WHERE id = ?',
        [price, nowIso(), accountId],
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
  accountId?: number | null,
): Promise<void> {
  const db = await getDb();

  // Fetch the old expense to reverse its balance effect
  const old = await db.getFirstAsync<{ price: number; accountId: number | null }>(
    'SELECT price, accountId FROM expenses WHERE id = ?',
    [id],
  );

  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE expenses SET price=?, category=?, note=?, accountId=? WHERE id=?',
      [price, category, note ?? null, accountId ?? null, id],
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

    // Reverse old balance effect
    if (old?.accountId != null) {
      await db.runAsync(
        'UPDATE accounts SET currentBalance = currentBalance + ?, updatedAt = ? WHERE id = ?',
        [old.price, nowIso(), old.accountId],
      );
    }
    // Apply new balance effect
    if (accountId != null) {
      await db.runAsync(
        'UPDATE accounts SET currentBalance = currentBalance - ?, updatedAt = ? WHERE id = ?',
        [price, nowIso(), accountId],
      );
    }
  });
}

export async function deleteExpense(id: number): Promise<void> {
  const db = await getDb();

  const exp = await db.getFirstAsync<{ price: number; accountId: number | null }>(
    'SELECT price, accountId FROM expenses WHERE id = ?',
    [id],
  );

  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync('DELETE FROM sub_expenses WHERE expenseId=?', [id]);
    await db.runAsync('DELETE FROM expenses WHERE id=?', [id]);

    // Reverse the balance deduction
    if (exp?.accountId != null) {
      await db.runAsync(
        'UPDATE accounts SET currentBalance = currentBalance + ?, updatedAt = ? WHERE id = ?',
        [exp.price, nowIso(), exp.accountId],
      );
    }
  });
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

