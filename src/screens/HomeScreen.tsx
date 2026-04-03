import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import {
  getExpensesByMonth, deleteExpense, getSettings,
} from '@/services/database';
import {
  currentMonthKey, monthKeyToLabel, formatCurrency, DEFAULT_CATEGORIES,
} from '@/services/constants';
import { Expense, Settings } from '@/types';
import SummaryCard from '@/components/SummaryCard';
import ExpenseTile from '@/components/ExpenseTile';

export default function HomeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const monthKey = currentMonthKey();

  const load = useCallback(async () => {
    setLoading(true);
    const [exps, sets] = await Promise.all([
      getExpensesByMonth(monthKey),
      getSettings(),
    ]);
    setExpenses(exps);
    setSettings(sets);
    setLoading(false);
  }, [monthKey]);

  useFocusEffect(load);

  const totalSpent = expenses.reduce((s, e) => s + e.price, 0);
  const remaining = (settings?.salary ?? 0) - totalSpent;
  const progress = settings?.salary ? Math.min(totalSpent / settings.salary, 1) : 0;

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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            💰 {monthKeyToLabel(monthKey)}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => navigation.navigate('History')} style={styles.iconBtn}>
              <Ionicons name="time-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconBtn}>
              <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Salary warning */}
        {(!settings?.salary || settings.salary === 0) && (
          <TouchableOpacity
            style={[styles.banner, { backgroundColor: colors.warning + '22', borderColor: colors.warning }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="warning-outline" size={16} color={colors.warning} />
            <Text style={[styles.bannerText, { color: colors.warning }]}>
              {' '}Set your monthly salary in Settings
            </Text>
          </TouchableOpacity>
        )}

        {/* Summary cards */}
        <View style={styles.cards}>
          <SummaryCard
            icon="💼" title="Salary"
            value={formatCurrency(settings?.salary ?? 0, settings?.currency)}
            flex
          />
          <SummaryCard
            icon="📉" title="Spent"
            value={formatCurrency(totalSpent, settings?.currency)}
            valueColor={colors.danger}
            flex
          />
        </View>
        <View style={[styles.cards, { marginTop: 0 }]}>
          <SummaryCard
            icon={remaining >= 0 ? '✅' : '🚨'} title="Remaining"
            value={formatCurrency(Math.abs(remaining), settings?.currency)}
            valueColor={remaining >= 0 ? colors.success : colors.danger}
            flex
          />
        </View>

        {/* Progress bar */}
        {(settings?.salary ?? 0) > 0 && (
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: progress >= 1 ? colors.danger : colors.primary,
                },
              ]}
            />
          </View>
        )}

        {/* Report button */}
        <TouchableOpacity
          style={[styles.reportBtn, { borderColor: colors.primary }]}
          onPress={() => navigation.navigate('Report', { monthKey })}
        >
          <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
          <Text style={[styles.reportBtnText, { color: colors.primary }]}>  View Full Report</Text>
        </TouchableOpacity>

        {/* Recent expenses */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Expenses</Text>

        {expenses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🧾</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No expenses this month yet
            </Text>
          </View>
        ) : (
          expenses.slice(0, 10).map((exp) => (
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
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddExpense', {})}
      >
        <Ionicons name="add" size={28} color={colors.background} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { flex: 1, fontSize: 20, fontWeight: '700' },
  headerActions: { flexDirection: 'row' },
  iconBtn: { padding: 6, marginLeft: 4 },
  banner: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 14,
  },
  bannerText: { fontSize: 13, fontWeight: '600' },
  cards: { flexDirection: 'row', marginBottom: 8 },
  progressTrack: {
    height: 8, borderRadius: 4, marginVertical: 12, overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4 },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, marginBottom: 20,
  },
  reportBtnText: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowOpacity: 0.3, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
