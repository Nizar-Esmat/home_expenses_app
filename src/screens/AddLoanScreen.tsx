import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import {
  getAccounts,
  getLoans,
  getLoanById,
  addLoan,
  addRepayment,
  updateLoan,
  getSettings,
} from '@/services/database';
import { Account, Loan, LoanType } from '@/types';
import { formatCurrency } from '@/services/constants';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import DateTimeInput from '@/components/DateTimeInput';
import AccountPicker from '@/components/AccountPicker';
import { useAppDialog } from '@/components/AppDialog';
import ScreenHeader from '@/components/ScreenHeader';

type Mode = 'loan' | 'repayment';

export default function AddLoanScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loanId: loanIdParam, editLoanId: editLoanIdParam } =
    useLocalSearchParams<{ loanId?: string; editLoanId?: string }>();
  const { showDialog } = useAppDialog();

  const isEditing = !!editLoanIdParam;
  const [editingLoanId, setEditingLoanId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>(loanIdParam ? 'repayment' : 'loan');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [loading, setLoading] = useState(false);

  // Loan specific state
  const [loanType, setLoanType] = useState<LoanType>('BORROWED');
  const [contactName, setContactName] = useState('');
  const [contactError, setContactError] = useState('');

  // Repayment specific state
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showLoanModal, setShowLoanModal] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [accts, loans, sets] = await Promise.all([
        getAccounts(),
        getLoans('ACTIVE'),
        getSettings(),
      ]);

      const activeAccts = accts.filter((a) => a.isArchived === 0);
      setAccounts(activeAccts);
      setActiveLoans(loans);
      if (sets?.currency) {
        setCurrency(sets.currency);
      }

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
      } else if (!editLoanIdParam && loans.length > 0) {
        // default selected loan in repayment mode
        setSelectedLoan(loans[0]);
      }
    };
    init();
  }, [loanIdParam, editLoanIdParam]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setAmountError('');
    setContactError('');
    if (m === 'repayment') {
      if (!selectedLoan && activeLoans.length > 0) {
        setSelectedLoan(activeLoans[0]);
        setAmount(String(activeLoans[0].amount - activeLoans[0].paidAmount));
      } else if (selectedLoan) {
        setAmount(String(selectedLoan.amount - selectedLoan.paidAmount));
      }
    }
  };

  const remainingBalance = selectedLoan
    ? Math.max(0, selectedLoan.amount - selectedLoan.paidAmount)
    : 0;

  const validateAndSave = async () => {
    const v = parseFloat(amount.replace(',', '.'));
    if (!amount.trim() || isNaN(v) || v <= 0) {
      setAmountError('Enter a valid amount greater than 0');
      return;
    }
    setAmountError('');

    if (!account) {
      showDialog({
        title: 'Account Required',
        message: 'Please select an account for this transaction.',
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    if (mode === 'loan') {
      if (!contactName.trim()) {
        setContactError('Please enter a contact name');
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
          title: 'Error',
          message: 'Failed to save loan. Please try again.',
          type: 'danger',
          buttons: [{ text: 'OK', style: 'default' }],
        });
      } finally {
        setLoading(false);
      }
    } else {
      if (!selectedLoan) {
        showDialog({
          title: 'Select Loan',
          message: 'Please select an active loan to record a repayment.',
          type: 'warning',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        return;
      }
      if (v > remainingBalance) {
        setAmountError(
          `Amount exceeds remaining balance of ${formatCurrency(remainingBalance, currency)}`,
        );
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
          title: 'Error',
          message: 'Failed to save repayment. Please try again.',
          type: 'danger',
          buttons: [{ text: 'OK', style: 'default' }],
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title={isEditing ? 'Edit Loan' : mode === 'loan' ? 'New Loan' : 'Record Repayment'}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mode Segmented Tab (New Loan vs Repayment) */}
        {!isEditing && (
          <View
            style={[
              styles.modeSegmentTrack,
              { backgroundColor: colors.inputFill, borderColor: colors.border },
            ]}
            accessibilityRole="tablist"
          >
            <TouchableOpacity
              style={[
                styles.modeSegmentBtn,
                mode === 'loan' && [
                  styles.modeSegmentActive,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ],
              ]}
              onPress={() => switchMode('loan')}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'loan' }}
            >
              <Ionicons
                name={mode === 'loan' ? 'wallet' : 'wallet-outline'}
                size={16}
                color={mode === 'loan' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeSegmentText,
                  { color: mode === 'loan' ? colors.textPrimary : colors.textSecondary },
                  mode === 'loan' && styles.modeSegmentTextActive,
                ]}
              >
                New Loan
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeSegmentBtn,
                mode === 'repayment' && [
                  styles.modeSegmentActive,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ],
              ]}
              onPress={() => switchMode('repayment')}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'repayment' }}
            >
              <Ionicons
                name={mode === 'repayment' ? 'return-down-back' : 'return-down-back-outline'}
                size={16}
                color={mode === 'repayment' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeSegmentText,
                  { color: mode === 'repayment' ? colors.textPrimary : colors.textSecondary },
                  mode === 'repayment' && styles.modeSegmentTextActive,
                ]}
              >
                Repayment
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── LOAN MODE ─────────────────────────────────── */}
        {mode === 'loan' ? (
          <>
            {/* Direction Selector (Borrowed vs Lent) */}
            <View style={styles.directionRow}>
              <TouchableOpacity
                style={[
                  styles.directionCard,
                  {
                    backgroundColor: loanType === 'BORROWED' ? colors.primary + '14' : colors.card,
                    borderColor: loanType === 'BORROWED' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setLoanType('BORROWED')}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: loanType === 'BORROWED' }}
              >
                <View
                  style={[
                    styles.directionIconCircle,
                    {
                      backgroundColor:
                        loanType === 'BORROWED' ? colors.primary + '22' : colors.inputFill,
                    },
                  ]}
                >
                  <Ionicons
                    name="arrow-down-circle"
                    size={22}
                    color={loanType === 'BORROWED' ? colors.primary : colors.textSecondary}
                  />
                </View>
                <Text style={[styles.directionTitle, { color: colors.textPrimary }]}>
                  Borrowed
                </Text>
                <Text style={[styles.directionSubtitle, { color: colors.textSecondary }]}>
                  You owe this money
                </Text>
                {loanType === 'BORROWED' && (
                  <View style={styles.directionCheck}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.directionCard,
                  {
                    backgroundColor: loanType === 'LENT' ? colors.primary + '14' : colors.card,
                    borderColor: loanType === 'LENT' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setLoanType('LENT')}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: loanType === 'LENT' }}
              >
                <View
                  style={[
                    styles.directionIconCircle,
                    {
                      backgroundColor:
                        loanType === 'LENT' ? colors.primary + '22' : colors.inputFill,
                    },
                  ]}
                >
                  <Ionicons
                    name="arrow-up-circle"
                    size={22}
                    color={loanType === 'LENT' ? colors.primary : colors.textSecondary}
                  />
                </View>
                <Text style={[styles.directionTitle, { color: colors.textPrimary }]}>
                  Lent
                </Text>
                <Text style={[styles.directionSubtitle, { color: colors.textSecondary }]}>
                  Owed back to you
                </Text>
                {loanType === 'LENT' && (
                  <View style={styles.directionCheck}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Hero Amount Input */}
            <AppInput
              label={`Amount (${currency})`}
              value={amount}
              onChangeText={(v) => {
                setAmount(v);
                if (amountError) setAmountError('');
              }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={amountError}
              textAlign="center"
              style={styles.heroAmountInput}
            />

            {/* Contact Name */}
            <AppInput
              label="Contact Name"
              value={contactName}
              onChangeText={(v) => {
                setContactName(v);
                if (contactError) setContactError('');
              }}
              placeholder={
                loanType === 'BORROWED' ? 'Who lent you this money?' : 'Who are you lending to?'
              }
              error={contactError}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </>
        ) : (
          /* ── REPAYMENT MODE ─────────────────────────────── */
          <>
            {activeLoans.length === 0 ? (
              <View
                style={[
                  styles.emptyStateCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.emptyIconCircle,
                    { backgroundColor: colors.success + '18' },
                  ]}
                >
                  <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No Active Loans
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  All loans have been settled or no loans have been recorded yet.
                </Text>
                <TouchableOpacity
                  style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => switchMode('loan')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.emptyActionBtnText, { color: colors.onPrimary }]}>
                    Create a New Loan
                  </Text>
                </TouchableOpacity>
              </View>
            ) : selectedLoan ? (
              <>
                {/* Active Selected Loan Card */}
                <View
                  style={[
                    styles.selectedLoanCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.selectedLoanTop}>
                    <View style={styles.selectedLoanPerson}>
                      <View
                        style={[
                          styles.selectedLoanIconWrap,
                          {
                            backgroundColor:
                              selectedLoan.type === 'BORROWED'
                                ? colors.primary + '18'
                                : colors.success + '18',
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            selectedLoan.type === 'BORROWED'
                              ? 'arrow-down-circle-outline'
                              : 'arrow-up-circle-outline'
                          }
                          size={20}
                          color={
                            selectedLoan.type === 'BORROWED' ? colors.primary : colors.success
                          }
                        />
                      </View>
                      <View>
                        <Text
                          style={[styles.selectedLoanName, { color: colors.textPrimary }]}
                        >
                          {selectedLoan.contactName}
                        </Text>
                        <Text
                          style={[styles.selectedLoanSub, { color: colors.textSecondary }]}
                        >
                          {selectedLoan.type === 'BORROWED'
                            ? 'Borrowed · You owe'
                            : 'Lent · Owed to you'}
                        </Text>
                      </View>
                    </View>

                    {activeLoans.length > 1 && (
                      <TouchableOpacity
                        style={[
                          styles.switchLoanBtn,
                          {
                            backgroundColor: colors.inputFill,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => setShowLoanModal(true)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={[styles.switchLoanText, { color: colors.primary }]}>
                          Change
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View
                      style={[styles.progressTrack, { backgroundColor: colors.border }]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: colors.primary,
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                (selectedLoan.paidAmount / selectedLoan.amount) * 100,
                              ),
                            )}%` as `${number}%`,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.progressLabelRow}>
                      <Text
                        style={[styles.progressLabelText, { color: colors.textSecondary }]}
                      >
                        Paid: {((selectedLoan.paidAmount / selectedLoan.amount) * 100).toFixed(0)}%
                      </Text>
                      <Text
                        style={[styles.progressLabelText, { color: colors.textSecondary }]}
                      >
                        Remaining: {formatCurrency(remainingBalance, currency)}
                      </Text>
                    </View>
                  </View>

                  {/* Stat Columns */}
                  <View
                    style={[styles.loanStatsRow, { borderTopColor: colors.border }]}
                  >
                    <View style={styles.loanStatCol}>
                      <Text
                        style={[styles.loanStatLabel, { color: colors.textSecondary }]}
                      >
                        Total
                      </Text>
                      <Text
                        style={[styles.loanStatVal, { color: colors.textPrimary }]}
                      >
                        {formatCurrency(selectedLoan.amount, currency)}
                      </Text>
                    </View>
                    <View
                      style={[styles.loanStatDivider, { backgroundColor: colors.border }]}
                    />
                    <View style={styles.loanStatCol}>
                      <Text
                        style={[styles.loanStatLabel, { color: colors.textSecondary }]}
                      >
                        Paid
                      </Text>
                      <Text
                        style={[styles.loanStatVal, { color: colors.success }]}
                      >
                        {formatCurrency(selectedLoan.paidAmount, currency)}
                      </Text>
                    </View>
                    <View
                      style={[styles.loanStatDivider, { backgroundColor: colors.border }]}
                    />
                    <View style={styles.loanStatCol}>
                      <Text
                        style={[styles.loanStatLabel, { color: colors.textSecondary }]}
                      >
                        Remaining
                      </Text>
                      <Text
                        style={[styles.loanStatVal, { color: colors.primary }]}
                      >
                        {formatCurrency(remainingBalance, currency)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Hero Repayment Amount */}
                <AppInput
                  label={`Repayment Amount (${currency})`}
                  value={amount}
                  onChangeText={(v) => {
                    setAmount(v);
                    if (amountError) setAmountError('');
                  }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  error={amountError}
                  textAlign="center"
                  style={styles.heroAmountInput}
                />

                {/* Quick Fill Full Balance Button */}
                {remainingBalance > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.quickFillBtn,
                      {
                        backgroundColor: colors.primary + '14',
                        borderColor: colors.primary + '30',
                      },
                    ]}
                    onPress={() => {
                      setAmount(String(remainingBalance));
                      if (amountError) setAmountError('');
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="flash" size={14} color={colors.primary} />
                    <Text style={[styles.quickFillText, { color: colors.primary }]}>
                      Pay full remaining ({formatCurrency(remainingBalance, currency)})
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : null}
          </>
        )}

        {/* ── ACCOUNT PICKER (Shared Standard Component) ── */}
        {accounts.length > 0 && (
          <AccountPicker
            accounts={accounts}
            selectedAccount={account}
            onSelect={setAccount}
          />
        )}

        {/* ── NOTE ─────────────────────────────────────── */}
        <AppInput
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Add details, terms, or reference…"
          multiline
          numberOfLines={2}
          style={styles.noteInput}
        />

        {/* ── DATE & TIME ──────────────────────────────── */}
        <DateTimeInput
          date={date}
          onChange={setDate}
          useCustomDate={useCustomDate}
          onUseCustomDateChange={setUseCustomDate}
        />

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── PINNED ACTION FOOTER ───────────────────────── */}
      <View
        style={[
          styles.pinnedFooter,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <AppButton
          label={
            isEditing
              ? 'Update Loan'
              : mode === 'loan'
                ? loanType === 'BORROWED'
                  ? 'Save Borrowed Loan'
                  : 'Save Lent Loan'
                : 'Record Repayment'
          }
          onPress={validateAndSave}
          loading={loading}
        />
      </View>

      {/* ── MODAL: Select Active Loan ──────────────────── */}
      <Modal
        visible={showLoanModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLoanModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLoanModal(false)}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Select Loan to Repay
              </Text>
              <TouchableOpacity
                onPress={() => setShowLoanModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalList}
            >
              {activeLoans.map((l) => {
                const rem = Math.max(0, l.amount - l.paidAmount);
                const isSelected = selectedLoan?.id === l.id;
                const isBorrowed = l.type === 'BORROWED';
                return (
                  <TouchableOpacity
                    key={l.id}
                    style={[
                      styles.modalLoanItem,
                      {
                        backgroundColor: isSelected ? colors.primary + '14' : colors.inputFill,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedLoan(l);
                      setAmount(String(rem));
                      setShowLoanModal(false);
                      setAmountError('');
                    }}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.modalLoanIcon,
                        {
                          backgroundColor: isBorrowed
                            ? colors.primary + '18'
                            : colors.success + '18',
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          isBorrowed
                            ? 'arrow-down-circle-outline'
                            : 'arrow-up-circle-outline'
                        }
                        size={22}
                        color={isBorrowed ? colors.primary : colors.success}
                      />
                    </View>
                    <View style={styles.modalLoanInfo}>
                      <Text style={[styles.modalLoanName, { color: colors.textPrimary }]}>
                        {l.contactName}
                      </Text>
                      <Text style={[styles.modalLoanType, { color: colors.textSecondary }]}>
                        {isBorrowed ? 'Borrowed · You owe' : 'Lent · Owed to you'}
                      </Text>
                    </View>
                    <View style={styles.modalLoanRight}>
                      <Text style={[styles.modalLoanRem, { color: colors.textPrimary }]}>
                        {formatCurrency(rem, currency)}
                      </Text>
                      <Text style={[styles.modalLoanRemLabel, { color: colors.textSecondary }]}>
                        Remaining
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },

  // ── Mode Segmented Control
  modeSegmentTrack: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  modeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    borderRadius: 9,
    gap: 6,
  },
  modeSegmentActive: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  modeSegmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modeSegmentTextActive: {
    fontWeight: '700',
  },

  // ── Direction Cards (Borrowed vs Lent)
  directionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  directionCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
    position: 'relative',
  },
  directionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  directionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  directionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  directionCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // ── Amount Hero Input
  heroAmountInput: {
    height: 58,
    fontSize: 26,
    fontWeight: '800',
    paddingVertical: 12,
  },

  // ── Selected Loan Hero Card (Repayment Mode)
  selectedLoanCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  selectedLoanTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedLoanPerson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectedLoanIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedLoanName: {
    fontSize: 16,
    fontWeight: '700',
  },
  selectedLoanSub: {
    fontSize: 12,
    marginTop: 1,
  },
  switchLoanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  switchLoanText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Progress Bar
  progressContainer: {
    gap: 6,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Stats
  loanStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  loanStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  loanStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  loanStatVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  loanStatDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },

  // Quick Fill Button
  quickFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: -8,
  },
  quickFillText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Note Input
  noteInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },

  // Empty State
  emptyStateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActionBtn: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Pinned Footer
  pinnedFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  // Modal Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalList: {
    padding: 16,
    gap: 10,
  },
  modalLoanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  modalLoanIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoanInfo: {
    flex: 1,
  },
  modalLoanName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  modalLoanType: {
    fontSize: 12,
  },
  modalLoanRight: {
    alignItems: 'flex-end',
  },
  modalLoanRem: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalLoanRemLabel: {
    fontSize: 11,
    marginTop: 1,
  },
});
