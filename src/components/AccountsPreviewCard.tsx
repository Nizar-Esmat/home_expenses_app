import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { Account } from '@/types';
import AccountListItem from '@/components/AccountListItem';

interface Props {
  accounts: Account[];
  totalAccountCount: number;
  hiddenCount: number;
  currency?: string;
  onViewAll: () => void;
  onAddAccount: () => void;
}

export default function AccountsPreviewCard({
  accounts,
  totalAccountCount,
  hiddenCount,
  currency = 'EGP',
  onViewAll,
  onAddAccount,
}: Props) {
  const { colors } = useTheme();

  if (accounts.length === 0) {
    return (
      <TouchableOpacity
        style={styles.emptyCard}
        onPress={onAddAccount}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="No accounts yet. Tap to add an account"
      >
        <Ionicons name='wallet-outline' size={28} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No accounts yet</Text>
        <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>Add account</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      {accounts.map((acc, idx) => (
        <AccountListItem
          key={acc.id}
          account={acc}
          currency={currency}
          showDivider={idx < accounts.length - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    paddingVertical: 10,
  },
  emptyCard: {
    width: '100%',
    height: 228,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  addBtn: {
    marginTop: 14,
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
