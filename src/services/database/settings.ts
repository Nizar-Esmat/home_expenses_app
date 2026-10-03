import { Settings, ReminderSettings } from '@/types';
import { getDb } from './client';

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  mode: 'daily',
  dailyTime: '20:00',
  intervalHours: 2,
};

export interface SettingsRow {
  key: string;
  value: string;
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [key, value],
  );
}

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings',
  );
  const map: Record<string, string> = {};
  rows.forEach((r) => (map[r.key] = r.value));
  let homeAccountIds: unknown = undefined;
  if (map['homeAccountIds']) {
    try {
      homeAccountIds = JSON.parse(map['homeAccountIds']);
    } catch {
      homeAccountIds = undefined;
    }
  }

  let reminder: ReminderSettings = DEFAULT_REMINDER_SETTINGS;
  if (map['reminder']) {
    try {
      reminder = { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(map['reminder']) };
    } catch {
      reminder = DEFAULT_REMINDER_SETTINGS;
    }
  }

  return {
    currency: map['currency'] ?? 'EGP',
    themeMode: (map['themeMode'] as Settings['themeMode']) ?? 'dark',
    customCategories: map['customCategories'] ? JSON.parse(map['customCategories']) : [],
    customCategoryEmojis: map['customCategoryEmojis'] ? JSON.parse(map['customCategoryEmojis']) : {},
    homeAccountIds: Array.isArray(homeAccountIds)
      ? homeAccountIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id))
      : undefined,
    reminder,
  };
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  const settings = await getSettings();
  return settings.reminder ?? DEFAULT_REMINDER_SETTINGS;
}

export async function saveReminderSettings(reminder: ReminderSettings): Promise<void> {
  await saveSetting('reminder', JSON.stringify(reminder));
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  for (const [key, value] of Object.entries(settings) as [string, unknown][]) {
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await saveSetting(key, str);
  }
}

export async function getRawSettingsRows(): Promise<SettingsRow[]> {
  const db = await getDb();
  return db.getAllAsync<SettingsRow>('SELECT key, value FROM settings');
}
