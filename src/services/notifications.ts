import { Platform } from 'react-native';
import type * as ExpoNotifications from 'expo-notifications';
import { ReminderSettings } from '@/types';
import {
  getReminderSettings,
  saveReminderSettings,
  DEFAULT_REMINDER_SETTINGS,
} from './database/settings';

export const REMINDER_CHANNEL_ID = 'expense-reminders';

let Notifications: typeof ExpoNotifications | null = null;
let isNotificationAvailable = false;

try {
  // Use require so that missing native modules don't crash the entire JavaScript bundle
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications');
  isNotificationAvailable = true;
} catch (e) {
  console.warn(
    '[BudgetBuddy] expo-notifications native module is not available in this build. Run `npx expo run:android` to rebuild with native notification support.',
    e
  );
  Notifications = null;
  isNotificationAvailable = false;
}

// Configure foreground presentation behavior if native module is available
if (Notifications && isNotificationAvailable) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.warn('[BudgetBuddy] Failed to set notification handler:', e);
  }
}

/**
 * Checks whether native notification support is available in the current build.
 */
export function isNotificationSupported(): boolean {
  return isNotificationAvailable && Notifications !== null;
}

/**
 * Initializes notification channels and listeners.
 */
export async function initNotifications(): Promise<void> {
  if (!Notifications || !isNotificationAvailable) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: 'Expense Reminders',
        description: 'Reminders to log your daily expenses',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#408A71',
      });
    }
  } catch (error) {
    console.warn('[BudgetBuddy] Failed to init notification channel:', error);
  }
}

/**
 * Requests permission to display notifications.
 * Returns true if granted, false otherwise.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications || !isNotificationAvailable) return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;

    if (existing.status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = requested.status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('[BudgetBuddy] Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Cancels all scheduled reminder notifications.
 */
export async function cancelExpenseReminder(): Promise<void> {
  if (!Notifications || !isNotificationAvailable) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('[BudgetBuddy] Failed to cancel notifications:', error);
  }
}

/**
 * Schedules an expense reminder according to user settings.
 * Clears previously scheduled reminders before setting the new one.
 */
export async function scheduleExpenseReminder(
  settings: ReminderSettings
): Promise<boolean> {
  if (!Notifications || !isNotificationAvailable) return false;

  // Always clear previous schedules first
  await cancelExpenseReminder();

  if (!settings.enabled) {
    return true;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return false;
  }

  const content: ExpoNotifications.NotificationContentInput = {
    title: 'BudgetBuddy Reminder 💰',
    body: 'Time to record your expenses! Keep your budget accurate.',
    data: { action: 'add-expense' },
    sound: 'default',
  };

  if (Platform.OS === 'android') {
    (content as { channelId?: string }).channelId = REMINDER_CHANNEL_ID;
  }

  if (settings.mode === 'daily') {
    const parts = (settings.dailyTime || '20:00').split(':');
    const hour = parseInt(parts[0] ?? '20', 10);
    const minute = parseInt(parts[1] ?? '0', 10);

    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: isNaN(hour) ? 20 : hour,
        minute: isNaN(minute) ? 0 : minute,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  } else {
    // Interval mode (every X hours)
    const hours = Math.max(1, settings.intervalHours || 2);
    const seconds = hours * 3600;

    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: true,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  }

  return true;
}

/**
 * Sends an immediate test notification (2 seconds delay) to verify banner,
 * sound, and permission setup.
 */
export async function sendTestNotification(): Promise<boolean> {
  if (!Notifications || !isNotificationAvailable) return false;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return false;
  }

  const content: ExpoNotifications.NotificationContentInput = {
    title: 'BudgetBuddy Test Reminder 🔔',
    body: 'Notifications are working! Tap here to add an expense.',
    data: { action: 'add-expense' },
    sound: 'default',
  };

  if (Platform.OS === 'android') {
    (content as { channelId?: string }).channelId = REMINDER_CHANNEL_ID;
  }

  await Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      repeats: false,
      channelId: REMINDER_CHANNEL_ID,
    },
  });

  return true;
}

/**
 * Checks database settings and applies the reminder schedule.
 */
export async function syncReminderSchedule(): Promise<void> {
  if (!Notifications || !isNotificationAvailable) return;
  try {
    const settings = await getReminderSettings();
    if (settings.enabled) {
      await scheduleExpenseReminder(settings);
    }
  } catch (error) {
    console.warn('[BudgetBuddy] Failed to sync reminder schedule:', error);
  }
}

/**
 * Registers response listener for when user taps a notification.
 * Returns an unsubscription function.
 */
export function addNotificationResponseListener(
  onAction: (action: string) => void
): () => void {
  if (!Notifications || !isNotificationAvailable) {
    return () => {};
  }

  try {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const action = response.notification.request.content.data?.action;
        if (typeof action === 'string') {
          onAction(action);
        }
      }
    );

    Notifications.getLastNotificationResponseAsync().then((response) => {
      const action = response?.notification.request.content.data?.action;
      if (typeof action === 'string') {
        onAction(action);
      }
    });

    return () => {
      subscription.remove();
    };
  } catch (error) {
    console.warn('[BudgetBuddy] Failed to attach notification response listener:', error);
    return () => {};
  }
}

export { getReminderSettings, saveReminderSettings, DEFAULT_REMINDER_SETTINGS };
