import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from '@/services/constants';

interface Props {
  category: string;
  total: number;
  percentage: number;
  categoryEmoji: string;
  categoryColor: string;
  currency: string;
  isLast?: boolean;
}

export default function CategoryStatRow({ category, total, percentage, categoryEmoji, categoryColor, currency, isLast = false }: Props) {
  return (
    <View style={[styles.card, isLast && styles.cardLast]}>
      <View style={styles.row}>
        <View style={[styles.iconWrapper, { backgroundColor: `${categoryColor}30` }]}>
          <Text style={styles.emoji}>{categoryEmoji}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{category}</Text>
          <Text style={styles.percentage}>{(percentage * 100).toFixed(1)}% of spending</Text>
        </View>
        <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(total, currency)}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(percentage * 100, 100)}%`, backgroundColor: categoryColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#263247',
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
    color: '#F8FAFC',
    marginBottom: 2,
  },
  percentage: {
    fontSize: 13,
    fontWeight: '400',
    color: '#AAB2C0',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginLeft: 8,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1A2332',
    overflow: 'hidden',
    marginTop: 6,
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});
