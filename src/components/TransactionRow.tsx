import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeTransaction } from '@/types';
import { formatDate } from '@/services/constants';
import SwipeableTransactionRow from '@/components/SwipeableTransactionRow';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  tx: HomeTransaction;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
  showDivider?: boolean;
}

function fmtAmt(amount: number, currency: string): string {
  const isWhole = amount % 1 === 0;
  return `${currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function TransactionRow({
  tx,
  currency,
  onEdit,
  onDelete,
  showDivider,
}: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const isTransfer = tx.type === 'transfer';
  const isLoan = tx.type === 'loan';
  const isLoanRepayment = tx.type === 'loan_repayment';
  const feeValue = tx.feeAmount ?? 0;
  const subs = tx.subExpenses ?? [];

  let amountColor = colors.success;
  if (tx.type === 'expense') amountColor = colors.danger;
  else if (isLoanRepayment) {
    // BORROWED repayment = you pay back (red), LENT repayment = you receive (green)
    amountColor = tx.category.startsWith('Repaid') ? colors.danger : colors.success;
  } else if (isLoan) {
    // BORROWED loan = money in (green), LENT loan = money out (red)
    amountColor = tx.category.startsWith('Loan from') ? colors.success : colors.danger;
  }

  const transferParts = isTransfer ? (tx.accountName ?? '').split(/\s*[→➛]\s*/) : [];
  const fromName = transferParts[0] ?? '?';
  const toName = transferParts[1] ?? '?';

  const loanSign = (() => {
    if (isLoan) return tx.category.startsWith('Loan from') ? '+' : '−';
    if (isLoanRepayment) return tx.category.startsWith('Repaid') ? '−' : '+';
    return '';
  })();

  return (
    <>
      <SwipeableTransactionRow onEdit={onEdit} onDelete={onDelete}>
        <View style={styles.card}>
          <View style={[styles.badge, { backgroundColor: colors.inputFill, borderColor: colors.border }]}>
            <Text style={styles.emoji}>{tx.emoji}</Text>
          </View>

          <View style={styles.info}>
            {/* Layer 1 */}
            {isTransfer ? (
              tx.note ? (
                <Text style={[styles.l1Text, { color: colors.textPrimary, textAlign: 'auto' }]} numberOfLines={1}>
                  {tx.note}
                  <Text style={[styles.transferAmtInline, { color: colors.textSecondary }]}> ({fmtAmt(tx.amount, currency)})</Text>
                </Text>
              ) : (
                <Text style={[styles.l1Text, { color: colors.textPrimary }]} numberOfLines={1}>
                  {fmtAmt(tx.amount, currency)}
                </Text>
              )
            ) : tx.note ? (
              <Text style={[styles.l1Text, { color: colors.textPrimary, textAlign: 'auto' }]} numberOfLines={1}>{tx.note}</Text>
            ) : null}

            {/* Layer 2 */}
            {isTransfer ? (
              <View style={styles.l2Row}>
                <Text style={[styles.l2CatText, { color: colors.textSecondary }]}>Transfer ·</Text>
                <View style={styles.fromChip}>
                  <Text style={styles.fromChipText} numberOfLines={1}>{fromName}</Text>
                </View>
                <Ionicons name="arrow-forward" size={10} color={colors.textSecondary} />
                <View style={styles.toChip}>
                  <Text style={styles.toChipText} numberOfLines={1}>{toName}</Text>
                </View>
              </View>
            ) : (isLoan || isLoanRepayment) ? (
              <View style={styles.l2Row}>
                <Text style={[styles.l2CatText, { color: colors.textSecondary }]} numberOfLines={1}>{tx.category} ·</Text>
                <View style={[styles.loanBadge, { backgroundColor: isLoanRepayment ? '#6B728022' : '#F59E0B22' }]}>
                  <Text style={[styles.loanBadgeText, { color: isLoanRepayment ? '#9CA3AF' : '#F59E0B' }]}>
                    {isLoanRepayment ? 'REPAYMENT' : 'LOAN'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.l2Row}>
                <Text style={[styles.l2CatText, { color: colors.textSecondary, textAlign: 'auto' }]} numberOfLines={1}>
                  {tx.category}{tx.accountName ? ' ·' : ''}
                </Text>
                {tx.accountName ? (
                  <View style={[
                    styles.accountPill,
                    tx.accountColor ? { backgroundColor: `${tx.accountColor}26` } : undefined,
                  ]}>
                    <Text style={[
                      styles.accountPillText,
                      tx.accountColor ? { color: tx.accountColor } : undefined,
                    ]} numberOfLines={1}>
                      {tx.accountName}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Layer 3: Date */}
            <Text style={[styles.l3Text, { color: colors.textSecondary }]}>{formatDate(tx.createdAt)}</Text>
          </View>

          {/* Right column */}
          {isTransfer ? (
            feeValue > 0 ? (
              <Text style={[styles.amount, { color: colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>
                {'−'}{fmtAmt(feeValue, currency)}
              </Text>
            ) : null
          ) : (isLoan || isLoanRepayment) ? (
            <Text style={[styles.amount, { color: amountColor }]} numberOfLines={1} adjustsFontSizeToFit>
              {loanSign}{fmtAmt(tx.amount, currency)}
            </Text>
          ) : (
            <Text
              style={[styles.amount, { color: amountColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {tx.type === 'expense' ? '−' : '+'}
              {fmtAmt(tx.amount, currency)}
            </Text>
          )}
        </View>

        {subs.length > 0 && (
          <View style={styles.subSection}>
            <TouchableOpacity
              style={styles.subToggle}
              onPress={() => setExpanded((e) => !e)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={`${subs.length} sub item${subs.length !== 1 ? 's' : ''}, ${expanded ? 'expanded' : 'collapsed'}`}
            >
              <Ionicons
                name={expanded ? 'chevron-forward' : 'chevron-down'}
                size={13}
                color={colors.textSecondary}
              />
              <Text style={[styles.subToggleText, { color: colors.textSecondary }]}>
                {subs.length} item{subs.length !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>

            {expanded &&
              subs.map((sub, i) => (
                <View key={i} style={styles.subRow}>
                  <Text style={[styles.subTitle, { color: colors.textPrimary, textAlign: 'auto' }]} numberOfLines={1}>{sub.title}</Text>
                  <Text style={[styles.subAmount, { color: colors.danger }]}>
                    {'−'}{fmtAmt(sub.amount, currency)}
                  </Text>
                </View>
              ))}
          </View>
        )}
      </SwipeableTransactionRow>
      {showDivider && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emoji: { fontSize: 22 },
  info: { flex: 1, marginRight: 8 },

  l1Text: {
    fontSize: 16,
    fontWeight: '700',
  },
  l2Row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    flexWrap: 'nowrap',
  },
  l2CatText: {
    fontSize: 13,
    flexShrink: 1,
  },
  accountPill: {
    backgroundColor: '#1A2332',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    flexShrink: 1,
  },
  accountPillText: {
    fontSize: 13,
    color: '#6B7280',
  },
  l2Text: {
    fontSize: 13,
    marginTop: 3,
  },
  l3Text: {
    fontSize: 13,
    marginTop: 3,
  },

  transferAmtInline: {
    fontSize: 16,
    fontWeight: '400',
  },

  fromChip: {
    backgroundColor: '#E24B4A18',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 1,
    maxWidth: 110,
  },
  fromChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A32D2D',
  },
  toChip: {
    backgroundColor: '#1D9E7518',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 1,
    maxWidth: 110,
  },
  toChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F6E56',
  },

  amount: { fontSize: 16, lineHeight: 22, fontWeight: '700' },

  subSection: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    marginLeft: 56,
    marginTop: -4,
  },
  subToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    paddingVertical: 4,
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  subToggleText: { fontSize: 12, fontWeight: '600' },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  subTitle: { flex: 1, fontSize: 13, marginRight: 8 },
  subAmount: { fontSize: 13, fontWeight: '600' },

  divider: { height: 1, marginHorizontal: 16 },

  loanBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    flexShrink: 0,
  },
  loanBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
