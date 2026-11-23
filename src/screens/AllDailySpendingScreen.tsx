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
import ScreenHeader from '@/components/ScreenHeader';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import {
  getSettings,
  deleteExpense,
  deleteIncome,
  getDailySpendingSummarySql,
  getTransactionsByDate,
} from '@/services/database';
import { monthKeyToLabel, formatCurrencyCompact, currentMonthKey } from '@/services/constants';
import { HomeTransaction, Settings } from '@/types';
import { DailySpendingSummary } from '@/services/reportUtils';
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
    Promise.all([getDailySpendingSummarySql(selectedMonthKey), getSettings()])
      .then(([sum, sets]) => {
        setSettings(sets);
        setSummary(sum);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedMonthKey]);

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
      <ScreenHeader
        title="Daily Spending"
        alignTitle="left"
        rightAction={
          <Text style={[styles.periodLabel, { color: colors.textSecondary }]} numberOfLines={1}>
            {periodLabel}
          </Text>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {summary && summary.allDays.length > 0 && (
          <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Ionicons name="trending-up" size={16} color={colors.danger} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Highest</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {summary.highestDay
                  ? formatCurrencyCompact(summary.highestDay.total, currency)
                  : '—'}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="calculator" size={16} color={colors.textSecondary} />
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

        {summary?.allDays.map((day) => {
          const isExpanded = expandedDay === day.dateKey;
          return (
            <View key={day.dateKey} style={styles.dayGroup}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleDayPress(day.dateKey)}
                accessibilityRole="button"
                accessibilityLabel={`${day.dateKey}, total spending ${day.total}`}
                accessibilityState={{ expanded: isExpanded }}
              >
                <DailySpendingRow
                  dateKey={day.dateKey}
                  total={day.total}
                  maxTotal={summary.totalSpent}
                  currency={currency}
                  expandable={true}
                  isExpanded={isExpanded}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View
                  style={[
                    styles.expandedSection,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
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
          );
        })}

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
  dayGroup: {
    marginBottom: 4,
  },
  expandedSection: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: -2,
    marginBottom: 12,
  },
  dayLoader: { paddingVertical: 16 },
  emptyText: { textAlign: 'center', paddingVertical: 12, fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
});
