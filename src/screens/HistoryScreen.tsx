import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { getMonthHistory, getSettings } from '@/services/database';
import { currentMonthKey, monthKeyToLabel, formatCurrency, MONTH_EMOJIS } from '@/services/constants';
import { MonthSummary, Settings } from '@/types';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [history, setHistory] = useState<MonthSummary[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const current = currentMonthKey();

  useFocusEffect(
    useCallback(() => {
      Promise.all([getMonthHistory(), getSettings()]).then(([h, s]) => {
        setHistory(h);
        setSettings(s);
        setLoading(false);
      });
    }, []),
  );

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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>📅 History</Text>
        <View style={{ width: 24 }} />
      </View>

      {history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No expense history yet</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.monthKey}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isCurrent = item.monthKey === current;
            const monthNum = item.monthKey.split('-')[1];
            const emoji = MONTH_EMOJIS[monthNum] ?? '📆';
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isCurrent ? colors.primary : colors.border,
                    borderWidth: isCurrent ? 2 : 1,
                  },
                ]}
                onPress={() => navigation.navigate('Report', { monthKey: item.monthKey })}
              >
                <Text style={styles.monthEmoji}>{emoji}</Text>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
                      {monthKeyToLabel(item.monthKey)}
                    </Text>
                    {isCurrent && (
                      <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.badgeText, { color: colors.background }]}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                    {item.count} expense{item.count !== 1 ? 's' : ''} ·{' '}
                    {formatCurrency(item.totalSpent, settings?.currency)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          }}
        />
      )}
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
  list: { padding: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 14, marginBottom: 12,
  },
  monthEmoji: { fontSize: 28, marginRight: 14 },
  cardInfo: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  monthLabel: { fontSize: 16, fontWeight: '600', flex: 1 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardSub: { fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15 },
});
