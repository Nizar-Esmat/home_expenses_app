import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getExpensesByMonth, deleteExpense, getSettings } from '../services/database';
import { currentMonthKey, monthKeyToLabel, formatCurrency } from '../services/constants';
import { Expense, Settings } from '../types';
import ExpenseTile from '../components/ExpenseTile';
import CategoryBar from '../components/CategoryBar';

type RouteParams = { monthKey?: string };

export default function ReportScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const monthKey = route.params?.monthKey ?? currentMonthKey();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'breakdown' | 'list'>('breakdown');

  const load = useCallback(async () => {
    setLoading(true);
    const [exps, sets] = await Promise.all([getExpensesByMonth(monthKey), getSettings()]);
    setExpenses(exps);
    setSettings(sets);
    setLoading(false);
  }, [monthKey]);

  useFocusEffect(load);

  const totalSpent = expenses.reduce((s, e) => s + e.price, 0);
  const salary = settings?.salary ?? 0;
  const remaining = salary - totalSpent;

  // Category breakdown
  const breakdown: Record<string, number> = {};
  expenses.forEach((e) => {
    breakdown[e.category] = (breakdown[e.category] ?? 0) + e.price;
  });
  const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);

  const handleDelete = async (id: number) => {
    await deleteExpense(id);
    load();
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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          📊 {monthKeyToLabel(monthKey)}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Spent</Text>
            <Text style={[styles.summaryValue, { color: colors.danger }]}>
              {formatCurrency(totalSpent, settings?.currency)}
            </Text>
          </View>
          {salary > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {remaining >= 0 ? 'Remaining' : 'Over Budget'}
              </Text>
              <Text style={[styles.summaryValue, { color: remaining >= 0 ? colors.success : colors.danger }]}>
                {formatCurrency(Math.abs(remaining), settings?.currency)}
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Transactions</Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{expenses.length}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.inputFill }]}>
          {(['breakdown', 'list'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && { backgroundColor: colors.primary }]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabLabel, { color: tab === t ? colors.background : colors.textSecondary }]}>
                {t === 'breakdown' ? '📊 Breakdown' : '📋 All Expenses'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {expenses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No expenses this month</Text>
          </View>
        ) : tab === 'breakdown' ? (
          sorted.map(([cat, total]) => (
            <CategoryBar
              key={cat}
              category={cat}
              total={total}
              currency={settings?.currency ?? 'EGP'}
              percentage={totalSpent > 0 ? total / totalSpent : 0}
              customEmojiMap={settings?.customCategoryEmojis ?? {}}
            />
          ))
        ) : (
          expenses.map((exp) => (
            <ExpenseTile
              key={exp.id}
              expense={exp}
              currency={settings?.currency ?? 'EGP'}
              customEmojiMap={settings?.customCategoryEmojis ?? {}}
              onEdit={() => navigation.navigate('AddExpense', { expense: exp })}
              onDelete={() => handleDelete(exp.id)}
            />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
  summaryCard: {
    padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
  },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  tabs: {
    flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 14 },
});
