import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { getLoans, softDeleteLoan } from '@/services/database';
import { Loan } from '@/types';
import { getSettings } from '@/services/database';
import LoanTile from '@/components/LoanTile';
import { useAppDialog } from '@/components/AppDialog';

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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Loans</Text>
        <TouchableOpacity onPress={() => router.push('/add-loan')} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary bar */}
      <View style={[styles.summaryBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.summaryCol}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>You owe</Text>
          <Text style={[styles.summaryAmt, { color: borrowedTotal > 0 ? '#EF4444' : colors.textSecondary }]}>
            {fmtAmt(borrowedTotal)}
          </Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryCol}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Owed to you</Text>
          <Text style={[styles.summaryAmt, { color: lentTotal > 0 ? '#10B981' : colors.textSecondary }]}>
            {fmtAmt(lentTotal)}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {(['BORROWED', 'LENT'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.textSecondary }]}>
              {t === 'BORROWED' ? '📥 You Owe' : '📤 Owed to You'}
            </Text>
          </TouchableOpacity>
        ))}
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
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Add Loan</Text>
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
                  const { getLoanById } = await import('@/services/database');
                  const full = await getLoanById(loan.id);
                  if (full) {
                    setLoans((prev) => prev.map((l) => l.id === full.id ? full : l));
                  }
                  setExpandedId(loan.id);
                }
              }}
              onPay={() => handlePay(loan)}
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  summaryBar: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    paddingHorizontal: 20, borderBottomWidth: 1,
  },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, marginBottom: 2 },
  summaryAmt: { fontSize: 16, fontWeight: '700' },
  summaryDivider: { width: 1, height: 28, marginHorizontal: 8 },
  tabs: {
    flexDirection: 'row', borderBottomWidth: 1,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 14, fontWeight: '700' },
  list: { padding: 16 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
