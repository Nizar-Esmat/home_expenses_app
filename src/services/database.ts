import * as SQLite from 'expo-sqlite';
import { Category, Expense, Income, Settings, MonthSummary } from '@/types';
import { DEFAULT_CATEGORIES, DEFAULT_CATEGORY_COLORS } from '@/services/constants';

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('budgetbuddy.db');
    await initDb(_db);
  }
  return _db;
}

// ── Schema ────────────────────────────────────────────────────

async function initDb(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS expenses (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      price     REAL    NOT NULL,
      category  TEXT    NOT NULL,
      note      TEXT,
      createdAt TEXT    NOT NULL,
      monthKey  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS incomes (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      amount    REAL    NOT NULL,
      note      TEXT,
      createdAt TEXT    NOT NULL,
      monthKey  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT    NOT NULL UNIQUE,
      emoji     TEXT    NOT NULL DEFAULT '📦',
      color     TEXT    NOT NULL DEFAULT '#408A71',
      isDefault INTEGER NOT NULL DEFAULT 0,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT    NOT NULL
    );
  `);

  await seedCategories(db);
}

// ── Category seed & migration ─────────────────────────────────

const BUILT_IN: { name: string; emoji: string; sortOrder: number }[] = [
  { name: 'Food',      emoji: '🍔', sortOrder: 0 },
  { name: 'Bills',     emoji: '💡', sortOrder: 1 },
  { name: 'Transport', emoji: '🚗', sortOrder: 2 },
  { name: 'Shopping',  emoji: '🛍️', sortOrder: 3 },
  { name: 'Home',      emoji: '🏠', sortOrder: 4 },
  { name: 'Other',     emoji: '📦', sortOrder: 5 },
];

async function seedCategories(db: SQLite.SQLiteDatabase): Promise<void> {
  const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM categories');
  if (count && count.n > 0) return; // already seeded

  const now = new Date().toISOString();

  // Insert built-in categories
  for (const cat of BUILT_IN) {
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (name, emoji, color, isDefault, sortOrder, createdAt) VALUES (?,?,?,1,?,?)',
      [cat.name, cat.emoji, DEFAULT_CATEGORY_COLORS[cat.name] ?? '#408A71', cat.sortOrder, now],
    );
  }

  // Migrate old customCategories from settings JSON (if any)
  const customCatsRow = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key='customCategories'",
  );
  const customEmojiRow = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key='customCategoryEmojis'",
  );

  if (customCatsRow?.value) {
    const cats: string[] = JSON.parse(customCatsRow.value);
    const emojis: Record<string, string> = customEmojiRow?.value
      ? JSON.parse(customEmojiRow.value)
      : {};
    let sortOrder = BUILT_IN.length;
    for (const cat of cats) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories (name, emoji, color, isDefault, sortOrder, createdAt) VALUES (?,?,?,0,?,?)',
        [cat, emojis[cat] ?? '📦', '#408A71', sortOrder++, now],
      );
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

function toMonthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── Categories CRUD ───────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const db = await getDb();
  return db.getAllAsync<Category>(
    'SELECT * FROM categories ORDER BY sortOrder ASC, id ASC',
  );
}

export async function addCategory(
  name: string,
  emoji: string,
  color: string,
): Promise<number> {
  const db = await getDb();
  const trimmed = name.trim();

  const existing = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM categories WHERE LOWER(name)=LOWER(?)',
    [trimmed],
  );
  if (existing && existing.n > 0) throw new Error('A category with this name already exists.');

  const maxSort = await db.getFirstAsync<{ m: number }>(
    'SELECT MAX(sortOrder) AS m FROM categories',
  );
  const sortOrder = (maxSort?.m ?? -1) + 1;

  const result = await db.runAsync(
    'INSERT INTO categories (name, emoji, color, isDefault, sortOrder, createdAt) VALUES (?,?,?,0,?,?)',
    [trimmed, emoji, color, sortOrder, nowIso()],
  );
  return result.lastInsertRowId;
}

export async function updateCategory(
  id: number,
  name: string,
  emoji: string,
  color: string,
): Promise<void> {
  const db = await getDb();
  const trimmed = name.trim();

  const cat = await db.getFirstAsync<Category>(
    'SELECT * FROM categories WHERE id=?',
    [id],
  );
  if (!cat) throw new Error('Category not found.');

  // Only check name uniqueness for custom (non-default) categories
  if (!cat.isDefault) {
    const dup = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM categories WHERE LOWER(name)=LOWER(?) AND id!=?',
      [trimmed, id],
    );
    if (dup && dup.n > 0) throw new Error('A category with this name already exists.');
  }

  await db.runAsync(
    'UPDATE categories SET emoji=?, color=?, name=? WHERE id=?',
    [emoji, color, cat.isDefault ? cat.name : trimmed, id],
  );

  // Rename all expenses that use the old name (only relevant for custom categories)
  if (!cat.isDefault && cat.name !== trimmed) {
    await db.runAsync(
      'UPDATE expenses SET category=? WHERE category=?',
      [trimmed, cat.name],
    );
  }
}

export async function deleteCategory(
  id: number,
): Promise<{ ok: boolean; reason?: string }> {
  const db = await getDb();

  const cat = await db.getFirstAsync<Category>(
    'SELECT * FROM categories WHERE id=?',
    [id],
  );
  if (!cat) return { ok: false, reason: 'Category not found.' };
  if (cat.isDefault) return { ok: false, reason: 'Built-in categories cannot be deleted.' };

  const used = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM expenses WHERE category=?',
    [cat.name],
  );
  if (used && used.n > 0) {
    return {
      ok: false,
      reason: `"${cat.name}" is used by ${used.n} expense${used.n > 1 ? 's' : ''}. Delete those expenses first.`,
    };
  }

  await db.runAsync('DELETE FROM categories WHERE id=?', [id]);
  return { ok: true };
}

/** Returns a map of { [categoryName]: expenseCount } for all categories */
export async function getCategoryUsageCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ category: string; cnt: number }>(
    'SELECT category, COUNT(*) AS cnt FROM expenses GROUP BY category',
  );
  const map: Record<string, number> = {};
  rows.forEach((r) => (map[r.category] = r.cnt));
  return map;
}

// ── Expenses ──────────────────────────────────────────────────

export async function addExpense(
  price: number,
  category: string,
  note: string | null,
  createdAt?: string,
): Promise<void> {
  const db = await getDb();
  const timestamp = createdAt ?? nowIso();
  await db.runAsync(
    'INSERT INTO expenses (price, category, note, createdAt, monthKey) VALUES (?, ?, ?, ?, ?)',
    [price, category, note ?? null, timestamp, toMonthKey(timestamp)],
  );
}

export async function updateExpense(
  id: number,
  price: number,
  category: string,
  note: string | null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE expenses SET price=?, category=?, note=? WHERE id=?',
    [price, category, note ?? null, id],
  );
}

export async function deleteExpense(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM expenses WHERE id=?', [id]);
}

export async function getExpensesByMonth(monthKey: string): Promise<Expense[]> {
  const db = await getDb();
  return db.getAllAsync<Expense>(
    'SELECT * FROM expenses WHERE monthKey=? ORDER BY createdAt DESC',
    [monthKey],
  );
}

// ── Incomes ───────────────────────────────────────────────────

export async function addIncome(
  amount: number,
  note: string | null,
  createdAt?: string,
): Promise<void> {
  const db = await getDb();
  const timestamp = createdAt ?? nowIso();
  await db.runAsync(
    'INSERT INTO incomes (amount, note, createdAt, monthKey) VALUES (?, ?, ?, ?)',
    [amount, note ?? null, timestamp, toMonthKey(timestamp)],
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

// ── History (expenses + income combined) ─────────────────────

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

// ── Settings ──────────────────────────────────────────────────

export async function saveSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [key, value],
  );
}

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings',
  );
  const map: Record<string, string> = {};
  rows.forEach((r) => (map[r.key] = r.value));
  return {
    currency: map['currency'] ?? 'EGP',
    themeMode: (map['themeMode'] as Settings['themeMode']) ?? 'dark',
    customCategories: map['customCategories'] ? JSON.parse(map['customCategories']) : [],
    customCategoryEmojis: map['customCategoryEmojis'] ? JSON.parse(map['customCategoryEmojis']) : {},
  };
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  for (const [key, value] of Object.entries(settings) as [string, unknown][]) {
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await saveSetting(key, str);
  }
}
