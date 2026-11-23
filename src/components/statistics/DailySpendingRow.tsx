import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@/services/constants';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  dateKey: string;
  total: number;
  maxTotal: number;
  currency: string;
  isLast?: boolean;
  expandable?: boolean;
  isExpanded?: boolean;
}

export default function DailySpendingRow({
  dateKey,
  total,
  maxTotal,
  currency,
  expandable = false,
  isExpanded = false,
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
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
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
      <View style={styles.right}>
        <Text style={[styles.amount, { color: colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>
          {formatCurrency(total, currency)}
        </Text>
        {expandable && (
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  date: {
    fontSize: 13,
    fontWeight: '600',
    width: 105,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 10,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
