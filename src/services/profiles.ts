import { UserProfile } from '@/types';
import {
  getAllUsers,
  getActiveUser,
  getUserById,
  getUserByUuid,
  setActiveUserIdInRegistry,
  insertUserInRegistry,
  renameUserInRegistry,
  removeUserFromRegistry,
} from './database/users';
import {
  getDb,
  switchDatabase,
  deleteUserDatabaseFile,
} from './database/client';
import {
  DatabaseBackupData,
  MergeBackupSummary,
  mergeBackupIntoDatabase,
} from './database/backup';
import {
  cancelExpenseReminder,
  syncReminderSchedule,
} from './notifications';

export interface ProfileStateSnapshot {
  users: UserProfile[];
  activeUser: UserProfile;
}

export async function bootstrapProfiles(): Promise<ProfileStateSnapshot> {
  const [users, activeUser] = await Promise.all([getAllUsers(), getActiveUser()]);
  await getDb();
  return { users, activeUser };
}

export async function switchToProfile(userId: number): Promise<ProfileStateSnapshot> {
  const target = await getUserById(userId);
  if (!target) {
    throw new Error('User profile not found.');
  }
  await setActiveUserIdInRegistry(target.id);
  await switchDatabase(target.dbFileName);
  const users = await getAllUsers();
  return { users, activeUser: target };
}

export async function switchToProfileByUuid(userUuid: string): Promise<ProfileStateSnapshot> {
  const target = await getUserByUuid(userUuid);
  if (!target) {
    throw new Error('User profile not found.');
  }
  return switchToProfile(target.id);
}

export async function createProfile(
  name: string,
  switchImmediately: boolean = true,
): Promise<ProfileStateSnapshot> {
  const created = await insertUserInRegistry(name);
  if (switchImmediately) {
    await setActiveUserIdInRegistry(created.id);
    await switchDatabase(created.dbFileName);
    const users = await getAllUsers();
    return { users, activeUser: created };
  }
  const [users, activeUser] = await Promise.all([getAllUsers(), getActiveUser()]);
  return { users, activeUser };
}

export async function renameProfile(
  userId: number,
  newName: string,
): Promise<ProfileStateSnapshot> {
  const updated = await renameUserInRegistry(userId, newName);
  const [users, activeUser] = await Promise.all([getAllUsers(), getActiveUser()]);
  if (updated.id === activeUser.id) {
    await syncReminderSchedule(updated);
  }
  return { users, activeUser };
}

export async function deleteProfile(userId: number): Promise<ProfileStateSnapshot> {
  const currentActive = await getActiveUser();
  const allUsers = await getAllUsers();
  if (allUsers.length <= 1) {
    throw new Error('You must keep at least one profile.');
  }

  const target = allUsers.find((u) => u.id === userId);
  if (!target) {
    throw new Error('User profile not found.');
  }

  let nextActive = currentActive;
  if (currentActive.id === userId) {
    const fallback = allUsers.find((u) => u.id !== userId);
    if (!fallback) {
      throw new Error('No fallback profile available.');
    }
    await setActiveUserIdInRegistry(fallback.id);
    await switchDatabase(fallback.dbFileName);
    nextActive = fallback;
  }

  await removeUserFromRegistry(userId);
  await cancelExpenseReminder(target.uuid);
  await deleteUserDatabaseFile(target.dbFileName);

  const users = await getAllUsers();
  return { users, activeUser: nextActive };
}

export async function createProfileFromBackup(
  name: string,
  data: DatabaseBackupData,
): Promise<{ snapshot: ProfileStateSnapshot; summary: MergeBackupSummary }> {
  const previousActive = await getActiveUser();
  const created = await insertUserInRegistry(name);

  try {
    await setActiveUserIdInRegistry(created.id);
    await switchDatabase(created.dbFileName);
    const summary = await mergeBackupIntoDatabase(data);
    const users = await getAllUsers();
    return {
      snapshot: { users, activeUser: created },
      summary,
    };
  } catch (err) {
    // Roll back failed profile creation cleanly
    try {
      await setActiveUserIdInRegistry(previousActive.id);
      await switchDatabase(previousActive.dbFileName);
      await removeUserFromRegistry(created.id);
      await deleteUserDatabaseFile(created.dbFileName);
    } catch {
      // Best-effort cleanup
    }
    throw err;
  }
}
