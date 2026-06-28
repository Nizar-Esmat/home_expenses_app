import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Loan } from '@/types';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  loan: Loan;
  currency: string;
  onPay: () => void;
  onEdit: () => void;
  onDelete: () => void;
  expanded?: boolean;
  onToggle: () => void;
}

function fmtAmt(amount: number, currency: string): string {
  const isWhole = amount % 1 === 0;
  return `${currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F59E0B',
  PARTIAL: '#3B82F6',
  SETTLED: '#10B981',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  PARTIAL: 'Partial',
  SETTLED: 'Settled',
};

export default function LoanTile({ loan, currency, onPay, onEdit, onDelete, expanded, onToggle }: Props) {
  const { colors } = useTheme();
  const outstanding = loan.amount - loan.paidAmount;
  const isBorrowed = loan.type === 'BORROWED';
  const statusColor = STATUS_COLOR[loan.status] ?? '#6B7280';
  const isSettled = loan.status === 'SETTLED';

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity activeOpacity={0.75} onPress={onToggle} style={styles.main}>
        <View style={[styles.iconBadge, { backgroundColor: isBorrowed ? '#10B98118' : '#EF444418' }]}>
          <Text style={styles.iconEmoji}>{isBorrowed ? '📥' : '📤'}</Text>
        </View>

        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={[styles.contact, { color: colors.textPrimary }]} numberOfLines={1}>
              {loan.contactName}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABEL[loan.status]}</Text>
            </View>
          </View>
          <Text style={[styles.typeLabel, { color: isBorrowed ? '#10B981' : '#EF4444' }]}>
            {isBorrowed ? 'You borrowed' : 'You lent'} · {fmtAmt(loan.amount, currency)}
          </Text>
          {loan.paidAmount > 0 && (
            <Text style={[styles.paidLabel, { color: colors.textSecondary }]}>
              Paid {fmtAmt(loan.paidAmount, currency)}
            </Text>
          )}
        </View>

        <View style={styles.rightCol}>
          <Text style={[styles.outstanding, { color: isSettled ? '#10B981' : isBorrowed ? '#EF4444' : '#10B981' }]}>
            {isSettled ? '✓' : fmtAmt(outstanding, currency)}
          </Text>
          <Text style={[styles.outstandingLabel, { color: colors.textSecondary }]}>
            {isSettled ? 'Settled' : 'Left'}
          </Text>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textSecondary}
          style={styles.chevron}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.expandedArea, { borderTopColor: colors.border }]}>
          {loan.repayments && loan.repayments.length > 0 ? (
            <View style={styles.repaymentList}>
              <Text style={[styles.repaymentHeader, { color: colors.textSecondary }]}>REPAYMENTS</Text>
              {loan.repayments.map((r) => (
                <View key={r.id} style={[styles.repaymentRow, { borderBottomColor: colors.border }]}>
                  <Text style={styles.repaymentEmoji}>↩️</Text>
                  <View style={styles.repaymentInfo}>
                    <Text style={[styles.repaymentAmt, { color: colors.textPrimary }]}>
                      {fmtAmt(r.amount, currency)}
                    </Text>
                    <Text style={[styles.repaymentDate, { color: colors.textSecondary }]}>
                      {new Date(r.repaymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {r.accountName ? ` · ${r.accountName}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.noRepayments, { color: colors.textSecondary }]}>No repayments yet</Text>
          )}

          <View style={styles.actionRow}>
            {!isSettled && (
              <TouchableOpacity
                style={[styles.payBtn, { backgroundColor: colors.primary }]}
                onPress={onPay}
                activeOpacity={0.8}
              >
                <Ionicons name="cash-outline" size={15} color="#fff" />
                <Text style={styles.payBtnText}>Add Repayment</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.editBtn, { borderColor: colors.border }]}
              onPress={onEdit}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil-outline" size={15} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: '#EF444440' }]}
              onPress={onDelete}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  main: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  iconBadge: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  iconEmoji: { fontSize: 20 },
  info: { flex: 1, marginRight: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  contact: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  typeLabel: { fontSize: 12, fontWeight: '600', marginBottom: 1 },
  paidLabel: { fontSize: 11, marginTop: 1 },
  rightCol: { alignItems: 'flex-end', marginRight: 4 },
  outstanding: { fontSize: 16, fontWeight: '700' },
  outstandingLabel: { fontSize: 11, marginTop: 1 },
  chevron: { marginLeft: 4 },
  expandedArea: { borderTopWidth: 1, padding: 14 },
  repaymentList: { marginBottom: 12 },
  repaymentHeader: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  repaymentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1,
  },
  repaymentEmoji: { fontSize: 16 },
  repaymentInfo: { flex: 1 },
  repaymentAmt: { fontSize: 14, fontWeight: '600' },
  repaymentDate: { fontSize: 12, marginTop: 1 },
  noRepayments: { fontSize: 13, marginBottom: 12, textAlign: 'center', paddingVertical: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  payBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  editBtn: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
