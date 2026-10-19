import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { HomeTransaction } from '@/types';
import TransactionRow from '@/components/TransactionRow';
import { useAppDialog } from '@/components/AppDialog';

interface Props {
  transactions: HomeTransaction[];
  currency?: string;
  onSeeAll: () => void;
  onEdit: (tx: HomeTransaction) => void;
  onDelete: (tx: HomeTransaction) => void;
  onRetry?: () => void;
  error?: boolean;
}

export default function RecentTransactionsSection({
  transactions,
  currency = 'EGP',
  onSeeAll,
  onEdit,
  onDelete,
  onRetry,
  error,
}: Props) {
  const { colors } = useTheme();
  const { showDialog } = useAppDialog();
  const router = useRouter();

  const handleDeleteConfirm = (tx: HomeTransaction) => {
    showDialog({
      title: 'Delete transaction?',
      message: 'This action cannot be undone.',
      type: 'danger',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(tx) },
      ],
    });
  };

  return (
    <View>
      <View style={[styles.headerRow, { borderTopColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} accessibilityRole="header">
            Recent Transactions
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {error
              ? "Couldn't load balances"
              : transactions.length > 0
                ? `Latest ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`
                : 'No transactions yet'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={onSeeAll}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="View all transactions"
        >
          <Text style={[styles.headerActionText, { color: colors.primary }]}>
            View all
          </Text>
          <Ionicons name='chevron-forward' size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {error ? (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry loading balances">
          <Text style={[styles.retryText, { color: colors.textSecondary }]}>Couldn&apos;t load balances</Text>
          <Text style={[styles.retryAction, { color: colors.primary }]}>
            {' '}
            Retry
          </Text>
        </TouchableOpacity>
      ) : transactions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No transactions for this month yet
          </Text>
          <TouchableOpacity
            style={[styles.emptyCta, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
            onPress={() => router.push('/add-expense')}
            accessibilityRole="button"
            accessibilityLabel="Add an expense"
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[styles.emptyCtaText, { color: colors.primary }]}>
              Add Expense
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        transactions.map((tx, index) => (
          <TransactionRow
            key={`${tx.type}-${tx.id}`}
            tx={tx}
            currency={currency}
            onEdit={() => onEdit(tx)}
            onDelete={() => handleDeleteConfirm(tx)}
            showDivider={index < transactions.length - 1}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 12,
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    marginTop: 4,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: 4,
  },
  headerActionText: { fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 28 },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 12,
  },
  retryText: { fontSize: 14 },
  retryAction: { fontSize: 14, fontWeight: '600' },
});
