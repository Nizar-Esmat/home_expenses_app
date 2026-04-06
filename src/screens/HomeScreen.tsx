import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { getExpensesByMonth, getIncomesByMonth, deleteExpense, deleteIncome, getSettings, getCategories, getIncomeCategories } from '@/services/database';
import { currentMonthKey, monthKeyToLabel, formatCurrency } from '@/services/constants';
import { Category, IncomeCategory, Expense, Income, Settings } from '@/types';
import SummaryCard from '@/components/SummaryCard';
import ExpenseTile from '@/components/ExpenseTile';
import IncomeTile from '@/components/IncomeTile';

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const monthKey = currentMonthKey();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [incomeCategoryMap, setIncomeCategoryMap] = useState<Record<string, IncomeCategory>>({});
  const [loading, setLoading] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getExpensesByMonth(monthKey),
      getIncomesByMonth(monthKey),
      getSettings(),
      getCategories(),
      getIncomeCategories(),
    ]).then(([exps, incs, sets, cats, incomeCats]) => {
      setExpenses(exps);
      setIncomes(incs);
      setSettings(sets);
      const map: Record<string, Category> = {};
      cats.forEach((c) => (map[c.name] = c));
      setCategoryMap(map);
      const incomeMap: Record<string, IncomeCategory> = {};
      incomeCats.forEach((c) => (incomeMap[c.name] = c));
      setIncomeCategoryMap(incomeMap);
      setLoading(false);
    });
  }, [monthKey]);

  useFocusEffect(load);

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.price, 0);
  const available = totalIncome - totalSpent;
  const progress = totalIncome > 0 ? Math.min(totalSpent / totalIncome, 1) : 0;

  const handleDeleteExpense = (id: number) => {
    deleteExpense(id).then(load);
  };

  const handleDeleteIncome = (id: number) => {
    deleteIncome(id).then(load);
  };

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
          <View>
            <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
              {monthKeyToLabel(monthKey)}
            </Text>
            <Text style={[styles.dateSubtitle, { color: colors.textSecondary }]}>
              📅 {todayLabel()}
            </Text>
          </View>
        </View>

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
          onPress={() => router.push({ pathname: '/report', params: { monthKey } })}
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
            <EmptyState emoji="🧾" text="No expenses this month" />
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
              />
            ))
          )
        ) : (
          incomes.length === 0 ? (
            <EmptyState emoji="💸" text="No income recorded this month" />
          ) : (
            incomes.map((inc) => (
              <IncomeTile
                key={inc.id}
                income={inc}
                currency={settings?.currency ?? 'EGP'}
                category={incomeCategoryMap[inc.category]}
                onDelete={() => handleDeleteIncome(inc.id)}
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  monthTitle: { fontSize: 20, fontWeight: '700' },
  dateSubtitle: { fontSize: 12, marginTop: 3 },

  cards: { flexDirection: 'row', marginBottom: 10 },
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
