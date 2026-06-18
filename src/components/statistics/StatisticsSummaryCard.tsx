import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency, formatCurrencyCompact } from '@/services/constants';

interface Props {
  income: number;
  spent: number;
  net: number;
  currency: string;
}

export default function StatisticsSummaryCard({ income, spent, net, currency }: Props) {
  const getNetColor = () => {
    if (net > 0) return '#10B981';
    if (net < 0) return '#EF4444';
    return '#F8FAFC';
  };

  const getNetPrefix = () => {
    if (net > 0) return '+';
    if (net < 0) return '-';
    return '';
  };

  const smartFormat = (val: number) => {
    const full = formatCurrency(val, currency);
    if (full.length > 16) {
      return formatCurrencyCompact(val, currency);
    }
    return full;
  };

  const formattedIncome = smartFormat(income);
  const formattedSpent = smartFormat(spent);
  const netValue = net === 0
    ? formatCurrency(0, currency)
    : `${getNetPrefix()}${smartFormat(Math.abs(net))}`;

  return (
    <View style={styles.card}>
      <View style={styles.leftColumn}>
        <View style={styles.rowItem}>
          <Text style={styles.label}>Income</Text>
          <Text style={styles.incomeAmount} numberOfLines={1} adjustsFontSizeToFit>{formattedIncome}</Text>
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.label}>Spent</Text>
          <Text style={styles.spentAmount} numberOfLines={1} adjustsFontSizeToFit>{formattedSpent}</Text>
        </View>
      </View>
      <View style={styles.rightColumn}>
        <Text style={styles.netLabel}>Net</Text>
        <Text
          style={[styles.netAmount, { color: getNetColor() }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {netValue}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: 148,
    backgroundColor: '#101827',
    borderWidth: 1,
    borderColor: '#263247',
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: 'row',
    columnGap: 12,
  },
  leftColumn: {
    width: '55%',
    justifyContent: 'center',
    gap: 14,
  },
  rightColumn: {
    width: '45%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowItem: {
    gap: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#AAB2C0',
  },
  incomeAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#10B981',
  },
  spentAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#EF4444',
  },
  netLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#AAB2C0',
    marginBottom: 4,
  },
  netAmount: {
    fontSize: 26,
    fontWeight: '800',
  },
});
