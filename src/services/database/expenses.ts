import { Expense, SubExpense, SubExpenseInput } from '@/types';
import { getDb } from './client';
import { nowIso, toMinorUnits } from './helpers';
import { recalculateBalance } from './accounts';

interface ExpenseRow {
  id: number;
  price: number;
  category: string;
  note: string | null;
  createdAt: string;
  monthKey: string;
  accountId: number | null;
}

interface SubExpenseRow {
  id: number;
  expenseId: number;
  title: string;
  amount: number;
  sortOrder: number;
}

const EXPENSE_SELECT = `
  SELECT
    t.id,
    t.amountMinor / 100.0 AS price,
    c.name AS category,
    t.note,
    t.transactionDate AS createdAt,
    substr(t.transactionDate, 1, 7) AS monthKey,
    t.accountId
  FROM transactions t
  JOIN categories c ON c.id = t.categoryId
  WHERE t.type = 'EXPENSE' AND t.deletedAt IS NULL
`;

async function getCategoryIdByName(name: string): Promise<number> {
  const db = await getDb();
  const categoryName = name.trim() || 'Other';
  const row = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM categories WHERE type = 'EXPENSE' AND LOWER(name)=LOWER(?)",
    [categoryName],
  );
  if (row) return row.id;

  const fallback = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM categories WHERE type = 'EXPENSE' AND name = 'Other' LIMIT 1",
  );
  if (!fallback) throw new Error('Expense category not found.');
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

async function attachSubExpenses(expenses: Expense[]): Promise<void> {
  if (expenses.length === 0) return;
  const db = await getDb();
  const ids = expenses.map((e) => e.id);
  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.getAllAsync<SubExpenseRow>(
    `SELECT
       id,
       transactionId AS expenseId,
       name AS title,
       amountMinor / 100.0 AS amount,
       sortOrder
     FROM transaction_items
     WHERE transactionId IN (${placeholders})
     ORDER BY transactionId ASC, sortOrder ASC`,
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
    `SELECT
       id,
       transactionId AS expenseId,
       name AS title,
       amountMinor / 100.0 AS amount,
       sortOrder
     FROM transaction_items
     WHERE transactionId=?
     ORDER BY sortOrder ASC`,
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
  const categoryId = await getCategoryIdByName(category);
  const resolvedAccountId = await getTransactionAccountId(accountId);
  const amountMinor = toMinorUnits(price);

  let newId = 0;
  await db.withExclusiveTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO transactions
         (accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, 'EXPENSE', ?, 'EGP', ?, ?, ?, ?, ?, NULL)`,
      [resolvedAccountId, categoryId, amountMinor, category, note ?? null, timestamp, timestamp, timestamp],
    );
    newId = result.lastInsertRowId;

    if (subExpenses && subExpenses.length > 0) {
      for (let i = 0; i < subExpenses.length; i++) {
        const sub = subExpenses[i]!;
        await db.runAsync(
          `INSERT INTO transaction_items
             (transactionId, categoryId, name, amountMinor, quantity, note, sortOrder, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?)`,
          [newId, categoryId, sub.title, toMinorUnits(sub.amount), i, timestamp, timestamp],
        );
      }
    }
  });

  await recalculateBalance(resolvedAccountId);
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
  const categoryId = await getCategoryIdByName(category);
  const resolvedAccountId = await getTransactionAccountId(accountId);
  const now = nowIso();

  const old = await db.getFirstAsync<{ accountId: number | null }>(
    "SELECT accountId FROM transactions WHERE id = ? AND type = 'EXPENSE'",
    [id],
  );

  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE transactions SET amountMinor=?, categoryId=?, title=?, note=?, accountId=?, updatedAt=? WHERE id=? AND type=?',
      [toMinorUnits(price), categoryId, category, note ?? null, resolvedAccountId, now, id, 'EXPENSE'],
    );

    await db.runAsync('DELETE FROM transaction_items WHERE transactionId=?', [id]);
    if (subExpenses && subExpenses.length > 0) {
      for (let i = 0; i < subExpenses.length; i++) {
        const sub = subExpenses[i]!;
        await db.runAsync(
          `INSERT INTO transaction_items
             (transactionId, categoryId, name, amountMinor, quantity, note, sortOrder, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?)`,
          [id, categoryId, sub.title, toMinorUnits(sub.amount), i, now, now],
        );
      }
    }
  });

  const affected = new Set<number>();
  if (old?.accountId != null) affected.add(old.accountId);
  affected.add(resolvedAccountId);
  for (const accId of affected) await recalculateBalance(accId);
}

export async function deleteExpense(id: number): Promise<void> {
  const db = await getDb();

  const exp = await db.getFirstAsync<{ accountId: number | null }>(
    "SELECT accountId FROM transactions WHERE id = ? AND type = 'EXPENSE'",
    [id],
  );

  await db.runAsync(
    "UPDATE transactions SET deletedAt = ?, updatedAt = ? WHERE id = ? AND type = 'EXPENSE'",
    [nowIso(), nowIso(), id],
  );

  if (exp?.accountId != null) await recalculateBalance(exp.accountId);
}

export async function getExpensesByMonth(monthKey: string): Promise<Expense[]> {
  const db = await getDb();
  const expenses = await db.getAllAsync<ExpenseRow>(
    `${EXPENSE_SELECT} AND substr(t.transactionDate, 1, 7)=? ORDER BY t.transactionDate DESC, t.id DESC`,
    [monthKey],
  );
  await attachSubExpenses(expenses);
  return expenses;
}

export async function getExpenseById(id: number): Promise<Expense | null> {
  const db = await getDb();
  const expenses = await db.getAllAsync<ExpenseRow>(
    `${EXPENSE_SELECT} AND t.id=? LIMIT 1`,
    [id],
  );
  if (expenses.length === 0) return null;
  await attachSubExpenses(expenses);
  return expenses[0] ?? null;
}

export async function getAllExpenses(): Promise<Expense[]> {
  const db = await getDb();
  const expenses = await db.getAllAsync<ExpenseRow>(
    `${EXPENSE_SELECT} ORDER BY t.transactionDate DESC, t.id DESC`,
  );
  await attachSubExpenses(expenses);
  return expenses;
}
