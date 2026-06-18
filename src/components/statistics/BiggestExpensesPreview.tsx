import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { Account, Expense, HomeTransaction } from '@/types';
import TransactionRow from '@/components/TransactionRow';

interface Props {
  expenses: Expense[];
  totalCount: number;
  currency: string;
  categoryMap: Record<string, { emoji: string; color: string }>;
  accountMap?: Record<number, Account>;
  onExpensePress?: (expense: Expense) => void;
  onViewAll?: () => void;
}

export default function BiggestExpensesPreview({ expenses, totalCount, currency, categoryMap, accountMap, onExpensePress, onViewAll }: Props) {
  const { colors } = useTheme();
  if (expenses.length === 0) return null;

  const limited = expenses.slice(0, 5);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.title}>Biggest Expenses</Text>
        {totalCount > 5 && onViewAll && (
          <TouchableOpacity style={styles.viewAllBtn} onPress={onViewAll} activeOpacity={0.7}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>View all</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      {limited.map((expense, index) => {
        const tx: HomeTransaction = {
          id: expense.id,
          type: 'expense',
          category: expense.category,
          emoji: categoryMap[expense.category]?.emoji ?? '📦',
          amount: expense.price,
          feeAmount: undefined,
          note: expense.note,
          createdAt: expense.createdAt,
          accountId: expense.accountId,
          accountName: expense.accountId != null ? (accountMap?.[expense.accountId]?.name ?? '') : '',
          accountColor: expense.accountId != null ? (accountMap?.[expense.accountId]?.color ?? null) : null,
          accountIcon: null,
          subExpenses: expense.subExpenses,
        };
        return (
          <TransactionRow
            key={expense.id}
            tx={tx}
            currency={currency}
            onEdit={() => onExpensePress?.(expense)}
            onDelete={() => {}}
            showDivider={index < limited.length - 1}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
