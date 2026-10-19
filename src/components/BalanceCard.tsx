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
    <View
      style={styles.card}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`Total balance: ${formatCurrency(totalBalance, currency)}, across all ${accountCount} account${accountCount !== 1 ? 's' : ''}`}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>Total Balance</Text>
      <Text
        style={[styles.amount, { color: colors.textPrimary }]}
        accessibilityRole="header"
      >
        {formatCurrency(totalBalance, currency)}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
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
  },
  amount: {
    fontSize: 34,
    lineHeight: 50,
    fontWeight: '800',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    marginTop: 2,
  },
});

