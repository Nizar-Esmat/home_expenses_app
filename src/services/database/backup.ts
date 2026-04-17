import { Category, IncomeCategory, Expense, Income, SubExpense } from '@/types';
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
}

export interface MergeBackupSummary {
  categoriesAdded: number;
  incomeCategoriesAdded: number;
  expensesAdded: number;
  expensesSkipped: number;
  incomesAdded: number;
  incomesSkipped: number;
  settingsMerged: number;
}

export async function exportDatabaseBackupData(): Promise<DatabaseBackupData> {
  const db = await getDb();
  const [expenses, incomes, categories, incomeCategories, settings, subExpenses] = await Promise.all([
    db.getAllAsync<Expense>('SELECT * FROM expenses ORDER BY createdAt DESC'),
    db.getAllAsync<Income>('SELECT * FROM incomes ORDER BY createdAt DESC'),
    db.getAllAsync<Category>('SELECT * FROM categories ORDER BY sortOrder ASC, id ASC'),
    db.getAllAsync<IncomeCategory>('SELECT * FROM income_categories ORDER BY sortOrder ASC, id ASC'),
    db.getAllAsync<SettingsRow>('SELECT key, value FROM settings'),
    db.getAllAsync<SubExpense>('SELECT * FROM sub_expenses ORDER BY expenseId ASC, sortOrder ASC'),
  ]);

  return { expenses, incomes, categories, incomeCategories, settings, subExpenses };
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

  await db.withExclusiveTransactionAsync(async () => {
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
      const expResult = await db.runAsync(
        'INSERT INTO expenses (price, category, note, createdAt, monthKey) VALUES (?, ?, ?, ?, ?)',
        [exp.price, exp.category, exp.note ?? null, exp.createdAt, exp.monthKey || toMonthKey(exp.createdAt)],
      );
      const newExpenseId = expResult.lastInsertRowId;

      // Re-insert sub-expenses under the new expense ID
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
      await db.runAsync(
        'INSERT INTO incomes (amount, category, note, createdAt, monthKey) VALUES (?, ?, ?, ?, ?)',
        [inc.amount, inc.category, inc.note ?? null, inc.createdAt, inc.monthKey || toMonthKey(inc.createdAt)],
      );
      incomeFingerprints.add(fp);
      summary.incomesAdded += 1;
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
  });

  return summary;
}
