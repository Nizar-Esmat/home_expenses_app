import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/theme/ThemeContext';
import {
  COLOR_PALETTES,
  ColorPaletteName,
  PALETTE_COLORS,
  PALETTE_COLORS_DARK,
} from '@/theme/colors';
import {
  exportBackupAndShare,
  exportDatabaseFileAndShare,
  pickAndParseBackupFile,
  importBackupDataIntoCurrentProfile,
} from '@/services/sync';
import { IS_PRODUCTION } from '@/services/constants';
import { seedActiveDatabaseWithSampleData, DatabaseBackupData } from '@/services/database';
import { useAppDialog } from '@/components/AppDialog';
import { ReminderSettings, UserProfile } from '@/types';
import { useUser } from '@/contexts/UserContext';
import { ProfileNameModal } from '@/components/ProfileSwitcherModal';
import {
  getReminderSettings,
  saveReminderSettings,
  scheduleExpenseReminder,
  cancelExpenseReminder,
  requestNotificationPermissions,
  sendTestNotification,
  isNotificationSupported,
  DEFAULT_REMINDER_SETTINGS,
} from '@/services/notifications';

const PALETTES = Object.keys(COLOR_PALETTES) as ColorPaletteName[];
const INTERVAL_PRESETS = [1, 2, 3, 4, 6, 8, 12];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDisplayTime(timeStr: string): string {
  const parts = (timeStr || '20:00').split(':');
  const h = parseInt(parts[0] || '20', 10);
  const m = parseInt(parts[1] || '0', 10);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getTimePickerDate(timeStr: string): Date {
  const parts = (timeStr || '20:00').split(':');
  const d = new Date();
  d.setHours(parseInt(parts[0] || '20', 10), parseInt(parts[1] || '0', 10), 0, 0);
  return d;
}

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme, colorPalette, changeColorPalette } =
    useTheme();
  const router = useRouter();
  const { showDialog } = useAppDialog();
  const {
    users,
    activeUser,
    switchUser,
    createUser,
    renameUser,
    deleteUser,
    importAsNewUser,
  } = useUser();

  const ringColor = colors.textPrimary;

  const [syncingAction, setSyncingAction] = useState<
    'export_json' | 'export_db' | 'import' | 'sample' | null
  >(null);

  const [profileModal, setProfileModal] = useState<
    | { mode: 'create' }
    | { mode: 'rename'; target: UserProfile }
    | { mode: 'import'; data: DatabaseBackupData; suggestedName: string }
    | null
  >(null);

  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(
    DEFAULT_REMINDER_SETTINGS,
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getReminderSettings()
      .then((res) => {
        if (isMounted) {
          setReminderSettings(res);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleReminder = async (enabled: boolean) => {
    if (enabled) {
      if (!isNotificationSupported()) {
        showDialog({
          title: 'Rebuild Required',
          message:
            'Notifications require native code. Please rebuild your development build using:\n\nnpx expo run:android\n\n(Note: expo-notifications is not supported in Expo Go on Android).',
          icon: '🔔',
          type: 'warning',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        return;
      }
      const granted = await requestNotificationPermissions();
      if (!granted) {
        showDialog({
          title: 'Permission Required',
          message:
            'Please enable notifications for BudgetBuddy in your device settings to receive expense reminders.',
          icon: '🔔',
          type: 'warning',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        return;
      }
      const updated: ReminderSettings = { ...reminderSettings, enabled: true };
      setReminderSettings(updated);
      await saveReminderSettings(updated);
      await scheduleExpenseReminder(updated, activeUser ?? undefined);
    } else {
      const updated: ReminderSettings = { ...reminderSettings, enabled: false };
      setReminderSettings(updated);
      await saveReminderSettings(updated);
      await cancelExpenseReminder(activeUser?.uuid);
    }
  };

  const handleChangeMode = async (mode: 'daily' | 'interval') => {
    const updated: ReminderSettings = { ...reminderSettings, mode };
    setReminderSettings(updated);
    await saveReminderSettings(updated);
    if (updated.enabled) {
      await scheduleExpenseReminder(updated, activeUser ?? undefined);
    }
  };

  const handleTimeChange = async (
    _event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const h = String(selectedDate.getHours()).padStart(2, '0');
      const m = String(selectedDate.getMinutes()).padStart(2, '0');
      const timeStr = `${h}:${m}`;
      const updated: ReminderSettings = {
        ...reminderSettings,
        dailyTime: timeStr,
      };
      setReminderSettings(updated);
      await saveReminderSettings(updated);
      if (updated.enabled) {
        await scheduleExpenseReminder(updated, activeUser ?? undefined);
      }
    }
  };

  const handleChangeInterval = async (hours: number) => {
    const updated: ReminderSettings = {
      ...reminderSettings,
      intervalHours: hours,
    };
    setReminderSettings(updated);
    await saveReminderSettings(updated);
    if (updated.enabled) {
      await scheduleExpenseReminder(updated, activeUser ?? undefined);
    }
  };

  const handleSendTest = async () => {
    if (isSendingTest) return;
    if (!isNotificationSupported()) {
      showDialog({
        title: 'Rebuild Required',
        message:
          'Notifications require native code. Please rebuild your development build using:\n\nnpx expo run:android\n\n(Note: expo-notifications is not supported in Expo Go on Android).',
        icon: '🔔',
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }
    setIsSendingTest(true);
    try {
      const sent = await sendTestNotification(activeUser ?? undefined);
      if (sent) {
        showDialog({
          title: 'Test Reminder Sent',
          message:
            'A test notification will arrive in 2 seconds. Tap it to test opening the Add Expense modal.',
          icon: '🔔',
          type: 'success',
          buttons: [{ text: 'OK', style: 'default' }],
        });
      } else {
        showDialog({
          title: 'Permission Denied',
          message:
            'Notification permission is needed to receive reminders. Please enable it in device settings.',
          icon: '⚠️',
          type: 'warning',
          buttons: [{ text: 'OK', style: 'default' }],
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send test reminder.';
      showDialog({
        title: 'Error',
        message: msg,
        icon: '❌',
        type: 'danger',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const startJsonExport = async () => {
    if (syncingAction) return;
    try {
      setSyncingAction('export_json');
      const { fileName } = await exportBackupAndShare();
      showDialog({
        title: 'JSON Backup Exported',
        message: `Your JSON backup file "${fileName}" is ready to share.`,
        icon: '📤',
        type: 'success',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Export failed.';
      showDialog({
        title: 'Export Failed',
        message: msg,
        icon: '❌',
        type: 'danger',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setSyncingAction(null);
    }
  };

  const startDatabaseExport = async () => {
    if (syncingAction) return;
    try {
      setSyncingAction('export_db');
      const { fileName } = await exportDatabaseFileAndShare();
      showDialog({
        title: 'Database Exported',
        message: `Your database file "${fileName}" is ready to share.`,
        icon: '📤',
        type: 'success',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Database export failed.';
      showDialog({
        title: 'Export Failed',
        message: msg,
        icon: '❌',
        type: 'danger',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setSyncingAction(null);
    }
  };

  const handleExport = () => {
    showDialog({
      title: 'Export Data',
      message:
        'Choose the export format. JSON is best for app backup/import. Database file is a raw SQLite copy.',
      icon: '📤',
      type: 'info',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export JSON Backup',
          style: 'default',
          onPress: () => {
            startJsonExport();
          },
        },
        {
          text: 'Export Database File',
          style: 'default',
          onPress: () => {
            startDatabaseExport();
          },
        },
      ],
    });
  };

  const formatImportSummary = (result: {
    categoriesAdded: number;
    incomeCategoriesAdded: number;
    expensesAdded: number;
    expensesSkipped: number;
    incomesAdded: number;
    incomesSkipped: number;
    accountsAdded: number;
    transfersAdded: number;
    settingsMerged: number;
  }) =>
    [
      `Categories added: ${result.categoriesAdded}`,
      `Income categories added: ${result.incomeCategoriesAdded}`,
      `Expenses added: ${result.expensesAdded}`,
      `Expenses skipped: ${result.expensesSkipped}`,
      `Income added: ${result.incomesAdded}`,
      `Income skipped: ${result.incomesSkipped}`,
      `Accounts added: ${result.accountsAdded}`,
      `Transfers added: ${result.transfersAdded}`,
      `Settings merged: ${result.settingsMerged}`,
    ].join('\n');

  const mergeIntoCurrent = async (data: DatabaseBackupData) => {
    try {
      setSyncingAction('import');
      const result = await importBackupDataIntoCurrentProfile(data);
      showDialog({
        title: 'Import Complete',
        message: `${formatImportSummary(result)}\n\nImported settings overwrite local settings for "${activeUser?.name ?? 'current profile'}".`,
        icon: '✅',
        type: 'success',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed.';
      showDialog({
        title: 'Import Failed',
        message: msg,
        icon: '❌',
        type: 'danger',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setSyncingAction(null);
    }
  };

  const handleImport = async () => {
    if (syncingAction) return;
    try {
      setSyncingAction('import');
      const { fileName, data } = await pickAndParseBackupFile();
      setSyncingAction(null);

      const baseName = fileName.replace(/\.json$/i, '').slice(0, 24) || 'Imported';
      showDialog({
        title: 'Choose Import Mode',
        message: `How would you like to import "${fileName}"?`,
        icon: '📥',
        type: 'info',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: `Merge into "${activeUser?.name ?? 'Current'}"`,
            style: 'default',
            onPress: () => {
              mergeIntoCurrent(data);
            },
          },
          {
            text: 'Import as New Profile',
            style: 'default',
            onPress: () => {
              setProfileModal({
                mode: 'import',
                data,
                suggestedName: baseName,
              });
            },
          },
        ],
      });
    } catch (e) {
      setSyncingAction(null);
      const msg = e instanceof Error ? e.message : 'Import failed.';
      if (msg === 'Import cancelled.') return;
      showDialog({
        title: 'Import Failed',
        message: msg,
        icon: '❌',
        type: 'danger',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    }
  };

  const handleDeleteProfile = (profile: UserProfile) => {
    if (users.length <= 1) return;
    showDialog({
      title: `Delete "${profile.name}"?`,
      message: `This will permanently delete "${profile.name}" and all of its accounts, transactions, loans, and settings. This cannot be undone.`,
      icon: '🗑️',
      type: 'danger',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(profile.id);
            } catch (e) {
              showDialog({
                title: 'Error',
                message: e instanceof Error ? e.message : 'Failed to delete profile.',
                type: 'danger',
                buttons: [{ text: 'OK', style: 'default' }],
              });
            }
          },
        },
      ],
    });
  };

  const handleSeedSampleData = () => {
    showDialog({
      title: 'Load Sample Data?',
      message:
        'This will populate your app with realistic sample accounts, expenses, incomes, transfers, and loans for testing.',
      type: 'info',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load Data',
          style: 'default',
          onPress: async () => {
            try {
              setSyncingAction('sample');
              await seedActiveDatabaseWithSampleData();
              showDialog({
                title: 'Data Loaded!',
                message: 'Sample accounts, expenses, incomes, transfers, and loans have been created. Switch to Home or Statistics to explore!',
                type: 'success',
                buttons: [{ text: 'OK', style: 'default' }],
              });
            } catch {
              showDialog({
                title: 'Error',
                message: 'Failed to populate sample data.',
                type: 'danger',
                buttons: [{ text: 'OK', style: 'default' }],
              });
            } finally {
              setSyncingAction(null);
            }
          },
        },
      ],
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]} accessibilityRole="header">
          Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profiles ───────────────────────────────────── */}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Profiles
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {users.map((profile, idx) => {
            const isActive = profile.id === activeUser?.id;
            return (
              <React.Fragment key={profile.id}>
                {idx > 0 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
                <TouchableOpacity
                  style={styles.navRow}
                  onPress={() => {
                    if (!isActive) switchUser(profile.id);
                  }}
                  activeOpacity={isActive ? 1 : 0.65}
                  accessibilityRole="button"
                  accessibilityLabel={`Profile ${profile.name}${isActive ? ', active' : '. Tap to switch'}`}
                >
                  <View style={styles.navRowLeft}>
                    <View
                      style={[
                        styles.navIcon,
                        {
                          backgroundColor: isActive
                            ? colors.primary + '33'
                            : colors.inputFill,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isActive ? 'person' : 'person-outline'}
                        size={16}
                        color={isActive ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.profileNameWrap}>
                      <Text
                        style={[styles.navLabel, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {profile.name}
                      </Text>
                      <Text style={[styles.navSub, { color: isActive ? colors.primary : colors.textSecondary }]}>
                        {isActive ? 'Active profile' : 'Tap to switch'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.profileActions}>
                    <TouchableOpacity
                      style={styles.profileIconBtn}
                      onPress={() => setProfileModal({ mode: 'rename', target: profile })}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Rename profile ${profile.name}`}
                    >
                      <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {users.length > 1 && (
                      <TouchableOpacity
                        style={styles.profileIconBtn}
                        onPress={() => handleDeleteProfile(profile)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete profile ${profile.name}`}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.navRowNoBorder}
            onPress={() => setProfileModal({ mode: 'create' })}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel="Add new profile"
          >
            <View style={styles.navRowLeft}>
              <View
                style={[
                  styles.navIcon,
                  { backgroundColor: colors.primary + '33' },
                ]}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.navLabel, { color: colors.primary }]}>
                  Add New Profile
                </Text>
                <Text style={[styles.navSub, { color: colors.textSecondary }]}>
                  Start a clean separate workspace
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Appearance ─────────────────────────────────── */}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 24 }]}>
          Appearance
        </Text>

        {/* Dark Mode — primary toggle, shown first */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.navRow}>
            <View style={styles.navRowLeft}>
              <View
                style={[
                  styles.navIcon,
                  { backgroundColor: colors.primary + '33' },
                ]}
              >
                <Ionicons
                  name='moon-outline'
                  size={16}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.navLabel, { color: colors.textPrimary }]}>
                Dark Mode
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{
                false: isDark ? '#3F3F46' : '#D4D4D8',
                true: colors.primary,
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDark ? '#3F3F46' : '#D4D4D8'}
              accessibilityLabel="Toggle Dark Mode"
              accessibilityRole="switch"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Accent Color
          </Text>
          <View style={styles.paletteGrid}>
            {PALETTES.map((p) => {
              const selected = colorPalette === p;
              const color = isDark ? PALETTE_COLORS_DARK[p] : PALETTE_COLORS[p];
              const checkmarkColor =
                p === 'yellow' ||
                p === 'lime' ||
                (isDark && p === 'grey') ||
                (!isDark && (p === 'orange' || p === 'green' || p === 'teal'))
                  ? '#111827'
                  : '#FFFFFF';
              return (
                <TouchableOpacity
                  key={p}
                  style={styles.paletteItem}
                  onPress={() => changeColorPalette(p)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${capitalize(p)} palette`}
                >
                  <View
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color },
                      selected && { borderColor: ringColor, borderWidth: 3 },
                    ]}
                  >
                    {selected && (
                      <View
                        style={[styles.checkmark, { backgroundColor: color }]}
                      >
                        <Ionicons name='checkmark' size={14} color={checkmarkColor} />
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.paletteName,
                      {
                        color: selected
                          ? colors.textPrimary
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {capitalize(p)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Reminders & Notifications ─────────────────── */}

        <Text
          style={[
            styles.sectionLabel,
            { color: colors.textSecondary, marginTop: 24 },
          ]}
        >
          Reminders & Notifications
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Main Toggle */}
          <View style={styles.navRow}>
            <View style={styles.navRowLeft}>
              <View
                style={[
                  styles.navIcon,
                  { backgroundColor: colors.primary + '33' },
                ]}
              >
                <Ionicons
                  name='alarm-outline'
                  size={16}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={[styles.navLabel, { color: colors.textPrimary }]}>
                  Expense Reminders
                </Text>
                <Text style={[styles.navSub, { color: colors.textSecondary }]}>
                  Notify me to record daily expenses
                </Text>
              </View>
            </View>
            <Switch
              value={reminderSettings.enabled}
              onValueChange={handleToggleReminder}
              trackColor={{
                false: isDark ? '#3F3F46' : '#D4D4D8',
                true: colors.primary,
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDark ? '#3F3F46' : '#D4D4D8'}
              accessibilityLabel="Toggle Expense Reminders"
              accessibilityRole="switch"
            />
          </View>

          {reminderSettings.enabled && (
            <>
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />

              <View style={styles.reminderContent}>
                <Text
                  style={[
                    styles.fieldLabelNoPadding,
                    { color: colors.textSecondary },
                  ]}
                >
                  Schedule Mode
                </Text>

                <View
                  style={[
                    styles.modeSelector,
                    {
                      backgroundColor: colors.inputFill,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.modeTab,
                      reminderSettings.mode === 'daily' && {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => handleChangeMode('daily')}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name='time-outline'
                      size={15}
                      color={
                        reminderSettings.mode === 'daily'
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.modeTabText,
                        {
                          color:
                            reminderSettings.mode === 'daily'
                              ? colors.textPrimary
                              : colors.textSecondary,
                          fontWeight:
                            reminderSettings.mode === 'daily' ? '700' : '500',
                        },
                      ]}
                    >
                      Daily Time
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeTab,
                      reminderSettings.mode === 'interval' && {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => handleChangeMode('interval')}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name='repeat-outline'
                      size={15}
                      color={
                        reminderSettings.mode === 'interval'
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.modeTabText,
                        {
                          color:
                            reminderSettings.mode === 'interval'
                              ? colors.textPrimary
                              : colors.textSecondary,
                          fontWeight:
                            reminderSettings.mode === 'interval' ? '700' : '500',
                        },
                      ]}
                    >
                      Repeating Interval
                    </Text>
                  </TouchableOpacity>
                </View>

                {reminderSettings.mode === 'daily' ? (
                  <View style={styles.optionSection}>
                    <Text
                      style={[
                        styles.fieldLabelNoPadding,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Reminder Time
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.timePickerButton,
                        {
                          backgroundColor: colors.inputFill,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => setShowTimePicker(true)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.timePickerLeft}>
                        <Ionicons
                          name='time'
                          size={18}
                          color={colors.primary}
                        />
                        <Text
                          style={[
                            styles.timePickerText,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {formatDisplayTime(reminderSettings.dailyTime)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.changeBadge,
                          { backgroundColor: colors.primary + '22' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.changeBadgeText,
                            { color: colors.primary },
                          ]}
                        >
                          Change
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {showTimePicker && (
                      <DateTimePicker
                        value={getTimePickerDate(reminderSettings.dailyTime)}
                        mode='time'
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleTimeChange}
                      />
                    )}
                  </View>
                ) : (
                  <View style={styles.optionSection}>
                    <Text
                      style={[
                        styles.fieldLabelNoPadding,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Repeat Frequency
                    </Text>
                    <View style={styles.intervalGrid}>
                      {INTERVAL_PRESETS.map((hrs) => {
                        const isSelected =
                          reminderSettings.intervalHours === hrs;
                        return (
                          <TouchableOpacity
                            key={hrs}
                            style={[
                              styles.intervalChip,
                              {
                                backgroundColor: isSelected
                                  ? colors.primary
                                  : colors.inputFill,
                                borderColor: isSelected
                                  ? colors.primary
                                  : colors.border,
                              },
                            ]}
                            onPress={() => handleChangeInterval(hrs)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.intervalChipText,
                                {
                                  color: isSelected
                                    ? '#FFFFFF'
                                    : colors.textPrimary,
                                  fontWeight: isSelected ? '700' : '500',
                                },
                              ]}
                            >
                              {`Every ${hrs}h`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {!IS_PRODUCTION && (
                  <View style={styles.testContainer}>
                    <TouchableOpacity
                      style={[
                        styles.testButton,
                        {
                          backgroundColor: colors.inputFill,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={handleSendTest}
                      disabled={isSendingTest}
                      activeOpacity={0.7}
                    >
                      {isSendingTest ? (
                        <ActivityIndicator
                          size='small'
                          color={colors.primary}
                        />
                      ) : (
                        <>
                          <Ionicons
                            name='paper-plane-outline'
                            size={15}
                            color={colors.primary}
                          />
                          <Text
                            style={[
                              styles.testButtonText,
                              { color: colors.primary },
                            ]}
                          >
                            Send Test Notification (2s)
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.testHint,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Tapping the notification will immediately open Add Expense
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* ── Categories ─────────────────────────────────── */}

        <Text
          style={[
            styles.sectionLabel,
            { color: colors.textSecondary, marginTop: 24 },
          ]}
        >
          Categories
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.navRowWithBorder}
            onPress={() => router.push('/categories')}
            activeOpacity={0.6}
          >
            <View style={styles.navRowLeft}>
              <View
                style={[
                  styles.navIcon,
                  { backgroundColor: colors.primary + '33' },
                ]}
              >
                <Ionicons
                  name='pricetags-outline'
                  size={16}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={[styles.navLabel, { color: colors.textPrimary }]}>
                  Expense Categories
                </Text>
                <Text style={[styles.navSub, { color: colors.textSecondary }]}>
                  Add, edit & organise expense categories
                </Text>
              </View>
            </View>
            <Ionicons
              name='chevron-forward'
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.navRowNoBorder}
            onPress={() => router.push('/income-categories')}
            activeOpacity={0.6}
          >
            <View style={styles.navRowLeft}>
              <View
                style={[
                  styles.navIcon,
                  { backgroundColor: colors.primary + '33' },
                ]}
              >
                <Ionicons
                  name='cash-outline'
                  size={16}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={[styles.navLabel, { color: colors.textPrimary }]}>
                  Income Categories
                </Text>
                <Text style={[styles.navSub, { color: colors.textSecondary }]}>
                  Add, edit & organise income categories
                </Text>
              </View>
            </View>
            <Ionicons
              name='chevron-forward'
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* ── Data Sync ──────────────────────────────────── */}

        <Text
          style={[
            styles.sectionLabel,
            { color: colors.textSecondary, marginTop: 24 },
          ]}
        >
          Data Sync
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.navRowWithBorder}
            onPress={handleExport}
            activeOpacity={0.6}
            disabled={syncingAction !== null}
          >
            <View style={styles.navRowLeft}>
              <View
                style={[
                  styles.navIcon,
                  { backgroundColor: colors.primary + '33' },
                ]}
              >
                <Ionicons
                  name='download-outline'
                  size={16}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={[styles.navLabel, { color: colors.textPrimary }]}>
                  Export Data
                </Text>
                <Text style={[styles.navSub, { color: colors.textSecondary }]}>
                  Create a backup file to move to another device
                </Text>
              </View>
            </View>
            {syncingAction === 'export_json' ||
            syncingAction === 'export_db' ? (
              <ActivityIndicator color={colors.primary} size='small' />
            ) : (
              <Ionicons
                name='chevron-forward'
                size={18}
                color={colors.textSecondary}
              />
            )}
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.navRowNoBorder}
            onPress={handleImport}
            activeOpacity={0.6}
            disabled={syncingAction !== null}
          >
            <View style={styles.navRowLeft}>
              <View
                style={[
                  styles.navIcon,
                  { backgroundColor: colors.primary + '33' },
                ]}
              >
                <Ionicons
                  name='cloud-upload-outline'
                  size={16}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={[styles.navLabel, { color: colors.textPrimary }]}>
                  Import Data
                </Text>
                <Text style={[styles.navSub, { color: colors.textSecondary }]}>
                  Merge backup from old device into this one
                </Text>
              </View>
            </View>
            {syncingAction === 'import' ? (
              <ActivityIndicator color={colors.primary} size='small' />
            ) : (
              <Ionicons
                name='chevron-forward'
                size={18}
                color={colors.textSecondary}
              />
            )}
          </TouchableOpacity>
          {!IS_PRODUCTION && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={styles.navRowNoBorder}
                onPress={handleSeedSampleData}
                activeOpacity={0.6}
                disabled={syncingAction !== null}
              >
                <View style={styles.navRowLeft}>
                  <View
                    style={[
                      styles.navIcon,
                      { backgroundColor: colors.primary + '33' },
                    ]}
                  >
                    <Ionicons
                      name='flask-outline'
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                  <View>
                    <Text style={[styles.navLabel, { color: colors.textPrimary }]}>
                      Load Sample Data
                    </Text>
                    <Text style={[styles.navSub, { color: colors.textSecondary }]}>
                      Populate demo accounts, transactions & loans
                    </Text>
                  </View>
                </View>
                {syncingAction === 'sample' ? (
                  <ActivityIndicator color={colors.primary} size='small' />
                ) : (
                  <Ionicons
                    name='chevron-forward'
                    size={18}
                    color={colors.textSecondary}
                  />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={{ height: 150 }} />
      </ScrollView>

      <ProfileNameModal
        visible={profileModal !== null}
        title={
          profileModal?.mode === 'rename'
            ? 'Rename Profile'
            : profileModal?.mode === 'import'
              ? 'New Profile Name'
              : 'Create New Profile'
        }
        subtitle={
          profileModal?.mode === 'import'
            ? 'Enter a name for the new profile that will receive this backup.'
            : profileModal?.mode === 'create'
              ? 'Each profile has completely separate accounts, transactions, theme, and reminders.'
              : undefined
        }
        initialValue={
          profileModal?.mode === 'rename'
            ? profileModal.target.name
            : profileModal?.mode === 'import'
              ? profileModal.suggestedName
              : ''
        }
        confirmLabel={
          profileModal?.mode === 'rename'
            ? 'Save'
            : profileModal?.mode === 'import'
              ? 'Create & Import'
              : 'Create'
        }
        onCancel={() => setProfileModal(null)}
        onConfirm={async (name) => {
          if (!profileModal) return;
          if (profileModal.mode === 'create') {
            await createUser(name, true);
            setProfileModal(null);
          } else if (profileModal.mode === 'rename') {
            await renameUser(profileModal.target.id, name);
            setProfileModal(null);
          } else if (profileModal.mode === 'import') {
            const summary = await importAsNewUser(name, profileModal.data);
            setProfileModal(null);
            showDialog({
              title: 'Profile Imported',
              message: `Created "${name}" and imported backup:\n\n${formatImportSummary(summary)}`,
              icon: '✅',
              type: 'success',
              buttons: [{ text: 'OK', style: 'default' }],
            });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 4,
  },

  card: {
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  navRowWithBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  navRowNoBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  navRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navLabel: { fontSize: 15, fontWeight: '600' },
  navSub: { fontSize: 12, marginTop: 2 },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
    letterSpacing: 0.3,
  },

  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 16,
    rowGap: 12,
  },
  paletteItem: {
    alignItems: 'center',
    width: '20%',
    paddingVertical: 4,
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteName: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },

  reminderContent: {
    padding: 14,
  },
  fieldLabelNoPadding: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  modeSelector: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  modeTabText: {
    fontSize: 13,
  },
  optionSection: {
    marginBottom: 14,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  timePickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timePickerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  changeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  changeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  intervalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intervalChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  intervalChipText: {
    fontSize: 13,
  },
  testContainer: {
    marginTop: 6,
    alignItems: 'center',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  testHint: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  profileNameWrap: {
    flex: 1,
  },
  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
