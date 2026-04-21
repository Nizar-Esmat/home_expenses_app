import { Account, AccountType } from "@/types";
import { getDb } from "./client";
import { nowIso } from "./helpers";

// ── Internal helpers ──────────────────────────────────────────

/** Adjust an account's currentBalance by delta (positive = add, negative = subtract). */
export async function adjustAccountBalance(
  accountId: number,
  delta: number,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE accounts SET currentBalance = currentBalance + ?, updatedAt = ? WHERE id = ?",
    [delta, nowIso(), accountId],
  );
}

// ── Account queries ───────────────────────────────────────────

export async function getAccounts(): Promise<Account[]> {
  const db = await getDb();
  return db.getAllAsync<Account>(
    "SELECT * FROM accounts ORDER BY isDefault DESC, createdAt ASC",
  );
}

export async function getActiveAccounts(): Promise<Account[]> {
  const db = await getDb();
  return db.getAllAsync<Account>(
    "SELECT * FROM accounts WHERE isArchived = 0 ORDER BY isDefault DESC, createdAt ASC",
  );
}

export async function getAccountById(id: number): Promise<Account | null> {
  const db = await getDb();
  return db.getFirstAsync<Account>("SELECT * FROM accounts WHERE id = ?", [id]);
}

export async function getDefaultAccount(): Promise<Account | null> {
  const db = await getDb();
  return db.getFirstAsync<Account>(
    "SELECT * FROM accounts WHERE isDefault = 1 AND isArchived = 0 LIMIT 1",
  );
}

// ── Account CRUD ──────────────────────────────────────────────

export interface AddAccountInput {
  name: string;
  type: AccountType;
  openingBalance: number;
  icon?: string | null;
  color?: string | null;
  isDefault?: number;
}

export async function addAccount(input: AddAccountInput): Promise<number> {
  const db = await getDb();
  const now = nowIso();
  const result = await db.runAsync(
    `INSERT INTO accounts
       (name, type, openingBalance, currentBalance, icon, color, isDefault, isArchived, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      input.name.trim(),
      input.type,
      input.openingBalance,
      input.openingBalance, // currentBalance starts equal to openingBalance
      input.icon ?? null,
      input.color ?? null,
      input.isDefault ?? 0,
      now,
      now,
    ],
  );
  return result.lastInsertRowId;
}

export interface UpdateAccountInput {
  name: string;
  type: AccountType;
  openingBalance: number;
  icon?: string | null;
  color?: string | null;
}

export async function updateAccount(
  id: number,
  input: UpdateAccountInput,
): Promise<void> {
  const db = await getDb();

  // Recalculate currentBalance based on new openingBalance + same transaction deltas
  const txRow = await db.getFirstAsync<{ txDelta: number }>(
    `SELECT
       (SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE accountId = ?) -
       (SELECT COALESCE(SUM(price),  0) FROM expenses WHERE accountId = ?) +
       (SELECT COALESCE(SUM(amount), 0) FROM transfers WHERE toAccountId = ?) -
       (SELECT COALESCE(SUM(amount), 0) FROM transfers WHERE fromAccountId = ?)
     AS txDelta`,
    [id, id, id, id],
  );
  const newCurrentBalance = input.openingBalance + (txRow?.txDelta ?? 0);

  await db.runAsync(
    `UPDATE accounts
     SET name = ?, type = ?, openingBalance = ?, currentBalance = ?, icon = ?, color = ?, updatedAt = ?
     WHERE id = ?`,
    [
      input.name.trim(),
      input.type,
      input.openingBalance,
      newCurrentBalance,
      input.icon ?? null,
      input.color ?? null,
      nowIso(),
      id,
    ],
  );
}

export async function archiveAccount(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE accounts SET isArchived = 1, updatedAt = ? WHERE id = ?",
    [nowIso(), id],
  );
}

export async function unarchiveAccount(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE accounts SET isArchived = 0, updatedAt = ? WHERE id = ?",
    [nowIso(), id],
  );
}

/** Returns true if the account has no transactions and is not the default. Safe to delete. */
export async function canDeleteAccount(id: number): Promise<boolean> {
  const db = await getDb();
  const account = await db.getFirstAsync<{ isDefault: number }>(
    "SELECT isDefault FROM accounts WHERE id = ?",
    [id],
  );
  if (!account || account.isDefault === 1) return false;

  const expRow = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM expenses WHERE accountId = ?",
    [id],
  );
  const incRow = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM incomes WHERE accountId = ?",
    [id],
  );
  const trRow = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM transfers WHERE fromAccountId = ? OR toAccountId = ?",
    [id, id],
  );
  return (
    (expRow?.n ?? 1) === 0 && (incRow?.n ?? 1) === 0 && (trRow?.n ?? 1) === 0
  );
}

// ── Balance helpers ───────────────────────────────────────────

/**
 * Recalculates currentBalance for all accounts from scratch based on
 * openingBalance + all linked transactions. Safe to call any time.
 */
export async function recalculateAccountBalances(): Promise<void> {
  const db = await getDb();
  const accounts = await db.getAllAsync<{ id: number; openingBalance: number }>(
    "SELECT id, openingBalance FROM accounts",
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
    const newBalance = acc.openingBalance + (txRow?.txDelta ?? 0);
    await db.runAsync(
      "UPDATE accounts SET currentBalance = ?, updatedAt = ? WHERE id = ?",
      [newBalance, now, acc.id],
    );
  }
}
