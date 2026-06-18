import { Expense, Transfer } from '@/types';
import { getDb } from './client';
import { nowIso, toMinorUnits, tzMonthKey } from './helpers';
import { recalculateBalance } from './accounts';

interface TransferRow {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  feeAmount: number;
  feeAccountId: number | null;
  note: string | null;
  createdAt: string;
  monthKey: string;
  transferDate: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

const TRANSFER_SELECT = `
  SELECT
    id,
    fromAccountId,
    toAccountId,
    amountMinor / 100.0 AS amount,
    feeAmountMinor / 100.0 AS feeAmount,
    feeAccountId,
    note,
    transferDate AS createdAt,
    ${tzMonthKey('transferDate')} AS monthKey,
    transferDate,
    updatedAt,
    deletedAt
  FROM transfers
  WHERE deletedAt IS NULL
`;

// ── Transfers CRUD ────────────────────────────────────────────

export async function getTransferById(id: number): Promise<Transfer | null> {
  const db = await getDb();
  return db.getFirstAsync<Transfer>(`${TRANSFER_SELECT} AND id = ?`, [id]);
}

export async function updateTransfer(
  id: number,
  fromAccountId: number,
  toAccountId: number,
  amount: number,
  note: string | null,
  feeAmount?: number,
  feeAccountId?: number | null,
): Promise<void> {
  const db = await getDb();

  const old = await db.getFirstAsync<Transfer>(`${TRANSFER_SELECT} AND id = ?`, [id]);
  if (!old) return;

  const now = nowIso();
  await db.runAsync(
    `UPDATE transfers
     SET fromAccountId = ?, toAccountId = ?, amountMinor = ?, feeAmountMinor = ?, feeAccountId = ?,
         note = ?, updatedAt = ?
     WHERE id = ?`,
    [
      fromAccountId,
      toAccountId,
      toMinorUnits(amount),
      toMinorUnits(feeAmount ?? 0),
      feeAccountId ?? null,
      note ?? null,
      now,
      id,
    ],
  );

  const affected = new Set<number>();
  affected.add(old.fromAccountId);
  affected.add(old.toAccountId);
  if (old.feeAccountId != null) affected.add(old.feeAccountId);
  affected.add(fromAccountId);
  affected.add(toAccountId);
  if (feeAccountId != null) affected.add(feeAccountId);
  for (const accId of affected) await recalculateBalance(accId);
}

export async function addTransfer(
  fromAccountId: number,
  toAccountId: number,
  amount: number,
  note: string | null,
  createdAt?: string,
  feeAmount?: number,
  feeAccountId?: number | null,
): Promise<number> {
  const db = await getDb();
  const timestamp = createdAt ?? nowIso();

  const result = await db.runAsync(
    `INSERT INTO transfers
       (fromAccountId, toAccountId, amountMinor, currencyCode, feeAmountMinor, feeAccountId, note, transferDate, createdAt, updatedAt, deletedAt)
     VALUES (?, ?, ?, 'EGP', ?, ?, ?, ?, ?, ?, NULL)`,
    [
      fromAccountId,
      toAccountId,
      toMinorUnits(amount),
      toMinorUnits(feeAmount ?? 0),
      feeAccountId ?? null,
      note ?? null,
      timestamp,
      timestamp,
      timestamp,
    ],
  );

  await recalculateBalance(fromAccountId);
  await recalculateBalance(toAccountId);
  if (feeAccountId != null) await recalculateBalance(feeAccountId);
  return result.lastInsertRowId;
}

export async function deleteTransfer(id: number): Promise<void> {
  const db = await getDb();

  const transfer = await db.getFirstAsync<Transfer>(
    `${TRANSFER_SELECT} AND id = ?`,
    [id],
  );
  if (!transfer) return;

  const now = nowIso();
  await db.runAsync(
    'UPDATE transfers SET deletedAt = ?, updatedAt = ? WHERE id = ?',
    [now, now, id],
  );

  await recalculateBalance(transfer.fromAccountId);
  await recalculateBalance(transfer.toAccountId);
  if (transfer.feeAccountId != null) await recalculateBalance(transfer.feeAccountId);
}

export async function getTransfersByMonth(monthKey: string): Promise<Transfer[]> {
  const db = await getDb();
  return db.getAllAsync<TransferRow>(
    `${TRANSFER_SELECT} AND ${tzMonthKey('transferDate')} = ? ORDER BY transferDate DESC, id DESC`,
    [monthKey],
  );
}

export async function getAllTransfers(): Promise<Transfer[]> {
  const db = await getDb();
  return db.getAllAsync<TransferRow>(`${TRANSFER_SELECT} ORDER BY transferDate DESC, id DESC`);
}

// ── Transfer fees (treat as synthetic expenses) ───────────────

const TRANSFER_FEE_CATEGORY_NAME = 'Transfer Fee';

export async function getTransferFeesByMonth(monthKey: string): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    feeAmount: number;
    createdAt: string;
    note: string | null;
    feeAccountId: number | null;
  }>(
    `SELECT
      id,
      feeAmountMinor / 100.0 AS feeAmount,
      transferDate AS createdAt,
      note,
      feeAccountId AS accountId
    FROM transfers
    WHERE deletedAt IS NULL AND feeAmountMinor > 0 AND ${tzMonthKey('transferDate')} = ?
    ORDER BY transferDate DESC, id DESC`,
    [monthKey],
  );
  return rows.map((r) => ({
    id: r.id,
    price: r.feeAmount,
    category: TRANSFER_FEE_CATEGORY_NAME,
    note: r.note,
    createdAt: r.createdAt,
    monthKey,
    accountId: r.feeAccountId,
    subExpenses: [],
  }));
}

export async function getAllTransferFees(): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    feeAmount: number;
    createdAt: string;
    note: string | null;
    feeAccountId: number | null;
    monthKey: string;
  }>(
    `SELECT
      id,
      feeAmountMinor / 100.0 AS feeAmount,
      transferDate AS createdAt,
      note,
      feeAccountId AS accountId,
      ${tzMonthKey('transferDate')} AS monthKey
    FROM transfers
    WHERE deletedAt IS NULL AND feeAmountMinor > 0
    ORDER BY transferDate DESC, id DESC`,
  );
  return rows.map((r) => ({
    id: r.id,
    price: r.feeAmount,
    category: TRANSFER_FEE_CATEGORY_NAME,
    note: r.note,
    createdAt: r.createdAt,
    monthKey: r.monthKey,
    accountId: r.feeAccountId,
    subExpenses: [],
  }));
}

export async function getAvailableTransferMonthKeys(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ monthKey: string }>(
    `SELECT DISTINCT ${tzMonthKey('transferDate')} AS monthKey
     FROM transfers
     WHERE deletedAt IS NULL
     ORDER BY monthKey DESC`,
  );
  return rows.map((r) => r.monthKey);
}
