import { Category, IncomeCategory, Expense, Income, SubExpense, Account, Transfer } from '@/types';
import { getDb } from './client';
import { nowIso, toMonthKey } from './helpers';
import { SettingsRow } from './settings';

export interface DatabaseBackupData {
  expenses: Expense[];
  incomes: Income[];
  categories: Category[];
  incomeCategories: IncomeCategory[];
  settings: SettingsRow[];
  subExpenses?: SubExpense[];
  accounts?: Account[];
  transfers?: Transfer[];
}

export interface MergeBackupSummary {
  categoriesAdded: number;
  incomeCategoriesAdded: number;
  expensesAdded: number;
  expensesSkipped: number;
  incomesAdded: number;
  incomesSkipped: number;
  settingsMerged: number;
  accountsAdded: number;
  transfersAdded: number;
  transfersSkipped: number;
}

export async function exportDatabaseBackupData(): Promise<DatabaseBackupData> {
  const db = await getDb();
  const [expenses, incomes, categories, incomeCategories, settings, subExpenses, accounts, transfers] =
    await Promise.all([
      db.getAllAsync<Expense>('SELECT * FROM expenses ORDER BY createdAt DESC'),
      db.getAllAsync<Income>('SELECT * FROM incomes ORDER BY createdAt DESC'),
      db.getAllAsync<Category>('SELECT * FROM categories ORDER BY sortOrder ASC, id ASC'),
      db.getAllAsync<IncomeCategory>('SELECT * FROM income_categories ORDER BY sortOrder ASC, id ASC'),
      db.getAllAsync<SettingsRow>('SELECT key, value FROM settings'),
      db.getAllAsync<SubExpense>('SELECT * FROM sub_expenses ORDER BY expenseId ASC, sortOrder ASC'),
      db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY createdAt ASC'),
      db.getAllAsync<Transfer>('SELECT * FROM transfers ORDER BY createdAt DESC'),
    ]);

  return { expenses, incomes, categories, incomeCategories, settings, subExpenses, accounts, transfers };
}

export async function mergeBackupIntoDatabase(data: DatabaseBackupData): Promise<MergeBackupSummary> {
  const db = await getDb();
  const summary: MergeBackupSummary = {
    categoriesAdded: 0,
    incomeCategoriesAdded: 0,
    expensesAdded: 0,
    expensesSkipped: 0,
    incomesAdded: 0,
    incomesSkipped: 0,
    settingsMerged: 0,
    accountsAdded: 0,
    transfersAdded: 0,
    transfersSkipped: 0,
  };

  const normalize = (v: string) => v.trim().toLowerCase();

  // Build sub-expenses map keyed by original expense ID (before remapping)
  const subExpensesMap = new Map<number, SubExpense[]>();
  for (const sub of (data.subExpenses ?? [])) {
    if (!sub?.expenseId || typeof sub.amount !== 'number' || !sub.title) continue;
    const arr = subExpensesMap.get(sub.expenseId) ?? [];
    arr.push(sub);
    subExpensesMap.set(sub.expenseId, arr);
  }

  // Build a map from backup account IDs → local account IDs for relinking
  const accountIdRemap = new Map<number, number>();

  await db.withExclusiveTransactionAsync(async () => {
    // ── Accounts ────────────────────────────────────────────
    for (const acc of (data.accounts ?? [])) {
      if (!acc?.name || !acc?.type) continue;

      const existing = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM accounts WHERE name = ?',
        [acc.name],
      );
      if (existing) {
        accountIdRemap.set(acc.id, existing.id);
        continue;
      }

      const result = await db.runAsync(
        `INSERT INTO accounts (name, type, openingBalance, currentBalance, icon, color, isDefault, isArchived, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          acc.name,
          acc.type,
          acc.openingBalance ?? 0,
          acc.currentBalance ?? 0,
          acc.icon ?? null,
          acc.color ?? null,
          0, // imported accounts are never default
          acc.isArchived ?? 0,
          acc.createdAt ?? nowIso(),
          acc.updatedAt ?? nowIso(),
        ],
      );
      accountIdRemap.set(acc.id, result.lastInsertRowId);
      summary.accountsAdded += 1;
    }

    // ── Categories ──────────────────────────────────────────
    const existingCategories = await db.getAllAsync<{ name: string }>('SELECT name FROM categories');
    const existingCategorySet = new Set(existingCategories.map((c) => normalize(c.name)));

    for (const cat of data.categories) {
      if (!cat?.name) continue;
      const key = normalize(cat.name);
      if (existingCategorySet.has(key)) continue;
      await db.runAsync(
        'INSERT INTO categories (name, emoji, color, isDefault, sortOrder, createdAt) VALUES (?,?,?,?,?,?)',
        [cat.name, cat.emoji ?? '📦', cat.color ?? '#408A71', 0, cat.sortOrder ?? 0, cat.createdAt ?? nowIso()],
      );
      existingCategorySet.add(key);
      summary.categoriesAdded += 1;
    }

    // ── Income categories ────────────────────────────────────
    const existingIncomeCategories = await db.getAllAsync<{ name: string }>('SELECT name FROM income_categories');
    const existingIncomeCategorySet = new Set(existingIncomeCategories.map((c) => normalize(c.name)));

    for (const cat of data.incomeCategories) {
      if (!cat?.name) continue;
      const key = normalize(cat.name);
      if (existingIncomeCategorySet.has(key)) continue;
      await db.runAsync(
        'INSERT INTO income_categories (name, emoji, color, isDefault, sortOrder, createdAt) VALUES (?,?,?,?,?,?)',
        [cat.name, cat.emoji ?? '💰', cat.color ?? '#10B981', 0, cat.sortOrder ?? 0, cat.createdAt ?? nowIso()],
      );
      existingIncomeCategorySet.add(key);
      summary.incomeCategoriesAdded += 1;
    }

    // ── Expenses ────────────────────────────────────────────
    const existingExpenses = await db.getAllAsync<Expense>('SELECT * FROM expenses');
    const expenseFingerprints = new Set(
      existingExpenses.map((e) => `${e.createdAt}|${e.price}|${normalize(e.category)}|${(e.note ?? '').trim()}`),
    );

    for (const exp of data.expenses) {
      if (!exp?.createdAt || typeof exp.price !== 'number' || !exp.category) continue;
      const fp = `${exp.createdAt}|${exp.price}|${normalize(exp.category)}|${(exp.note ?? '').trim()}`;
      if (expenseFingerprints.has(fp)) {
        summary.expensesSkipped += 1;
        continue;
      }

      // Remap accountId
      const remappedAccountId = exp.accountId != null
        ? (accountIdRemap.get(exp.accountId) ?? exp.accountId)
        : null;

      const expResult = await db.runAsync(
        'INSERT INTO expenses (price, category, note, createdAt, monthKey, accountId) VALUES (?, ?, ?, ?, ?, ?)',
        [exp.price, exp.category, exp.note ?? null, exp.createdAt, exp.monthKey || toMonthKey(exp.createdAt), remappedAccountId],
      );
      const newExpenseId = expResult.lastInsertRowId;

      const subsToInsert = subExpensesMap.get(exp.id);
      if (subsToInsert && subsToInsert.length > 0) {
        for (let i = 0; i < subsToInsert.length; i++) {
          const sub = subsToInsert[i]!;
          await db.runAsync(
            'INSERT INTO sub_expenses (expenseId, title, amount, sortOrder) VALUES (?, ?, ?, ?)',
            [newExpenseId, sub.title, sub.amount, sub.sortOrder ?? i],
          );
        }
      }

      expenseFingerprints.add(fp);
      summary.expensesAdded += 1;
    }

    // ── Incomes ─────────────────────────────────────────────
    const existingIncomes = await db.getAllAsync<Income>('SELECT * FROM incomes');
    const incomeFingerprints = new Set(
      existingIncomes.map((i) => `${i.createdAt}|${i.amount}|${normalize(i.category)}|${(i.note ?? '').trim()}`),
    );

    for (const inc of data.incomes) {
      if (!inc?.createdAt || typeof inc.amount !== 'number' || !inc.category) continue;
      const fp = `${inc.createdAt}|${inc.amount}|${normalize(inc.category)}|${(inc.note ?? '').trim()}`;
      if (incomeFingerprints.has(fp)) {
        summary.incomesSkipped += 1;
        continue;
      }

      const remappedAccountId = inc.accountId != null
        ? (accountIdRemap.get(inc.accountId) ?? inc.accountId)
        : null;

      await db.runAsync(
        'INSERT INTO incomes (amount, category, note, createdAt, monthKey, accountId) VALUES (?, ?, ?, ?, ?, ?)',
        [inc.amount, inc.category, inc.note ?? null, inc.createdAt, inc.monthKey || toMonthKey(inc.createdAt), remappedAccountId],
      );
      incomeFingerprints.add(fp);
      summary.incomesAdded += 1;
    }

    // ── Transfers ────────────────────────────────────────────
    const existingTransfers = await db.getAllAsync<Transfer>('SELECT * FROM transfers');
    const transferFingerprints = new Set(
      existingTransfers.map((t) => `${t.createdAt}|${t.amount}|${t.fromAccountId}|${t.toAccountId}`),
    );

    for (const tr of (data.transfers ?? [])) {
      if (!tr?.createdAt || typeof tr.amount !== 'number') continue;

      const remappedFrom = accountIdRemap.get(tr.fromAccountId) ?? tr.fromAccountId;
      const remappedTo   = accountIdRemap.get(tr.toAccountId)   ?? tr.toAccountId;
      const fp = `${tr.createdAt}|${tr.amount}|${remappedFrom}|${remappedTo}`;

      if (transferFingerprints.has(fp)) {
        summary.transfersSkipped += 1;
        continue;
      }

      await db.runAsync(
        'INSERT INTO transfers (fromAccountId, toAccountId, amount, note, createdAt, monthKey) VALUES (?, ?, ?, ?, ?, ?)',
        [remappedFrom, remappedTo, tr.amount, tr.note ?? null, tr.createdAt, tr.monthKey || toMonthKey(tr.createdAt)],
      );
      transferFingerprints.add(fp);
      summary.transfersAdded += 1;
    }

    // ── Settings ────────────────────────────────────────────
    for (const row of data.settings) {
      if (!row?.key) continue;
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        [row.key, row.value ?? ''],
      );
      summary.settingsMerged += 1;
    }

    // Recalculate all account balances after merge to ensure consistency
    const accounts = await db.getAllAsync<{ id: number; openingBalance: number }>(
      'SELECT id, openingBalance FROM accounts',
    );
    const now = nowIso();
    for (const acc of accounts) {
      const txRow = await db.getFirstAsync<{ txDelta: number }>(
        `SELECT
           (SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE accountId = ?) -
           (SELECT COALESCE(SUM(price),  0) FROM expenses WHERE accountId = ?) +
           (SELECT COALESCE(SUM(amount), 0) FROM transfers WHERE toAccountId = ?) -
           (SELECT COALESCE(SUM(amount), 0) FROM transfers WHERE fromAccountId = ?)
         AS txDelta`,
        [acc.id, acc.id, acc.id, acc.id],
      );
      await db.runAsync('UPDATE accounts SET currentBalance = ?, updatedAt = ? WHERE id = ?', [
        acc.openingBalance + (txRow?.txDelta ?? 0),
        now,
        acc.id,
      ]);
    }
  });

  return summary;
}

