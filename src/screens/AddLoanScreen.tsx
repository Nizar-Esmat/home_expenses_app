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

export default function AddLoanScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { loanId: loanIdParam, editLoanId: editLoanIdParam } = useLocalSearchParams<{ loanId?: string; editLoanId?: string }>();
  const { showDialog } = useAppDialog();

  const isEditing = !!editLoanIdParam;
  const [editingLoanId, setEditingLoanId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>(loanIdParam ? 'repayment' : 'loan');

  // Shared
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  // New loan fields
  const [loanType, setLoanType] = useState<LoanType>('BORROWED');
  const [contactName, setContactName] = useState('');
  const [contactError, setContactError] = useState('');

  // Repayment fields
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showLoanPicker, setShowLoanPicker] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [accts, loans] = await Promise.all([
        getAccounts(),
        getLoans('ACTIVE'),
      ]);
      setAccounts(accts.filter((a) => a.isArchived === 0));
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
          const acc = accts.find((a) => a.id === loan.accountId) ?? accts[0] ?? null;
          setAccount(acc);
        }
      } else {
        setAccount(accts.filter((a) => a.isArchived === 0)[0] ?? null);
      }

      if (loanIdParam) {
        const pre = loans.find((l) => l.id === Number(loanIdParam));
        if (pre) {
          setSelectedLoan(pre);
          const remaining = pre.amount - pre.paidAmount;
          setAmount(String(remaining));
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
      showDialog({
        title: 'Error', message: 'Please select an account.',
        icon: '⚠️', type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    if (mode === 'loan') {
      if (!contactName.trim()) {
        setContactError('Enter a contact name');
        return;
      }
      setContactError('');
      setLoading(true);
      try {
        const loanDate = useCustomDate ? date.toISOString() : new Date().toISOString();
        if (editingLoanId !== null) {
          await updateLoan(editingLoanId, {
            type: loanType,
            contactName: contactName.trim(),
            amount: v,
            accountId: account.id,
            note: note.trim() || null,
            loanDate,
          });
        } else {
          await addLoan({
            type: loanType,
            contactName: contactName.trim(),
            amount: v,
            accountId: account.id,
            note: note.trim() || null,
            loanDate,
          });
        }
        router.back();
      } catch {
        showDialog({
          title: 'Error', message: 'Failed to save loan. Please try again.',
          icon: '❌', type: 'danger',
          buttons: [{ text: 'OK', style: 'default' }],
        });
      } finally {
        setLoading(false);
      }
    } else {
      if (!selectedLoan) {
        showDialog({
          title: 'Error', message: 'Please select a loan to repay.',
          icon: '⚠️', type: 'warning',
          buttons: [{ text: 'OK', style: 'default' }],
        });
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
        await addRepayment(selectedLoan.id, {
          amount: v,
          accountId: account.id,
          note: note.trim() || null,
          repaymentDate,
        });
        router.back();
      } catch {
        showDialog({
          title: 'Error', message: 'Failed to save repayment. Please try again.',
          icon: '❌', type: 'danger',
          buttons: [{ text: 'OK', style: 'default' }],
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const remainingBalance = selectedLoan ? selectedLoan.amount - selectedLoan.paidAmount : 0;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {isEditing ? 'Edit Loan' : mode === 'loan' ? 'New Loan' : 'Add Repayment'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Mode toggle — hidden in edit mode */}
        {!isEditing && <View style={[styles.modeToggle, { backgroundColor: colors.inputFill, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'loan' && { backgroundColor: colors.primary }]}
            onPress={() => switchMode('loan')}
            activeOpacity={0.8}
          >
            <Ionicons name="cash-outline" size={16} color={mode === 'loan' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.modeBtnText, { color: mode === 'loan' ? '#fff' : colors.textSecondary }]}>New Loan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'repayment' && { backgroundColor: colors.primary }]}
            onPress={() => switchMode('repayment')}
            activeOpacity={0.8}
          >
            <Ionicons name="return-down-back-outline" size={16} color={mode === 'repayment' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.modeBtnText, { color: mode === 'repayment' ? '#fff' : colors.textSecondary }]}>Repayment</Text>
          </TouchableOpacity>
        </View>}

        {mode === 'loan' ? (
          <>
            {/* Loan type selector */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>LOAN TYPE</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, { borderColor: loanType === 'BORROWED' ? colors.primary : colors.border, backgroundColor: loanType === 'BORROWED' ? colors.primary + '18' : colors.inputFill }]}
                onPress={() => setLoanType('BORROWED')}
                activeOpacity={0.8}
              >
                <Text style={styles.typeEmoji}>📥</Text>
                <Text style={[styles.typeBtnText, { color: loanType === 'BORROWED' ? colors.primary : colors.textPrimary }]}>Borrowed</Text>
                <Text style={[styles.typeDesc, { color: colors.textSecondary }]}>Someone lent you</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, { borderColor: loanType === 'LENT' ? colors.primary : colors.border, backgroundColor: loanType === 'LENT' ? colors.primary + '18' : colors.inputFill }]}
                onPress={() => setLoanType('LENT')}
                activeOpacity={0.8}
              >
                <Text style={styles.typeEmoji}>📤</Text>
                <Text style={[styles.typeBtnText, { color: loanType === 'LENT' ? colors.primary : colors.textPrimary }]}>Lent</Text>
                <Text style={[styles.typeDesc, { color: colors.textSecondary }]}>You lent someone</Text>
              </TouchableOpacity>
            </View>

            <AppInput
              label="Contact Name"
              value={contactName}
              onChangeText={(v) => { setContactName(v); if (contactError) setContactError(''); }}
              placeholder={loanType === 'BORROWED' ? "Who lent you money?" : "Who did you lend to?"}
              error={contactError}
            />
          </>
        ) : (
          <>
            {/* Loan picker */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SELECT LOAN</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: colors.inputFill, borderColor: colors.border }]}
              onPress={() => setShowLoanPicker((v) => !v)}
              activeOpacity={0.8}
            >
              {selectedLoan ? (
                <View style={styles.pickerSelected}>
                  <Text style={styles.pickerEmoji}>{selectedLoan.type === 'BORROWED' ? '📥' : '📤'}</Text>
                  <View style={styles.pickerInfo}>
                    <Text style={[styles.pickerName, { color: colors.textPrimary }]}>{selectedLoan.contactName}</Text>
                    <Text style={[styles.pickerSub, { color: colors.textSecondary }]}>
                      {selectedLoan.type === 'BORROWED' ? 'Borrowed' : 'Lent'} ·
                      Remaining: {remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.pickerPlaceholder, { color: colors.textSecondary }]}>Select a loan…</Text>
              )}
              <Ionicons name={showLoanPicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {showLoanPicker && (
              <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {activeLoans.length === 0 ? (
                  <Text style={[styles.dropdownEmpty, { color: colors.textSecondary }]}>No active loans</Text>
                ) : (
                  activeLoans.map((loan) => {
                    const rem = loan.amount - loan.paidAmount;
                    const isSelected = selectedLoan?.id === loan.id;
                    return (
                      <TouchableOpacity
                        key={loan.id}
                        style={[styles.dropdownItem, { borderBottomColor: colors.border }, isSelected && { backgroundColor: colors.primary + '15' }]}
                        onPress={() => {
                          setSelectedLoan(loan);
                          setAmount(String(rem));
                          setShowLoanPicker(false);
                          setAmountError('');
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.pickerEmoji}>{loan.type === 'BORROWED' ? '📥' : '📤'}</Text>
                        <View style={styles.dropdownInfo}>
                          <Text style={[styles.dropdownName, { color: colors.textPrimary }]}>{loan.contactName}</Text>
                          <Text style={[styles.dropdownSub, { color: colors.textSecondary }]}>
                            {loan.type === 'BORROWED' ? 'Borrowed' : 'Lent'} · Remaining {rem.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </View>
                        {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}
          </>
        )}

        <AppInput
          label="Amount"
          value={amount}
          onChangeText={(v) => { setAmount(v); if (amountError) setAmountError(''); }}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={amountError}
        />

        {/* Account picker */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ACCOUNT</Text>
        <TouchableOpacity
          style={[styles.pickerBtn, { backgroundColor: colors.inputFill, borderColor: colors.border }]}
          onPress={() => setShowAccountPicker((v) => !v)}
          activeOpacity={0.8}
        >
          {account ? (
            <View style={styles.pickerSelected}>
              <Text style={styles.pickerEmoji}>{account.icon ?? '💳'}</Text>
              <View style={styles.pickerInfo}>
                <Text style={[styles.pickerName, { color: colors.textPrimary }]}>{account.name}</Text>
                <Text style={[styles.pickerSub, { color: colors.textSecondary }]}>
                  {ACCOUNT_TYPE_LABELS[account.type]} · {account.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.pickerPlaceholder, { color: colors.textSecondary }]}>Select account…</Text>
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
                  style={[styles.dropdownItem, { borderBottomColor: colors.border }, isSelected && { backgroundColor: colors.primary + '15' }]}
                  onPress={() => { setAccount(acc); setShowAccountPicker(false); }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.pickerEmoji}>{acc.icon ?? '💳'}</Text>
                  <View style={styles.dropdownInfo}>
                    <Text style={[styles.dropdownName, { color: colors.textPrimary }]}>{acc.name}</Text>
                    <Text style={[styles.dropdownSub, { color: colors.textSecondary }]}>
                      {ACCOUNT_TYPE_LABELS[acc.type]} · {acc.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <AppInput
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Add a note…"
          multiline
          numberOfLines={2}
          style={{ height: 64, paddingTop: 10, textAlignVertical: 'top' }}
        />

        <DateTimeInput
          date={date}
          onChange={setDate}
          useCustomDate={useCustomDate}
          onUseCustomDateChange={setUseCustomDate}
        />

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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },

  modeToggle: {
    flexDirection: 'row', borderRadius: 12, borderWidth: 1,
    padding: 4, marginBottom: 24,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 9,
  },
  modeBtnText: { fontSize: 14, fontWeight: '700' },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeBtn: {
    flex: 1, alignItems: 'center', padding: 14,
    borderRadius: 12, borderWidth: 1.5,
  },
  typeEmoji: { fontSize: 24, marginBottom: 4 },
  typeBtnText: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  typeDesc: { fontSize: 11, textAlign: 'center' },

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 8,
  },
  pickerSelected: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  pickerEmoji: { fontSize: 20 },
  pickerInfo: { flex: 1 },
  pickerName: { fontSize: 14, fontWeight: '700' },
  pickerSub: { fontSize: 12, marginTop: 1 },
  pickerPlaceholder: { fontSize: 14 },

  dropdown: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 12, gap: 10, borderBottomWidth: 1,
  },
  dropdownInfo: { flex: 1 },
  dropdownName: { fontSize: 14, fontWeight: '600' },
  dropdownSub: { fontSize: 12, marginTop: 1 },
  dropdownEmpty: { padding: 16, textAlign: 'center', fontSize: 13 },
});
