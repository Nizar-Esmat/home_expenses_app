import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import {
  getExpensesByMonth, getIncomesByMonth, getSettings, deleteExpense, getCategories,
} from '@/services/database';
import { monthKeyToLabel, formatCurrency } from '@/services/constants';
import { Category, Expense, Income, Settings } from '@/types';
import ExpenseTile from '@/components/ExpenseTile';
import IncomeTile from '@/components/IncomeTile';
import CategoryBar from '@/components/CategoryBar';

export default function ReportScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { monthKey } = useLocalSearchParams<{ monthKey: string }>();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!monthKey) return;
    setLoading(true);
    Promise.all([
      getExpensesByMonth(monthKey),
      getIncomesByMonth(monthKey),
      getSettings(),
      getCategories(),
    ]).then(([exps, incs, sets, cats]) => {
      setExpenses(exps);
      setIncomes(incs);
      setSettings(sets);
      const map: Record<string, Category> = {};
      cats.forEach((c) => (map[c.name] = c));
      setCategoryMap(map);
      setLoading(false);
    });
  }, [monthKey]);

  useFocusEffect(load);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const totalSpent = expenses.reduce((s, e) => s + e.price, 0);
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const available = totalIncome - totalSpent;
  const currency = settings?.currency ?? 'EGP';

  // Category breakdown sorted by total descending
  const byCategory: Record<string, number> = {};
  for (const e of expenses) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.price;
  const categoryBreakdown = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount]) => ({
      category: cat,
      total: amount,
      percentage: totalSpent > 0 ? amount / totalSpent : 0,
      categoryEmoji: categoryMap[cat]?.emoji ?? '📦',
      categoryColor: categoryMap[cat]?.color ?? '#408A71',
    }));

  const handleDeleteExpense = (id: number) => {
    deleteExpense(id).then(load);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {monthKeyToLabel(monthKey ?? '')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Summary row */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBox, { backgroundColor: colors.successBg }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Income</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(totalIncome, currency)}
            </Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: colors.dangerBg }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Spent</Text>
            <Text style={[styles.summaryValue, { color: colors.danger }]}>
              {formatCurrency(totalSpent, currency)}
            </Text>
          </View>
        </View>

        <View style={[
          styles.balanceCard,
          { backgroundColor: colors.card },
        ]}>
          <View style={styles.balanceHeader}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Net Available</Text>
            <Text style={styles.balanceEmoji}>
              {available >= 0 ? '💰' : '⚠️'}
            </Text>
          </View>
          <Text style={[styles.balanceValue, { color: colors.textPrimary }]}>
            {available >= 0 ? '' : '-'}{formatCurrency(Math.abs(available), currency)}
          </Text>
        </View>

        {/* Category breakdown */}
        {categoryBreakdown.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>By Category</Text>
            {categoryBreakdown.map((c) => (
              <CategoryBar key={c.category} {...c} currency={currency} />
            ))}
          </>
        )}

        {/* Expense list */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Expenses ({expenses.length})
        </Text>
        {expenses.length === 0 ? (
          <EmptyRow text="No expenses" />
        ) : (
          expenses.map((exp) => (
            <ExpenseTile
              key={exp.id}
              expense={exp}
              currency={currency}
              categoryEmoji={categoryMap[exp.category]?.emoji ?? '📦'}
              categoryColor={categoryMap[exp.category]?.color ?? '#408A71'}
              onEdit={() => router.push({ pathname: '/add-expense', params: { expenseId: String(exp.id) } })}
              onDelete={() => handleDeleteExpense(exp.id)}
            />
          ))
        )}

        {/* Income list */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Income ({incomes.length})
        </Text>
        {incomes.length === 0 ? (
          <EmptyRow text="No income recorded" />
        ) : (
          incomes.map((inc) => (
            <IncomeTile
              key={inc.id}
              income={inc}
              currency={currency}
              onDelete={load}
            />
          ))
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function EmptyRow({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 12, fontSize: 14 }}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryBox: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  summaryLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '800' },
  balanceCard: { borderRadius: 16, padding: 18, marginBottom: 20 },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  balanceLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  balanceEmoji: { fontSize: 14, marginLeft: 6 },
  balanceValue: { fontSize: 28, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 4 },
});
