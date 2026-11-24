import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { UserProfile } from '@/types';
import { DatabaseBackupData, MergeBackupSummary } from '@/services/database/backup';
import { getAllUsers, getActiveUser } from '@/services/database/users';
import {
  bootstrapProfiles,
  createProfile,
  createProfileFromBackup,
  deleteProfile,
  renameProfile,
  switchToProfile,
  switchToProfileByUuid,
} from '@/services/profiles';

interface UserContextType {
  users: UserProfile[];
  activeUser: UserProfile | null;
  ready: boolean;
  isSwitching: boolean;
  switchUser: (userId: number) => Promise<void>;
  switchUserByUuid: (userUuid: string, pendingRoute?: string) => Promise<void>;
  createUser: (name: string, switchImmediately?: boolean) => Promise<UserProfile>;
  renameUser: (userId: number, newName: string) => Promise<void>;
  deleteUser: (userId: number) => Promise<void>;
  importAsNewUser: (name: string, data: DatabaseBackupData) => Promise<MergeBackupSummary>;
  refreshUsers: () => Promise<void>;
  consumePendingRoute: () => string | null;
}

const UserContext = createContext<UserContextType>({
  users: [],
  activeUser: null,
  ready: false,
  isSwitching: false,
  switchUser: async () => {},
  switchUserByUuid: async () => {},
  createUser: async () => {
    throw new Error('UserProvider not mounted');
  },
  renameUser: async () => {},
  deleteUser: async () => {},
  importAsNewUser: async () => {
    throw new Error('UserProvider not mounted');
  },
  refreshUsers: async () => {},
  consumePendingRoute: () => null,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const pendingRouteRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    bootstrapProfiles()
      .then((snap) => {
        if (!mounted) return;
        setUsers(snap.users);
        setActiveUser(snap.activeUser);
        setReady(true);
      })
      .catch((err) => {
        console.error('[UserProvider] Failed to bootstrap profiles:', err);
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const refreshUsers = useCallback(async () => {
    const [all, active] = await Promise.all([getAllUsers(), getActiveUser()]);
    setUsers(all);
    setActiveUser(active);
  }, []);

  const switchUser = useCallback(
    async (userId: number) => {
      if (activeUser?.id === userId) return;
      setIsSwitching(true);
      try {
        const snap = await switchToProfile(userId);
        setUsers(snap.users);
        setActiveUser(snap.activeUser);
      } finally {
        setIsSwitching(false);
      }
    },
    [activeUser?.id],
  );

  const switchUserByUuid = useCallback(
    async (userUuid: string, pendingRoute?: string) => {
      if (pendingRoute) {
        pendingRouteRef.current = pendingRoute;
      }
      if (activeUser?.uuid === userUuid) return;
      setIsSwitching(true);
      try {
        const snap = await switchToProfileByUuid(userUuid);
        setUsers(snap.users);
        setActiveUser(snap.activeUser);
      } finally {
        setIsSwitching(false);
      }
    },
    [activeUser?.uuid],
  );

  const createUser = useCallback(
    async (name: string, switchImmediately: boolean = true): Promise<UserProfile> => {
      setIsSwitching(switchImmediately);
      try {
        const snap = await createProfile(name, switchImmediately);
        setUsers(snap.users);
        setActiveUser(snap.activeUser);
        return switchImmediately
          ? snap.activeUser
          : snap.users[snap.users.length - 1]!;
      } finally {
        setIsSwitching(false);
      }
    },
    [],
  );

  const renameUser = useCallback(async (userId: number, newName: string) => {
    const snap = await renameProfile(userId, newName);
    setUsers(snap.users);
    setActiveUser(snap.activeUser);
  }, []);

  const deleteUser = useCallback(async (userId: number) => {
    setIsSwitching(true);
    try {
      const snap = await deleteProfile(userId);
      setUsers(snap.users);
      setActiveUser(snap.activeUser);
    } finally {
      setIsSwitching(false);
    }
  }, []);

  const importAsNewUser = useCallback(
    async (name: string, data: DatabaseBackupData): Promise<MergeBackupSummary> => {
      setIsSwitching(true);
      try {
        const { snapshot, summary } = await createProfileFromBackup(name, data);
        setUsers(snapshot.users);
        setActiveUser(snapshot.activeUser);
        return summary;
      } finally {
        setIsSwitching(false);
      }
    },
    [],
  );

  const consumePendingRoute = useCallback(() => {
    const route = pendingRouteRef.current;
    pendingRouteRef.current = null;
    return route;
  }, []);

  return (
    <UserContext.Provider
      value={{
        users,
        activeUser,
        ready,
        isSwitching,
        switchUser,
        switchUserByUuid,
        createUser,
        renameUser,
        deleteUser,
        importAsNewUser,
        refreshUsers,
        consumePendingRoute,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
