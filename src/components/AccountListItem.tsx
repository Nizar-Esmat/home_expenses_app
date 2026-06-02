import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Account } from '@/types';
import { formatCurrency } from '@/services/constants';

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
  const isNegative = account.currentBalance < 0;
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.icon}>{account.icon ?? '💳'}</Text>
        <View>
          <Text style={styles.name}>{account.name}</Text>
          <Text style={styles.type}>
            {account.type === 'cash'
              ? 'Cash'
              : account.type === 'bank_account'
                ? 'Bank'
                : 'E-Wallet'}
          </Text>
        </View>
      </View>
      <Text style={[styles.amount, isNegative && { color: '#EF4444' }]}>
        {isNegative ? '-' : ''}
        {formatCurrency(Math.abs(account.currentBalance), currency)}
      </Text>
      {showDivider && <View style={styles.divider} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    position: 'relative',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 32 },
  name: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  type: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '400',
    color: '#AAB2C0',
  },
  amount: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    width: '100%',
    marginLeft: '5%',
    backgroundColor: '#263247',
  },
});
