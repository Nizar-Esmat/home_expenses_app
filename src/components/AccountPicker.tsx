import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { Account, AccountType } from '@/types';

interface Props {
  accounts: Account[];
  selectedAccount: Account | null;
  onSelect: (account: Account) => void;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Cash',
  bank_account: 'Bank',
  e_wallet: 'E-Wallet',
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, keyof typeof Ionicons.glyphMap> = {
  cash: 'cash-outline',
  bank_account: 'business-outline',
  e_wallet: 'phone-portrait-outline',
};

export default function AccountPicker({ accounts, selectedAccount, onSelect }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>ACCOUNT</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {accounts.map((acc) => {
          const selected = selectedAccount?.id === acc.id;
          const accent = acc.color ?? colors.primary;
          return (
            <TouchableOpacity
              key={acc.id}
              style={[
                styles.card,
                {
                  backgroundColor: selected ? accent + '22' : colors.inputFill,
                  borderColor: selected ? accent : colors.border,
                },
              ]}
              onPress={() => onSelect(acc)}
              activeOpacity={0.75}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardIcon}>{acc.icon ?? '💳'}</Text>
                {selected && (
                  <Ionicons name="checkmark-circle" size={16} color={accent} />
                )}
              </View>
              <Text
                style={[styles.cardName, { color: selected ? accent : colors.textPrimary }]}
                numberOfLines={1}
              >
                {acc.name}
              </Text>
              <Text style={[styles.cardType, { color: colors.textSecondary }]}>
                {ACCOUNT_TYPE_LABELS[acc.type]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  scrollContent: { paddingHorizontal: 2, gap: 10 },
  card: {
    width: 100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardIcon: { fontSize: 22 },
  cardName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  cardType: { fontSize: 11 },
});

