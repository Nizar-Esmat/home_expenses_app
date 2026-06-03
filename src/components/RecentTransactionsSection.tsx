import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { HomeTransaction } from '@/types';
import { formatCurrency, formatDate } from '@/services/constants';
import SwipeableTransactionRow from '@/components/SwipeableTransactionRow';
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
            See all
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
          <React.Fragment key={`${tx.type}-${tx.id}`}>
            <SwipeableTransactionRow
              onEdit={() => onEdit(tx)}
              onDelete={() => handleDeleteConfirm(tx)}
            >
              <View style={styles.txCard}>
                <View style={styles.txBadge}>
                  <Text style={styles.txEmoji}>{tx.emoji}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txTitle} numberOfLines={1}>
                    {tx.category}
                  </Text>
                  <Text style={styles.txMeta} numberOfLines={1}>
                    {formatDate(tx.createdAt)} · {tx.accountName}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    {
                      color:
                        tx.type === 'expense'
                          ? '#EF4444'
                          : tx.type === 'income'
                            ? '#10B981'
                            : '#F8FAFC',
                    },
                  ]}
                >
                  {tx.type === 'expense'
                    ? '-'
                    : tx.type === 'income'
                      ? '+'
                      : ''}
                  {formatCurrency(tx.amount, currency)}
                </Text>
              </View>
            </SwipeableTransactionRow>
            {index < transactions.length - 1 && (
              <View
                style={[styles.txDivider, { backgroundColor: '#263247' }]}
              />
            )}
          </React.Fragment>
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
    gap: 12,
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: 24,
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
  txCard: {
    height: 80,
    padding: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  txDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  txBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1F2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txEmoji: { fontSize: 22 },
  txInfo: { flex: 1, marginRight: 8 },
  txTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  txMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: '#AAB2C0',
    marginTop: 1,
  },
  txAmount: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
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
