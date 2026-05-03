import { Transfer } from '@/types';
import { getDb } from './client';
import { nowIso, toMinorUnits } from './helpers';
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
    substr(transferDate, 1, 7) AS monthKey,
    transferDate,
    updatedAt,
    deletedAt
  FROM transfers
  WHERE deletedAt IS NULL
`;

// ── Transfers CRUD ────────────────────────────────────────────

export async function addTransfer(
  fromAccountId: number,
  toAccountId: number,
  amount: number,
  note: string | null,
  createdAt?: string,
): Promise<number> {
  const db = await getDb();
  const timestamp = createdAt ?? nowIso();

  const result = await db.runAsync(
    `INSERT INTO transfers
       (fromAccountId, toAccountId, amountMinor, currencyCode, feeAmountMinor, feeAccountId, note, transferDate, createdAt, updatedAt, deletedAt)
     VALUES (?, ?, ?, 'EGP', 0, NULL, ?, ?, ?, ?, NULL)`,
    [fromAccountId, toAccountId, toMinorUnits(amount), note ?? null, timestamp, timestamp, timestamp],
  );

  await recalculateBalance(fromAccountId);
  await recalculateBalance(toAccountId);
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
    `${TRANSFER_SELECT} AND substr(transferDate, 1, 7) = ? ORDER BY transferDate DESC, id DESC`,
    [monthKey],
  );
}

export async function getAllTransfers(): Promise<Transfer[]> {
  const db = await getDb();
  return db.getAllAsync<TransferRow>(`${TRANSFER_SELECT} ORDER BY transferDate DESC, id DESC`);
}
