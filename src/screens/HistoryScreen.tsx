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
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Expense History</Text>
        <View style={{ width: 24 }} />
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
          months.map((m) => {
            const available = m.totalIncome - m.totalSpent;
            const pct = m.totalIncome > 0 ? Math.min(m.totalSpent / m.totalIncome, 1) : 0;
            const over = available < 0;

            return (
              <TouchableOpacity
                key={m.monthKey}
                style={[styles.card, { backgroundColor: colors.card }]}
                onPress={() => router.push({ pathname: '/report', params: { monthKey: m.monthKey } })}
              >
                <View style={styles.cardRow}>
                  <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
                    {monthKeyToLabel(m.monthKey)}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Income</Text>
                    <Text style={[styles.statValue, { color: colors.success }]}>
                      +{formatCurrency(m.totalIncome, settings?.currency)}
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Spent</Text>
                    <Text style={[styles.statValue, { color: colors.danger }]}>
                      -{formatCurrency(m.totalSpent, settings?.currency)}
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Net</Text>
                    <Text style={[styles.statValue, { color: over ? colors.danger : colors.primary }]}>
                      {over ? '-' : ''}{formatCurrency(Math.abs(available), settings?.currency)}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.txCount, { color: colors.textSecondary }]}>
                  {m.count} expense{m.count !== 1 ? 's' : ''}
                </Text>

                {m.totalIncome > 0 && (
                  <View style={[styles.track, { backgroundColor: colors.border }]}>
                    <View style={[
                      styles.fill,
                      { width: `${pct * 100}%`, backgroundColor: over ? colors.danger : colors.primary },
                    ]} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })
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
  card: { borderRadius: 16, padding: 18, marginBottom: 14 },
  cardRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  monthLabel: { fontSize: 16, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stat: { alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  statValue: { fontSize: 13, fontWeight: '700' },
  txCount: { fontSize: 12, marginBottom: 8 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 14 },
});
