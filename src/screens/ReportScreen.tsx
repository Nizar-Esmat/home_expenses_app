import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { getExpensesByMonth, getIncomesByMonth, getSettings, deleteExpense } from '@/services/database';
import { monthKeyToLabel, formatCurrency } from '@/services/constants';
import { Expense, Income, Settings } from '@/types';
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!monthKey) return;
    setLoading(true);
    Promise.all([
      getExpensesByMonth(monthKey),
      getIncomesByMonth(monthKey),
      getSettings(),
    ]).then(([exps, incs, sets]) => {
      setExpenses(exps);
      setIncomes(incs);
      setSettings(sets);
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

  const byCategory: Record<string, number> = {};
  for (const e of expenses) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.price;

  const categories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount]) => ({
      category: cat,
      total: amount,
      percentage: totalSpent > 0 ? amount / totalSpent : 0,
      customEmojiMap: settings?.customCategoryEmojis ?? {},
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

        {/* Top summary row */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBox, { backgroundColor: colors.successBg }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Income</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(totalIncome, settings?.currency)}
            </Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: colors.dangerBg }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Spent</Text>
            <Text style={[styles.summaryValue, { color: colors.danger }]}>
              {formatCurrency(totalSpent, settings?.currency)}
            </Text>
          </View>
        </View>

        <View style={[
          styles.balanceCard,
          { backgroundColor: available >= 0 ? colors.successBg : colors.dangerBg },
        ]}>
          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Net Available</Text>
          <Text style={[styles.balanceValue, { color: available >= 0 ? colors.success : colors.danger }]}>
            {available >= 0 ? '' : '-'}{formatCurrency(Math.abs(available), settings?.currency)}
          </Text>
        </View>

        {/* Expense breakdown */}
        {categories.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Expenses by Category</Text>
            {categories.map(c => (
              <CategoryBar key={c.category} {...c} currency={settings?.currency ?? 'EGP'} />
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
          expenses.map(exp => (
            <ExpenseTile
              key={exp.id}
              expense={exp}
              currency={settings?.currency ?? 'EGP'}
              customEmojiMap={settings?.customCategoryEmojis ?? {}}
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
          incomes.map(inc => (
            <IncomeTile
              key={inc.id}
              income={inc}
              currency={settings?.currency ?? 'EGP'}
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
  balanceCard: { borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 20 },
  balanceLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  balanceValue: { fontSize: 28, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 4 },
});
