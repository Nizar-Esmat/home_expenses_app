import * as SQLite from 'expo-sqlite';
import { UserProfile } from '@/types';
import { nowIso } from './helpers';
import { generateUuidV7 } from './uuid';

export const REGISTRY_DB_NAME = 'budgetbuddy_registry.db';
export const LEGACY_USER_DB_NAME = 'budgetbuddy.db';
export const DEFAULT_USER_NAME = 'Personal';

let _registryDb: SQLite.SQLiteDatabase | null = null;
let _registryInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getRegistryDb(): Promise<SQLite.SQLiteDatabase> {
  if (_registryDb) {
    return _registryDb;
  }
  if (!_registryInitPromise) {
    _registryInitPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(REGISTRY_DB_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS users (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid       TEXT    NOT NULL UNIQUE,
          name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
          dbFileName TEXT    NOT NULL UNIQUE,
          createdAt  TEXT    NOT NULL,
          updatedAt  TEXT
        );

        CREATE TABLE IF NOT EXISTS registry_meta (
          key   TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      const existingCount = await db.getFirstAsync<{ n: number }>(
        'SELECT COUNT(*) AS n FROM users',
      );
      if (!existingCount || existingCount.n === 0) {
        const now = nowIso();
        const uuid = generateUuidV7();
        const res = await db.runAsync(
          `INSERT INTO users (uuid, name, dbFileName, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?)`,
          [uuid, DEFAULT_USER_NAME, LEGACY_USER_DB_NAME, now, now],
        );
        await db.runAsync(
          "INSERT OR REPLACE INTO registry_meta (key, value) VALUES ('activeUserId', ?)",
          [String(res.lastInsertRowId)],
        );
      }

      _registryDb = db;
      return db;
    })().catch((err) => {
      _registryInitPromise = null;
      _registryDb = null;
      throw err;
    });
  }
  return _registryInitPromise;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const db = await getRegistryDb();
  return db.getAllAsync<UserProfile>(
    'SELECT id, uuid, name, dbFileName, createdAt, updatedAt FROM users ORDER BY id ASC',
  );
}

export async function getUserById(id: number): Promise<UserProfile | null> {
  const db = await getRegistryDb();
  const row = await db.getFirstAsync<UserProfile>(
    'SELECT id, uuid, name, dbFileName, createdAt, updatedAt FROM users WHERE id = ?',
    [id],
  );
  return row ?? null;
}

export async function getUserByUuid(uuid: string): Promise<UserProfile | null> {
  const db = await getRegistryDb();
  const row = await db.getFirstAsync<UserProfile>(
    'SELECT id, uuid, name, dbFileName, createdAt, updatedAt FROM users WHERE uuid = ?',
    [uuid],
  );
  return row ?? null;
}

export async function getActiveUser(): Promise<UserProfile> {
  const db = await getRegistryDb();
  const meta = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM registry_meta WHERE key = 'activeUserId'",
  );
  if (meta) {
    const active = await getUserById(Number(meta.value));
    if (active) return active;
  }

  const first = await db.getFirstAsync<UserProfile>(
    'SELECT id, uuid, name, dbFileName, createdAt, updatedAt FROM users ORDER BY id ASC LIMIT 1',
  );
  if (!first) {
    throw new Error('No user profiles found.');
  }
  await db.runAsync(
    "INSERT OR REPLACE INTO registry_meta (key, value) VALUES ('activeUserId', ?)",
    [String(first.id)],
  );
  return first;
}

export async function setActiveUserIdInRegistry(userId: number): Promise<UserProfile> {
  const db = await getRegistryDb();
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User profile not found.');
  }
  await db.runAsync(
    "INSERT OR REPLACE INTO registry_meta (key, value) VALUES ('activeUserId', ?)",
    [String(userId)],
  );
  return user;
}

export async function insertUserInRegistry(name: string): Promise<UserProfile> {
  const db = await getRegistryDb();
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Profile name cannot be empty.');
  }

  const dup = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM users WHERE LOWER(name) = LOWER(?) LIMIT 1',
    [trimmed],
  );
  if (dup) {
    throw new Error(`A profile named "${trimmed}" already exists.`);
  }

  const now = nowIso();
  const uuid = generateUuidV7();
  const dbFileName = `budgetbuddy_u_${uuid.replace(/-/g, '')}.db`;

  const res = await db.runAsync(
    `INSERT INTO users (uuid, name, dbFileName, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?)`,
    [uuid, trimmed, dbFileName, now, now],
  );

  const created = await getUserById(res.lastInsertRowId);
  if (!created) {
    throw new Error('Failed to create user profile.');
  }
  return created;
}

export async function renameUserInRegistry(userId: number, newName: string): Promise<UserProfile> {
  const db = await getRegistryDb();
  const trimmed = newName.trim();
  if (!trimmed) {
    throw new Error('Profile name cannot be empty.');
  }

  const existing = await getUserById(userId);
  if (!existing) {
    throw new Error('User profile not found.');
  }

  const dup = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM users WHERE LOWER(name) = LOWER(?) AND id != ? LIMIT 1',
    [trimmed, userId],
  );
  if (dup) {
    throw new Error(`A profile named "${trimmed}" already exists.`);
  }

  await db.runAsync(
    'UPDATE users SET name = ?, updatedAt = ? WHERE id = ?',
    [trimmed, nowIso(), userId],
  );

  const updated = await getUserById(userId);
  if (!updated) {
    throw new Error('Failed to load updated profile.');
  }
  return updated;
}

export async function removeUserFromRegistry(userId: number): Promise<UserProfile> {
  const db = await getRegistryDb();
  const all = await getAllUsers();
  if (all.length <= 1) {
    throw new Error('You must keep at least one profile.');
  }

  const target = all.find((u) => u.id === userId);
  if (!target) {
    throw new Error('User profile not found.');
  }

  await db.runAsync('DELETE FROM users WHERE id = ?', [userId]);
  return target;
}
