import * as SQLite from 'expo-sqlite';
import { DEFAULT_CATEGORY_COLORS } from '@/services/constants';
import { nowIso } from './helpers';
import { populateSampleData } from './seedSampleData';
import { runMigrations, SCHEMA_VERSION } from './migrations';

const DEFAULT_CURRENCY = 'EGP';

let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) {
    return _db;
  }
  if (!_initPromise) {
    _initPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('budgetbuddy.db');
      await initDb(db);
      _db = db;
      return db;
    })().catch((err) => {
      _initPromise = null;
      _db = null;
      throw err;
    });
  }
  return _initPromise;
}

// ── Schema ────────────────────────────────────────────────────

async function initDb(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
  await runMigrations(db);
  await createSchema(db);
  await seedCategories(db);
  await seedIncomeCategories(db);
  await seedDefaultAccount(db);

  const sampleSeeded = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'hasSeededSampleData'",
  );
  if (!sampleSeeded) {
    const txCount = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM transactions');
    if (!txCount || txCount.n === 0) {
      await populateSampleData(db);
    }
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('hasSeededSampleData', '1')",
    );
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}

async function createSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid                TEXT    UNIQUE,
      name                TEXT    NOT NULL UNIQUE,
      type                TEXT    NOT NULL CHECK(type IN ('CASH', 'BANK', 'EWALLET')),
      currencyCode        TEXT    NOT NULL DEFAULT '${DEFAULT_CURRENCY}',
      openingBalanceMinor INTEGER NOT NULL DEFAULT 0,
      currentBalanceMinor INTEGER NOT NULL DEFAULT 0,
      icon                TEXT,
      color               TEXT,
      isPrimary           INTEGER NOT NULL DEFAULT 0 CHECK(isPrimary IN (0, 1)),
      isArchived          INTEGER NOT NULL DEFAULT 0 CHECK(isArchived IN (0, 1)),
      createdAt           TEXT    NOT NULL,
      updatedAt           TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
    CREATE INDEX IF NOT EXISTS idx_accounts_isArchived ON accounts(isArchived);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_uuid ON accounts(uuid);

    CREATE TABLE IF NOT EXISTS categories (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT    NOT NULL,
      type      TEXT    NOT NULL CHECK(type IN ('EXPENSE', 'INCOME')),
      icon      TEXT,
      color     TEXT,
      isDefault INTEGER NOT NULL DEFAULT 0 CHECK(isDefault IN (0, 1)),
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT    NOT NULL,
      updatedAt TEXT,
      UNIQUE(type, name)
    );

    CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);

    CREATE TABLE IF NOT EXISTS transactions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid            TEXT    UNIQUE,
      accountId       INTEGER NOT NULL,
      categoryId      INTEGER NOT NULL,
      type            TEXT    NOT NULL CHECK(type IN ('EXPENSE', 'INCOME')),
      amountMinor     INTEGER NOT NULL CHECK(amountMinor >= 0),
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
    CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_uuid ON transactions(uuid);

    CREATE TABLE IF NOT EXISTS transaction_items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      transactionId INTEGER NOT NULL,
      categoryId    INTEGER,
      name          TEXT    NOT NULL,
      amountMinor   INTEGER NOT NULL CHECK(amountMinor >= 0),
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
      uuid           TEXT    UNIQUE,
      fromAccountId  INTEGER NOT NULL,
      toAccountId    INTEGER NOT NULL,
      amountMinor    INTEGER NOT NULL CHECK(amountMinor > 0),
      currencyCode   TEXT    NOT NULL DEFAULT '${DEFAULT_CURRENCY}',
      feeAmountMinor INTEGER NOT NULL DEFAULT 0 CHECK(feeAmountMinor >= 0),
      feeAccountId   INTEGER,
      note           TEXT,
      transferDate   TEXT    NOT NULL,
      createdAt      TEXT    NOT NULL,
      updatedAt      TEXT,
      deletedAt      TEXT,
      CHECK(fromAccountId != toAccountId),
      FOREIGN KEY(fromAccountId) REFERENCES accounts(id),
      FOREIGN KEY(toAccountId) REFERENCES accounts(id),
      FOREIGN KEY(feeAccountId) REFERENCES accounts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transfers_from_date ON transfers(fromAccountId, transferDate);
    CREATE INDEX IF NOT EXISTS idx_transfers_to_date ON transfers(toAccountId, transferDate);
    CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(transferDate);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_uuid ON transfers(uuid);

    CREATE TABLE IF NOT EXISTS loans (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid             TEXT    UNIQUE,
      type             TEXT    NOT NULL CHECK(type IN ('BORROWED','LENT')),
      contactName      TEXT    NOT NULL,
      amountMinor      INTEGER NOT NULL,
      currencyCode     TEXT    NOT NULL DEFAULT '${DEFAULT_CURRENCY}',
      accountId        INTEGER NOT NULL,
      note             TEXT,
      loanDate         TEXT    NOT NULL,
      paidAmountMinor  INTEGER NOT NULL DEFAULT 0,
      status           TEXT    NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PARTIAL','SETTLED')),
      createdAt        TEXT    NOT NULL,
      updatedAt        TEXT,
      deletedAt        TEXT,
      FOREIGN KEY(accountId) REFERENCES accounts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
    CREATE INDEX IF NOT EXISTS idx_loans_date ON loans(loanDate);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_loans_uuid ON loans(uuid);

    CREATE TABLE IF NOT EXISTS loan_repayments (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      loanId         INTEGER NOT NULL,
      amountMinor    INTEGER NOT NULL,
      accountId      INTEGER NOT NULL,
      note           TEXT,
      repaymentDate  TEXT    NOT NULL,
      createdAt      TEXT    NOT NULL,
      deletedAt      TEXT,
      FOREIGN KEY(loanId) REFERENCES loans(id),
      FOREIGN KEY(accountId) REFERENCES accounts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan ON loan_repayments(loanId);

    CREATE VIEW IF NOT EXISTS v_cash_movements AS
    SELECT
      'EXPENSE' AS movementType,
      t.id AS entityId,
      t.uuid AS entityUuid,
      t.accountId,
      NULL AS targetAccountId,
      -t.amountMinor AS netDeltaMinor,
      t.amountMinor / 100.0 AS amount,
      0.0 AS feeAmount,
      c.name AS categoryName,
      c.icon AS categoryEmoji,
      t.note,
      t.transactionDate AS eventDate,
      t.createdAt,
      t.deletedAt
    FROM transactions t
    JOIN categories c ON c.id = t.categoryId
    WHERE t.type = 'EXPENSE'

    UNION ALL

    SELECT
      'INCOME' AS movementType,
      t.id AS entityId,
      t.uuid AS entityUuid,
      t.accountId,
      NULL AS targetAccountId,
      t.amountMinor AS netDeltaMinor,
      t.amountMinor / 100.0 AS amount,
      0.0 AS feeAmount,
      c.name AS categoryName,
      c.icon AS categoryEmoji,
      t.note,
      t.transactionDate AS eventDate,
      t.createdAt,
      t.deletedAt
    FROM transactions t
    JOIN categories c ON c.id = t.categoryId
    WHERE t.type = 'INCOME'

    UNION ALL

    SELECT
      'TRANSFER' AS movementType,
      tr.id AS entityId,
      tr.uuid AS entityUuid,
      tr.fromAccountId AS accountId,
      tr.toAccountId AS targetAccountId,
      -tr.amountMinor AS netDeltaMinor,
      tr.amountMinor / 100.0 AS amount,
      tr.feeAmountMinor / 100.0 AS feeAmount,
      'Transfer' AS categoryName,
      '🔄' AS categoryEmoji,
      tr.note,
      tr.transferDate AS eventDate,
      tr.createdAt,
      tr.deletedAt
    FROM transfers tr;
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
  { name: 'Starting Balance', emoji: '🏁', sortOrder: 5 },
];

const DEFAULT_INCOME_COLORS: Record<string, string> = {
  Salary: '#10B981',
  Freelance: '#3B82F6',
  Gift: '#A855F7',
  Investment: '#F59E0B',
  Other: '#6B7280',
  'Starting Balance': '#059669',
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
  const res = await db.runAsync(
    `INSERT INTO accounts
       (name, type, currencyCode, openingBalanceMinor, currentBalanceMinor, icon, color, isPrimary, isArchived, createdAt, updatedAt)
     VALUES (?, ?, ?, 0, 0, ?, ?, 0, 0, ?, ?)`,
    ['Cash', 'CASH', DEFAULT_CURRENCY, '💵', '#10B981', now, now],
  );

  await db.runAsync(
    "INSERT OR IGNORE INTO settings (key, value) VALUES ('homeAccountIds', ?)",
    [JSON.stringify([res.lastInsertRowId])],
  );
}
