import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { getAccountById, addAccount, updateAccount } from '@/services/database';
import { Account, AccountType } from '@/types';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS } from '@/components/AccountPicker';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import { useAppDialog } from '@/components/AppDialog';

const PRESET_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B',
  '#EF4444', '#06B6D4', '#EC4899', '#6B7280',
  '#F97316', '#84CC16',
];

const PRESET_ICONS: Record<AccountType, string[]> = {
  cash:         ['💵', '💴', '💶', '💷', '🪙', '💰'],
  bank_account: ['🏦', '💳', '🏧', '📊', '💼', '🏢'],
  e_wallet:     ['📱', '💻', '⚡', '🔗', '📲', '🌐'],
};

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank_account', 'e_wallet'];

export default function AddEditAccountScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { showDialog } = useAppDialog();
  const { accountId } = useLocalSearchParams<{ accountId?: string }>();
  const isEdit = !!accountId;

  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [icon, setIcon] = useState('💵');
  const [color, setColor] = useState(PRESET_COLORS[0]!);

  const [nameError, setNameError] = useState('');
  const [balanceError, setBalanceError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    getAccountById(Number(accountId)).then((acc) => {
      if (!acc) return;
      setEditAccount(acc);
      setName(acc.name);
      setType(acc.type);
      setOpeningBalance(String(acc.currentBalance));
      setIcon(acc.icon ?? '💵');
      setColor(acc.color ?? PRESET_COLORS[0]!);
    });
  }, [accountId]);

  // Reset icon when type changes (on add only)
  useEffect(() => {
    if (!isEdit) {
      setIcon(PRESET_ICONS[type][0]!);
    }
  }, [type, isEdit]);

  const validate = (): boolean => {
    let ok = true;
    if (!name.trim()) {
      setNameError('Account name is required');
      ok = false;
    } else {
      setNameError('');
    }
    const bal = parseFloat(openingBalance.replace(',', '.'));
    if (isNaN(bal) || bal < 0) {
      setBalanceError(isEdit ? 'Current balance must be 0 or more' : 'Opening balance must be 0 or more');
      ok = false;
    } else {
      setBalanceError('');
    }
    return ok;
  };

  const save = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const bal = parseFloat(openingBalance.replace(',', '.'));
      if (isEdit && editAccount) {
        await updateAccount(editAccount.id, {
          name: name.trim(),
          type,
          currentBalance: bal,
          icon,
          color,
        });
      } else {
        await addAccount({
          name: name.trim(),
          type,
          openingBalance: bal,
          icon,
          color,
          isDefault: 0,
        });
      }
      router.back();
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.toLowerCase().includes('unique')) {
        setNameError('An account with this name already exists');
      } else {
        showDialog({
          title: 'Error',
          message: 'Failed to save account. Please try again.',
          icon: '❌',
          type: 'danger',
          buttons: [{ text: 'OK', style: 'default' }],
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {isEdit ? 'Edit Account' : 'New Account'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Preview card */}
        <View style={[styles.preview, { backgroundColor: color + '22', borderColor: color + '44' }]}>
          <View style={[styles.previewIcon, { backgroundColor: color + '33' }]}>
            <Text style={styles.previewEmoji}>{icon}</Text>
          </View>
          <View style={styles.previewInfo}>
            <Text style={[styles.previewName, { color: colors.textPrimary }]}>
              {name.trim() || 'Account Name'}
            </Text>
            <Text style={[styles.previewType, { color: colors.textSecondary }]}>
              {ACCOUNT_TYPE_LABELS[type]}
            </Text>
          </View>
        </View>

        {/* Name */}
        <AppInput
          label="Account Name"
          value={name}
          onChangeText={(v) => { setName(v); if (nameError) setNameError(''); }}
          placeholder="e.g. Wallet, Savings, PayPal…"
          error={nameError}
          autoCorrect={false}
        />

        {/* Type selector */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TYPE</Text>
        <View style={styles.typeRow}>
          {ACCOUNT_TYPES.map((t) => {
            const selected = type === t;
            return (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typePill,
                  {
                    backgroundColor: selected ? colors.primary + '22' : colors.inputFill,
                    borderColor: selected ? colors.primary : colors.border,
                    flex: 1,
                  },
                ]}
                onPress={() => setType(t)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={ACCOUNT_TYPE_ICONS[t]}
                  size={16}
                  color={selected ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.typePillLabel, { color: selected ? colors.primary : colors.textPrimary }]}>
                  {ACCOUNT_TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Opening/Current balance */}
        <AppInput
          label={isEdit ? 'Current Balance' : 'Opening Balance'}
          value={openingBalance}
          onChangeText={(v) => { setOpeningBalance(v); if (balanceError) setBalanceError(''); }}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={balanceError}
        />
        {isEdit && (
          <Text style={[styles.editNote, { color: colors.textSecondary }]}>
            Set your current balance directly — transactions are preserved and the opening balance is adjusted automatically.
          </Text>
        )}

        {/* Icon */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ICON</Text>
        <View style={styles.iconGrid}>
          {PRESET_ICONS[type].map((em) => (
            <TouchableOpacity
              key={em}
              style={[
                styles.iconOption,
                {
                  backgroundColor: icon === em ? color + '33' : colors.inputFill,
                  borderColor: icon === em ? color : colors.border,
                },
              ]}
              onPress={() => setIcon(em)}
              activeOpacity={0.75}
            >
              <Text style={styles.iconEmoji}>{em}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Color */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>COLOR</Text>
        <View style={styles.colorGrid}>
          {PRESET_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                color === c && { borderColor: '#fff', borderWidth: 3 },
              ]}
              onPress={() => setColor(c)}
              activeOpacity={0.8}
            />
          ))}
        </View>

        <AppButton
          label={isEdit ? 'Update Account' : 'Create Account'}
          onPress={save}
          loading={loading}
        />

        <View style={{ height: 40 }} />
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
  content: { padding: 20 },

  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 24,
    gap: 14,
  },
  previewIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: { fontSize: 28 },
  previewInfo: { flex: 1 },
  previewName: { fontSize: 18, fontWeight: '700' },
  previewType: { fontSize: 13, marginTop: 2 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10, marginTop: 4 },

  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  typePillLabel: { fontSize: 13, fontWeight: '600' },

  editNote: { fontSize: 12, marginTop: -14, marginBottom: 20 },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  iconOption: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  iconEmoji: { fontSize: 26 },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
});
