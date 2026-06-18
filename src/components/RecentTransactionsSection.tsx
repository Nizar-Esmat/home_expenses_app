import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Recent Transactions</Text>
          <Text style={styles.headerSubtitle}>
            {error
              ? "Couldn't load balances"
              : transactions.length > 0
                ? `Latest ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`
                : 'No transactions yet'}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={onSeeAll}>
          <Text style={[styles.headerActionText, { color: colors.primary }]}>
            View all
          </Text>
          <Ionicons name='chevron-forward' size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {error ? (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryText}>Couldn&apos;t load balances</Text>
          <Text style={[styles.retryAction, { color: colors.primary }]}>
            {' '}
            Retry
          </Text>
        </TouchableOpacity>
      ) : transactions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No transactions for this month yet
          </Text>
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
    borderColor: '#C0C0C080',
    paddingTop: 12,
    gap: 12,
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: '#AAB2C0',
    marginTop: 4,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  headerActionText: { fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#AAB2C0',
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  retryText: { fontSize: 14, color: '#AAB2C0' },
  retryAction: { fontSize: 14, fontWeight: '600' },
});
