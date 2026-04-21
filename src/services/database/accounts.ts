import { Account, AccountType } from "@/types";
import { getDb } from "./client";
import { nowIso } from "./helpers";

// ── Balance recalculation ─────────────────────────────────────

const DELTA_SQL = `
  SELECT
    (SELECT COALESCE(SUM(amount), 0) FROM incomes    WHERE accountId      = ?) -
    (SELECT COALESCE(SUM(price),  0) FROM expenses   WHERE accountId      = ?) +
    (SELECT COALESCE(SUM(amount), 0) FROM transfers  WHERE toAccountId    = ?) -
    (SELECT COALESCE(SUM(amount), 0) FROM transfers  WHERE fromAccountId  = ?)
  AS txDelta
`;

/**
 * Recalculate currentBalance for a single account from scratch.
 * Safe to call at any time — no side effects beyond updating currentBalance.
 */
export async function recalculateBalance(accountId: number): Promise<void> {
  const db = await getDb();
  const acc = await db.getFirstAsync<{ openingBalance: number }>(
    "SELECT openingBalance FROM accounts WHERE id = ?",
    [accountId],
  );
  if (!acc) return;
  const txRow = await db.getFirstAsync<{ txDelta: number }>(DELTA_SQL, [
    accountId, accountId, accountId, accountId,
  ]);
  const newBalance = acc.openingBalance + (txRow?.txDelta ?? 0);
  await db.runAsync(
    "UPDATE accounts SET currentBalance = ?, updatedAt = ? WHERE id = ?",
    [newBalance, nowIso(), accountId],
  );
}

/** @deprecated – call recalculateBalance() instead */
export async function adjustAccountBalance(accountId: number, _delta: number): Promise<void> {
  await recalculateBalance(accountId);
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

export async function getFavoriteBankAccount(): Promise<Account | null> {
  const db = await getDb();
  return db.getFirstAsync<Account>(
    "SELECT * FROM accounts WHERE isPrimary = 1 AND isArchived = 0 LIMIT 1",
  );
}

/** Set id as the favorite bank account (clears any previous primary). Pass null to unset all. */
export async function setFavoriteBankAccount(id: number | null): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync('UPDATE accounts SET isPrimary = 0, updatedAt = ? WHERE isPrimary = 1', [now]);
    if (id !== null) {
      await db.runAsync('UPDATE accounts SET isPrimary = 1, updatedAt = ? WHERE id = ?', [now, id]);
    }
  });
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
  /**
   * The CURRENT BALANCE the user wants to set (e.g. what is shown on the edit screen).
   * The function derives the implied openingBalance by subtracting the net transaction delta.
   */
  currentBalance: number;
  icon?: string | null;
  color?: string | null;
}

export async function updateAccount(
  id: number,
  input: UpdateAccountInput,
): Promise<void> {
  const db = await getDb();

  // Compute net transaction delta so we can derive the implied opening balance
  const txRow = await db.getFirstAsync<{ txDelta: number }>(DELTA_SQL, [
    id, id, id, id,
  ]);
  const txDelta = txRow?.txDelta ?? 0;
  // openingBalance is back-calculated so that: currentBalance = openingBalance + txDelta
  const newOpeningBalance = input.currentBalance - txDelta;

  await db.runAsync(
    `UPDATE accounts
     SET name = ?, type = ?, openingBalance = ?, currentBalance = ?, icon = ?, color = ?, updatedAt = ?
     WHERE id = ?`,
    [
      input.name.trim(),
      input.type,
      newOpeningBalance,
      input.currentBalance,
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

export type CanDeleteReason = 'default' | 'has_expenses' | 'has_incomes' | 'has_transfers';

/** Returns whether the account can be safely deleted, and why not if it cannot. */
export async function canDeleteAccount(id: number): Promise<{ ok: boolean; reason?: CanDeleteReason }> {
  const db = await getDb();
  const account = await db.getFirstAsync<{ isDefault: number }>(
    "SELECT isDefault FROM accounts WHERE id = ?",
    [id],
  );
  if (!account) return { ok: false };
  if (account.isDefault === 1) return { ok: false, reason: 'default' };

  const expRow = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM expenses WHERE accountId = ?",
    [id],
  );
  if ((expRow?.n ?? 1) > 0) return { ok: false, reason: 'has_expenses' };

  const incRow = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM incomes WHERE accountId = ?",
    [id],
  );
  if ((incRow?.n ?? 1) > 0) return { ok: false, reason: 'has_incomes' };

  const trRow = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM transfers WHERE fromAccountId = ? OR toAccountId = ?",
    [id, id],
  );
  if ((trRow?.n ?? 1) > 0) return { ok: false, reason: 'has_transfers' };

  return { ok: true };
}

// ── Balance helpers ───────────────────────────────────────────

/**
 * Recalculates currentBalance for all accounts from scratch.
 * Safe to call any time — delegates to recalculateBalance per account.
 */
export async function recalculateAccountBalances(): Promise<void> {
  const db = await getDb();
  const accounts = await db.getAllAsync<{ id: number }>("SELECT id FROM accounts");
  for (const acc of accounts) {
    await recalculateBalance(acc.id);
  }
}
