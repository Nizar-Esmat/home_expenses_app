import * as SQLite from 'expo-sqlite';
import { DEFAULT_CATEGORY_COLORS } from '@/services/constants';
import { nowIso } from './helpers';

const SCHEMA_VERSION = 3;
const DEFAULT_CURRENCY = 'EGP';

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
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await runMigrations(db);
  await createSchema(db);
  await seedCategories(db);
  await seedIncomeCategories(db);
  await seedDefaultAccount(db);
  await db.runAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

async function createSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      name                TEXT    NOT NULL UNIQUE,
      type                TEXT    NOT NULL,
      currencyCode        TEXT    NOT NULL DEFAULT '${DEFAULT_CURRENCY}',
      openingBalanceMinor INTEGER NOT NULL DEFAULT 0,
      currentBalanceMinor INTEGER NOT NULL DEFAULT 0,
      icon                TEXT,
      color               TEXT,
      isPrimary           INTEGER NOT NULL DEFAULT 0,
      isArchived          INTEGER NOT NULL DEFAULT 0,
      createdAt           TEXT    NOT NULL,
      updatedAt           TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
    CREATE INDEX IF NOT EXISTS idx_accounts_isArchived ON accounts(isArchived);

    CREATE TABLE IF NOT EXISTS categories (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT    NOT NULL,
      type      TEXT    NOT NULL,
      icon      TEXT,
      color     TEXT,
      isDefault INTEGER NOT NULL DEFAULT 0,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT    NOT NULL,
      updatedAt TEXT,
      UNIQUE(type, name)
    );

    CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);

    CREATE TABLE IF NOT EXISTS transactions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      accountId       INTEGER NOT NULL,
      categoryId      INTEGER NOT NULL,
      type            TEXT    NOT NULL,
      amountMinor     INTEGER NOT NULL,
      currencyCode    TEXT    NOT NULL DEFAULT '${DEFAULT_CURRENCY}',
      title           TEXT,
      note            TEXT,
      transactionDate TEXT    NOT NULL,
      createdAt       TEXT    NOT NULL,
      updatedAt       TEXT,
      deletedAt       TEXT,
      FOREIGN KEY(accountId) REFERENCES accounts(id),
      FOREIGN KEY(categoryId) REFERENCES categories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(accountId, transactionDate);
    CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(categoryId, transactionDate);
    CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, transactionDate);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transactionDate);

    CREATE TABLE IF NOT EXISTS transaction_items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      transactionId INTEGER NOT NULL,
      categoryId    INTEGER,
      name          TEXT    NOT NULL,
      amountMinor   INTEGER NOT NULL,
      quantity      REAL,
      note          TEXT,
      sortOrder     INTEGER NOT NULL DEFAULT 0,
      createdAt     TEXT    NOT NULL,
      updatedAt     TEXT,
      FOREIGN KEY(transactionId) REFERENCES transactions(id),
      FOREIGN KEY(categoryId) REFERENCES categories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction ON transaction_items(transactionId);
    CREATE INDEX IF NOT EXISTS idx_transaction_items_category ON transaction_items(categoryId);

    CREATE TABLE IF NOT EXISTS transfers (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      fromAccountId  INTEGER NOT NULL,
      toAccountId    INTEGER NOT NULL,
      amountMinor    INTEGER NOT NULL,
      currencyCode   TEXT    NOT NULL DEFAULT '${DEFAULT_CURRENCY}',
      feeAmountMinor INTEGER NOT NULL DEFAULT 0,
      feeAccountId   INTEGER,
      note           TEXT,
      transferDate   TEXT    NOT NULL,
      createdAt      TEXT    NOT NULL,
      updatedAt      TEXT,
      deletedAt      TEXT,
      FOREIGN KEY(fromAccountId) REFERENCES accounts(id),
      FOREIGN KEY(toAccountId) REFERENCES accounts(id),
      FOREIGN KEY(feeAccountId) REFERENCES accounts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transfers_from_date ON transfers(fromAccountId, transferDate);
    CREATE INDEX IF NOT EXISTS idx_transfers_to_date ON transfers(toAccountId, transferDate);
    CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(transferDate);
  `);
}

// ── Migrations ────────────────────────────────────────────────

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = versionRow?.user_version ?? 0;

  if (version < SCHEMA_VERSION) {
    await freshResetFinancialSchema(db);
  }
}

async function freshResetFinancialSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    DROP TABLE IF EXISTS transaction_items;
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS transfers;
    DROP TABLE IF EXISTS income_categories;
    DROP TABLE IF EXISTS sub_expenses;
    DROP TABLE IF EXISTS expenses;
    DROP TABLE IF EXISTS incomes;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS accounts;
  `);
}

// ── Seed data ─────────────────────────────────────────────────

const BUILT_IN: { name: string; emoji: string; sortOrder: number }[] = [
  { name: 'Food', emoji: '🍔', sortOrder: 0 },
  { name: 'Bills', emoji: '💡', sortOrder: 1 },
  { name: 'Transport', emoji: '🚗', sortOrder: 2 },
  { name: 'Shopping', emoji: '🛍️', sortOrder: 3 },
  { name: 'Home', emoji: '🏠', sortOrder: 4 },
  { name: 'Other', emoji: '📦', sortOrder: 5 },
];

async function seedCategories(db: SQLite.SQLiteDatabase): Promise<void> {
  const count = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM categories WHERE type = 'EXPENSE'",
  );
  if (count && count.n > 0) return;

  const now = nowIso();
  for (const cat of BUILT_IN) {
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (name, type, icon, color, isDefault, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, ?, ?, ?)',
      [
        cat.name,
        'EXPENSE',
        cat.emoji,
        DEFAULT_CATEGORY_COLORS[cat.name] ?? '#408A71',
        cat.sortOrder,
        now,
        now,
      ],
    );
  }
}

const INCOME_BUILT_IN: { name: string; emoji: string; sortOrder: number }[] = [
  { name: 'Salary', emoji: '💼', sortOrder: 0 },
  { name: 'Freelance', emoji: '💻', sortOrder: 1 },
  { name: 'Gift', emoji: '🎁', sortOrder: 2 },
  { name: 'Investment', emoji: '📈', sortOrder: 3 },
  { name: 'Other', emoji: '💰', sortOrder: 4 },
];

const DEFAULT_INCOME_COLORS: Record<string, string> = {
  Salary: '#10B981',
  Freelance: '#3B82F6',
  Gift: '#A855F7',
  Investment: '#F59E0B',
  Other: '#6B7280',
};

async function seedIncomeCategories(db: SQLite.SQLiteDatabase): Promise<void> {
  const count = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM categories WHERE type = 'INCOME'",
  );
  if (count && count.n > 0) return;

  const now = nowIso();
  for (const cat of INCOME_BUILT_IN) {
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (name, type, icon, color, isDefault, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, ?, ?, ?)',
      [
        cat.name,
        'INCOME',
        cat.emoji,
        DEFAULT_INCOME_COLORS[cat.name] ?? '#10B981',
        cat.sortOrder,
        now,
        now,
      ],
    );
  }
}

async function seedDefaultAccount(db: SQLite.SQLiteDatabase): Promise<void> {
  const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM accounts');
  if (count && count.n > 0) return;

  const now = nowIso();
  await db.runAsync(
    `INSERT INTO accounts
       (name, type, currencyCode, openingBalanceMinor, currentBalanceMinor, icon, color, isPrimary, isArchived, createdAt, updatedAt)
     VALUES (?, ?, ?, 0, 0, ?, ?, 0, 0, ?, ?)`,
    ['Cash', 'CASH', DEFAULT_CURRENCY, '💵', '#10B981', now, now],
  );
}
