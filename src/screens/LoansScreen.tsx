import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { getLoans, softDeleteLoan, getLoanById, getSettings } from '@/services/database';
import { Loan } from '@/types';
import LoanTile from '@/components/LoanTile';
import { useAppDialog } from '@/components/AppDialog';
import ScreenHeader from '@/components/ScreenHeader';

type Tab = 'BORROWED' | 'LENT';

export default function LoansScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { showDialog } = useAppDialog();

  const [tab, setTab] = useState<Tab>('BORROWED');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [currency, setCurrency] = useState('EGP');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [all, settings] = await Promise.all([getLoans(), getSettings()]);
    setLoans(all);
    setCurrency(settings?.currency ?? 'EGP');
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = loans.filter((l) => l.type === tab);

  const handleDelete = (loan: Loan) => {
    showDialog({
      title: 'Delete Loan',
      message: `Delete the loan with ${loan.contactName}? This will also remove all repayments and reverse balance changes.`,
      icon: '🗑️',
      type: 'danger',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await softDeleteLoan(loan.id);
            load();
          },
        },
      ],
    });
  };

  const handlePay = (loan: Loan) => {
    router.push({ pathname: '/add-loan', params: { loanId: String(loan.id) } });
  };

  const handleEdit = (loan: Loan) => {
    router.push({ pathname: '/add-loan', params: { editLoanId: String(loan.id) } });
  };

  const borrowedTotal = loans
    .filter((l) => l.type === 'BORROWED' && l.status !== 'SETTLED')
    .reduce((s, l) => s + (l.amount - l.paidAmount), 0);

  const lentTotal = loans
    .filter((l) => l.type === 'LENT' && l.status !== 'SETTLED')
    .reduce((s, l) => s + (l.amount - l.paidAmount), 0);

  function fmtAmt(n: number) {
    const isWhole = n % 1 === 0;
    return `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: isWhole ? 0 : 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Loans"
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/add-loan')}
            activeOpacity={0.8}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Add loan"
          >
            <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Summary bar */}
      <View style={[styles.summaryBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.summaryCol}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>You owe</Text>
          <Text style={[styles.summaryAmt, { color: borrowedTotal > 0 ? colors.danger : colors.textSecondary }]}>
            {fmtAmt(borrowedTotal)}
          </Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryCol}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Owed to you</Text>
          <Text style={[styles.summaryAmt, { color: lentTotal > 0 ? colors.success : colors.textSecondary }]}>
            {fmtAmt(lentTotal)}
          </Text>
        </View>
      </View>

      {/* Modern Segmented Pill Tabs */}
      <View style={styles.tabsWrapper}>
        <View style={[styles.tabs, { backgroundColor: colors.inputFill, borderColor: colors.border }]}>
          {(['BORROWED', 'LENT'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.tab,
                tab === t && { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              accessibilityLabel={t === 'BORROWED' ? 'You Owe' : 'Owed to You'}
            >
              <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.textSecondary, fontWeight: tab === t ? '700' : '500' }]}>
                {t === 'BORROWED' ? '📥 You Owe' : '📤 Owed to You'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>{tab === 'BORROWED' ? '📥' : '📤'}</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {tab === 'BORROWED' ? 'No borrowed loans' : 'No lent loans'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {tab === 'BORROWED'
                ? 'Tap + to record money someone lent you'
                : 'Tap + to record money you lent someone'}
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/add-loan')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Add loan"
            >
              <Ionicons name="add" size={18} color={colors.onPrimary} />
              <Text style={[styles.emptyBtnText, { color: colors.onPrimary }]}>Add Loan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((loan) => (
            <LoanTile
              key={loan.id}
              loan={loan}
              currency={currency}
              expanded={expandedId === loan.id}
              onToggle={async () => {
                if (expandedId === loan.id) {
                  setExpandedId(null);
                } else {
                  // Load repayments for this loan
                  const full = await getLoanById(loan.id);
                  if (full) {
                    setLoans((prev) => prev.map((l) => l.id === full.id ? full : l));
                  }
                  setExpandedId(loan.id);
                }
              }}
              onPay={() => handlePay(loan)}
              onEdit={() => handleEdit(loan)}
              onDelete={() => handleDelete(loan)}
            />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBar: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    paddingHorizontal: 20, marginHorizontal: 20, marginTop: 12, marginBottom: 8,
    borderRadius: 14, borderWidth: 1,
  },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, marginBottom: 2 },
  summaryAmt: { fontSize: 16, fontWeight: '700' },
  summaryDivider: { width: 1, height: 28, marginHorizontal: 8 },
  tabsWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    borderRadius: 9,
  },
  tabText: { fontSize: 13 },
  list: { padding: 20 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: 44, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700' },
});
