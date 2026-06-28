import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { useMonth } from '@/contexts/MonthContext';
import {
  getSettings,
  getActiveAccounts,
  getExpenseTotalByMonth,
  getIncomeTotalByMonth,
  getAvailableMonthKeys,
  recalculateAccountBalances,
  deleteExpense,
  deleteIncome,
  deleteTransfer,
  getRecentTransactions,
  getIncomeTotalAll,
  getExpenseTotalAll,
} from '@/services/database';
import {
  currentMonthKey,
  monthKeyToLabel,
  formatCurrency,
} from '@/services/constants';
import { Account, HomeTransaction, Settings } from '@/types';
import BalanceCard from '@/components/BalanceCard';
import AccountsPreviewCard from '@/components/AccountsPreviewCard';
import MonthlySummaryCard from '@/components/MonthlySummaryCard';
import ReportButton from '@/components/ReportButton';
import RecentTransactionsSection from '@/components/RecentTransactionsSection';
import FloatingAddButton from '@/components/FloatingAddButton';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const currentMonth = currentMonthKey();
  const { selectedMonthKey, setSelectedMonthKey } = useMonth();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [accountMap, setAccountMap] = useState<Record<number, Account>>({});
  const [homeAccounts, setHomeAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<HomeTransaction[]>([]);
  const [availableMonthKeys, setAvailableMonthKeys] = useState<string[]>([
    'ALL',
    currentMonth,
  ]);
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [periodTotals, setPeriodTotals] = useState({ income: 0, spent: 0 });

  const resolveHomeAccounts = (
    accs: Account[],
    homeIds: number[] | undefined,
  ): Account[] => {
    const selected = (homeIds ?? [])
      .map((id) => accs.find((a) => a.id === id && a.isArchived === 0))
      .filter((a): a is Account => Boolean(a))
      .slice(0, 3);
    return selected;
  };

  const getHiddenCount = (totalCount: number, shownCount: number): number => {
    return Math.max(0, totalCount - shownCount);
  };

  const load = useCallback(
    (monthKey: string = selectedMonthKey) => {
      setLoading(true);
      setError(false);

      const totalsPromise =
        monthKey === 'ALL'
          ? Promise.all([getIncomeTotalAll(), getExpenseTotalAll()])
          : Promise.all([
              getIncomeTotalByMonth(monthKey),
              getExpenseTotalByMonth(monthKey),
            ]);

      Promise.all([
        getRecentTransactions(monthKey === 'ALL' ? undefined : monthKey, 5),
        getSettings(),
        getAvailableMonthKeys(),
        recalculateAccountBalances().then(() => getActiveAccounts()),
        totalsPromise,
      ])
        .then(([txs, sets, monthKeys, accs, totals]) => {
          setTransactions(txs);
          setSettings(sets);
          setPeriodTotals({ income: totals[0], spent: totals[1] });
          const mergedMonths = Array.from(
            new Set([
              'ALL',
              currentMonth,
              ...(monthKey !== currentMonth ? [monthKey] : []),
              ...monthKeys,
            ]),
          ).sort((a, b) => b.localeCompare(a));
          setAvailableMonthKeys(mergedMonths);
          const aMap: Record<number, Account> = {};
          accs.forEach((a) => (aMap[a.id] = a));
          setAccountMap(aMap);
          const list = resolveHomeAccounts(accs, sets?.homeAccountIds);
          setHomeAccounts(list);
          setLoading(false);
        })
        .catch(() => {
          setError(true);
          setLoading(false);
        });
    },
    [currentMonth, selectedMonthKey],
  );

  useFocusEffect(
    useCallback(() => {
      load(selectedMonthKey);
    }, [load, selectedMonthKey]),
  );

  const overallBalance = Object.values(accountMap).reduce(
    (sum, acc) => sum + acc.currentBalance,
    0,
  );
  const totalAccountCount = Object.values(accountMap).length;
  const totalIncome = periodTotals.income;
  const totalSpent = periodTotals.spent;
  const periodNet = totalIncome - totalSpent;
  const selectedMonthLabel = monthKeyToLabel(selectedMonthKey);
  const hiddenCount = getHiddenCount(totalAccountCount, homeAccounts.length);

  const handleDeleteTransaction = (tx: HomeTransaction) => {
    if (tx.type === 'expense') {
      deleteExpense(tx.id).then(() => load(selectedMonthKey));
    } else if (tx.type === 'income') {
      deleteIncome(tx.id).then(() => load(selectedMonthKey));
    } else if (tx.type === 'transfer') {
      deleteTransfer(tx.id).then(() => load(selectedMonthKey));
    }
  };

  const handleEditTransaction = (tx: HomeTransaction) => {
    if (tx.type === 'expense') {
      router.push({
        pathname: '/add-expense',
        params: { expenseId: String(tx.id) },
      });
    } else if (tx.type === 'income') {
      router.push({
        pathname: '/add-income',
        params: { incomeId: String(tx.id) },
      });
    } else if (tx.type === 'transfer') {
      router.push({
        pathname: '/transfer',
        params: { transferId: String(tx.id) },
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <LoadingSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Home</Text>
        </View>

        {/* Total Balance */}
        <BalanceCard
          totalBalance={overallBalance}
          accountCount={totalAccountCount}
          currency={settings?.currency}
        />

        {/* Accounts */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionLeft}>
            <Text style={styles.sectionTitle}>Accounts</Text>
            <Text style={styles.sectionSubtitle}>
              {homeAccounts.length > 0
                ? `Showing ${homeAccounts.length} of ${totalAccountCount} account${totalAccountCount !== 1 ? 's' : ''}${hiddenCount > 0 ? ` · ${hiddenCount} hidden included in total` : ''}`
                : 'No accounts to display'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.sectionAction}
            onPress={() => router.push('/accounts')}
          >
            <Text style={[styles.sectionActionText, { color: colors.primary }]}>
              View all
            </Text>
            <Ionicons name='chevron-forward' size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <AccountsPreviewCard
          accounts={homeAccounts}
          totalAccountCount={totalAccountCount}
          hiddenCount={hiddenCount}
          currency={settings?.currency}
          onViewAll={() => router.push('/accounts')}
          onAddAccount={() => router.push('/add-account')}
        />

        {/* Monthly Summary */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionLeft}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.monthFilterWrap}>
              <TouchableOpacity
                style={[styles.monthFilterBtn, { borderColor: colors.border }]}
                onPress={() => setMonthMenuOpen((open) => !open)}
              >
                <Text
                  style={[
                    styles.monthFilterText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {selectedMonthLabel}
                </Text>
                <Ionicons
                  name='chevron-down'
                  size={14}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>

              {monthMenuOpen && (
                <>
                  <TouchableOpacity
                    style={styles.monthMenuBackdrop}
                    activeOpacity={1}
                    onPress={() => setMonthMenuOpen(false)}
                  />
                  <View
                    style={[
                      styles.monthMenu,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <ScrollView
                      nestedScrollEnabled
                      style={styles.monthMenuList}
                    >
                      {availableMonthKeys.map((key) => (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.monthMenuItem,
                            selectedMonthKey === key && {
                              backgroundColor: colors.primary + '20',
                            },
                          ]}
                          onPress={() => {
                            setMonthMenuOpen(false);
                            setSelectedMonthKey(key);
                            load(key);
                          }}
                        >
                          <View style={styles.monthMenuItemContent}>
                            <Ionicons
                              name='calendar-outline'
                              size={18}
                              color={colors.textPrimary}
                            />
                            <Text
                              style={[
                                styles.monthMenuItemText,
                                { color: colors.textPrimary },
                              ]}
                            >
                              {monthKeyToLabel(key)}
                            </Text>
                            {selectedMonthKey === key && (
                              <Ionicons
                                name='checkmark'
                                size={18}
                                color={colors.primary}
                              />
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}
            </View>
          </View>
          <ReportButton
            onPress={() =>
              router.push({
                pathname: '/statistics',
                params: { monthKey: selectedMonthKey },
              })
            }
          />
        </View>

        <MonthlySummaryCard
          income={formatCurrency(totalIncome, settings?.currency)}
          spent={formatCurrency(totalSpent, settings?.currency)}
          net={formatCurrency(periodNet, settings?.currency)}
        />

        {/* Recent Transactions */}
        <View style={{ marginTop: 24 }}>
          <RecentTransactionsSection
            transactions={transactions}
            currency={settings?.currency}
            onSeeAll={() =>
              router.push({
                pathname: '/all-transactions',
                params: { monthKey: selectedMonthKey },
              })
            }
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            onRetry={() => load(selectedMonthKey)}
            error={error}
          />
        </View>

        <View style={{ height: 150 }} />
      </ScrollView>

      <FloatingAddButton bottomOffset={110} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20 },
  headerRow: { marginBottom: 24 },
  pageTitle: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#C0C0C080',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 10,
    paddingTop: 10,
    gap: 12,
  },
  sectionLeft: { flex: 1, alignItems: 'flex-start' },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: '#AAB2C0',
    marginTop: 4,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 10,
  },
  sectionActionText: { fontSize: 14, fontWeight: '600', marginLeft: 4 },
  monthFilterWrap: { position: 'relative', zIndex: 6, marginTop: 8 },
  monthFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
    zIndex: 3,
    alignSelf: 'flex-start',
  },
  monthFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  monthMenuBackdrop: {
    position: 'absolute',
    top: -2400,
    left: -2400,
    width: 4800,
    height: 4800,
    zIndex: 1,
  },
  monthMenu: {
    position: 'absolute',
    top: 42,
    left: 0,
    width: 200,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
    zIndex: 2,
    elevation: 6,
  },
  monthMenuList: { maxHeight: 240 },
  monthMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 6,
    borderRadius: 8,
  },
  monthMenuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monthMenuItemText: { fontSize: 14, fontWeight: '600', flex: 1 },
});
