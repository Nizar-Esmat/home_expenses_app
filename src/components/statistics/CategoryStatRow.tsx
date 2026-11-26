import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { formatCurrency } from '@/services/constants';

interface Props {
  category: string;
  total: number;
  percentage: number;
  categoryEmoji: string;
  categoryColor: string;
  currency: string;
  budgetLimit?: number | null;
  budgetPercentage?: number | null;
  isLast?: boolean;
}

export default function CategoryStatRow({
  category,
  total,
  percentage,
  categoryEmoji,
  categoryColor,
  currency,
  budgetLimit,
  budgetPercentage,
  isLast = false,
}: Props) {
  const { colors, isDark } = useTheme();

  const hasBudget = budgetLimit != null && budgetLimit > 0;
  const isExceeded = hasBudget && (budgetPercentage ?? 0) > 1.0;
  const isWarning = hasBudget && (budgetPercentage ?? 0) >= 0.9 && !isExceeded;

  const barColor = isExceeded ? colors.danger : isWarning ? '#F59E0B' : categoryColor;

  return (
    <View
      style={[styles.card, { borderColor: colors.border }, isLast && styles.cardLast]}
      accessible={true}
      accessibilityLabel={`${category}: ${formatCurrency(total, currency)}, ${(percentage * 100).toFixed(1)}% of spending`}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrapper, { backgroundColor: `${categoryColor}30` }]}>
          <Text style={styles.emoji}>{categoryEmoji}</Text>
        </View>
        <View style={styles.info}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {category}
            </Text>
            {isExceeded && (
              <View style={[styles.warningBadge, { backgroundColor: colors.dangerBg }]}>
                <Text style={[styles.warningBadgeText, { color: colors.danger }]}>Exceeded</Text>
              </View>
            )}
            {isWarning && (
              <View style={[styles.warningBadge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.warningBadgeText, { color: '#B45309' }]}>Near limit</Text>
              </View>
            )}
          </View>

          <Text style={[styles.percentage, { color: colors.textSecondary }]}>
            {(percentage * 100).toFixed(1)}% of spending
            {hasBudget && (
              <Text
                style={{
                  color: isExceeded ? colors.danger : isWarning ? '#F59E0B' : colors.textSecondary,
                  fontWeight: isExceeded || isWarning ? '700' : '400',
                }}
              >
                {' '}· {Math.round((budgetPercentage ?? 0) * 100)}% of {formatCurrency(budgetLimit!, currency)}
              </Text>
            )}
          </Text>
        </View>
        <Text style={[styles.amount, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
          {formatCurrency(total, currency)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: isDark ? '#1A2332' : '#E2E8F0' }]}>
        <View style={[styles.fill, { width: `${Math.min(percentage * 100, 100)}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    justifyContent: 'space-between',
  },
  cardLast: {
    borderBottomWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'auto',
  },
  warningBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  warningBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  percentage: {
    fontSize: 13,
    fontWeight: '400',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});
