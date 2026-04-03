import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { getExpensesByMonth, getSettings, deleteExpense } from '@/services/database';
import { monthKeyToLabel, formatCurrency, CATEGORY_EMOJIS } from '@/services/constants';
import { Expense, Settings } from '@/types';
import ExpenseTile from '@/components/ExpenseTile';
import CategoryBar from '@/components/CategoryBar';

export default function ReportScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { monthKey } = useLocalSearchParams<{ monthKey: string }>();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!monthKey) return;
    setLoading(true);
    const [exps, sets] = await Promise.all([getExpensesByMonth(monthKey), getSettings()]);
    setExpenses(exps);
    setSettings(sets);
    setLoading(false);
  }, [monthKey]);

  useFocusEffect(load);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const total = expenses.reduce((s, e) => s + e.price, 0);

  const byCategory: Record<string, number> = {};
  for (const e of expenses) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.price;

  const categories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount]) => ({
      name: cat,
      emoji: CATEGORY_EMOJIS[cat] ?? settings?.customCategoryEmojis?.[cat] ?? '📦',
      amount,
      pct: total > 0 ? amount / total : 0,
    }));

  const handleDelete = async (id: number) => {
    await deleteExpense(id);
    load();
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
        <View style={[styles.totalCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Spent</Text>
          <Text style={[styles.totalValue, { color: colors.danger }]}>
            {formatCurrency(total, settings?.currency)}
          </Text>
          <Text style={[styles.txCount, { color: colors.textSecondary }]}>
            {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {categories.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>By Category</Text>
            {categories.map(c => (
              <CategoryBar key={c.name} {...c} currency={settings?.currency ?? 'EGP'} />
            ))}
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>All Expenses</Text>
        {expenses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No expenses found</Text>
          </View>
        ) : (
          expenses.map(exp => (
            <ExpenseTile
              key={exp.id}
              expense={exp}
              currency={settings?.currency ?? 'EGP'}
              customEmojiMap={settings?.customCategoryEmojis ?? {}}
              onEdit={() => router.push({ pathname: '/add-expense', params: { expenseId: String(exp.id) } })}
              onDelete={() => handleDelete(exp.id)}
            />
          ))
        )}
        <View style={{ height: 60 }} />
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
  totalCard: {
    borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20,
  },
  totalLabel: { fontSize: 13, fontWeight: '600' },
  totalValue: { fontSize: 32, fontWeight: '800', marginVertical: 4 },
  txCount: { fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 14 },
});
