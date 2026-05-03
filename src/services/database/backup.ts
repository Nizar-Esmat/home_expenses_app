import { Transaction, TransactionItem } from '@/types';
import { getDb } from './client';
import { nowIso } from './helpers';
import { recalculateAccountBalances } from './accounts';
import { SettingsRow } from './settings';

interface BackupAccount {
  id: number;
  name: string;
  type: string;
  currencyCode: string;
  openingBalanceMinor: number;
  currentBalanceMinor: number;
  icon: string | null;
  color: string | null;
  isPrimary: number;
  isArchived: number;
  createdAt: string;
  updatedAt: string | null;
}

interface BackupCategory {
  id: number;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  icon: string | null;
  color: string | null;
  isDefault: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string | null;
}

interface BackupTransfer {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  amountMinor: number;
  currencyCode: string;
  feeAmountMinor: number;
  feeAccountId: number | null;
  note: string | null;
  transferDate: string;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface DatabaseBackupData {
  accounts: BackupAccount[];
  categories: BackupCategory[];
  transactions: Transaction[];
  transactionItems: TransactionItem[];
  transfers: BackupTransfer[];
  settings: SettingsRow[];
}

export interface MergeBackupSummary {
  categoriesAdded: number;
  incomeCategoriesAdded: number;
  expensesAdded: number;
  expensesSkipped: number;
  incomesAdded: number;
  incomesSkipped: number;
  settingsMerged: number;
  accountsAdded: number;
  transfersAdded: number;
  transfersSkipped: number;
}

export async function exportDatabaseBackupData(): Promise<DatabaseBackupData> {
  const db = await getDb();
  const [accounts, categories, transactions, transactionItems, transfers, settings] =
    await Promise.all([
      db.getAllAsync<BackupAccount>('SELECT * FROM accounts ORDER BY createdAt ASC, id ASC'),
      db.getAllAsync<BackupCategory>('SELECT * FROM categories ORDER BY type ASC, sortOrder ASC, id ASC'),
      db.getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY transactionDate DESC, id DESC'),
      db.getAllAsync<TransactionItem>('SELECT * FROM transaction_items ORDER BY transactionId ASC, sortOrder ASC'),
      db.getAllAsync<BackupTransfer>('SELECT * FROM transfers ORDER BY transferDate DESC, id DESC'),
      db.getAllAsync<SettingsRow>('SELECT key, value FROM settings'),
    ]);

  return { accounts, categories, transactions, transactionItems, transfers, settings };
}

export async function mergeBackupIntoDatabase(data: DatabaseBackupData): Promise<MergeBackupSummary> {
  const db = await getDb();
  const summary: MergeBackupSummary = {
    categoriesAdded: 0,
    incomeCategoriesAdded: 0,
    expensesAdded: 0,
    expensesSkipped: 0,
    incomesAdded: 0,
    incomesSkipped: 0,
    settingsMerged: 0,
    accountsAdded: 0,
    transfersAdded: 0,
    transfersSkipped: 0,
  };

  const normalize = (v: string) => v.trim().toLowerCase();
  const accountIdRemap = new Map<number, number>();
  const categoryIdRemap = new Map<number, number>();
  const transactionIdRemap = new Map<number, number>();

  await db.withExclusiveTransactionAsync(async () => {
    for (const acc of data.accounts) {
      if (!acc?.name || !acc?.type) continue;

      const existing = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM accounts WHERE name = ?',
        [acc.name],
      );
      if (existing) {
        accountIdRemap.set(acc.id, existing.id);
        continue;
      }

      const result = await db.runAsync(
        `INSERT INTO accounts
           (name, type, currencyCode, openingBalanceMinor, currentBalanceMinor, icon, color, isPrimary, isArchived, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          acc.name,
          acc.type,
          acc.currencyCode ?? 'EGP',
          acc.openingBalanceMinor ?? 0,
          acc.currentBalanceMinor ?? 0,
          acc.icon ?? null,
          acc.color ?? null,
          acc.isPrimary ?? 0,
          acc.isArchived ?? 0,
          acc.createdAt ?? nowIso(),
          acc.updatedAt ?? nowIso(),
        ],
      );
      accountIdRemap.set(acc.id, result.lastInsertRowId);
      summary.accountsAdded += 1;
    }

    const existingCategories = await db.getAllAsync<{ id: number; name: string; type: string }>(
      'SELECT id, name, type FROM categories',
    );
    const existingCategoryMap = new Map(
      existingCategories.map((c) => [`${c.type}:${normalize(c.name)}`, c.id]),
    );

    for (const cat of data.categories) {
      if (!cat?.name || !cat?.type) continue;
      const key = `${cat.type}:${normalize(cat.name)}`;
      const existingId = existingCategoryMap.get(key);
      if (existingId) {
        categoryIdRemap.set(cat.id, existingId);
        continue;
      }

      const result = await db.runAsync(
        `INSERT INTO categories
           (name, type, icon, color, isDefault, sortOrder, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cat.name,
          cat.type,
          cat.icon ?? null,
          cat.color ?? null,
          0,
          cat.sortOrder ?? 0,
          cat.createdAt ?? nowIso(),
          cat.updatedAt ?? nowIso(),
        ],
      );
      categoryIdRemap.set(cat.id, result.lastInsertRowId);
      existingCategoryMap.set(key, result.lastInsertRowId);
      if (cat.type === 'INCOME') summary.incomeCategoriesAdded += 1;
      else summary.categoriesAdded += 1;
    }

    const fallbackAccount = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM accounts ORDER BY id ASC LIMIT 1',
    );
    const fallbackExpenseCategory = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM categories WHERE type = 'EXPENSE' ORDER BY isDefault DESC, sortOrder ASC LIMIT 1",
    );
    const fallbackIncomeCategory = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM categories WHERE type = 'INCOME' ORDER BY isDefault DESC, sortOrder ASC LIMIT 1",
    );

    const existingTransactions = await db.getAllAsync<{
      transactionDate: string;
      amountMinor: number;
      type: string;
      note: string | null;
    }>('SELECT transactionDate, amountMinor, type, note FROM transactions');
    const transactionFingerprints = new Set(
      existingTransactions.map((t) => `${t.transactionDate}|${t.amountMinor}|${t.type}|${(t.note ?? '').trim()}`),
    );

    for (const tx of data.transactions) {
      if (!tx?.transactionDate || typeof tx.amountMinor !== 'number' || !tx.type) continue;
      const fp = `${tx.transactionDate}|${tx.amountMinor}|${tx.type}|${(tx.note ?? '').trim()}`;
      if (transactionFingerprints.has(fp)) {
        if (tx.type === 'INCOME') summary.incomesSkipped += 1;
        else summary.expensesSkipped += 1;
        continue;
      }

      const accountId = accountIdRemap.get(tx.accountId) ?? tx.accountId ?? fallbackAccount?.id;
      const fallbackCategory = tx.type === 'INCOME' ? fallbackIncomeCategory : fallbackExpenseCategory;
      const categoryId = categoryIdRemap.get(tx.categoryId) ?? tx.categoryId ?? fallbackCategory?.id;
      if (!accountId || !categoryId) continue;

      const result = await db.runAsync(
        `INSERT INTO transactions
           (accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt, deletedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          accountId,
          categoryId,
          tx.type,
          tx.amountMinor,
          tx.currencyCode ?? 'EGP',
          tx.title ?? null,
          tx.note ?? null,
          tx.transactionDate,
          tx.createdAt ?? tx.transactionDate,
          tx.updatedAt ?? null,
          tx.deletedAt ?? null,
        ],
      );
      transactionIdRemap.set(tx.id, result.lastInsertRowId);
      transactionFingerprints.add(fp);
      if (tx.type === 'INCOME') summary.incomesAdded += 1;
      else summary.expensesAdded += 1;
    }

    for (const item of data.transactionItems) {
      const transactionId = transactionIdRemap.get(item.transactionId);
      if (!transactionId || !item?.name || typeof item.amountMinor !== 'number') continue;
      await db.runAsync(
        `INSERT INTO transaction_items
           (transactionId, categoryId, name, amountMinor, quantity, note, sortOrder, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionId,
          item.categoryId != null ? (categoryIdRemap.get(item.categoryId) ?? item.categoryId) : null,
          item.name,
          item.amountMinor,
          item.quantity ?? null,
          item.note ?? null,
          item.sortOrder ?? 0,
          item.createdAt ?? nowIso(),
          item.updatedAt ?? null,
        ],
      );
    }

    const existingTransfers = await db.getAllAsync<BackupTransfer>(
      'SELECT * FROM transfers',
    );
    const transferFingerprints = new Set(
      existingTransfers.map((t) => `${t.transferDate}|${t.amountMinor}|${t.fromAccountId}|${t.toAccountId}`),
    );

    for (const tr of data.transfers) {
      if (!tr?.transferDate || typeof tr.amountMinor !== 'number') continue;

      const remappedFrom = accountIdRemap.get(tr.fromAccountId) ?? tr.fromAccountId;
      const remappedTo = accountIdRemap.get(tr.toAccountId) ?? tr.toAccountId;
      const remappedFee = tr.feeAccountId != null
        ? (accountIdRemap.get(tr.feeAccountId) ?? tr.feeAccountId)
        : null;
      const fp = `${tr.transferDate}|${tr.amountMinor}|${remappedFrom}|${remappedTo}`;

      if (transferFingerprints.has(fp)) {
        summary.transfersSkipped += 1;
        continue;
      }

      await db.runAsync(
        `INSERT INTO transfers
           (fromAccountId, toAccountId, amountMinor, currencyCode, feeAmountMinor, feeAccountId, note, transferDate, createdAt, updatedAt, deletedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          remappedFrom,
          remappedTo,
          tr.amountMinor,
          tr.currencyCode ?? 'EGP',
          tr.feeAmountMinor ?? 0,
          remappedFee,
          tr.note ?? null,
          tr.transferDate,
          tr.createdAt ?? tr.transferDate,
          tr.updatedAt ?? null,
          tr.deletedAt ?? null,
        ],
      );
      transferFingerprints.add(fp);
      summary.transfersAdded += 1;
    }

    for (const row of data.settings) {
      if (!row?.key) continue;
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        [row.key, row.value ?? ''],
      );
      summary.settingsMerged += 1;
    }
  });

  await recalculateAccountBalances();
  return summary;
}
