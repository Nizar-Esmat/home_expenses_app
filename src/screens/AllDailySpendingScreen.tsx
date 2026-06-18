import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import DailySpendingSkeleton from '@/components/skeletons/DailySpendingSkeleton';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import {
  getExpensesByMonth,
  getAllExpenses,
  getSettings,
  deleteExpense,
  deleteIncome,
  getTransferFeesByMonth,
  getAllTransferFees,
  getTransactionsByDate,
} from '@/services/database';
import { monthKeyToLabel, formatCurrencyCompact, currentMonthKey } from '@/services/constants';
import { HomeTransaction, Settings } from '@/types';
import { getDailySpendingSummary, DailySpendingSummary } from '@/services/reportUtils';
import DailySpendingRow from '@/components/statistics/DailySpendingRow';
import TransactionRow from '@/components/TransactionRow';
import { useAppDialog } from '@/components/AppDialog';

const ALL_MONTHS_KEY = 'ALL';

export default function AllDailySpendingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { monthKey: routeMonthKey } = useLocalSearchParams<{ monthKey: string }>();
  const { showDialog } = useAppDialog();

  const selectedMonthKey = routeMonthKey ?? currentMonthKey();
  const isAllTime = selectedMonthKey === ALL_MONTHS_KEY;

  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DailySpendingSummary | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [dayTransactions, setDayTransactions] = useState<HomeTransaction[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const expensePromise = isAllTime ? getAllExpenses() : getExpensesByMonth(selectedMonthKey);
    const feePromise = isAllTime ? getAllTransferFees() : getTransferFeesByMonth(selectedMonthKey);

    Promise.all([expensePromise, feePromise, getSettings()])
      .then(([exps, fees, sets]) => {
        setSettings(sets);
        setSummary(getDailySpendingSummary(exps, fees));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isAllTime, selectedMonthKey]);

  useFocusEffect(load);

  const handleDayPress = useCallback(
    async (dateKey: string) => {
      if (expandedDay === dateKey) {
        setExpandedDay(null);
        setDayTransactions([]);
        return;
      }
      setExpandedDay(dateKey);
      setLoadingDay(true);
      const txs = await getTransactionsByDate(dateKey);
      setDayTransactions(txs);
      setLoadingDay(false);
    },
    [expandedDay],
  );

  const handleDelete = useCallback(
    (tx: HomeTransaction) => {
      if (tx.type === 'expense') {
        deleteExpense(tx.id).then(() => {
          load();
          if (expandedDay) handleDayPress(expandedDay);
        });
      } else if (tx.type === 'income') {
        deleteIncome(tx.id).then(() => {
          load();
          if (expandedDay) handleDayPress(expandedDay);
        });
      }
    },
    [load, expandedDay, handleDayPress],
  );

  const handleDeleteConfirm = useCallback(
    (tx: HomeTransaction) => {
      showDialog({
        title: 'Delete Transaction',
        message: 'Are you sure you want to delete this transaction?',
        type: 'danger',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => handleDelete(tx) },
        ],
      });
    },
    [handleDelete, showDialog],
  );

  const handleEdit = useCallback(
    (tx: HomeTransaction) => {
      if (tx.type === 'expense') {
        router.push({ pathname: '/add-expense', params: { expenseId: String(tx.id) } });
      } else if (tx.type === 'income') {
        router.push({ pathname: '/add-income', params: { incomeId: String(tx.id) } });
      }
    },
    [router],
  );

  const currency = settings?.currency ?? 'EGP';

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <DailySpendingSkeleton />
      </View>
    );
  }

  const periodLabel = isAllTime ? 'All Time' : monthKeyToLabel(selectedMonthKey);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          Daily Spending
        </Text>
        <Text style={[styles.periodLabel, { color: colors.textSecondary }]} numberOfLines={1}>
          {periodLabel}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {summary && summary.allDays.length > 0 && (
          <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Ionicons name="trending-up" size={16} color="#EF4444" />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Highest</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {summary.highestDay
                  ? formatCurrencyCompact(summary.highestDay.total, currency)
                  : '—'}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="calculator" size={16} color="#AAB2C0" />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Average</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {formatCurrencyCompact(summary.averageDailySpend, currency)}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="calendar" size={16} color={colors.primary} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Days</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {summary.allDays.length}
              </Text>
            </View>
          </View>
        )}

        {summary?.allDays.map((day, index) => (
          <View key={day.dateKey}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleDayPress(day.dateKey)}
              style={styles.dayRowTouchable}
            >
              <DailySpendingRow
                dateKey={day.dateKey}
                total={day.total}
                maxTotal={summary.totalSpent}
                currency={currency}
                isLast={index === summary.allDays.length - 1}
              />
              <Ionicons
                name={expandedDay === day.dateKey ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#AAB2C0"
                style={styles.expandIcon}
              />
            </TouchableOpacity>

            {expandedDay === day.dateKey && (
              <View style={styles.expandedSection}>
                {loadingDay ? (
                  <ActivityIndicator color={colors.primary} size="small" style={styles.dayLoader} />
                ) : dayTransactions.length > 0 ? (
                  dayTransactions.map((tx, i) => (
                    <TransactionRow
                      key={`${tx.type}-${tx.id}`}
                      tx={tx}
                      currency={currency}
                      onEdit={() => handleEdit(tx)}
                      onDelete={() => handleDeleteConfirm(tx)}
                      showDivider={i < dayTransactions.length - 1}
                    />
                  ))
                ) : (
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No transactions
                  </Text>
                )}
              </View>
            )}
          </View>
        ))}

        {(!summary || summary.allDays.length === 0) && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No daily spending</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Add expenses to see daily breakdown
            </Text>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '700', flex: 1, marginLeft: 12 },
  periodLabel: { fontSize: 13, fontWeight: '600' },
  content: { padding: 20 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 11, fontWeight: '600' },
  statValue: { fontSize: 14, fontWeight: '700' },
  statDivider: { width: 1, height: 36 },
  dayRowTouchable: {
    position: 'relative',
  },
  expandIcon: {
    position: 'absolute',
    right: 14,
    top: -14,
    zIndex: 1,
  },
  expandedSection: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  dayLoader: { paddingVertical: 16 },
  emptyText: { textAlign: 'center', paddingVertical: 12, fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
});
