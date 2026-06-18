import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Expense } from '@/types';
import { formatCurrency, formatDate } from '@/services/constants';

interface Props {
  expense: Expense;
  currency: string;
  categoryEmoji: string;
  categoryColor: string;
  onPress?: () => void;
}

export default function ExpenseStatRow({ expense, currency, categoryEmoji, categoryColor, onPress }: Props) {
  const title = expense.category + (expense.note ? ` · ${expense.note}` : '');

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconWrapper, { backgroundColor: categoryColor }]}>
        <Text style={styles.emoji}>{categoryEmoji}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.meta} numberOfLines={1}>{formatDate(expense.createdAt)}</Text>
      </View>
      <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
        -{formatCurrency(expense.price, currency)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#101827',
    borderWidth: 1,
    borderColor: '#263247',
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
    color: '#F8FAFC',
  },
  meta: {
    fontSize: 14,
    fontWeight: '400',
    color: '#AAB2C0',
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 8,
  },
});
