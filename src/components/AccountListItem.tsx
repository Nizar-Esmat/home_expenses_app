import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Account } from '@/types';
import { formatCurrency } from '@/services/constants';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  account: Account;
  currency?: string;
  showDivider?: boolean;
}

export default function AccountListItem({
  account,
  currency = 'EGP',
  showDivider = true,
}: Props) {
  const { colors } = useTheme();
  const isNegative = account.currentBalance < 0;
  const typeLabel =
    account.type === 'cash'
      ? 'Cash'
      : account.type === 'bank_account'
        ? 'Bank'
        : 'E-Wallet';

  return (
    <View
      style={styles.row}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${account.name}, ${typeLabel} account, balance ${isNegative ? 'negative ' : ''}${formatCurrency(Math.abs(account.currentBalance), currency)}`}
    >
      <View style={styles.left}>
        <Text style={styles.icon}>{account.icon ?? '💳'}</Text>
        <View style={styles.nameWrap}>
          <Text style={[styles.name, { color: colors.textPrimary, textAlign: 'auto' }]}>{account.name}</Text>
          <Text style={[styles.type, { color: colors.textSecondary }]}>
            {typeLabel}
          </Text>
        </View>
      </View>
      <Text style={[styles.amount, { color: isNegative ? colors.danger : colors.textPrimary }]}>
        {isNegative ? '-' : ''}
        {formatCurrency(Math.abs(account.currentBalance), currency)}
      </Text>
      {showDivider && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: 'relative',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
  icon: { fontSize: 32 },
  nameWrap: { flex: 1 },
  name: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  type: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    marginTop: 2,
  },
  amount: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 1,
  },
});
