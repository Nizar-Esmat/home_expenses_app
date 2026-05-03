import { Account, AccountType } from '@/types';
import { getDb } from './client';
import { fromDbAccountType, fromMinorUnits, nowIso, toDbAccountType, toMinorUnits } from './helpers';

interface AccountRow {
  id: number;
  name: string;
  type: string;
  openingBalanceMinor: number;
  currentBalanceMinor: number;
  icon: string | null;
  color: string | null;
  isPrimary: number;
  isArchived: number;
  createdAt: string;
  updatedAt: string | null;
  isDefault: number;
}

const ACCOUNT_SELECT = `
  SELECT
    a.*,
    CASE
      WHEN a.id = (SELECT id FROM accounts ORDER BY createdAt ASC, id ASC LIMIT 1)
      THEN 1 ELSE 0
    END AS isDefault
  FROM accounts a
`;

const DELTA_SQL = `
  SELECT
    (SELECT COALESCE(SUM(
      CASE
        WHEN type = 'INCOME' THEN amountMinor
        WHEN type = 'EXPENSE' THEN -amountMinor
        ELSE 0
      END
    ), 0) FROM transactions WHERE accountId = ? AND deletedAt IS NULL) +
    (SELECT COALESCE(SUM(amountMinor), 0) FROM transfers WHERE toAccountId = ? AND deletedAt IS NULL) -
    (SELECT COALESCE(SUM(amountMinor), 0) FROM transfers WHERE fromAccountId = ? AND deletedAt IS NULL) -
    (SELECT COALESCE(SUM(feeAmountMinor), 0) FROM transfers WHERE COALESCE(feeAccountId, fromAccountId) = ? AND deletedAt IS NULL)
  AS txDeltaMinor
`;

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: fromDbAccountType(row.type),
    openingBalance: fromMinorUnits(row.openingBalanceMinor),
    currentBalance: fromMinorUnits(row.currentBalanceMinor),
    icon: row.icon,
    color: row.color,
    isDefault: row.isDefault,
    isPrimary: row.isPrimary,
    isArchived: row.isArchived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? row.createdAt,
  };
}

// ── Balance recalculation ─────────────────────────────────────

export async function recalculateBalance(accountId: number): Promise<void> {
  const db = await getDb();
  const acc = await db.getFirstAsync<{ openingBalanceMinor: number }>(
    'SELECT openingBalanceMinor FROM accounts WHERE id = ?',
    [accountId],
  );
  if (!acc) return;

  const txRow = await db.getFirstAsync<{ txDeltaMinor: number }>(DELTA_SQL, [
    accountId,
    accountId,
    accountId,
    accountId,
  ]);
  const newBalanceMinor = acc.openingBalanceMinor + (txRow?.txDeltaMinor ?? 0);
  await db.runAsync(
    'UPDATE accounts SET currentBalanceMinor = ?, updatedAt = ? WHERE id = ?',
    [newBalanceMinor, nowIso(), accountId],
  );
}

/** @deprecated – call recalculateBalance() instead */
export async function adjustAccountBalance(accountId: number, _delta: number): Promise<void> {
  await recalculateBalance(accountId);
}

// ── Account queries ───────────────────────────────────────────

export async function getAccounts(): Promise<Account[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AccountRow>(
    `${ACCOUNT_SELECT} ORDER BY isDefault DESC, a.createdAt ASC, a.id ASC`,
  );
  return rows.map(toAccount);
}

export async function getActiveAccounts(): Promise<Account[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AccountRow>(
    `${ACCOUNT_SELECT} WHERE a.isArchived = 0 ORDER BY isDefault DESC, a.createdAt ASC, a.id ASC`,
  );
  return rows.map(toAccount);
}

export async function getAccountById(id: number): Promise<Account | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<AccountRow>(`${ACCOUNT_SELECT} WHERE a.id = ?`, [id]);
  return row ? toAccount(row) : null;
}

export async function getDefaultAccount(): Promise<Account | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<AccountRow>(
    `${ACCOUNT_SELECT} WHERE a.isArchived = 0 ORDER BY isDefault DESC, a.createdAt ASC, a.id ASC LIMIT 1`,
  );
  return row ? toAccount(row) : null;
}

export async function getFavoriteBankAccount(): Promise<Account | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<AccountRow>(
    `${ACCOUNT_SELECT} WHERE a.isPrimary = 1 AND a.type = 'BANK' AND a.isArchived = 0 LIMIT 1`,
  );
  return row ? toAccount(row) : null;
}

/** Set id as the favorite bank account (clears any previous primary). Pass null to unset all. */
export async function setFavoriteBankAccount(id: number | null): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync('UPDATE accounts SET isPrimary = 0, updatedAt = ? WHERE isPrimary = 1', [now]);
    if (id !== null) {
      await db.runAsync(
        "UPDATE accounts SET isPrimary = 1, updatedAt = ? WHERE id = ? AND type = 'BANK'",
        [now, id],
      );
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
  const balanceMinor = toMinorUnits(input.openingBalance);
  const result = await db.runAsync(
    `INSERT INTO accounts
       (name, type, currencyCode, openingBalanceMinor, currentBalanceMinor, icon, color, isPrimary, isArchived, createdAt, updatedAt)
     VALUES (?, ?, 'EGP', ?, ?, ?, ?, 0, 0, ?, ?)`,
    [
      input.name.trim(),
      toDbAccountType(input.type),
      balanceMinor,
      balanceMinor,
      input.icon ?? null,
      input.color ?? null,
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

export async function updateAccount(id: number, input: UpdateAccountInput): Promise<void> {
  const db = await getDb();
  const txRow = await db.getFirstAsync<{ txDeltaMinor: number }>(DELTA_SQL, [id, id, id, id]);
  const currentBalanceMinor = toMinorUnits(input.currentBalance);
  const openingBalanceMinor = currentBalanceMinor - (txRow?.txDeltaMinor ?? 0);

  await db.runAsync(
    `UPDATE accounts
     SET name = ?, type = ?, openingBalanceMinor = ?, currentBalanceMinor = ?, icon = ?, color = ?, updatedAt = ?
     WHERE id = ?`,
    [
      input.name.trim(),
      toDbAccountType(input.type),
      openingBalanceMinor,
      currentBalanceMinor,
      input.icon ?? null,
      input.color ?? null,
      nowIso(),
      id,
    ],
  );
}

export async function archiveAccount(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE accounts SET isArchived = 1, updatedAt = ? WHERE id = ?', [nowIso(), id]);
}

export async function unarchiveAccount(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE accounts SET isArchived = 0, updatedAt = ? WHERE id = ?', [nowIso(), id]);
}

export type CanDeleteReason = 'default' | 'has_expenses' | 'has_incomes' | 'has_transfers';

/** Returns whether the account can be safely deleted, and why not if it cannot. */
export async function canDeleteAccount(id: number): Promise<{ ok: boolean; reason?: CanDeleteReason }> {
  const db = await getDb();
  const account = await getAccountById(id);
  if (!account) return { ok: false };
  if (account.isDefault === 1) return { ok: false, reason: 'default' };

  const expRow = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM transactions WHERE accountId = ? AND type = 'EXPENSE' AND deletedAt IS NULL",
    [id],
  );
  if ((expRow?.n ?? 1) > 0) return { ok: false, reason: 'has_expenses' };

  const incRow = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM transactions WHERE accountId = ? AND type = 'INCOME' AND deletedAt IS NULL",
    [id],
  );
  if ((incRow?.n ?? 1) > 0) return { ok: false, reason: 'has_incomes' };

  const trRow = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM transfers WHERE (fromAccountId = ? OR toAccountId = ? OR feeAccountId = ?) AND deletedAt IS NULL',
    [id, id, id],
  );
  if ((trRow?.n ?? 1) > 0) return { ok: false, reason: 'has_transfers' };

  return { ok: true };
}

// ── Balance helpers ───────────────────────────────────────────

export async function recalculateAccountBalances(): Promise<void> {
  const db = await getDb();
  const accounts = await db.getAllAsync<{ id: number }>('SELECT id FROM accounts');
  for (const acc of accounts) {
    await recalculateBalance(acc.id);
  }
}
