import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { getActiveAccounts, addTransfer, getTransferById, updateTransfer } from '@/services/database';
import { Account, Transfer } from '@/types';
import { ACCOUNT_TYPE_LABELS } from '@/components/AccountPicker';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import DateTimeInput from '@/components/DateTimeInput';
import { useAppDialog } from '@/components/AppDialog';

export default function TransferScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { transferId } = useLocalSearchParams<{ transferId?: string }>();
  const { showDialog } = useAppDialog();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromAccount, setFromAccount] = useState<Account | null>(null);
  const [toAccount, setToAccount] = useState<Account | null>(null);
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [feeError, setFeeError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [editTransfer, setEditTransfer] = useState<Transfer | null>(null);

  useEffect(() => {
    const init = async () => {
      const accts = await getActiveAccounts();
      setAccounts(accts);

      if (transferId) {
        const existing = await getTransferById(Number(transferId));
        if (existing) {
          setEditTransfer(existing);
          setAmount(String(existing.amount));
          setFee(existing.feeAmount ? String(existing.feeAmount) : '');
          setNote(existing.note ?? '');
          setDate(new Date(existing.transferDate ?? existing.createdAt));
          const from = accts.find((a) => a.id === existing.fromAccountId) ?? accts[0] ?? null;
          const to = accts.find((a) => a.id === existing.toAccountId) ?? accts[1] ?? null;
          setFromAccount(from);
          setToAccount(to);
          return;
        }
        showDialog({
          title: 'Transfer Not Found',
          message: 'This transfer was not found or may have been deleted.',
          icon: '⚠️',
          type: 'warning',
          buttons: [{ text: 'OK', style: 'default', onPress: () => router.back() }],
        });
        return;
      }

      setFromAccount(accts[0] ?? null);
      setToAccount(accts[1] ?? null);
    };
    init();
  }, [transferId, router, showDialog]);

  const validate = (): { amount: number; fee: number } | null => {
    if (!fromAccount || !toAccount) {
      showDialog({
        title: 'Error',
        message: 'Please select both accounts.',
        icon: '⚠️',
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return null;
    }
    if (fromAccount.id === toAccount.id) {
      showDialog({
        title: 'Invalid Transfer',
        message: 'Source and destination accounts must be different.',
        icon: '⚠️',
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return null;
    }
    const v = parseFloat(amount.replace(',', '.'));
    if (!amount.trim() || isNaN(v) || v <= 0) {
      setAmountError('Enter a valid amount greater than 0');
      return null;
    }
    setAmountError('');

    let f = 0;
    if (fee.trim()) {
      f = parseFloat(fee.replace(',', '.'));
      if (isNaN(f) || f < 0) {
        setFeeError('Enter a valid fee amount');
        return null;
      }
    }
    setFeeError('');

    const maxAvailable = fromAccount.currentBalance + (editTransfer?.fromAccountId === fromAccount.id ? editTransfer.amount + (editTransfer.feeAmount ?? 0) : 0);
    if (v + f > maxAvailable) {
      setAmountError(`Insufficient balance. Available: ${maxAvailable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      return null;
    }
    return { amount: v, fee: f };
  };

  const save = async () => {
    const result = validate();
    if (result === null) return;
    const { amount: v, fee: f } = result;
    setLoading(true);
    try {
      if (editTransfer) {
        await updateTransfer(editTransfer.id, fromAccount!.id, toAccount!.id, v, note.trim() || null, f, null);
      } else {
        const createdAt = useCustomDate ? date.toISOString() : new Date().toISOString();
        await addTransfer(fromAccount!.id, toAccount!.id, v, note.trim() || null, createdAt, f, null);
      }
      router.back();
    } catch {
      showDialog({
        title: 'Error',
        message: 'Failed to save transfer. Please try again.',
        icon: '❌',
        type: 'danger',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setLoading(false);
    }
  };

  const swapAccounts = () => {
    setFromAccount(toAccount);
    setToAccount(fromAccount);
    setShowFromPicker(false);
    setShowToPicker(false);
    setAmountError('');
    setFeeError('');
  };

  const AccountSelector = ({
    label,
    selected,
    onSelect,
    excludeId,
    show,
    onToggle,
  }: {
    label: string;
    selected: Account | null;
    onSelect: (a: Account) => void;
    excludeId?: number;
    show: boolean;
    onToggle: () => void;
  }) => (
    <View style={styles.selectorBlock}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectorBtn, { backgroundColor: colors.inputFill, borderColor: colors.border }]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        {selected ? (
          <View style={styles.selectedRow}>
            <Text style={styles.selectedIcon}>{selected.icon ?? '💳'}</Text>
            <View>
              <Text style={[styles.selectedName, { color: colors.textPrimary }]}>{selected.name}</Text>
              <Text style={[styles.selectedType, { color: colors.textSecondary }]}>
                {ACCOUNT_TYPE_LABELS[selected.type]} · Balance: {selected.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>Select account…</Text>
        )}
        <Ionicons name={show ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {show && (
        <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {accounts
            .filter((a) => a.id !== excludeId)
            .map((acc) => {
              const isSelected = selected?.id === acc.id;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.dropdownItem,
                    isSelected && { backgroundColor: colors.primary + '15' },
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => { onSelect(acc); onToggle(); }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.dropdownIcon}>{acc.icon ?? '💳'}</Text>
                  <View style={styles.dropdownInfo}>
                    <Text style={[styles.dropdownName, { color: colors.textPrimary }]}>{acc.name}</Text>
                    <Text style={[styles.dropdownBalance, { color: colors.textSecondary }]}>
                      {ACCOUNT_TYPE_LABELS[acc.type]} · {acc.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{editTransfer ? 'Edit Transfer' : 'Transfer'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="swap-horizontal" size={22} color={colors.primary} />
          <Text style={[styles.bannerText, { color: colors.primary }]}>
            Move money between your accounts
          </Text>
        </View>

        <AccountSelector
          label="FROM ACCOUNT"
          selected={fromAccount}
          onSelect={setFromAccount}
          excludeId={toAccount?.id}
          show={showFromPicker}
          onToggle={() => { setShowFromPicker((v) => !v); setShowToPicker(false); }}
        />

        <View style={[styles.arrowRow]}>
          <View style={[styles.arrowLine, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={[styles.arrowCircle, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}
            onPress={swapAccounts}
            activeOpacity={0.75}
            disabled={!fromAccount || !toAccount}
          >
            <Ionicons name="swap-vertical" size={18} color={colors.primary} />
          </TouchableOpacity>
          <View style={[styles.arrowLine, { backgroundColor: colors.border }]} />
        </View>

        <AccountSelector
          label="TO ACCOUNT"
          selected={toAccount}
          onSelect={setToAccount}
          excludeId={fromAccount?.id}
          show={showToPicker}
          onToggle={() => { setShowToPicker((v) => !v); setShowFromPicker(false); }}
        />

        <AppInput
          label="Amount"
          value={amount}
          onChangeText={(v) => { setAmount(v); if (amountError) setAmountError(''); }}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={amountError}
        />

        <AppInput
          label="Fee (optional)"
          value={fee}
          onChangeText={(v) => { setFee(v); if (feeError) setFeeError(''); }}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={feeError}
        />

        <AppInput
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="What is this transfer for?"
          multiline
          numberOfLines={2}
          style={{ height: 64, paddingTop: 10, textAlignVertical: 'top' }}
        />

        {editTransfer ? null : (
          <DateTimeInput
            date={date}
            onChange={setDate}
            useCustomDate={useCustomDate}
            onUseCustomDateChange={setUseCustomDate}
          />
        )}

        <AppButton
          label={editTransfer ? 'Update Transfer' : 'Transfer'}
          onPress={save}
          loading={loading}
          disabled={!fromAccount || !toAccount || fromAccount.id === toAccount?.id}
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
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 14, marginBottom: 24,
  },
  bannerText: { fontSize: 14, fontWeight: '600', flex: 1 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },

  selectorBlock: { marginBottom: 8 },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  selectedIcon: { fontSize: 22 },
  selectedName: { fontSize: 15, fontWeight: '700' },
  selectedType: { fontSize: 12, marginTop: 1 },
  placeholderText: { fontSize: 14 },

  dropdown: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  dropdownIcon: { fontSize: 20 },
  dropdownInfo: { flex: 1 },
  dropdownName: { fontSize: 14, fontWeight: '600' },
  dropdownBalance: { fontSize: 12, marginTop: 1 },

  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  arrowLine: { flex: 1, height: 1 },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginHorizontal: 8,
  },
});
