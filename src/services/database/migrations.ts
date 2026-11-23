import * as SQLite from 'expo-sqlite';
import { generateUuidV7 } from './uuid';

export const SCHEMA_VERSION = 6;

export interface MigrationStep {
  version: number;
  description: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

/**
 * Registry of incremental, non-destructive schema migrations.
 * Each entry transitions the database from (version - 1) to version.
 */
export const MIGRATIONS: MigrationStep[] = [
  {
    version: 3,
    description: 'Ensure baseline unified transactions schema',
    up: async (db) => {
      // Legacy migration check: if legacy 'expenses' table exists from early versions,
      // migrate its records into the unified 'transactions' table instead of dropping.
      const legacyTable = await db.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='expenses'",
      );
      if (legacyTable) {
        await db.execAsync(`
          INSERT INTO transactions (accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt)
          SELECT
            COALESCE(e.accountId, (SELECT id FROM accounts ORDER BY id ASC LIMIT 1)),
            COALESCE((SELECT c.id FROM categories c WHERE LOWER(c.name) = LOWER(e.category) AND c.type = 'EXPENSE' LIMIT 1), 1),
            'EXPENSE',
            ROUND(e.price * 100),
            'EGP',
            e.category,
            e.note,
            e.createdAt,
            e.createdAt,
            e.createdAt
          FROM expenses e;
        `);
      }
    },
  },
  {
    version: 4,
    description: 'Add loans and loan_repayments tables with indexes',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS loans (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          type             TEXT    NOT NULL CHECK(type IN ('BORROWED','LENT')),
          contactName      TEXT    NOT NULL,
          amountMinor      INTEGER NOT NULL,
          currencyCode     TEXT    NOT NULL DEFAULT 'EGP',
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
      `);
    },
  },
  {
    version: 5,
    description: 'Add time-sortable UUIDv7 columns and unique indexes to financial entities',
    up: async (db) => {
      // 1. Accounts
      if (await tableExists(db, 'accounts')) {
        const hasUuid = await columnExists(db, 'accounts', 'uuid');
        if (!hasUuid) {
          await db.execAsync('ALTER TABLE accounts ADD COLUMN uuid TEXT;');
        }
        const accounts = await db.getAllAsync<{ id: number }>('SELECT id FROM accounts WHERE uuid IS NULL');
        for (const acc of accounts) {
          await db.runAsync('UPDATE accounts SET uuid = ? WHERE id = ?', [generateUuidV7(), acc.id]);
        }
        await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_uuid ON accounts(uuid);');
      }

      // 2. Transactions
      if (await tableExists(db, 'transactions')) {
        const hasUuid = await columnExists(db, 'transactions', 'uuid');
        if (!hasUuid) {
          await db.execAsync('ALTER TABLE transactions ADD COLUMN uuid TEXT;');
        }
        const txs = await db.getAllAsync<{ id: number }>('SELECT id FROM transactions WHERE uuid IS NULL');
        for (const tx of txs) {
          await db.runAsync('UPDATE transactions SET uuid = ? WHERE id = ?', [generateUuidV7(), tx.id]);
        }
        await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_uuid ON transactions(uuid);');
      }

      // 3. Transfers
      if (await tableExists(db, 'transfers')) {
        const hasUuid = await columnExists(db, 'transfers', 'uuid');
        if (!hasUuid) {
          await db.execAsync('ALTER TABLE transfers ADD COLUMN uuid TEXT;');
        }
        const trs = await db.getAllAsync<{ id: number }>('SELECT id FROM transfers WHERE uuid IS NULL');
        for (const tr of trs) {
          await db.runAsync('UPDATE transfers SET uuid = ? WHERE id = ?', [generateUuidV7(), tr.id]);
        }
        await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_uuid ON transfers(uuid);');
      }

      // 4. Loans
      if (await tableExists(db, 'loans')) {
        const hasUuid = await columnExists(db, 'loans', 'uuid');
        if (!hasUuid) {
          await db.execAsync('ALTER TABLE loans ADD COLUMN uuid TEXT;');
        }
        const loans = await db.getAllAsync<{ id: number }>('SELECT id FROM loans WHERE uuid IS NULL');
        for (const l of loans) {
          await db.runAsync('UPDATE loans SET uuid = ? WHERE id = ?', [generateUuidV7(), l.id]);
        }
        await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_loans_uuid ON loans(uuid);');
      }
    },
  },
  {
    version: 6,
    description: 'Create unified cash flow view and validation triggers',
    up: async (db) => {
      // 1. Create unified cash movements View
      await db.execAsync(`
        DROP VIEW IF EXISTS v_cash_movements;
        CREATE VIEW v_cash_movements AS
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

      // 2. Validation triggers for strict domain invariant enforcement on existing tables
      await db.execAsync(`
        CREATE TRIGGER IF NOT EXISTS trg_val_accounts_type
        BEFORE INSERT ON accounts
        WHEN NEW.type NOT IN ('CASH', 'BANK', 'EWALLET')
        BEGIN
          SELECT RAISE(ABORT, 'Invalid account type: must be CASH, BANK, or EWALLET');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_val_transactions_type
        BEFORE INSERT ON transactions
        WHEN NEW.type NOT IN ('EXPENSE', 'INCOME')
        BEGIN
          SELECT RAISE(ABORT, 'Invalid transaction type: must be EXPENSE or INCOME');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_val_transfers_same_account
        BEFORE INSERT ON transfers
        WHEN NEW.fromAccountId = NEW.toAccountId
        BEGIN
          SELECT RAISE(ABORT, 'Transfer source and target accounts cannot be identical');
        END;
      `);
    },
  },
];

async function columnExists(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName});`);
  return tableInfo.some((col) => col.name === columnName);
}

async function tableExists(db: SQLite.SQLiteDatabase, tableName: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    [tableName],
  );
  return Boolean(row?.name);
}

/**
 * Runs incremental, non-destructive migrations.
 * Never drops user financial tables.
 */
export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = versionRow?.user_version ?? 0;

  // If user_version is 0, check if this is a fresh install or an existing database
  if (currentVersion === 0) {
    const hasTransactions = await tableExists(db, 'transactions');
    if (!hasTransactions) {
      // Completely fresh database: createSchema will build all tables directly.
      return;
    }

    // Existing database created before PRAGMA user_version was persisted
    const hasLoans = await tableExists(db, 'loans');
    if (hasLoans) {
      currentVersion = 4;
      await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
      return;
    } else {
      currentVersion = 3;
      await db.execAsync('PRAGMA user_version = 3;');
    }
  }

  // Sequentially apply missing migrations
  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion && migration.version <= SCHEMA_VERSION) {
      await db.withExclusiveTransactionAsync(async () => {
        await migration.up(db);
        await db.execAsync(`PRAGMA user_version = ${migration.version};`);
      });
      currentVersion = migration.version;
    }
  }

  // Safety check: log any foreign key integrity violations without crashing
  try {
    const fkIssues = await db.getAllAsync<{ table: string; rowid: number; parent: string; fkid: number }>(
      'PRAGMA foreign_key_check;',
    );
    if (fkIssues && fkIssues.length > 0) {
      console.warn('[Database] PRAGMA foreign_key_check reported integrity issues:', fkIssues);
    }
  } catch (err) {
    console.warn('[Database] Could not run foreign_key_check:', err);
  }
}
