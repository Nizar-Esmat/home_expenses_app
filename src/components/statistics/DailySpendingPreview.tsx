import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { DailySpendingSummary } from '@/services/reportUtils';
import { formatCurrency, formatCurrencyCompact } from '@/services/constants';
import DailySpendingRow from './DailySpendingRow';

interface Props {
  summary: DailySpendingSummary;
  currency: string;
  onViewAll?: () => void;
}

export default function DailySpendingPreview({
  summary,
  currency,
  onViewAll,
}: Props) {
  const { colors } = useTheme();
  if (summary.allDays.length === 0) return null;

  const { highestDay, averageDailySpend, topDays, totalSpent } = summary;

  const formatDayShort = (dateKey: string): string => {
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    return dt.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const avgFormatted = formatCurrencyCompact(averageDailySpend, currency);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.title}>Daily Spending</Text>
        {summary.allDays.length > 5 && onViewAll && (
          <TouchableOpacity
            onPress={onViewAll}
            activeOpacity={0.7}
            style={styles.viewAllBtn}
          >
            <Text style={[styles.viewAllText, { color: colors.primary }]}>
              View all
            </Text>
            <Ionicons name='chevron-forward' size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {highestDay && (
        <View style={styles.statRow}>
          <View style={styles.statLeft}>
            <Ionicons name='trending-up' size={18} color='#EF4444' />
            <Text style={styles.statLabel}>Highest day</Text>
          </View>
          <Text style={styles.statValue}>
            {formatDayShort(highestDay.dateKey)} ·{' '}
            {formatCurrency(highestDay.total, currency)}
          </Text>
        </View>
      )}

      <View style={styles.statRow}>
        <View style={styles.statLeft}>
          <Ionicons name='calculator' size={18} color='#AAB2C0' />
          <Text style={styles.statLabel}>Average daily spend</Text>
        </View>
        <Text style={styles.statValue}>{avgFormatted}</Text>
      </View>

      <View style={styles.divider} />

      {topDays.map((item, index) => (
        <DailySpendingRow
          key={item.dateKey}
          dateKey={item.dateKey}
          total={item.total}
          maxTotal={totalSpent}
          currency={currency}
          isLast={index === topDays.length - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderTopWidth: 1,
    borderColor: '#C0C0C080',
    paddingTop: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#AAB2C0',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  divider: {
    height: 1,
    backgroundColor: '#263247',
    marginVertical: 10,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
