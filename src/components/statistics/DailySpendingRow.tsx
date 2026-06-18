import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from '@/services/constants';

interface Props {
  dateKey: string;
  total: number;
  maxTotal: number;
  currency: string;
  isLast?: boolean;
}

export default function DailySpendingRow({
  dateKey,
  total,
  maxTotal,
  currency,
  isLast = false,
}: Props) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  const dayLabel = dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const barWidth = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.left}>
        <Text style={styles.date} numberOfLines={1}>
          {dayLabel}
        </Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${barWidth}%` }]} />
        </View>
      </View>
      <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
        {formatCurrency(total, currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: '#101827',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#1A2332',
    paddingBottom: 8,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    width: 130,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#1A2332',
    borderRadius: 3,
    overflow: 'hidden',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  barFill: {
    height: 6,
    backgroundColor: '#4A90E2',
    borderRadius: 3,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 10,
  },
});
