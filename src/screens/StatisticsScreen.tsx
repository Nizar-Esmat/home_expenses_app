import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useMonth } from '@/contexts/MonthContext';
import {
  getSettings,
  saveSettings,
  getCategories,
  getMonthHistory,
  getIncomeTotalByMonth,
  getIncomeTotalAll,
  getAccounts,
  getCategorySpendingSql,
  getDailySpendingSummarySql,
  getQuickInsightsSql,
  getTopExpensesSql,
  getFilteredExpenseTotalSql,
} from '@/services/database';
import { currentMonthKey, formatCurrency } from '@/services/constants';
import { Account, Category, Expense, Settings } from '@/types';
import {
  QuickInsightsData,
  SpendingCategoryItem,
  DailySpendingSummary,
} from '@/services/reportUtils';
import PeriodSelector from '@/components/statistics/PeriodSelector';
import CategoryFilterBar from '@/components/statistics/CategoryFilterBar';
import QuickInsightsGrid from '@/components/statistics/QuickInsightsGrid';
import CategoryBreakdownPreview from '@/components/statistics/CategoryBreakdownPreview';
import DailySpendingPreview from '@/components/statistics/DailySpendingPreview';
import BiggestExpensesPreview from '@/components/statistics/BiggestExpensesPreview';
import EmptyStatisticsState from '@/components/statistics/EmptyStatisticsState';
import StatisticsLoadingSkeleton from '@/components/statistics/LoadingSkeleton';
import ErrorState from '@/components/statistics/ErrorState';
import MonthlySummaryCard from '../components/MonthlySummaryCard';

const ALL_MONTHS_KEY = 'ALL';

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { selectedMonthKey, setSelectedMonthKey } = useMonth();

  const [availableMonthKeys, setAvailableMonthKeys] = useState<string[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [insights, setInsights] = useState<QuickInsightsData>({
    transactionCount: 0,
    averageExpense: 0,
    topCategory: null,
    biggestExpense: 0,
  });
  const [spendingByCategory, setSpendingByCategory] = useState<SpendingCategoryItem[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySpendingSummary>({
    highestDay: null,
    averageDailySpend: 0,
    topDays: [],
    allDays: [],
    maxTotal: 0,
    totalSpent: 0,
  });
  const [biggestExpenses, setBiggestExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [accountMap, setAccountMap] = useState<Record<number, Account>>({});
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isAllTime = selectedMonthKey === ALL_MONTHS_KEY;

  const load = useCallback(() => {
    setLoading(true);
    setError(false);

    Promise.all([getMonthHistory(), getSettings(), getCategories(), getAccounts()])
      .then(([hist, sets, cats, accs]) => {
        const keys = hist.map((h) => h.monthKey);
        if (!keys.includes(ALL_MONTHS_KEY)) {
          keys.push(ALL_MONTHS_KEY);
        }
        const currentKey = currentMonthKey();
        if (!keys.includes(currentKey)) {
          keys.unshift(currentKey);
        }
        setAvailableMonthKeys(keys);

        setSettings(sets);
        setCategoryList(cats);
        const map: Record<string, Category> = {};
        cats.forEach((c) => (map[c.name] = c));
        setCategoryMap(map);

        const aMap: Record<number, Account> = {};
        accs.forEach((a) => (aMap[a.id] = a));
        setAccountMap(aMap);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const loadMonthData = useCallback(() => {
    if (!selectedMonthKey) return;
    setLoading(true);
    setError(false);

    const activeCatIds = selectedCategoryIds && selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined;

    const spentPromise = getFilteredExpenseTotalSql(selectedMonthKey, activeCatIds);
    const incomePromise = isAllTime
      ? getIncomeTotalAll()
      : getIncomeTotalByMonth(selectedMonthKey);
    const insightsPromise = getQuickInsightsSql(selectedMonthKey, activeCatIds);
    const categoryPromise = getCategorySpendingSql(selectedMonthKey, activeCatIds);
    const dailyPromise = getDailySpendingSummarySql(selectedMonthKey, activeCatIds);
    const topExpensesPromise = getTopExpensesSql(selectedMonthKey, 5, activeCatIds);

    Promise.all([
      spentPromise,
      incomePromise,
      insightsPromise,
      categoryPromise,
      dailyPromise,
      topExpensesPromise,
    ])
      .then(([spent, inc, ins, cats, daily, top]) => {
        setTotalSpent(spent);
        setTotalIncome(inc);
        setInsights(ins);
        setSpendingByCategory(cats);
        setDailySummary(daily);
        setBiggestExpenses(top);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [isAllTime, selectedMonthKey, selectedCategoryIds]);

  useFocusEffect(
    useCallback(() => {
      load();
      loadMonthData();
    }, [load, loadMonthData]),
  );

  useEffect(() => {
    loadMonthData();
  }, [selectedMonthKey, selectedCategoryIds, loadMonthData]);

  const handleSaveRoutinePreset = async (ids: number[]) => {
    try {
      await saveSettings({ routineCategoryIds: ids });
      setSettings((prev) => (prev ? { ...prev, routineCategoryIds: ids } : prev));
    } catch (err) {
      console.error('Failed to save routine preset', err);
    }
  };

  const net = totalIncome - totalSpent;
  const currency = settings?.currency ?? 'EGP';

  const hasData = insights.transactionCount > 0 || totalSpent > 0 || totalIncome > 0;

  const handleViewAllTransactions = () => {
    router.push({
      pathname: '/all-transactions',
      params: { monthKey: selectedMonthKey },
    });
  };

  const handleRetry = () => {
    load();
    loadMonthData();
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <PeriodSelector
          selectedMonthKey={selectedMonthKey}
          availableMonthKeys={
            availableMonthKeys.length > 0
              ? availableMonthKeys
              : [currentMonthKey(), ALL_MONTHS_KEY]
          }
          onSelectMonth={setSelectedMonthKey}
        />
        {categoryList.length > 0 && (
          <CategoryFilterBar
            categories={categoryList}
            selectedCategoryIds={selectedCategoryIds}
            onSelectCategories={setSelectedCategoryIds}
            routineCategoryIds={settings?.routineCategoryIds}
            onSaveRoutinePreset={handleSaveRoutinePreset}
          />
        )}
        <ScrollView showsVerticalScrollIndicator={false}>
          <StatisticsLoadingSkeleton />
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <PeriodSelector
          selectedMonthKey={selectedMonthKey}
          availableMonthKeys={
            availableMonthKeys.length > 0
              ? availableMonthKeys
              : [currentMonthKey(), ALL_MONTHS_KEY]
          }
          onSelectMonth={setSelectedMonthKey}
        />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ErrorState onRetry={handleRetry} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <PeriodSelector
        selectedMonthKey={selectedMonthKey}
        availableMonthKeys={availableMonthKeys}
        onSelectMonth={setSelectedMonthKey}
      />

      {categoryList.length > 0 && (
        <CategoryFilterBar
          categories={categoryList}
          selectedCategoryIds={selectedCategoryIds}
          onSelectCategories={setSelectedCategoryIds}
          routineCategoryIds={settings?.routineCategoryIds}
          onSaveRoutinePreset={handleSaveRoutinePreset}
        />
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!hasData ? (
          <EmptyStatisticsState
            monthLabel={isAllTime ? 'this period' : 'this period'}
          />
        ) : (
          <>
            <MonthlySummaryCard
              income={formatCurrency(totalIncome, settings?.currency)}
              spent={formatCurrency(totalSpent, settings?.currency)}
              net={formatCurrency(net, settings?.currency)}
            />

            <QuickInsightsGrid
              transactionCount={insights.transactionCount}
              averageExpense={insights.averageExpense}
              topCategory={insights.topCategory}
              biggestExpense={insights.biggestExpense}
              currency={currency}
            />

            <DailySpendingPreview
              summary={dailySummary}
              currency={currency}
              onViewAll={() =>
                router.push({
                  pathname: '/daily-spending',
                  params: { monthKey: selectedMonthKey },
                })
              }
            />

            <CategoryBreakdownPreview
              data={spendingByCategory}
              currency={currency}
              onViewAll={() =>
                router.push({
                  pathname: '/category-spending',
                  params: { monthKey: selectedMonthKey },
                })
              }
            />

            <BiggestExpensesPreview
              expenses={biggestExpenses}
              totalCount={insights.transactionCount}
              currency={currency}
              categoryMap={categoryMap}
              accountMap={accountMap}
              onExpensePress={(expense) => {
                router.push({
                  pathname: '/add-expense',
                  params: { expenseId: String(expense.id) },
                });
              }}
              onViewAll={() =>
                router.push({
                  pathname: '/all-transactions',
                  params: { monthKey: selectedMonthKey, typeFilter: 'expense', sortBy: 'amount_desc' },
                })
              }
            />

            <TouchableOpacity
              style={styles.viewAllLink}
              onPress={handleViewAllTransactions}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="View all transactions"
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>
                View all transactions →
              </Text>
            </TouchableOpacity>

            <View style={{ height: 160 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20 },
  viewAllLink: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 14,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
