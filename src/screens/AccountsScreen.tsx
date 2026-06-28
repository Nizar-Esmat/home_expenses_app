import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import {
  getAccounts,
  archiveAccount,
  unarchiveAccount,
  canDeleteAccount,
  recalculateAccountBalances,
  getSettings,
  saveSettings,
} from '@/services/database';
import { Account } from '@/types';
import { useAppDialog } from '@/components/AppDialog';

// Helper: show balance without .00 for whole numbers
function formatBalance(amount: number): string {
  const isWhole = amount % 1 === 0;
  return isWhole
    ? amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    : amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

const TYPE_LABEL_MAP: Record<string, string> = {
  cash: 'Cash account',
  bank_account: 'Bank account',
  e_wallet: 'E-Wallet',
};

export default function AccountsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { showDialog } = useAppDialog();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [homeAccountIds, setHomeAccountIds] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [currency, setCurrency] = useState('EGP');

  const load = useCallback(async () => {
    await recalculateAccountBalances();
    const [all, settings] = await Promise.all([getAccounts(), getSettings()]);
    setAccounts(all);
    setCurrency(settings.currency ?? 'EGP');
    const validIds = (settings.homeAccountIds ?? [])
      .filter((id) =>
        all.some((a) => a.id === id && a.isArchived === 0),
      )
      .slice(0, 3);
    setHomeAccountIds(validIds);
    if ((settings.homeAccountIds ?? []).join(',') !== validIds.join(',')) {
      saveSettings({ homeAccountIds: validIds });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleArchive = (acc: Account) => {
    const isArchived = acc.isArchived === 1;
    const action = isArchived ? 'Unarchive' : 'Archive';
    showDialog({
      title: `${action} Account`,
      message: isArchived
        ? `"${acc.name}" will be visible again in account selectors.`
        : `"${acc.name}" will be hidden from account selectors. Existing transactions are kept.`,
      icon: isArchived ? '📂' : '🗄️',
      type: isArchived ? 'info' : 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: isArchived ? 'default' : 'destructive',
          onPress: async () => {
            if (isArchived) {
              await unarchiveAccount(acc.id);
            } else {
              await archiveAccount(acc.id);
            }
            load();
          },
        },
      ],
    });
  };

  const handleDelete = async (acc: Account) => {
    const result = await canDeleteAccount(acc.id);
    if (!result.ok) {
      const message =
        result.reason === 'default'
          ? 'The default account cannot be deleted. Archive it instead.'
          : result.reason === 'has_transfers'
            ? 'This account has linked transfers. Remove all transfers involving it first, or archive it instead.'
            : 'This account has transactions. Archive it to hide it, or remove all linked transactions first.';
      showDialog({
        title: 'Cannot Delete',
        message,
        icon: '⚠️',
        type: 'warning',
        buttons: [{ text: 'Got it', style: 'default' }],
      });
      return;
    }
    showDialog({
      title: 'Delete Account',
      message: `Permanently delete "${acc.name}"?`,
      icon: '🗑️',
      type: 'danger',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { getDb } = await import('@/services/database/client');
            const db = await getDb();
            await db.runAsync('DELETE FROM accounts WHERE id = ?', [acc.id]);
            load();
          },
        },
      ],
    });
  };

  const handleToggleHome = async (acc: Account) => {
    const isPinned = homeAccountIds.includes(acc.id);
    if (acc.isArchived === 1 && !isPinned) return;
    if (isPinned) {
      const updated = homeAccountIds.filter((id) => id !== acc.id);
      setHomeAccountIds(updated);
      await saveSettings({ homeAccountIds: updated });
      return;
    }
    const activePinnedIds = homeAccountIds.filter((id) =>
      accounts.some(
        (a) => a.id === id && a.isArchived === 0),
    );
    if (activePinnedIds.length < 3) {
      const updated = [...activePinnedIds, acc.id];
      setHomeAccountIds(updated);
      await saveSettings({ homeAccountIds: updated });
      return;
    }

    const current = activePinnedIds
      .map((id) => accounts.find((a) => a.id === id && a.isArchived === 0))
      .filter((a): a is Account => Boolean(a));

    showDialog({
      title: 'Replace Home Account',
      message:
        'You can show up to 3 accounts on Home. Choose one to replace.',
      icon: '🏷️',
      type: 'info',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        ...current.map((c) => ({
          text: c.name,
          style: 'default' as const,
          onPress: async () => {
            const updated = activePinnedIds
              .filter((id) => id !== c.id)
              .concat(acc.id);
            setHomeAccountIds(updated);
            await saveSettings({ homeAccountIds: updated });
          },
        })),
      ],
    });
  };

  const totalBalance = accounts
    .filter((a) => a.isArchived === 0)
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const active = accounts.filter((a) => a.isArchived === 0);
  const archived = accounts.filter((a) => a.isArchived === 1);

  const renderRow = (acc: Account, isLast: boolean) => {
    const accentColor = acc.color ?? colors.primary;
    const hasZeroBalance = acc.currentBalance === 0;
    const balanceColor = hasZeroBalance
      ? colors.textSecondary
      : acc.currentBalance > 0
        ? colors.success
        : colors.danger;
    const isPinnedHome = homeAccountIds.includes(acc.id);
    const isExpanded = expandedId === acc.id;
    const typeLabel = TYPE_LABEL_MAP[acc.type] ?? acc.type;

    return (
      <View key={acc.id}>
        <TouchableOpacity
          onPress={() => toggleExpand(acc.id)}
          activeOpacity={0.7}
        >
          <View style={styles.row}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: accentColor + '22' },
              ]}
            >
              <Text style={styles.iconEmoji}>{acc.icon ?? '💳'}</Text>
            </View>
            <View style={styles.rowInfo}>
              <View style={styles.rowNameRow}>
                <Text
                  style={[styles.rowName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {acc.name}
                </Text>
                {acc.isDefault === 1 && (
                  <View
                    style={[
                      styles.defaultTag,
                      { backgroundColor: colors.primary + '22' },
                    ]}
                  >
                    <Text
                      style={[styles.defaultTagText, { color: colors.primary }]}
                    >
                      Default
                    </Text>
                  </View>
                )}
                {acc.isPrimary === 1 && (
                  <View
                    style={[
                      styles.defaultTag,
                      { backgroundColor: '#F59E0B22' },
                    ]}
                  >
                    <Ionicons name='star' size={10} color='#F59E0B' />
                    <Text style={[styles.defaultTagText, { color: '#F59E0B' }]}>
                      Favorite
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>
                {typeLabel}
              </Text>
            </View>
            <Text style={[styles.balance, { color: balanceColor }]}>
              {formatBalance(acc.currentBalance)}
            </Text>
            <Ionicons
              name='chevron-down'
              size={16}
              color={colors.textSecondary}
              style={[styles.chevron, isExpanded && styles.chevronUp]}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.actionStrip}>
            {/* Show on Home */}
            {(acc.isArchived === 0 || isPinnedHome) && (
                <TouchableOpacity
                  style={[
                    styles.pill,
                    isPinnedHome
                      ? {
                          backgroundColor: colors.success + '22',
                          borderColor: colors.success + '55',
                        }
                      : {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                  ]}
                  onPress={() => handleToggleHome(acc)}
                >
                  <Ionicons
                    name={isPinnedHome ? 'home' : 'home-outline'}
                    size={14}
                    color={isPinnedHome ? colors.success : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.pillLabel,
                      {
                        color: isPinnedHome
                          ? colors.success
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {isPinnedHome ? 'On Home' : 'Show on Home'}
                  </Text>
                </TouchableOpacity>
              )}

            {/* Edit */}
            <TouchableOpacity
              style={[
                styles.pill,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() =>
                router.push({
                  pathname: '/add-account',
                  params: { accountId: String(acc.id) },
                })
              }
            >
              <Ionicons
                name='pencil-outline'
                size={14}
                color={colors.textSecondary}
              />
              <Text style={[styles.pillLabel, { color: colors.textSecondary }]}>
                Edit
              </Text>
            </TouchableOpacity>

            {/* Archive / Unarchive */}
            <TouchableOpacity
              style={[
                styles.pill,
                {
                  backgroundColor: colors.warning + '22',
                  borderColor: colors.warning + '55',
                },
              ]}
              onPress={() => handleArchive(acc)}
            >
              <Ionicons
                name={acc.isArchived === 1 ? 'eye-outline' : 'archive-outline'}
                size={14}
                color={colors.warning}
              />
              <Text style={[styles.pillLabel, { color: colors.warning }]}>
                {acc.isArchived === 1 ? 'Unarchive' : 'Archive'}
              </Text>
            </TouchableOpacity>

            {/* Delete — non-default only */}
            {acc.isDefault === 0 && (
              <TouchableOpacity
                style={[
                  styles.pill,
                  {
                    backgroundColor: colors.danger + '22',
                    borderColor: colors.danger + '55',
                  },
                ]}
                onPress={() => handleDelete(acc)}
              >
                <Ionicons
                  name='trash-outline'
                  size={14}
                  color={colors.danger}
                />
                <Text style={[styles.pillLabel, { color: colors.danger }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!isLast && (
          <View
            style={[styles.rowDivider, { borderBottomColor: colors.border }]}
          />
        )}
      </View>
    );
  };

  const renderList = (list: Account[]) => (
    <View style={styles.listContainer}>
      {list.map((acc, index) => renderRow(acc, index === list.length - 1))}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name='arrow-back' size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Accounts
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Net Worth Summary */}
        {(() => {
          const isWhole = totalBalance % 1 === 0;
          const [intPart, decPart] = totalBalance
            .toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
            .split('.');
          return (
            <View style={[styles.summaryCard]}>
              <View style={styles.summaryTopRow}>
                <Text style={styles.summaryLabel}>Total Balance</Text>
              </View>

              <View style={styles.summaryAmountRow}>
                <Text style={styles.summaryCurrency}>{currency}</Text>
                <Text style={styles.summaryAmount}>{intPart}</Text>
                {!isWhole && (
                  <Text style={styles.summaryDecimals}>.{decPart}</Text>
                )}
              </View>

              <View style={styles.summaryStatsRow}>
                <View style={styles.summaryStat}>
                  <Ionicons
                    name='checkmark-circle'
                    size={10}
                    color='#00fc0d56'
                  />
                  <Text style={styles.summaryStatText}>
                    {active.length} active account
                    {active.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                {archived.length > 0 && (
                  <View style={styles.summaryStat}>
                    <Ionicons name='remove-circle' size={10} color='#f7a000' />
                    <Text style={styles.summaryStatText}>
                      {archived.length} archived
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })()}

        {/* Active Accounts */}
        {active.length > 0 && (
          <>
            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              ACCOUNTS
            </Text>
            {renderList(active)}
          </>
        )}

        {/* Archived */}
        {archived.length > 0 && (
          <>
            <Text
              style={[
                styles.sectionLabel,
                { color: colors.textSecondary, marginTop: 16 },
              ]}
            >
              ARCHIVED
            </Text>
            {renderList(archived)}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* FAB - Add new account */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/add-account')}
        activeOpacity={0.8}
      >
        <Ionicons name='add' size={28} color='#FFFFFF' />
      </TouchableOpacity>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },

  summaryCard: {
    borderWidth: 1,
    borderColor: '#C0C0C020',
    backgroundColor: '#1E293B',
    position: 'relative',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    overflow: 'hidden',
  },
  summaryCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -50,
    right: -40,
  },
  summaryCircle2: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -30,
    right: 60,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginBottom: 16,
  },
  summaryCurrency: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryAmount: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 42,
  },
  summaryDecimals: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 12,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryStat: {
    borderWidth: 0.5,
    borderColor: '#ffffff0e',
    backgroundColor: '#75757541',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  summaryStatText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '500',
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Flat list container - no card wrapper
  listContainer: {
    marginBottom: 4,
  },

  // Account row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 22 },
  rowInfo: { flex: 1 },
  rowNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  rowName: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  typeLabel: { fontSize: 12, marginTop: 1 },
  defaultTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultTagText: { fontSize: 11, fontWeight: '700' },
  balance: { fontSize: 16, fontWeight: '800' },
  chevron: { marginLeft: 4 },
  chevronUp: { transform: [{ rotate: '180deg' }] },

  // Action strip
  actionStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingLeft: 54,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  pillLabel: { fontSize: 13, fontWeight: '500' },

  // Divider between rows
  rowDivider: {
    borderBottomWidth: 1,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
