import { Platform } from 'react-native';
import type * as ExpoNotifications from 'expo-notifications';
import { ReminderSettings } from '@/types';
import {
  getReminderSettings,
  saveReminderSettings,
  DEFAULT_REMINDER_SETTINGS,
} from './database/settings';
import { getActiveUser } from './database/users';

export const REMINDER_CHANNEL_ID = 'expense-reminders';

function getUserReminderId(userUuid: string): string {
  return `expense-reminder-${userUuid}`;
}

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
 * Cancels scheduled reminder notifications for a specific user (or all if omitted).
 * Also cleans up any legacy un-tagged notifications lacking a userUuid.
 */
export async function cancelExpenseReminder(userUuid?: string): Promise<void> {
  if (!Notifications || !isNotificationAvailable) return;
  try {
    if (!userUuid) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }

    await Notifications.cancelScheduledNotificationAsync(getUserReminderId(userUuid));

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      const data = item.content?.data as Record<string, unknown> | undefined;
      if (!data?.userUuid) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch (error) {
    console.warn('[BudgetBuddy] Failed to cancel notifications:', error);
  }
}

/**
 * Schedules an expense reminder for a specific user profile.
 * Preserves other profiles' scheduled reminders.
 */
export async function scheduleExpenseReminder(
  settings: ReminderSettings,
  user?: { uuid: string; name: string },
): Promise<boolean> {
  if (!Notifications || !isNotificationAvailable) return false;

  const targetUser = user ?? (await getActiveUser());
  const identifier = getUserReminderId(targetUser.uuid);

  await cancelExpenseReminder(targetUser.uuid);

  if (!settings.enabled) {
    return true;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return false;
  }

  const content: ExpoNotifications.NotificationContentInput = {
    title: `BudgetBuddy (${targetUser.name}) 💰`,
    body: 'Time to record your expenses! Keep your budget accurate.',
    data: { action: 'add-expense', userUuid: targetUser.uuid },
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
      identifier,
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
      identifier,
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
 * sound, and permission setup for the active profile.
 */
export async function sendTestNotification(
  user?: { uuid: string; name: string },
): Promise<boolean> {
  if (!Notifications || !isNotificationAvailable) return false;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return false;
  }

  const targetUser = user ?? (await getActiveUser());

  const content: ExpoNotifications.NotificationContentInput = {
    title: `BudgetBuddy (${targetUser.name}) Test 🔔`,
    body: 'Notifications are working! Tap here to add an expense.',
    data: { action: 'add-expense', userUuid: targetUser.uuid },
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
 * Checks database settings for the active user and applies the reminder schedule.
 */
export async function syncReminderSchedule(
  user?: { uuid: string; name: string },
): Promise<void> {
  if (!Notifications || !isNotificationAvailable) return;
  try {
    const targetUser = user ?? (await getActiveUser());
    const settings = await getReminderSettings();
    if (settings.enabled) {
      await scheduleExpenseReminder(settings, targetUser);
    } else {
      await cancelExpenseReminder(targetUser.uuid);
    }
  } catch (error) {
    console.warn('[BudgetBuddy] Failed to sync reminder schedule:', error);
  }
}

/**
 * Registers response listener for when user taps a notification.
 * Passes both action and target userUuid (if set) so the app can switch profiles first.
 */
export function addNotificationResponseListener(
  onAction: (action: string, userUuid?: string) => void
): () => void {
  if (!Notifications || !isNotificationAvailable) {
    return () => {};
  }

  const extractAndDispatch = (response: ExpoNotifications.NotificationResponse | null) => {
    const data = response?.notification.request.content.data as Record<string, unknown> | undefined;
    const action = data?.action;
    const userUuid = data?.userUuid;
    if (typeof action === 'string') {
      onAction(action, typeof userUuid === 'string' ? userUuid : undefined);
    }
  };

  try {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        extractAndDispatch(response);
      }
    );

    Notifications.getLastNotificationResponseAsync().then((response) => {
      extractAndDispatch(response);
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
