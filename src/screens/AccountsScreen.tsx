import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { getAccounts, archiveAccount, unarchiveAccount, canDeleteAccount, recalculateAccountBalances } from '@/services/database';
import { Account, AccountType } from '@/types';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS } from '@/components/AccountPicker';

function TypeBadge({ type }: { type: AccountType }) {
  const badgeColors: Record<AccountType, string> = {
    cash:         '#10B981',
    bank_account: '#3B82F6',
    e_wallet:     '#8B5CF6',
  };
  const color = badgeColors[type];
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
      <Ionicons name={ACCOUNT_TYPE_ICONS[type]} size={11} color={color} />
      <Text style={[styles.badgeText, { color }]}>{ACCOUNT_TYPE_LABELS[type]}</Text>
    </View>
  );
}

export default function AccountsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);

  const load = useCallback(async () => {
    await recalculateAccountBalances();
    const all = await getAccounts();
    setAccounts(all);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleArchive = (acc: Account) => {
    const action = acc.isArchived === 1 ? 'Unarchive' : 'Archive';
    Alert.alert(
      `${action} Account`,
      acc.isArchived === 1
        ? `"${acc.name}" will be visible again in account selectors.`
        : `"${acc.name}" will be hidden from account selectors. Existing transactions are kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: acc.isArchived === 1 ? 'default' : 'destructive',
          onPress: async () => {
            if (acc.isArchived === 1) {
              await unarchiveAccount(acc.id);
            } else {
              await archiveAccount(acc.id);
            }
            load();
          },
        },
      ],
    );
  };

  const handleDelete = async (acc: Account) => {
    const ok = await canDeleteAccount(acc.id);
    if (!ok) {
      Alert.alert(
        'Cannot Delete',
        acc.isDefault === 1
          ? 'The default account cannot be deleted. Archive it instead.'
          : 'This account has transactions. Archive it to hide it, or remove all linked transactions first.',
      );
      return;
    }
    Alert.alert('Delete Account', `Permanently delete "${acc.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Only canDeleteAccount=true accounts reach here — safe to delete
          const { getDb } = await import('@/services/database/client');
          const db = await getDb();
          await db.runAsync('DELETE FROM accounts WHERE id = ?', [acc.id]);
          load();
        },
      },
    ]);
  };

  const totalBalance = accounts
    .filter((a) => a.isArchived === 0)
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const active  = accounts.filter((a) => a.isArchived === 0);
  const archived = accounts.filter((a) => a.isArchived === 1);

  const renderCard = (acc: Account) => {
    const accentColor = acc.color ?? colors.primary;
    const balanceColor = acc.currentBalance >= 0 ? colors.success : colors.danger;

    return (
      <View key={acc.id} style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardTop}>
          <View style={[styles.iconCircle, { backgroundColor: accentColor + '22' }]}>
            <Text style={styles.iconEmoji}>{acc.icon ?? '💳'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.cardNameRow}>
              <Text style={[styles.cardName, { color: colors.textPrimary }]}>{acc.name}</Text>
              {acc.isDefault === 1 && (
                <View style={[styles.defaultTag, { backgroundColor: colors.primary + '22' }]}>
                  <Text style={[styles.defaultTagText, { color: colors.primary }]}>Default</Text>
                </View>
              )}
            </View>
            <TypeBadge type={acc.type} />
          </View>
          <Text style={[styles.balance, { color: balanceColor }]}>
            {acc.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push({ pathname: '/add-account', params: { accountId: String(acc.id) } })}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
            <Text style={[styles.actionLabel, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleArchive(acc)}
          >
            <Ionicons
              name={acc.isArchived === 1 ? 'eye-outline' : 'archive-outline'}
              size={16}
              color={colors.textSecondary}
            />
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>
              {acc.isArchived === 1 ? 'Unarchive' : 'Archive'}
            </Text>
          </TouchableOpacity>

          {acc.isDefault === 0 && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDelete(acc)}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={[styles.actionLabel, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Accounts</Text>
        <TouchableOpacity onPress={() => router.push('/transfer')}>
          <Ionicons name="swap-horizontal-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Net Worth Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.summaryLabel}>Total Balance</Text>
          <Text style={styles.summaryAmount}>
            {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={styles.summaryNote}>
            {active.length} active account{active.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Active Accounts */}
        {active.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ACCOUNTS</Text>
            {active.map(renderCard)}
          </>
        )}

        {/* Archived */}
        {archived.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>
              ARCHIVED
            </Text>
            {archived.map(renderCard)}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/add-account')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },

  summaryCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  summaryAmount: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4 },
  summaryNote: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 4 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },

  card: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 24 },
  cardInfo: { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: '700' },
  defaultTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultTagText: { fontSize: 11, fontWeight: '700' },
  balance: { fontSize: 18, fontWeight: '800' },

  cardDivider: { height: 1, marginHorizontal: 16 },

  cardActions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionLabel: { fontSize: 13, fontWeight: '600' },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
});
