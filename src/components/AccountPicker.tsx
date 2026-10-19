import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
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

export const ACCOUNT_TYPE_ICONS: Record<
  AccountType,
  keyof typeof Ionicons.glyphMap
> = {
  cash: 'cash-outline',
  bank_account: 'business-outline',
  e_wallet: 'phone-portrait-outline',
};

export default function AccountPicker({
  accounts,
  selectedAccount,
  onSelect,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper} accessibilityRole="radiogroup" accessibilityLabel="Select account">
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Account
      </Text>
      <View style={styles.grid}>
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
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${acc.name} account`}
            >
              <Text style={styles.cardIcon}>{acc.icon ?? '💳'}</Text>
              <Text
                style={[
                  styles.cardName,
                  { color: selected ? accent : colors.textPrimary, textAlign: 'auto' },
                ]}
                numberOfLines={1}
                ellipsizeMode='tail'
              >
                {acc.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  card: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  cardIcon: { fontSize: 20 },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
    flexShrink: 1,
  },
});
