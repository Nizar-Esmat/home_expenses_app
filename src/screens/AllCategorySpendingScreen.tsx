import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import CategorySpendingSkeleton from '@/components/skeletons/CategorySpendingSkeleton';
import ScreenHeader from '@/components/ScreenHeader';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import {
  getSettings,
  deleteExpense,
  getCategorySpendingSql,
  getTransactionsByCategory,
} from '@/services/database';
import { monthKeyToLabel, formatCurrency, currentMonthKey } from '@/services/constants';
import { HomeTransaction, Settings } from '@/types';
import { SpendingCategoryItem } from '@/services/reportUtils';
import CategoryStatRow from '@/components/statistics/CategoryStatRow';
import TransactionRow from '@/components/TransactionRow';
import { useAppDialog } from '@/components/AppDialog';

const ALL_MONTHS_KEY = 'ALL';

export default function AllCategorySpendingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { monthKey: routeMonthKey } = useLocalSearchParams<{ monthKey: string }>();
  const { showDialog } = useAppDialog();

  const selectedMonthKey = routeMonthKey ?? currentMonthKey();
  const isAllTime = selectedMonthKey === ALL_MONTHS_KEY;

  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<SpendingCategoryItem[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<HomeTransaction[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getCategorySpendingSql(selectedMonthKey), getSettings()])
      .then(([cats, sets]) => {
        setSettings(sets);
        setCategories(cats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedMonthKey]);

  useFocusEffect(load);

  const handleCategoryPress = useCallback(
    async (categoryName: string) => {
      if (expandedCategory === categoryName) {
        setExpandedCategory(null);
        setCategoryTransactions([]);
        return;
      }
      setExpandedCategory(categoryName);
      setLoadingCategory(true);
      const monthParam = isAllTime ? undefined : selectedMonthKey;
      const txs = await getTransactionsByCategory(monthParam, categoryName);
      setCategoryTransactions(txs);
      setLoadingCategory(false);
    },
    [expandedCategory, isAllTime, selectedMonthKey],
  );

  const handleDelete = useCallback(
    (tx: HomeTransaction) => {
      if (tx.type === 'expense') {
        deleteExpense(tx.id).then(() => {
          load();
          if (expandedCategory) handleCategoryPress(expandedCategory);
        });
      }
    },
    [load, expandedCategory, handleCategoryPress],
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
  const totalSpent = categories.reduce((sum, c) => sum + c.total, 0);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <CategorySpendingSkeleton />
      </View>
    );
  }

  const periodLabel = isAllTime ? 'All Time' : monthKeyToLabel(selectedMonthKey);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Spending by Category"
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
        {totalSpent > 0 && (
          <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Spending</Text>
            <Text style={[styles.totalValue, { color: colors.textPrimary }]}>
              {formatCurrency(totalSpent, currency)}
            </Text>
          </View>
        )}

        {categories.map((cat) => (
          <View key={cat.category}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleCategoryPress(cat.category)}
              style={styles.categoryTouchable}
              accessibilityRole="button"
              accessibilityLabel={`${cat.category}, ${formatCurrency(cat.total, currency)}, ${(cat.percentage * 100).toFixed(1)}% of spending`}
              accessibilityState={{ expanded: expandedCategory === cat.category }}
            >
              <CategoryStatRow
                category={cat.category}
                total={cat.total}
                percentage={cat.percentage}
                categoryEmoji={cat.categoryEmoji}
                categoryColor={cat.categoryColor}
                currency={currency}
              />
              <Ionicons
                name={expandedCategory === cat.category ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
                style={styles.expandIcon}
              />
            </TouchableOpacity>

            {expandedCategory === cat.category && (
              <View style={styles.expandedSection}>
                {loadingCategory ? (
                  <ActivityIndicator color={colors.primary} size="small" style={styles.categoryLoader} />
                ) : categoryTransactions.length > 0 ? (
                  categoryTransactions.map((tx, i) => (
                    <TransactionRow
                      key={`${tx.type}-${tx.id}`}
                      tx={tx}
                      currency={currency}
                      onEdit={() => handleEdit(tx)}
                      onDelete={() => handleDeleteConfirm(tx)}
                      showDivider={i < categoryTransactions.length - 1}
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

        {categories.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No category spending</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Add expenses to see category breakdown
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
  totalCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  totalValue: { fontSize: 24, fontWeight: '900' },
  categoryTouchable: { position: 'relative' },
  expandIcon: {
    position: 'absolute',
    right: 14,
    top: 16,
    zIndex: 1,
  },
  expandedSection: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  categoryLoader: { paddingVertical: 16 },
  emptyText: { textAlign: 'center', paddingVertical: 12, fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
});
