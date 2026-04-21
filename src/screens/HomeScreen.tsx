import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import {
  getExpensesByMonth,
  getIncomesByMonth,
  deleteExpense,
  deleteIncome,
  getSettings,
  getCategories,
  getIncomeCategories,
  getAllExpenses,
  getAllIncomes,
  getAvailableMonthKeys,
  getActiveAccounts,
  recalculateAccountBalances,
} from '@/services/database';
import { currentMonthKey, monthKeyToLabel, formatCurrency } from '@/services/constants';
import { Account, Category, IncomeCategory, Expense, Income, Settings } from '@/types';
import SummaryCard from '@/components/SummaryCard';
import ExpenseTile from '@/components/ExpenseTile';
import IncomeTile from '@/components/IncomeTile';

const ALL_MONTHS_KEY = 'all';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const currentMonth = currentMonthKey();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [incomeCategoryMap, setIncomeCategoryMap] = useState<Record<string, IncomeCategory>>({});
  const [availableMonthKeys, setAvailableMonthKeys] = useState<string[]>([currentMonth]);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonth);
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');
  const [accountMap, setAccountMap] = useState<Record<number, Account>>({});
  const [cashAccount, setCashAccount] = useState<Account | null>(null);
  const [favBankAccount, setFavBankAccount] = useState<Account | null>(null);

  const load = useCallback((monthKey: string = selectedMonthKey) => {
    setLoading(true);
    const expensePromise = monthKey === ALL_MONTHS_KEY ? getAllExpenses() : getExpensesByMonth(monthKey);
    const incomePromise = monthKey === ALL_MONTHS_KEY ? getAllIncomes() : getIncomesByMonth(monthKey);

    Promise.all([
      expensePromise,
      incomePromise,
      getSettings(),
      getCategories(),
      getIncomeCategories(),
      getAvailableMonthKeys(),
      recalculateAccountBalances().then(() => getActiveAccounts()),
    ]).then(([exps, incs, sets, cats, incomeCats, monthKeys, accs]) => {
      setExpenses(exps);
      setIncomes(incs);
      setSettings(sets);
      const mergedMonths = Array.from(new Set([
        currentMonth,
        ...(selectedMonthKey !== ALL_MONTHS_KEY ? [selectedMonthKey] : []),
        ...monthKeys,
      ])).sort((a, b) => b.localeCompare(a));
      setAvailableMonthKeys(mergedMonths);
      const map: Record<string, Category> = {};
      cats.forEach((c) => (map[c.name] = c));
      setCategoryMap(map);
      const incomeMap: Record<string, IncomeCategory> = {};
      incomeCats.forEach((c) => (incomeMap[c.name] = c));
      setIncomeCategoryMap(incomeMap);
      const aMap: Record<number, Account> = {};
      accs.forEach((a) => (aMap[a.id] = a));
      setAccountMap(aMap);
      setCashAccount(accs.find((a) => a.type === 'cash') ?? null);
      setFavBankAccount(accs.find((a) => a.isPrimary === 1) ?? null);
      setLoading(false);
    });
  }, [currentMonth, selectedMonthKey]);

  useFocusEffect(useCallback(() => {
    load(selectedMonthKey);
  }, [load, selectedMonthKey]));

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.price, 0);
  // Real available balance = sum of all account currentBalances (not month income − expenses)
  const available = Object.values(accountMap).reduce((sum, acc) => sum + acc.currentBalance, 0);
  const progress = totalIncome > 0 ? Math.min(totalSpent / totalIncome, 1) : 0;

  const handleDeleteExpense = (id: number) => {
    deleteExpense(id).then(() => load(selectedMonthKey));
  };

  const handleDeleteIncome = (id: number) => {
    deleteIncome(id).then(() => load(selectedMonthKey));
  };

  const selectedMonthLabel = selectedMonthKey === ALL_MONTHS_KEY
    ? 'All months'
    : monthKeyToLabel(selectedMonthKey);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
              Overview
            </Text>
          </View>

          <View style={styles.monthFilterWrap}>
            <TouchableOpacity
              style={[
                styles.monthFilterBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => setMonthMenuOpen((open) => !open)}
            >
              <Text style={[styles.monthFilterText, { color: colors.textPrimary }]} numberOfLines={1}>
                {selectedMonthLabel}
              </Text>
              <Ionicons
                name={monthMenuOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
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
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <ScrollView nestedScrollEnabled style={styles.monthMenuList}>
                    <TouchableOpacity
                      style={[
                        styles.monthMenuItem,
                        selectedMonthKey === ALL_MONTHS_KEY && { backgroundColor: colors.primary + '20' },
                      ]}
                      onPress={() => {
                        setMonthMenuOpen(false);
                        setSelectedMonthKey(ALL_MONTHS_KEY);
                        load(ALL_MONTHS_KEY);
                      }}
                    >
                      <View style={styles.monthMenuItemContent}>
                        <Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />
                        <Text style={[styles.monthMenuItemText, { color: colors.textPrimary }]}>All months</Text>
                        {selectedMonthKey === ALL_MONTHS_KEY && (
                          <Ionicons name="checkmark" size={18} color={colors.primary} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {availableMonthKeys.map((key) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.monthMenuItem,
                          selectedMonthKey === key && { backgroundColor: colors.primary + '20' },
                        ]}
                        onPress={() => {
                          setMonthMenuOpen(false);
                          setSelectedMonthKey(key);
                          load(key);
                        }}
                      >
                        <View style={styles.monthMenuItemContent}>
                          <Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />
                          <Text style={[styles.monthMenuItemText, { color: colors.textPrimary }]}>
                            {monthKeyToLabel(key)}
                          </Text>
                          {selectedMonthKey === key && (
                            <Ionicons name="checkmark" size={18} color={colors.primary} />
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

        {/* Account snapshot */}
        {(cashAccount || favBankAccount) && (
          <View style={styles.accountRow}>
            {cashAccount && (
              <AccountSnapshotCard
                label="Cash"
                icon={cashAccount.icon ?? '💵'}
                name={cashAccount.name}
                balance={cashAccount.currentBalance}
                color="#10B981"
                currency={settings?.currency}
              />
            )}
            {favBankAccount ? (
              <AccountSnapshotCard
                label="Bank"
                icon={favBankAccount.icon ?? '🏦'}
                name={favBankAccount.name}
                balance={favBankAccount.currentBalance}
                color={favBankAccount.color ?? colors.primary}
                currency={settings?.currency}
              />
            ) : (
              <TouchableOpacity
                style={[styles.accountSnapshotPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/accounts')}
              >
                <Ionicons name="star-outline" size={22} color={colors.textSecondary} />
                <Text style={[styles.accountPlaceholderText, { color: colors.textSecondary }]}>
                  {'Set favorite\nbank account'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Summary cards */}
        <View style={styles.cards}>
          <SummaryCard icon="💰" title="Income"
            value={formatCurrency(totalIncome, settings?.currency)}
            valueColor={colors.success} flex />
          <SummaryCard icon="📉" title="Spent"
            value={formatCurrency(totalSpent, settings?.currency)}
            valueColor={colors.danger} flex />
        </View>

        {/* Available balance */}
        <View style={[
          styles.balanceCard,
          { backgroundColor: colors.card },
        ]}>
          <View style={styles.balanceHeader}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
              Available Balance
            </Text>
            <Text style={styles.balanceEmoji}>
              {available >= 0 ? '💰' : '⚠️'}
            </Text>
          </View>
          <Text style={[
            styles.balanceValue,
            { color: colors.textPrimary },
          ]}>
            {available >= 0 ? '' : '-'}{formatCurrency(Math.abs(available), settings?.currency)}
          </Text>
        </View>

        {/* Progress bar */}
        {totalIncome > 0 && (
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[
              styles.progressFill,
              { width: `${progress * 100}%`, backgroundColor: progress >= 1 ? colors.danger : colors.primary },
            ]} />
          </View>
        )}

        {/* Report button */}
        <TouchableOpacity
          style={[styles.reportBtn, { borderColor: colors.primary }]}
          onPress={() => router.push({ pathname: '/report', params: { monthKey: selectedMonthKey } })}
        >
          <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
          <Text style={[styles.reportBtnText, { color: colors.primary }]}>  View Full Report</Text>
        </TouchableOpacity>

        {/* Tab switcher */}
        <View style={[styles.tabs, { backgroundColor: colors.inputFill }]}>
          {(['expenses', 'income'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { backgroundColor: colors.primary },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab ? colors.background : colors.textSecondary },
              ]}>
                {tab === 'expenses' ? '📉 Expenses' : '💰 Income'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        {activeTab === 'expenses' ? (
          expenses.length === 0 ? (
            <EmptyState
              emoji="🧾"
              text={selectedMonthKey === ALL_MONTHS_KEY ? 'No expenses in this period' : 'No expenses this month'}
            />
          ) : (
            expenses.map((exp) => (
              <ExpenseTile
                key={exp.id}
                expense={exp}
                currency={settings?.currency ?? 'EGP'}
                categoryEmoji={categoryMap[exp.category]?.emoji ?? '📦'}
                categoryColor={categoryMap[exp.category]?.color ?? '#408A71'}
                onEdit={() => router.push({ pathname: '/add-expense', params: { expenseId: String(exp.id) } })}
                onDelete={() => handleDeleteExpense(exp.id)}
                accountName={exp.accountId != null ? accountMap[exp.accountId]?.name : undefined}
                accountIcon={exp.accountId != null ? (accountMap[exp.accountId]?.icon ?? undefined) : undefined}
              />
            ))
          )
        ) : (
          incomes.length === 0 ? (
            <EmptyState
              emoji="💸"
              text={selectedMonthKey === ALL_MONTHS_KEY ? 'No income recorded in this period' : 'No income recorded this month'}
            />
          ) : (
            incomes.map((inc) => (
              <IncomeTile
                key={inc.id}
                income={inc}
                currency={settings?.currency ?? 'EGP'}
                category={incomeCategoryMap[inc.category]}
                onDelete={() => handleDeleteIncome(inc.id)}
                accountName={inc.accountId != null ? accountMap[inc.accountId]?.name : undefined}
                accountIcon={inc.accountId != null ? (accountMap[inc.accountId]?.icon ?? undefined) : undefined}
              />
            ))
          )
        )}

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* FAB overlay to close */}
      {fabOpen && (
        <TouchableOpacity style={styles.overlay} onPress={() => setFabOpen(false)} />
      )}

      {/* FAB group */}
      <View style={styles.fabGroup}>
        {fabOpen && (
          <>
            <TouchableOpacity
              style={[styles.fabMini, { backgroundColor: colors.success }]}
              onPress={() => { setFabOpen(false); router.push('/add-income'); }}
            >
              <Ionicons name="trending-up-outline" size={20} color={colors.background} />
              <Text style={[styles.fabMiniLabel, { color: colors.background }]}>Income</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fabMini, { backgroundColor: colors.danger }]}
              onPress={() => { setFabOpen(false); router.push('/add-expense'); }}
            >
              <Ionicons name="trending-down-outline" size={20} color={colors.background} />
              <Text style={[styles.fabMiniLabel, { color: colors.background }]}>Expense</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setFabOpen((o) => !o)}
        >
          <Ionicons name={fabOpen ? 'close' : 'add'} size={28} color={colors.background} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

function AccountSnapshotCard({
  label, icon, name, balance, color, currency,
}: {
  label: string; icon: string; name: string;
  balance: number; color: string; currency?: string;
}) {
  const { colors } = useTheme();
  const balColor = balance >= 0 ? colors.textPrimary : colors.danger;
  return (
    <View style={[styles.accountSnapshotCard, { backgroundColor: colors.card }]}>
      <View style={styles.accountSnapshotTop}>
        <Text style={[styles.accountSnapshotLabel, { color: colors.textSecondary }]}>{label.toUpperCase()}</Text>
        <Text style={styles.accountSnapshotIcon}>{icon}</Text>
      </View>
      <Text style={[styles.accountSnapshotBalance, { color: balColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {balance < 0 ? '-' : ''}{formatCurrency(Math.abs(balance), currency)}
      </Text>
      <Text style={[styles.accountSnapshotName, { color: colors.textSecondary }]} numberOfLines={1}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  monthTitle: { fontSize: 20, fontWeight: '700' },
  monthFilterWrap: { minWidth: 150, position: 'relative', zIndex: 6 },
  monthFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    zIndex: 3,
  },
  monthFilterText: { fontSize: 13, fontWeight: '600', flex: 1 },
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
    right: 0,
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

  cards: { flexDirection: 'row', marginBottom: 10 },
  accountRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  accountSnapshotCard: {
    flex: 1, borderRadius: 16, padding: 14, minHeight: 90,
  },
  accountSnapshotTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
  },
  accountSnapshotLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  accountSnapshotIcon: { fontSize: 20 },
  accountSnapshotBalance: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  accountSnapshotName: { fontSize: 11 },
  accountSnapshotPlaceholder: {
    flex: 1, borderRadius: 16, padding: 14, minHeight: 90,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderStyle: 'dashed',
  },
  accountPlaceholderText: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
  balanceCard: {
    borderRadius: 16, padding: 18, marginBottom: 12,
  },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  balanceLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  balanceEmoji: { fontSize: 14, marginLeft: 6 },
  balanceValue: { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  progressTrack: { height: 8, borderRadius: 4, marginBottom: 16, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, marginBottom: 20,
  },
  reportBtnText: { fontSize: 14, fontWeight: '600' },
  tabs: {
    flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 16,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 14 },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  fabGroup: {
    position: 'absolute', bottom: 110, right: 24,
    alignItems: 'flex-end', zIndex: 2,
  },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowOpacity: 0.3, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabMini: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 28, marginBottom: 10,
    elevation: 3, shadowOpacity: 0.2, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  fabMiniLabel: { fontSize: 14, fontWeight: '700', marginLeft: 8 },
});
