import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Income, IncomeCategory } from '@/types';
import { formatCurrency, formatDate } from '@/services/constants';
import { useTheme } from '@/theme/ThemeContext';
import { useAppDialog } from '@/components/AppDialog';

interface Props {
  income: Income;
  currency: string;
  category?: IncomeCategory;
  onDelete: () => void;
  accountName?: string;
  accountIcon?: string;
}

export default function IncomeTile({ income, currency, category, onDelete, accountName, accountIcon }: Props) {
  const { colors } = useTheme();
  const { showDialog } = useAppDialog();
  const isBuiltIn = category?.isDefault === 1;
  const bgColor = isBuiltIn ? colors.success : (category?.color || colors.success);

  const confirmDelete = () =>
    showDialog({
      title: 'Delete Income',
      message: 'Remove this income entry?',
      icon: '🗑️',
      type: 'danger',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    });

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: bgColor }]}>
        <Text style={styles.emoji}>{category?.emoji || '💰'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.note, { color: colors.textPrimary }]} numberOfLines={1}>
          {category?.name || income.category}
        </Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {formatDate(income.createdAt)}
        </Text>
        {accountName ? (
          <View style={styles.accountChip}>
            <Text style={styles.accountChipIcon}>{accountIcon ?? '💳'}</Text>
            <Text style={[styles.accountChipText, { color: colors.textSecondary }]}>{accountName}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.amount, { color: colors.success }]}>
        +{formatCurrency(income.amount, currency)}
      </Text>
      <TouchableOpacity onPress={confirmDelete} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10,
  },
  icon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  emoji: { fontSize: 22 },
  info: { flex: 1 },
  note: { fontSize: 15, fontWeight: '600' },
  date: { fontSize: 12, marginTop: 2 },
  accountChip: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  accountChipIcon: { fontSize: 11 },
  accountChipText: { fontSize: 11 },
  amount: { fontSize: 15, fontWeight: '700', marginRight: 8 },
  deleteBtn: { padding: 4 },
});