import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { getAccounts, getLoans, getLoanById, addLoan, addRepayment, updateLoan } from '@/services/database';
import { Account, Loan, LoanType } from '@/types';
import { ACCOUNT_TYPE_LABELS } from '@/components/AccountPicker';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import DateTimeInput from '@/components/DateTimeInput';
import { useAppDialog } from '@/components/AppDialog';

type Mode = 'loan' | 'repayment';

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

export default function AddLoanScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { loanId: loanIdParam, editLoanId: editLoanIdParam } = useLocalSearchParams<{ loanId?: string; editLoanId?: string }>();
  const { showDialog } = useAppDialog();

  const isEditing = !!editLoanIdParam;
  const [editingLoanId, setEditingLoanId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>(loanIdParam ? 'repayment' : 'loan');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  const [loanType, setLoanType] = useState<LoanType>('BORROWED');
  const [contactName, setContactName] = useState('');
  const [contactError, setContactError] = useState('');

  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showLoanPicker, setShowLoanPicker] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [accts, loans] = await Promise.all([getAccounts(), getLoans('ACTIVE')]);
      const activeAccts = accts.filter((a) => a.isArchived === 0);
      setAccounts(activeAccts);
      setActiveLoans(loans);

      if (editLoanIdParam) {
        const loan = await getLoanById(Number(editLoanIdParam));
        if (loan) {
          setEditingLoanId(loan.id);
          setLoanType(loan.type);
          setContactName(loan.contactName);
          setAmount(String(loan.amount));
          setNote(loan.note ?? '');
          setDate(new Date(loan.loanDate));
          setUseCustomDate(true);
          const acc = accts.find((a) => a.id === loan.accountId) ?? activeAccts[0] ?? null;
          setAccount(acc);
        }
      } else {
        setAccount(activeAccts[0] ?? null);
      }

      if (loanIdParam) {
        const pre = loans.find((l) => l.id === Number(loanIdParam));
        if (pre) {
          setSelectedLoan(pre);
          setAmount(String(pre.amount - pre.paidAmount));
        }
      }
    };
    init();
  }, [loanIdParam, editLoanIdParam]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setAmountError('');
    setContactError('');
  };

  const validateAndSave = async () => {
    const v = parseFloat(amount.replace(',', '.'));
    if (!amount.trim() || isNaN(v) || v <= 0) {
      setAmountError('Enter a valid amount greater than 0');
      return;
    }
    setAmountError('');

    if (!account) {
      showDialog({ title: 'Error', message: 'Please select an account.', icon: '⚠️', type: 'warning', buttons: [{ text: 'OK', style: 'default' }] });
      return;
    }

    if (mode === 'loan') {
      if (!contactName.trim()) { setContactError('Enter a contact name'); return; }
      setContactError('');
      setLoading(true);
      try {
        const loanDate = useCustomDate ? date.toISOString() : new Date().toISOString();
        if (editingLoanId !== null) {
          await updateLoan(editingLoanId, { type: loanType, contactName: contactName.trim(), amount: v, accountId: account.id, note: note.trim() || null, loanDate });
        } else {
          await addLoan({ type: loanType, contactName: contactName.trim(), amount: v, accountId: account.id, note: note.trim() || null, loanDate });
        }
        router.back();
      } catch {
        showDialog({ title: 'Error', message: 'Failed to save loan. Please try again.', icon: '❌', type: 'danger', buttons: [{ text: 'OK', style: 'default' }] });
      } finally { setLoading(false); }
    } else {
      if (!selectedLoan) {
        showDialog({ title: 'Error', message: 'Please select a loan to repay.', icon: '⚠️', type: 'warning', buttons: [{ text: 'OK', style: 'default' }] });
        return;
      }
      const remaining = selectedLoan.amount - selectedLoan.paidAmount;
      if (v > remaining) {
        setAmountError(`Exceeds remaining balance of ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        return;
      }
      setLoading(true);
      try {
        const repaymentDate = useCustomDate ? date.toISOString() : new Date().toISOString();
        await addRepayment(selectedLoan.id, { amount: v, accountId: account.id, note: note.trim() || null, repaymentDate });
        router.back();
      } catch {
        showDialog({ title: 'Error', message: 'Failed to save repayment. Please try again.', icon: '❌', type: 'danger', buttons: [{ text: 'OK', style: 'default' }] });
      } finally { setLoading(false); }
    }
  };

  const remainingBalance = selectedLoan ? selectedLoan.amount - selectedLoan.paidAmount : 0;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* ── Header ───────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {isEditing ? 'Edit Loan' : mode === 'loan' ? 'New Loan' : 'Add Repayment'}
          </Text>
          {isEditing && (
            <Text style={[styles.titleSub, { color: colors.textSecondary }]}>Update loan details</Text>
          )}
        </View>

        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Mode Toggle ──────────────────────────── */}
        {!isEditing && (
          <View style={[styles.modeToggle, { backgroundColor: colors.inputFill, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'loan' && { backgroundColor: colors.primary }]}
              onPress={() => switchMode('loan')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={mode === 'loan' ? 'cash' : 'cash-outline'}
                size={16}
                color={mode === 'loan' ? '#fff' : colors.textSecondary}
              />
              <Text style={[styles.modeBtnText, { color: mode === 'loan' ? '#fff' : colors.textSecondary }]}>
                New Loan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'repayment' && { backgroundColor: colors.primary }]}
              onPress={() => switchMode('repayment')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={mode === 'repayment' ? 'return-down-back' : 'return-down-back-outline'}
                size={16}
                color={mode === 'repayment' ? '#fff' : colors.textSecondary}
              />
              <Text style={[styles.modeBtnText, { color: mode === 'repayment' ? '#fff' : colors.textSecondary }]}>
                Repayment
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── LOAN MODE ──────────────────────────────── */}
        {mode === 'loan' ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>LOAN TYPE</Text>
            <View style={styles.typeRow}>

              {/* BORROWED */}
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  { backgroundColor: colors.card, borderColor: loanType === 'BORROWED' ? colors.primary : colors.border },
                ]}
                onPress={() => setLoanType('BORROWED')}
                activeOpacity={0.8}
              >
                <View style={[styles.typeAccentRail, { backgroundColor: loanType === 'BORROWED' ? colors.primary : 'transparent' }]} />
                <View style={styles.typeBtnInner}>
                  <View style={[styles.typeIconCircle, { backgroundColor: loanType === 'BORROWED' ? colors.primary + '22' : colors.inputFill }]}>
                    <Text style={styles.typeEmoji}>📥</Text>
                  </View>
                  <Text style={[styles.typeBtnLabel, { color: loanType === 'BORROWED' ? colors.primary : colors.textPrimary }]}>
                    Borrowed
                  </Text>
                  <Text style={[styles.typeBtnDesc, { color: colors.textSecondary }]}>Someone lent you</Text>
                  {loanType === 'BORROWED' && (
                    <View style={[styles.typeCheck, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* LENT */}
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  { backgroundColor: colors.card, borderColor: loanType === 'LENT' ? colors.primary : colors.border },
                ]}
                onPress={() => setLoanType('LENT')}
                activeOpacity={0.8}
              >
                <View style={[styles.typeAccentRail, { backgroundColor: loanType === 'LENT' ? colors.primary : 'transparent' }]} />
                <View style={styles.typeBtnInner}>
                  <View style={[styles.typeIconCircle, { backgroundColor: loanType === 'LENT' ? colors.primary + '22' : colors.inputFill }]}>
                    <Text style={styles.typeEmoji}>📤</Text>
                  </View>
                  <Text style={[styles.typeBtnLabel, { color: loanType === 'LENT' ? colors.primary : colors.textPrimary }]}>
                    Lent
                  </Text>
                  <Text style={[styles.typeBtnDesc, { color: colors.textSecondary }]}>You lent someone</Text>
                  {loanType === 'LENT' && (
                    <View style={[styles.typeCheck, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>

            </View>

            <AppInput
              label="Contact Name"
              value={contactName}
              onChangeText={(v) => { setContactName(v); if (contactError) setContactError(''); }}
              placeholder={loanType === 'BORROWED' ? 'Who lent you money?' : 'Who did you lend to?'}
              error={contactError}
            />
          </>
        ) : (
          <>
            {/* ── REPAYMENT MODE ─────────────────────── */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SELECT LOAN</Text>

            {/* Loan picker button */}
            <TouchableOpacity
              style={[styles.loanPickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowLoanPicker((v) => !v)}
              activeOpacity={0.8}
            >
              {selectedLoan ? (
                <View style={{ gap: 10 }}>
                  <View style={styles.loanPickerTop}>
                    <View style={styles.loanPickerLeft}>
                      <View style={[styles.loanTypeIcon, { backgroundColor: selectedLoan.type === 'BORROWED' ? '#10B98118' : '#EF444418' }]}>
                        <Text style={{ fontSize: 18 }}>{selectedLoan.type === 'BORROWED' ? '📥' : '📤'}</Text>
                      </View>
                      <View>
                        <Text style={[styles.loanPickerName, { color: colors.textPrimary }]}>
                          {selectedLoan.contactName}
                        </Text>
                        <Text style={[styles.loanPickerSub, { color: colors.textSecondary }]}>
                          {selectedLoan.type === 'BORROWED' ? 'Borrowed' : 'Lent'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.loanPickerRight}>
                      <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[selectedLoan.status] ?? '#6B7280') + '22' }]}>
                        <Text style={[styles.statusText, { color: STATUS_COLOR[selectedLoan.status] ?? '#6B7280' }]}>
                          {STATUS_LABEL[selectedLoan.status]}
                        </Text>
                      </View>
                      <Ionicons name={showLoanPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
                    </View>
                  </View>
                  {/* Progress bar */}
                  <View style={{ gap: 4 }}>
                    <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: colors.primary,
                            width: `${Math.min(100, (selectedLoan.paidAmount / selectedLoan.amount) * 100)}%` as `${number}%`,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.progressLabels}>
                      <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                        Paid {((selectedLoan.paidAmount / selectedLoan.amount) * 100).toFixed(0)}%
                      </Text>
                      <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                        Left {remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.loanPickerPlaceholderRow}>
                  <View style={[styles.loanTypeIcon, { backgroundColor: colors.inputFill }]}>
                    <Ionicons name="receipt-outline" size={18} color={colors.textSecondary} />
                  </View>
                  <Text style={[styles.loanPickerPlaceholder, { color: colors.textSecondary }]}>
                    Select a loan to repay…
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </View>
              )}
            </TouchableOpacity>

            {/* Loan dropdown */}
            {showLoanPicker && (
              <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {activeLoans.length === 0 ? (
                  <View style={styles.dropdownEmptyWrap}>
                    <Text style={{ fontSize: 28, marginBottom: 6 }}>🔍</Text>
                    <Text style={[styles.dropdownEmpty, { color: colors.textSecondary }]}>No active loans</Text>
                  </View>
                ) : (
                  activeLoans.map((loan) => {
                    const rem = loan.amount - loan.paidAmount;
                    const isSelected = selectedLoan?.id === loan.id;
                    const paidPct = Math.min(100, (loan.paidAmount / loan.amount) * 100);
                    return (
                      <TouchableOpacity
                        key={loan.id}
                        style={[
                          styles.dropdownItem,
                          { borderBottomColor: colors.border },
                          isSelected && { backgroundColor: colors.primary + '10' },
                        ]}
                        onPress={() => {
                          setSelectedLoan(loan);
                          setAmount(String(rem));
                          setShowLoanPicker(false);
                          setAmountError('');
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.loanTypeIcon, { backgroundColor: loan.type === 'BORROWED' ? '#10B98115' : '#EF444415' }]}>
                          <Text style={{ fontSize: 16 }}>{loan.type === 'BORROWED' ? '📥' : '📤'}</Text>
                        </View>
                        <View style={styles.dropdownInfo}>
                          <Text style={[styles.dropdownName, { color: colors.textPrimary }]}>{loan.contactName}</Text>
                          <Text style={[styles.dropdownSub, { color: colors.textSecondary }]}>
                            {loan.type === 'BORROWED' ? 'Borrowed' : 'Lent'} · Rem {rem.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                          <View style={[styles.dropdownProgress, { backgroundColor: colors.border }]}>
                            <View
                              style={[
                                styles.dropdownProgressFill,
                                { backgroundColor: colors.primary, width: `${paidPct}%` as `${number}%` },
                              ]}
                            />
                          </View>
                        </View>
                        {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* Summary card */}
            {selectedLoan && (
              <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total</Text>
                  <Text style={[styles.summaryAmt, { color: colors.textPrimary }]}>
                    {selectedLoan.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Paid</Text>
                  <Text style={[styles.summaryAmt, { color: '#10B981' }]}>
                    {selectedLoan.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Remaining</Text>
                  <Text style={[styles.summaryAmt, { color: '#EF4444' }]}>
                    {remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* ── Amount ───────────────────────────────── */}
        <AppInput
          label="Amount"
          value={amount}
          onChangeText={(v) => { setAmount(v); if (amountError) setAmountError(''); }}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={amountError}
        />

        {/* ── Account Picker ───────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ACCOUNT</Text>
        <TouchableOpacity
          style={[styles.pickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowAccountPicker((v) => !v)}
          activeOpacity={0.8}
        >
          {account ? (
            <View style={styles.pickerRow}>
              {account.color ? <View style={[styles.acctDot, { backgroundColor: account.color }]} /> : null}
              <View style={[styles.acctIconWrap, { backgroundColor: colors.inputFill }]}>
                <Text style={{ fontSize: 18 }}>{account.icon ?? '💳'}</Text>
              </View>
              <View style={styles.acctInfo}>
                <Text style={[styles.acctName, { color: colors.textPrimary }]}>{account.name}</Text>
                <Text style={[styles.acctType, { color: colors.textSecondary }]}>{ACCOUNT_TYPE_LABELS[account.type]}</Text>
              </View>
              <View style={[styles.balancePill, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.balancePillText, { color: colors.primary }]}>
                  {account.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.pickerRow}>
              <View style={[styles.acctIconWrap, { backgroundColor: colors.inputFill }]}>
                <Ionicons name="wallet-outline" size={18} color={colors.textSecondary} />
              </View>
              <Text style={[styles.acctPlaceholder, { color: colors.textSecondary }]}>Select account…</Text>
            </View>
          )}
          <Ionicons name={showAccountPicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {showAccountPicker && (
          <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {accounts.map((acc) => {
              const isSelected = account?.id === acc.id;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.dropdownItem,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => { setAccount(acc); setShowAccountPicker(false); }}
                  activeOpacity={0.75}
                >
                  {acc.color ? <View style={[styles.acctDot, { backgroundColor: acc.color }]} /> : null}
                  <View style={[styles.acctIconWrap, { backgroundColor: colors.inputFill }]}>
                    <Text style={{ fontSize: 16 }}>{acc.icon ?? '💳'}</Text>
                  </View>
                  <View style={styles.dropdownInfo}>
                    <Text style={[styles.dropdownName, { color: colors.textPrimary }]}>{acc.name}</Text>
                    <Text style={[styles.dropdownSub, { color: colors.textSecondary }]}>{ACCOUNT_TYPE_LABELS[acc.type]}</Text>
                  </View>
                  <Text style={[styles.dropdownBal, { color: colors.primary }]}>
                    {acc.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginLeft: 6 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Note + Date group card ───────────────── */}
        <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AppInput
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="Add a note…"
            multiline
            numberOfLines={2}
            style={{ height: 64, paddingTop: 10, textAlignVertical: 'top' }}
          />
          <View style={[styles.groupDivider, { backgroundColor: colors.border }]} />
          <DateTimeInput
            date={date}
            onChange={setDate}
            useCustomDate={useCustomDate}
            onUseCustomDateChange={setUseCustomDate}
          />
        </View>

        <AppButton
          label={isEditing ? 'Save Changes' : mode === 'loan' ? 'Save Loan' : 'Save Repayment'}
          onPress={validateAndSave}
          loading={loading}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // ── Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  titleSub: { fontSize: 12, marginTop: 2 },

  content: { padding: 20 },

  // ── Mode Toggle
  modeToggle: {
    flexDirection: 'row', borderRadius: 16, borderWidth: 1.5,
    padding: 4, marginBottom: 24,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
  },
  modeBtnText: { fontSize: 14, fontWeight: '700' },

  // ── Section label
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },

  // ── Loan Type Selector
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeBtn: {
    flex: 1, borderRadius: 14, borderWidth: 1.5,
    overflow: 'hidden', flexDirection: 'row',
  },
  typeAccentRail: { width: 3, alignSelf: 'stretch' },
  typeBtnInner: {
    flex: 1, alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 10,
    position: 'relative',
  },
  typeIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  typeEmoji: { fontSize: 22 },
  typeBtnLabel: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  typeBtnDesc: { fontSize: 11, textAlign: 'center' },
  typeCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Loan Picker
  loanPickerBtn: {
    borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 8,
  },
  loanPickerTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  loanPickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loanPickerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loanPickerName: { fontSize: 15, fontWeight: '700' },
  loanPickerSub: { fontSize: 12, marginTop: 1 },
  loanPickerPlaceholderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loanPickerPlaceholder: { flex: 1, fontSize: 14 },
  loanTypeIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },

  // Status badge
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Progress bar
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 11 },

  // ── Summary Card
  summaryCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  summaryAmt: { fontSize: 15, fontWeight: '700' },
  summaryDivider: { width: 1, height: 32, marginHorizontal: 4 },

  // ── Dropdown (shared)
  dropdown: { borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginBottom: 8 },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderBottomWidth: 1,
  },
  dropdownInfo: { flex: 1 },
  dropdownName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  dropdownSub: { fontSize: 12 },
  dropdownBal: { fontSize: 13, fontWeight: '700' },
  dropdownProgress: { height: 3, borderRadius: 2, marginTop: 5, overflow: 'hidden' },
  dropdownProgressFill: { height: 3, borderRadius: 2 },
  dropdownEmptyWrap: { alignItems: 'center', paddingVertical: 20 },
  dropdownEmpty: { fontSize: 13 },

  // ── Account Picker
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 8,
  },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  acctDot: { width: 8, height: 8, borderRadius: 4 },
  acctIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  acctInfo: { flex: 1 },
  acctName: { fontSize: 14, fontWeight: '700' },
  acctType: { fontSize: 12, marginTop: 1 },
  acctPlaceholder: { flex: 1, fontSize: 14 },
  balancePill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  balancePillText: { fontSize: 12, fontWeight: '700' },

  // ── Note + Date group card
  groupCard: {
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingTop: 14,
    marginBottom: 16, overflow: 'hidden',
  },
  groupDivider: { height: 1, marginHorizontal: -14, marginBottom: 4 },
});
