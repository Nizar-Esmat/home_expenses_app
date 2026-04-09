import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { getMonthHistory, getSettings } from '@/services/database';
import { monthKeyToLabel, formatCurrency } from '@/services/constants';
import { MonthSummary, Settings } from '@/types';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [months, setMonths] = useState<MonthSummary[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getMonthHistory(), getSettings()]).then(([hist, sets]) => {
      setMonths(hist);
      setSettings(sets);
      setLoading(false);
    });
  }, []);

  useFocusEffect(load);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}> 
        <ActivityIndicator color={colors.primary} size='large' />
      </View>
    );
  }

  const allTimeTotals = months.reduce(
    (acc, m) => ({
      totalIncome: acc.totalIncome + m.totalIncome,
      totalSpent: acc.totalSpent + m.totalSpent,
      count: acc.count + m.count,
    }),
    { totalIncome: 0, totalSpent: 0, count: 0 },
  );
  const allTimeAvailable = allTimeTotals.totalIncome - allTimeTotals.totalSpent;
  const allTimePct = allTimeTotals.totalIncome > 0
    ? Math.min(allTimeTotals.totalSpent / allTimeTotals.totalIncome, 1)
    : 0;
  const allTimeOver = allTimeAvailable < 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <Text style={[styles.title, { color: colors.textPrimary }]}>Statistics</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {months.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}> 
              No history available yet
            </Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/report', params: { monthKey: 'all' } })}
            >
              <View style={styles.cardTopRow}>
                <View>
                  <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>All Time</Text>
                  <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Across all months</Text>
                </View>
                <Ionicons name='chevron-forward' size={18} color={colors.textSecondary} />
              </View>

              <View style={styles.kpiRow}>
                <View style={[styles.kpiChip, { backgroundColor: colors.successBg }]}> 
                  <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Income</Text>
                  <Text style={[styles.kpiValue, { color: colors.success }]}> 
                    +{formatCurrency(allTimeTotals.totalIncome, settings?.currency)}
                  </Text>
                </View>
                <View style={[styles.kpiChip, { backgroundColor: colors.dangerBg }]}> 
                  <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Spent</Text>
                  <Text style={[styles.kpiValue, { color: colors.danger }]}> 
                    -{formatCurrency(allTimeTotals.totalSpent, settings?.currency)}
                  </Text>
                </View>
                <View style={[styles.kpiChip, { backgroundColor: colors.inputFill }]}> 
                  <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Net</Text>
                  <Text style={[styles.kpiValue, { color: allTimeOver ? colors.danger : colors.primary }]}> 
                    {allTimeOver ? '-' : ''}{formatCurrency(Math.abs(allTimeAvailable), settings?.currency)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.txCount, { color: colors.textSecondary }]}> 
                {allTimeTotals.count} expense{allTimeTotals.count !== 1 ? 's' : ''}
              </Text>

              {allTimeTotals.totalIncome > 0 && (
                <View style={[styles.track, { backgroundColor: colors.border }]}> 
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${allTimePct * 100}%`,
                        backgroundColor: allTimeOver ? colors.danger : colors.primary,
                      },
                    ]}
                  />
                </View>
              )}
            </TouchableOpacity>

            {months.map((m) => {
              const available = m.totalIncome - m.totalSpent;
              const pct = m.totalIncome > 0 ? Math.min(m.totalSpent / m.totalIncome, 1) : 0;
              const over = available < 0;

              return (
                <TouchableOpacity
                  key={m.monthKey}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push({ pathname: '/report', params: { monthKey: m.monthKey } })}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.monthLabel, { color: colors.textPrimary }]}> 
                      {monthKeyToLabel(m.monthKey)}
                    </Text>
                    <Ionicons name='chevron-forward' size={18} color={colors.textSecondary} />
                  </View>

                  <View style={styles.kpiRow}>
                    <View style={[styles.kpiChip, { backgroundColor: colors.successBg }]}> 
                      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Income</Text>
                      <Text style={[styles.kpiValue, { color: colors.success }]}> 
                        +{formatCurrency(m.totalIncome, settings?.currency)}
                      </Text>
                    </View>
                    <View style={[styles.kpiChip, { backgroundColor: colors.dangerBg }]}> 
                      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Spent</Text>
                      <Text style={[styles.kpiValue, { color: colors.danger }]}> 
                        -{formatCurrency(m.totalSpent, settings?.currency)}
                      </Text>
                    </View>
                    <View style={[styles.kpiChip, { backgroundColor: colors.inputFill }]}> 
                      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Net</Text>
                      <Text style={[styles.kpiValue, { color: over ? colors.danger : colors.primary }]}> 
                        {over ? '-' : ''}{formatCurrency(Math.abs(available), settings?.currency)}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.txCount, { color: colors.textSecondary }]}> 
                    {m.count} expense{m.count !== 1 ? 's' : ''}
                  </Text>

                  {m.totalIncome > 0 && (
                    <View style={[styles.track, { backgroundColor: colors.border }]}> 
                      <View
                        style={[
                          styles.fill,
                          { width: `${pct * 100}%`, backgroundColor: over ? colors.danger : colors.primary },
                        ]}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
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
  title: { fontSize: 20, fontWeight: '700' },
  content: { padding: 20 },
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthLabel: { fontSize: 16, fontWeight: '700' },
  subLabel: { fontSize: 12, marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kpiChip: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  kpiLabel: { fontSize: 10, fontWeight: '600', marginBottom: 3 },
  kpiValue: { fontSize: 12, fontWeight: '800' },
  txCount: { fontSize: 12, marginBottom: 8 },
  track: { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 14 },
});
