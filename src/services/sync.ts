import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  exportDatabaseBackupData,
  mergeBackupIntoDatabase,
  DatabaseBackupData,
  MergeBackupSummary,
} from '@/services/database';
import { getDb } from '@/services/database/client';

const BACKUP_VERSION = 3;
const SUPPORTED_VERSIONS = [3];

interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  app: {
    name: string;
    platform: string;
  };
  data: DatabaseBackupData;
}

function makeBackupFileName(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `budgetbuddy-backup-${yyyy}${mm}${dd}-${hh}${min}.json`;
}

function makeDatabaseFileName(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `budgetbuddy-database-${yyyy}${mm}${dd}-${hh}${min}.db`;
}

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

function validatePayload(raw: unknown): BackupPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup file.');
  }

  const payload = raw as Partial<BackupPayload>;
  if (!payload.schemaVersion || !SUPPORTED_VERSIONS.includes(payload.schemaVersion)) {
    throw new Error('Unsupported backup version.');
  }
  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error('Backup data is missing.');
  }

  const data = payload.data as Partial<DatabaseBackupData>;
  if (!Array.isArray(data.transactions) || !Array.isArray(data.transactionItems)) {
    throw new Error('Invalid transactions in backup.');
  }
  if (!Array.isArray(data.categories)) {
    throw new Error('Invalid categories in backup.');
  }
  if (!Array.isArray(data.accounts) || !Array.isArray(data.transfers)) {
    throw new Error('Invalid accounts or transfers in backup.');
  }
  if (!Array.isArray(data.settings)) {
    throw new Error('Invalid settings in backup.');
  }

  return payload as BackupPayload;
}

export async function exportBackupAndShare(): Promise<{ uri: string; fileName: string }> {
  const data = await exportDatabaseBackupData();
  const payload: BackupPayload = {
    schemaVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: {
      name: 'budget-buddy',
      platform: 'expo',
    },
    data,
  };

  const fileName = makeBackupFileName();
  const dir = FileSystem.documentDirectory;
  if (!dir) throw new Error('Could not access local file system.');
  const uri = `${dir}${fileName}`;

  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Budget Buddy Backup',
      UTI: 'public.json',
    });
  }

  return { uri, fileName };
}

export async function exportDatabaseFileAndShare(): Promise<{ uri: string; fileName: string }> {
  const db = await getDb();
  await db.execAsync('PRAGMA wal_checkpoint(FULL);');

  const fileName = makeDatabaseFileName();
  const dir = FileSystem.documentDirectory;
  if (!dir) throw new Error('Could not access local file system.');
  const uri = `${dir}${fileName}`;

  await FileSystem.copyAsync({
    from: toFileUri(db.databasePath),
    to: uri,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.sqlite3',
      dialogTitle: 'Export Budget Buddy Database',
      UTI: 'public.database',
    });
  }

  return { uri, fileName };
}

export async function pickAndImportBackupMerge(): Promise<MergeBackupSummary> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (picked.canceled || !picked.assets?.[0]?.uri) {
    throw new Error('Import cancelled.');
  }

  const fileUri = picked.assets[0].uri;
  const raw = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Selected file is not valid JSON.');
  }

  const payload = validatePayload(parsed);
  return mergeBackupIntoDatabase(payload.data);
}
