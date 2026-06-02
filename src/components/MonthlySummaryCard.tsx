import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  income: string;
  spent: string;
  net: string;
  currency?: string;
}

export default function MonthlySummaryCard({
  income,
  spent,
  net,
  currency = 'EGP',
}: Props) {
  // Parse raw numeric values for Net calculation and color logic
  const parseAmount = (val: string): number => {
    const clean = val.replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
  };

  const incomeNum = parseAmount(income);
  const spentNum = parseAmount(spent);
  const netNum = parseAmount(net);

  // Color logic for Net
  const getNetColor = () => {
    if (netNum > 0) return '#10B981';
    if (netNum < 0) return '#EF4444';
    return '#F8FAFC';
  };

  // Prefix logic for Net
  const getNetPrefix = () => {
    if (netNum > 0) return '+';
    if (netNum < 0) return '-';
    return '';
  };

  const formattedNet = `${getNetPrefix()}${currency} ${Math.abs(
    netNum,
  ).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <View style={styles.card}>
      {/* Left Column - Income & Spent */}
      <View style={styles.leftColumn}>
        <View style={styles.rowItem}>
          <Text style={styles.label}>Income</Text>
          <Text style={[styles.amount, { color: '#10B981' }]}>{income}</Text>
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.label}>Spent</Text>
          <Text style={[styles.amount, { color: '#EF4444' }]}>{spent}</Text>
        </View>
      </View>

      {/* Right Column - Net */}
      <View style={styles.rightColumn}>
        <Text style={styles.netLabel}>Net</Text>
        <Text style={[styles.netAmount, { color: getNetColor() }]}>
          {formattedNet}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 136,
    maxHeight: 152,
    backgroundColor: '#101827',
    borderWidth: 1,
    borderColor: '#263247',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    columnGap: 12,
  },
  leftColumn: {
    width: '55%',
    justifyContent: 'center',
    gap: 8,
  },
  rightColumn: {
    width: '45%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowItem: {
    gap: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AAB2C0',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
  },
  netLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#AAB2C0',
    marginBottom: 4,
  },
  netAmount: {
    fontSize: 24,
    fontWeight: '800',
  },
});
