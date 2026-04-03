import * as SQLite from 'expo-sqlite';
import { Expense, Settings, MonthSummary } from '../types';

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('budgetbuddy.db');
    await initDb(_db);
  }
  return _db;
}

async function initDb(db: SQLite.SQLiteDatabase) {
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

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// ── Expenses ─────────────────────────────────────────────────

export async function addExpense(
  price: number,
  category: string,
  note: string | null,
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  const createdAt = now.toISOString();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  await db.runAsync(
    'INSERT INTO expenses (price, category, note, createdAt, monthKey) VALUES (?, ?, ?, ?, ?)',
    [price, category, note ?? null, createdAt, monthKey],
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
  return await db.getAllAsync<Expense>(
    'SELECT * FROM expenses WHERE monthKey=? ORDER BY createdAt DESC',
    [monthKey],
  );
}

export async function getRecentExpenses(limit = 10): Promise<Expense[]> {
  const db = await getDb();
  return await db.getAllAsync<Expense>(
    'SELECT * FROM expenses ORDER BY createdAt DESC LIMIT ?',
    [limit],
  );
}

export async function getMonthHistory(): Promise<MonthSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<MonthSummary>(
    `SELECT monthKey,
            SUM(price) AS totalSpent,
            COUNT(*)   AS count
     FROM expenses
     GROUP BY monthKey
     ORDER BY monthKey DESC`,
  );
  return rows;
}

// ── Settings ─────────────────────────────────────────────────

export async function saveSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [key, value],
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key=?',
    [key],
  );
  return row?.value ?? null;
}

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings',
  );
  const map: Record<string, string> = {};
  rows.forEach((r) => (map[r.key] = r.value));

  return {
    salary: parseFloat(map['salary'] ?? '0'),
    currency: map['currency'] ?? 'EGP',
    themeMode: (map['themeMode'] as Settings['themeMode']) ?? 'dark',
    customCategories: map['customCategories']
      ? JSON.parse(map['customCategories'])
      : [],
    customCategoryEmojis: map['customCategoryEmojis']
      ? JSON.parse(map['customCategoryEmojis'])
      : {},
  };
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const entries = Object.entries(settings) as [string, unknown][];
  for (const [key, value] of entries) {
    const str =
      typeof value === 'object' ? JSON.stringify(value) : String(value);
    await saveSetting(key, str);
  }
}
