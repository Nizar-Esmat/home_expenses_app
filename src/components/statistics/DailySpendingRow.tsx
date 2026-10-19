import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from '@/services/constants';
import { useTheme } from '@/theme/ThemeContext';

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
  const { colors } = useTheme();
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  const dayLabel = dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const barWidth = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.card, borderBottomColor: colors.border },
        isLast && styles.rowLast,
      ]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${dayLabel}, spent ${formatCurrency(total, currency)}`}
    >
      <View style={styles.left}>
        <Text style={[styles.date, { color: colors.textPrimary }]} numberOfLines={1}>
          {dayLabel}
        </Text>
        <View style={[styles.barTrack, { backgroundColor: colors.inputFill }]}>
          <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: colors.primary }]} />
        </View>
      </View>
      <Text style={[styles.amount, { color: colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatCurrency(total, currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
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
    width: 120,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
  },
});
