import * as SQLite from 'expo-sqlite';
import { Expense, Income, Settings, MonthSummary } from '@/types';

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('budgetbuddy.db');
    await initDb(_db);
  }
  return _db;
}

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
  `);
}

// ── Helpers ───────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

function toMonthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── Expenses ──────────────────────────────────────────────────

export async function addExpense(
  price: number,
  category: string,
  note: string | null,
): Promise<void> {
  const db = await getDb();
  const createdAt = nowIso();
  await db.runAsync(
    'INSERT INTO expenses (price, category, note, createdAt, monthKey) VALUES (?, ?, ?, ?, ?)',
    [price, category, note ?? null, createdAt, toMonthKey(createdAt)],
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
): Promise<void> {
  const db = await getDb();
  const createdAt = nowIso();
  await db.runAsync(
    'INSERT INTO incomes (amount, note, createdAt, monthKey) VALUES (?, ?, ?, ?)',
    [amount, note ?? null, createdAt, toMonthKey(createdAt)],
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

  // Get all months that appear in either table
  const months = await db.getAllAsync<{ monthKey: string }>(
    `SELECT DISTINCT monthKey FROM expenses
     UNION
     SELECT DISTINCT monthKey FROM incomes
     ORDER BY monthKey DESC`,
  );

  const summaries: MonthSummary[] = await Promise.all(
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

  return summaries;
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
    salary: parseFloat(map['salary'] ?? '0'),
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
