import { Transfer } from '@/types';
import { getDb } from './client';
import { nowIso, toMonthKey } from './helpers';
import { recalculateBalance } from './accounts';

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

  let newId = 0;
  await db.withExclusiveTransactionAsync(async () => {
    const result = await db.runAsync(
      'INSERT INTO transfers (fromAccountId, toAccountId, amount, note, createdAt, monthKey) VALUES (?, ?, ?, ?, ?, ?)',
      [fromAccountId, toAccountId, amount, note ?? null, timestamp, toMonthKey(timestamp)],
    );
    newId = result.lastInsertRowId;
  });

  await recalculateBalance(fromAccountId);
  await recalculateBalance(toAccountId);
  return newId;
}

export async function deleteTransfer(id: number): Promise<void> {
  const db = await getDb();

  const transfer = await db.getFirstAsync<Transfer>(
    'SELECT * FROM transfers WHERE id = ?',
    [id],
  );
  if (!transfer) return;

  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync('DELETE FROM transfers WHERE id = ?', [id]);
  });

  await recalculateBalance(transfer.fromAccountId);
  await recalculateBalance(transfer.toAccountId);
}

export async function getTransfersByMonth(monthKey: string): Promise<Transfer[]> {
  const db = await getDb();
  return db.getAllAsync<Transfer>(
    'SELECT * FROM transfers WHERE monthKey = ? ORDER BY createdAt DESC',
    [monthKey],
  );
}

export async function getAllTransfers(): Promise<Transfer[]> {
  const db = await getDb();
  return db.getAllAsync<Transfer>('SELECT * FROM transfers ORDER BY createdAt DESC');
}
