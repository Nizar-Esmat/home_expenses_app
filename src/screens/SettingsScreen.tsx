import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  pickAndImportBackupMerge,
} from '@/services/sync';
import { useAppDialog } from '@/components/AppDialog';

const PALETTES = Object.keys(COLOR_PALETTES) as ColorPaletteName[];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme, colorPalette, changeColorPalette } =
    useTheme();
  const router = useRouter();
  const { showDialog } = useAppDialog();

  const ringColor = isDark ? '#FFFFFF' : '#374151';

  const [syncingAction, setSyncingAction] = useState<
    'export_json' | 'export_db' | 'import' | null
  >(null);

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

  const startImport = async () => {
    if (syncingAction) return;
    try {
      setSyncingAction('import');
      const result = await pickAndImportBackupMerge();
      showDialog({
        title: 'Import Complete',
        message: [
          `Categories added: ${result.categoriesAdded}`,
          `Income categories added: ${result.incomeCategoriesAdded}`,
          `Expenses added: ${result.expensesAdded}`,
          `Expenses skipped: ${result.expensesSkipped}`,
          `Income added: ${result.incomesAdded}`,
          `Income skipped: ${result.incomesSkipped}`,
          `Accounts added: ${result.accountsAdded}`,
          `Transfers added: ${result.transfersAdded}`,
          `Settings merged: ${result.settingsMerged}`,
          '',
          'Imported settings overwrite local settings. Reopen the app if theme/palette does not update instantly.',
        ].join('\n'),
        icon: '✅',
        type: 'success',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed.';
      if (msg === 'Import cancelled.') return;
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

  const handleImport = () => {
    showDialog({
      title: 'Import Backup',
      message:
        'This will merge data from the backup into your current device. Existing matching records are skipped; imported settings overwrite local settings.',
      icon: '📥',
      type: 'info',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'default',
          onPress: () => {
            startImport();
          },
        },
      ],
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Appearance ─────────────────────────────────── */}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
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
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.background}
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
              return (
                <TouchableOpacity
                  key={p}
                  style={styles.paletteItem}
                  onPress={() => changeColorPalette(p)}
                  activeOpacity={0.7}
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
                        <Ionicons name='checkmark' size={14} color='#fff' />
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
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '800' },
  content: { padding: 16 },

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
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 12,
  },
  paletteItem: {
    alignItems: 'center',
    width: 52,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
});
