import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { formatCurrency } from '@/services/constants';

interface Props {
  totalBalance: number;
  accountCount: number;
  currency?: string;
}

export default function BalanceCard({
  totalBalance,
  accountCount,
  currency = 'EGP',
}: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Total Balance</Text>
      <Text style={styles.amount}>
        {formatCurrency(totalBalance, currency)}
      </Text>
      <Text style={styles.subtitle}>
        Across all {accountCount} account{accountCount !== 1 ? 's' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    paddingVertical: 10,
  },
  label: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: '#AAB2C0',
  },
  amount: {
    fontSize: 34,
    lineHeight: 50,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: '#AAB2C0',
    marginTop: 2,
  },
});
