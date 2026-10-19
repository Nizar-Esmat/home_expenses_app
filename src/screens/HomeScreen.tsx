import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
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
  getOutstandingLoanSummary,
  softDeleteLoan,
  softDeleteRepayment,
  resolveHomeAccounts,
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
import LoansSummaryCard from '@/components/LoansSummaryCard';
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
  const [loanSummary, setLoanSummary] = useState({ totalBorrowed: 0, totalLent: 0 });


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
        getOutstandingLoanSummary(),
      ])
        .then(([txs, sets, monthKeys, accs, totals, loanSum]) => {
          setTransactions(txs);
          setSettings(sets);
          setPeriodTotals({ income: totals[0], spent: totals[1] });
          setLoanSummary(loanSum);
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
      deleteExpense(tx.id).then(() => load(selectedMonthKey)).catch(() => {});
    } else if (tx.type === 'income') {
      deleteIncome(tx.id).then(() => load(selectedMonthKey)).catch(() => {});
    } else if (tx.type === 'transfer') {
      deleteTransfer(tx.id).then(() => load(selectedMonthKey)).catch(() => {});
    } else if (tx.type === 'loan') {
      softDeleteLoan(tx.id).then(() => load(selectedMonthKey)).catch(() => {});
    } else if (tx.type === 'loan_repayment') {
      softDeleteRepayment(tx.id).then(() => load(selectedMonthKey)).catch(() => {});
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
    } else if (tx.type === 'loan' || tx.type === 'loan_repayment') {
      router.push('/loans');
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
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]} accessibilityRole="header">
            Home
          </Text>
        </View>

        {/* Total Balance */}
        <BalanceCard
          totalBalance={overallBalance}
          accountCount={totalAccountCount}
          currency={settings?.currency}
        />

        {/* Accounts */}
        <View style={[styles.sectionHeaderRow, { borderTopColor: colors.border }]}>
          <View style={styles.sectionLeft}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Accounts</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {homeAccounts.length > 0
                ? `Showing ${homeAccounts.length} of ${totalAccountCount} account${totalAccountCount !== 1 ? 's' : ''}${hiddenCount > 0 ? ` · ${hiddenCount} hidden included in total` : ''}`
                : 'No accounts to display'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.sectionAction}
            onPress={() => router.push('/accounts')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="View all accounts"
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
        <View style={[styles.sectionHeaderRow, { borderTopColor: colors.border }]}>
          <View style={styles.sectionLeft}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Summary</Text>
            <View style={styles.monthFilterWrap}>
              <TouchableOpacity
                style={[styles.monthFilterBtn, { borderColor: colors.border }]}
                onPress={() => setMonthMenuOpen((open) => !open)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Select month, currently ${selectedMonthLabel}`}
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

              <Modal
                visible={monthMenuOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setMonthMenuOpen(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setMonthMenuOpen(false)}
                >
                  <View
                    style={[
                      styles.monthMenuModal,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]} accessibilityRole="header">
                        Select Month
                      </Text>
                      <TouchableOpacity
                        onPress={() => setMonthMenuOpen(false)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                      >
                        <Ionicons name="close" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <ScrollView
                      style={styles.monthMenuList}
                      showsVerticalScrollIndicator={false}
                    >
                      {availableMonthKeys.map((key) => {
                        const isSelected = selectedMonthKey === key;
                        return (
                          <TouchableOpacity
                            key={key}
                            style={[
                              styles.monthMenuItem,
                              isSelected && {
                                backgroundColor: colors.primary + '20',
                              },
                            ]}
                            onPress={() => {
                              setMonthMenuOpen(false);
                              setSelectedMonthKey(key);
                              load(key);
                            }}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: isSelected }}
                            accessibilityLabel={monthKeyToLabel(key)}
                          >
                            <View style={styles.monthMenuItemContent}>
                              <Ionicons
                                name='calendar-outline'
                                size={18}
                                color={isSelected ? colors.primary : colors.textPrimary}
                              />
                              <Text
                                style={[
                                  styles.monthMenuItemText,
                                  {
                                    color: isSelected ? colors.primary : colors.textPrimary,
                                    fontWeight: isSelected ? '700' : '500',
                                  },
                                ]}
                              >
                                {monthKeyToLabel(key)}
                              </Text>
                              {isSelected && (
                                <Ionicons
                                  name='checkmark'
                                  size={18}
                                  color={colors.primary}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>
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

        {(loanSummary.totalBorrowed > 0 || loanSummary.totalLent > 0) && (
          <LoansSummaryCard
            totalBorrowed={loanSummary.totalBorrowed}
            totalLent={loanSummary.totalLent}
            currency={settings?.currency ?? 'EGP'}
            onPress={() => router.push('/loans')}
          />
        )}

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
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
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
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    marginTop: 4,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  monthMenuModal: {
    width: '100%',
    maxWidth: 320,
    maxHeight: 400,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  monthMenuList: { maxHeight: 320, paddingVertical: 6 },
  monthMenuItem: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 10,
    justifyContent: 'center',
  },
  monthMenuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthMenuItemText: { fontSize: 14, flex: 1 },
});
