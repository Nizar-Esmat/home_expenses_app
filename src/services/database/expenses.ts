import { Expense, SubExpense, SubExpenseInput } from '@/types';
import { SPLIT_CATEGORY_NAME } from '@/services/constants';
import { getDb } from './client';
import { getMonthDateRange, nowIso, toMinorUnits, tzMonthKey } from './helpers';
import { recalculateBalance } from './accounts';
import { generateUuidV7 } from './uuid';

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
  categoryId: number | null;
  categoryName: string | null;
  categoryEmoji: string | null;
  categoryColor: string | null;
}

const EXPENSE_SELECT = `
  SELECT
    t.id,
    t.amountMinor / 100.0 AS price,
    c.name AS category,
    t.note,
    t.transactionDate AS createdAt,
    ${tzMonthKey('t.transactionDate')} AS monthKey,
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

async function getSplitCategoryId(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM categories WHERE type = 'EXPENSE' AND name = ? LIMIT 1",
    [SPLIT_CATEGORY_NAME],
  );
  if (row) return row.id;

  const now = nowIso();
  const res = await db.runAsync(
    "INSERT OR IGNORE INTO categories (name, type, icon, color, isDefault, sortOrder, createdAt, updatedAt) VALUES (?, 'EXPENSE', '🔀', '#6366F1', 1, 99, ?, ?)",
    [SPLIT_CATEGORY_NAME, now, now],
  );
  if (res.lastInsertRowId) return res.lastInsertRowId;

  const retry = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM categories WHERE type = 'EXPENSE' AND name = ? LIMIT 1",
    [SPLIT_CATEGORY_NAME],
  );
  if (!retry) throw new Error('Split category not found.');
  return retry.id;
}

async function resolveParentAndItemCategories(
  fallbackCategoryName: string,
  subExpenses?: SubExpenseInput[],
): Promise<{
  parentCategoryId: number;
  parentTitle: string;
  itemCategoryIds: number[];
}> {
  const db = await getDb();
  const fallbackId = await getCategoryIdByName(fallbackCategoryName);

  if (!subExpenses || subExpenses.length === 0) {
    return {
      parentCategoryId: fallbackId,
      parentTitle: fallbackCategoryName,
      itemCategoryIds: [],
    };
  }

  const itemCategoryIds = subExpenses.map((s) => s.categoryId ?? fallbackId);
  const uniqueIds = new Set(itemCategoryIds);

  if (uniqueIds.size > 1) {
    const splitId = await getSplitCategoryId();
    return {
      parentCategoryId: splitId,
      parentTitle: SPLIT_CATEGORY_NAME,
      itemCategoryIds,
    };
  }

  const singleId = itemCategoryIds[0]!;
  if (singleId === fallbackId) {
    return {
      parentCategoryId: fallbackId,
      parentTitle: fallbackCategoryName,
      itemCategoryIds,
    };
  }

  const catRow = await db.getFirstAsync<{ name: string }>(
    'SELECT name FROM categories WHERE id = ?',
    [singleId],
  );
  return {
    parentCategoryId: singleId,
    parentTitle: catRow?.name ?? fallbackCategoryName,
    itemCategoryIds,
  };
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

export async function attachSubExpenses(expenses: Expense[]): Promise<void> {
  if (expenses.length === 0) return;
  const db = await getDb();
  const ids = expenses.map((e) => e.id);
  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.getAllAsync<SubExpenseRow>(
    `SELECT
       ti.id,
       ti.transactionId AS expenseId,
       ti.name AS title,
       ti.amountMinor / 100.0 AS amount,
       ti.sortOrder,
       ti.categoryId,
       c.name AS categoryName,
       c.icon AS categoryEmoji,
       c.color AS categoryColor
     FROM transaction_items ti
     LEFT JOIN categories c ON c.id = ti.categoryId
     WHERE ti.transactionId IN (${placeholders})
     ORDER BY ti.transactionId ASC, ti.sortOrder ASC`,
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
       ti.id,
       ti.transactionId AS expenseId,
       ti.name AS title,
       ti.amountMinor / 100.0 AS amount,
       ti.sortOrder,
       ti.categoryId,
       c.name AS categoryName,
       c.icon AS categoryEmoji,
       c.color AS categoryColor
     FROM transaction_items ti
     LEFT JOIN categories c ON c.id = ti.categoryId
     WHERE ti.transactionId=?
     ORDER BY ti.sortOrder ASC`,
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
  const { parentCategoryId, parentTitle, itemCategoryIds } =
    await resolveParentAndItemCategories(category, subExpenses);
  const resolvedAccountId = await getTransactionAccountId(accountId);
  const amountMinor = toMinorUnits(price);
  const uuid = generateUuidV7();

  if (subExpenses && subExpenses.length > 0) {
    const subSum = subExpenses.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(toMinorUnits(subSum) - amountMinor) > 1) {
      throw new Error('Total price does not match the sum of sub-expenses.');
    }
  }

  let newId = 0;
  await db.withExclusiveTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO transactions
         (uuid, accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, 'EXPENSE', ?, 'EGP', ?, ?, ?, ?, ?, NULL)`,
      [uuid, resolvedAccountId, parentCategoryId, amountMinor, parentTitle, note ?? null, timestamp, timestamp, timestamp],
    );
    newId = result.lastInsertRowId;

    if (subExpenses && subExpenses.length > 0) {
      for (let i = 0; i < subExpenses.length; i++) {
        const sub = subExpenses[i]!;
        await db.runAsync(
          `INSERT INTO transaction_items
             (transactionId, categoryId, name, amountMinor, quantity, note, sortOrder, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?)`,
          [newId, itemCategoryIds[i]!, sub.title, toMinorUnits(sub.amount), i, timestamp, timestamp],
        );
      }
    }

    // Atomic balance update inside the same transaction
    await recalculateBalance(resolvedAccountId);
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
  const { parentCategoryId, parentTitle, itemCategoryIds } =
    await resolveParentAndItemCategories(category, subExpenses);
  const resolvedAccountId = await getTransactionAccountId(accountId);
  const now = nowIso();
  const amountMinor = toMinorUnits(price);

  if (subExpenses && subExpenses.length > 0) {
    const subSum = subExpenses.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(toMinorUnits(subSum) - amountMinor) > 1) {
      throw new Error('Total price does not match the sum of sub-expenses.');
    }
  }

  const old = await db.getFirstAsync<{ accountId: number | null }>(
    "SELECT accountId FROM transactions WHERE id = ? AND type = 'EXPENSE'",
    [id],
  );

  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE transactions SET amountMinor=?, categoryId=?, title=?, note=?, accountId=?, updatedAt=? WHERE id=? AND type=?',
      [amountMinor, parentCategoryId, parentTitle, note ?? null, resolvedAccountId, now, id, 'EXPENSE'],
    );

    await db.runAsync('DELETE FROM transaction_items WHERE transactionId=?', [id]);
    if (subExpenses && subExpenses.length > 0) {
      for (let i = 0; i < subExpenses.length; i++) {
        const sub = subExpenses[i]!;
        await db.runAsync(
          `INSERT INTO transaction_items
             (transactionId, categoryId, name, amountMinor, quantity, note, sortOrder, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?)`,
          [id, itemCategoryIds[i]!, sub.title, toMinorUnits(sub.amount), i, now, now],
        );
      }
    }

    const affected = new Set<number>();
    if (old?.accountId != null) affected.add(old.accountId);
    affected.add(resolvedAccountId);
    for (const accId of affected) await recalculateBalance(accId);
  });
}

export async function deleteExpense(id: number): Promise<void> {
  const db = await getDb();

  const exp = await db.getFirstAsync<{ accountId: number | null }>(
    "SELECT accountId FROM transactions WHERE id = ? AND type = 'EXPENSE'",
    [id],
  );

  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync(
      "UPDATE transactions SET deletedAt = ?, updatedAt = ? WHERE id = ? AND type = 'EXPENSE'",
      [nowIso(), nowIso(), id],
    );

    if (exp?.accountId != null) await recalculateBalance(exp.accountId);
  });
}

export async function getExpensesByMonth(monthKey: string): Promise<Expense[]> {
  const db = await getDb();
  const { startIso, endIso } = getMonthDateRange(monthKey);
  const expenses = await db.getAllAsync<ExpenseRow>(
    `${EXPENSE_SELECT} AND t.transactionDate >= ? AND t.transactionDate < ? ORDER BY t.transactionDate DESC, t.id DESC`,
    [startIso, endIso],
  );
  await attachSubExpenses(expenses);
  return expenses;
}

export async function getExpensesByMonthPaged(
  monthKey: string,
  limit: number,
  offset: number,
): Promise<Expense[]> {
  const db = await getDb();
  const { startIso, endIso } = getMonthDateRange(monthKey);
  const expenses = await db.getAllAsync<ExpenseRow>(
    `${EXPENSE_SELECT} AND t.transactionDate >= ? AND t.transactionDate < ? ORDER BY t.transactionDate DESC, t.id DESC LIMIT ? OFFSET ?`,
    [startIso, endIso, limit, offset],
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

export async function getExpenseTotalByMonth(monthKey: string): Promise<number> {
  const db = await getDb();
  const { startIso, endIso } = getMonthDateRange(monthKey);
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT (
      (SELECT COALESCE(SUM(amountMinor), 0) FROM transactions
       WHERE type = 'EXPENSE' AND deletedAt IS NULL AND transactionDate >= ? AND transactionDate < ?) +
      (SELECT COALESCE(SUM(feeAmountMinor), 0) FROM transfers
       WHERE deletedAt IS NULL AND transferDate >= ? AND transferDate < ?) +
      (SELECT COALESCE(SUM(l.amountMinor), 0) FROM loans l
       WHERE l.type = 'LENT' AND l.deletedAt IS NULL AND l.loanDate >= ? AND l.loanDate < ?) +
      (SELECT COALESCE(SUM(lr.amountMinor), 0) FROM loan_repayments lr JOIN loans l ON l.id = lr.loanId
       WHERE l.type = 'BORROWED' AND lr.deletedAt IS NULL AND l.deletedAt IS NULL
         AND lr.repaymentDate >= ? AND lr.repaymentDate < ? AND l.loanDate < ?) -
      (SELECT COALESCE(SUM(lr.amountMinor), 0) FROM loan_repayments lr JOIN loans l ON l.id = lr.loanId
       WHERE l.type = 'LENT' AND lr.deletedAt IS NULL AND l.deletedAt IS NULL
         AND lr.repaymentDate >= ? AND lr.repaymentDate < ? AND l.loanDate >= ? AND l.loanDate < ?)
    ) / 100.0 AS total`,
    [startIso, endIso, startIso, endIso, startIso, endIso, startIso, endIso, startIso, startIso, endIso, startIso, endIso],
  );
  return row?.total ?? 0;
}

export async function getAllExpenses(): Promise<Expense[]> {
  const db = await getDb();
  const expenses = await db.getAllAsync<ExpenseRow>(
    `${EXPENSE_SELECT} ORDER BY t.transactionDate DESC, t.id DESC`,
  );
  await attachSubExpenses(expenses);
  return expenses;
}

export async function getExpenseTotalAll(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT (
      (SELECT COALESCE(SUM(amountMinor), 0) FROM transactions WHERE type = 'EXPENSE' AND deletedAt IS NULL) +
      (SELECT COALESCE(SUM(feeAmountMinor), 0) FROM transfers WHERE deletedAt IS NULL) +
      (SELECT COALESCE(SUM(amountMinor), 0) FROM loans WHERE type = 'LENT' AND deletedAt IS NULL) +
      (SELECT COALESCE(SUM(lr.amountMinor), 0) FROM loan_repayments lr JOIN loans l ON l.id = lr.loanId
       WHERE l.type = 'BORROWED' AND lr.deletedAt IS NULL AND l.deletedAt IS NULL
         AND ${tzMonthKey('lr.repaymentDate')} != ${tzMonthKey('l.loanDate')}) -
      (SELECT COALESCE(SUM(lr.amountMinor), 0) FROM loan_repayments lr JOIN loans l ON l.id = lr.loanId
       WHERE l.type = 'LENT' AND lr.deletedAt IS NULL AND l.deletedAt IS NULL
         AND ${tzMonthKey('lr.repaymentDate')} = ${tzMonthKey('l.loanDate')})
    ) / 100.0 AS total`,
  );
  return row?.total ?? 0;
}

export async function getAllExpensesPaged(limit: number, offset: number): Promise<Expense[]> {
  const db = await getDb();
  const expenses = await db.getAllAsync<ExpenseRow>(
    `${EXPENSE_SELECT} ORDER BY t.transactionDate DESC, t.id DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  await attachSubExpenses(expenses);
  return expenses;
}
