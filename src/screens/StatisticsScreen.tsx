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
  getExpensesByMonth,
  getIncomesByMonth,
  getSettings,
  getCategories,
  getAllExpenses,
  getAllIncomes,
  getMonthHistory,
  getExpenseTotalByMonth,
  getExpenseTotalAll,
  getTransferFeesByMonth,
  getAllTransferFees,
  getAccounts,
} from '@/services/database';
import { currentMonthKey, formatCurrency } from '@/services/constants';
import { Account, Category, Expense, Income, Settings } from '@/types';
import {
  getQuickInsights,
  buildSpendingByCategory,
  getDailySpendingSummary,
  getTopExpenses,
  QuickInsightsData,
  SpendingCategoryItem,
  DailySpendingSummary,
} from '@/services/reportUtils';
import PeriodSelector from '@/components/statistics/PeriodSelector';
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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [transferFees, setTransferFees] = useState<Expense[]>([]);
  const [totalSpentValue, setTotalSpentValue] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [accountMap, setAccountMap] = useState<Record<number, Account>>({});
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

    const expensePromise = isAllTime
      ? getAllExpenses()
      : getExpensesByMonth(selectedMonthKey);
    const incomePromise = isAllTime
      ? getAllIncomes()
      : getIncomesByMonth(selectedMonthKey);
    const totalPromise = isAllTime
      ? getExpenseTotalAll()
      : getExpenseTotalByMonth(selectedMonthKey);
    const feePromise = isAllTime
      ? getAllTransferFees()
      : getTransferFeesByMonth(selectedMonthKey);

    Promise.all([expensePromise, incomePromise, totalPromise, feePromise])
      .then(([exps, incs, total, fees]) => {
        setExpenses(exps);
        setIncomes(incs);
        setTransferFees(fees);
        setTotalSpentValue(total);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [isAllTime, selectedMonthKey]);

  useFocusEffect(
    useCallback(() => {
      load();
      loadMonthData();
    }, [load, loadMonthData]),
  );

  useEffect(() => {
    loadMonthData();
  }, [selectedMonthKey, loadMonthData]);

  const totalSpent = totalSpentValue;
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const net = totalIncome - totalSpent;
  const currency = settings?.currency ?? 'EGP';

  const insights: QuickInsightsData = getQuickInsights(expenses, incomes, transferFees);
  const spendingByCategory: SpendingCategoryItem[] = buildSpendingByCategory(
    expenses,
    categoryMap,
    transferFees,
  );
  const dailySummary: DailySpendingSummary = getDailySpendingSummary(expenses, transferFees);
  const biggestExpenses: Expense[] = getTopExpenses(expenses, 5, transferFees);

  const hasData = expenses.length > 0 || incomes.length > 0 || transferFees.length > 0;

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
              totalCount={expenses.length + transferFees.length}
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
    paddingVertical: 14,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
