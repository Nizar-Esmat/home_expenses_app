import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
      <View style={styles.list}>
        {accounts.map((acc) => {
          const selected = selectedAccount?.id === acc.id;
          const accentColor = acc.color ?? colors.primary;
          return (
            <TouchableOpacity
              key={acc.id}
              style={[
                styles.pill,
                {
                  backgroundColor: selected ? accentColor + '22' : colors.inputFill,
                  borderColor: selected ? accentColor : colors.border,
                },
              ]}
              onPress={() => onSelect(acc)}
              activeOpacity={0.7}
            >
              <Text style={styles.icon}>{acc.icon ?? '💳'}</Text>
              <View style={styles.textBlock}>
                <Text style={[styles.name, { color: selected ? accentColor : colors.textPrimary }]}>
                  {acc.name}
                </Text>
                <Text style={[styles.type, { color: colors.textSecondary }]}>
                  {ACCOUNT_TYPE_LABELS[acc.type]}
                </Text>
              </View>
              {selected && (
                <Ionicons name="checkmark-circle" size={18} color={accentColor} style={styles.check} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  icon: { fontSize: 18 },
  textBlock: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600' },
  type: { fontSize: 11, marginTop: 1 },
  check: { marginLeft: 4 },
});
