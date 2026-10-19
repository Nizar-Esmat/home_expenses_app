import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Expense } from '@/types';
import { formatCurrency, formatDate } from '@/services/constants';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  expense: Expense;
  currency: string;
  categoryEmoji: string;
  categoryColor: string;
  onPress?: () => void;
}

export default function ExpenseStatRow({ expense, currency, categoryEmoji, categoryColor, onPress }: Props) {
  const { colors } = useTheme();
  const title = expense.category + (expense.note ? ` · ${expense.note}` : '');

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${title}, -${formatCurrency(expense.price, currency)}, on ${formatDate(expense.createdAt)}`}
    >
      <View style={[styles.iconWrapper, { backgroundColor: categoryColor }]}>
        <Text style={styles.emoji}>{categoryEmoji}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.textPrimary, textAlign: 'auto' }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>{formatDate(expense.createdAt)}</Text>
      </View>
      <Text style={[styles.amount, { color: colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>
        -{formatCurrency(expense.price, currency)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 10,
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
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});
