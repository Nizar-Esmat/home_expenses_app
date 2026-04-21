import * as SQLite from 'expo-sqlite';
import { DEFAULT_CATEGORY_COLORS } from '@/services/constants';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
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
      monthKey  TEXT    NOT NULL,
      accountId INTEGER
    );

    CREATE TABLE IF NOT EXISTS incomes (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      amount    REAL    NOT NULL,
      category  TEXT    NOT NULL,
      note      TEXT,
      createdAt TEXT    NOT NULL,
      monthKey  TEXT    NOT NULL,
      accountId INTEGER
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

    CREATE TABLE IF NOT EXISTS income_categories (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT    NOT NULL UNIQUE,
      emoji     TEXT    NOT NULL DEFAULT '💰',
      color     TEXT    NOT NULL DEFAULT '#10B981',
      isDefault INTEGER NOT NULL DEFAULT 0,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sub_expenses (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      expenseId INTEGER NOT NULL,
      title     TEXT    NOT NULL,
      amount    REAL    NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT    NOT NULL UNIQUE,
      type           TEXT    NOT NULL DEFAULT 'cash',
      openingBalance REAL    NOT NULL DEFAULT 0,
      currentBalance REAL    NOT NULL DEFAULT 0,
      icon           TEXT,
      color          TEXT,
      isDefault      INTEGER NOT NULL DEFAULT 0,
      isPrimary      INTEGER NOT NULL DEFAULT 0,
      isArchived     INTEGER NOT NULL DEFAULT 0,
      createdAt      TEXT    NOT NULL,
      updatedAt      TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      fromAccountId INTEGER NOT NULL,
      toAccountId   INTEGER NOT NULL,
      amount        REAL    NOT NULL,
      note          TEXT,
      createdAt     TEXT    NOT NULL,
      monthKey      TEXT    NOT NULL
    );
  `);

  await seedCategories(db);
  await seedIncomeCategories(db);
  await runMigrations(db);
}

// ── Migrations ────────────────────────────────────────────────

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = versionRow?.user_version ?? 0;

  if (version < 1) {
    await migrateV1(db);
  }
  if (version < 2) {
    await migrateV2(db);
  }
}

async function migrateV1(db: SQLite.SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();

  await db.withExclusiveTransactionAsync(async () => {
    // Add accountId to expenses if column is missing (existing installs)
    const expCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(expenses)');
    if (!expCols.some((c) => c.name === 'accountId')) {
      await db.runAsync('ALTER TABLE expenses ADD COLUMN accountId INTEGER');
    }

    // Add accountId to incomes if column is missing (existing installs)
    const incCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(incomes)');
    if (!incCols.some((c) => c.name === 'accountId')) {
      await db.runAsync('ALTER TABLE incomes ADD COLUMN accountId INTEGER');
    }

    // Create default Cash account if it doesn't exist
    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM accounts WHERE name = 'Cash'",
    );
    let cashId: number;

    if (existing) {
      cashId = existing.id;
    } else {
      const result = await db.runAsync(
        'INSERT INTO accounts (name, type, openingBalance, currentBalance, icon, color, isDefault, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['Cash', 'cash', 0, 0, '💵', '#10B981', 1, 0, now, now],
      );
      cashId = result.lastInsertRowId;
    }

    // Assign all unlinked expenses/incomes to Cash
    await db.runAsync('UPDATE expenses SET accountId = ? WHERE accountId IS NULL', [cashId]);
    await db.runAsync('UPDATE incomes SET accountId = ? WHERE accountId IS NULL', [cashId]);

    // Recalculate Cash account balance from actual data
    const balRow = await db.getFirstAsync<{ balance: number }>(
      `SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE accountId = ?) -
        (SELECT COALESCE(SUM(price),  0) FROM expenses WHERE accountId = ?) +
        (SELECT COALESCE(SUM(amount), 0) FROM transfers WHERE toAccountId = ?) -
        (SELECT COALESCE(SUM(amount), 0) FROM transfers WHERE fromAccountId = ?)
       AS balance`,
      [cashId, cashId, cashId, cashId],
    );
    await db.runAsync('UPDATE accounts SET currentBalance = ? WHERE id = ?', [
      balRow?.balance ?? 0,
      cashId,
    ]);
  });

  await db.runAsync('PRAGMA user_version = 1');
}

async function migrateV2(db: SQLite.SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(accounts)');
  if (!cols.some((c) => c.name === 'isPrimary')) {
    await db.runAsync('ALTER TABLE accounts ADD COLUMN isPrimary INTEGER NOT NULL DEFAULT 0');
  }
  await db.runAsync('PRAGMA user_version = 2');
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
  if (count && count.n > 0) return;

  const now = new Date().toISOString();

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

const INCOME_BUILT_IN: { name: string; emoji: string; sortOrder: number }[] = [
  { name: 'Salary',     emoji: '💼', sortOrder: 0 },
  { name: 'Freelance',  emoji: '💻', sortOrder: 1 },
  { name: 'Gift',       emoji: '🎁', sortOrder: 2 },
  { name: 'Investment', emoji: '📈', sortOrder: 3 },
  { name: 'Other',      emoji: '💰', sortOrder: 4 },
];

const DEFAULT_INCOME_COLORS: Record<string, string> = {
  Salary:     '#10B981',
  Freelance:  '#3B82F6',
  Gift:       '#A855F7',
  Investment: '#F59E0B',
  Other:      '#6B7280',
};

async function seedIncomeCategories(db: SQLite.SQLiteDatabase): Promise<void> {
  const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM income_categories');
  if (count && count.n > 0) return;

  const now = new Date().toISOString();

  for (const cat of INCOME_BUILT_IN) {
    await db.runAsync(
      'INSERT OR IGNORE INTO income_categories (name, emoji, color, isDefault, sortOrder, createdAt) VALUES (?,?,?,1,?,?)',
      [cat.name, cat.emoji, DEFAULT_INCOME_COLORS[cat.name] ?? '#10B981', cat.sortOrder, now],
    );
  }
}
