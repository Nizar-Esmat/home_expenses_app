import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { addIncome, getIncomeCategories, getActiveAccounts } from '@/services/database';
import { Account, IncomeCategory } from '@/types';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import DateTimeInput from '@/components/DateTimeInput';
import AccountPicker from '@/components/AccountPicker';
import { useAppDialog } from '@/components/AppDialog';

export default function AddIncomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { showDialog } = useAppDialog();

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IncomeCategory | null>(null);
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [date, setDate] = useState(new Date());
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  useEffect(() => {
    Promise.all([getIncomeCategories(), getActiveAccounts()]).then(([cats, accts]) => {
      setCategories(cats);
      setSelectedCategory(cats[0] ?? null);
      setAccounts(accts);
      setSelectedAccount(accts.find((a) => a.isDefault === 1) ?? accts[0] ?? null);
    });
  }, []);

  const validate = (): boolean => {
    const v = parseFloat(amount.replace(',', '.'));
    if (!amount.trim()) { setAmountError('Please enter an amount'); return false; }
    if (isNaN(v) || v <= 0) { setAmountError('Enter a valid amount greater than 0'); return false; }
    setAmountError('');
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const v = parseFloat(amount.replace(',', '.'));
      const createdAt = useCustomDate ? date.toISOString() : new Date().toISOString();
      const catName = selectedCategory?.name ?? 'Other';
      await addIncome(v, catName, note.trim() || null, createdAt, selectedAccount?.id ?? null);
      router.back();
    } catch {
      showDialog({
        title: 'Error',
        message: 'Failed to save income. Please try again.',
        icon: '❌',
        type: 'danger',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Add Income</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.banner, { backgroundColor: colors.successBg }]}>
          <Text style={styles.bannerEmoji}>💰</Text>
          <Text style={[styles.bannerText, { color: colors.success }]}>
            Record money you received today
          </Text>
        </View>

        <AppInput
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={amountError}
        />

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CATEGORY</Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => {
            const selected = selectedCategory?.id === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: selected ? cat.color : colors.inputFill,
                    borderColor: selected ? cat.color : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={styles.pillEmoji}>{cat.emoji}</Text>
                <Text style={[styles.pillLabel, { color: selected ? '#fff' : colors.textPrimary }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {accounts.length > 0 && (
          <AccountPicker
            accounts={accounts}
            selectedAccount={selectedAccount}
            onSelect={setSelectedAccount}
          />
        )}

        <AppInput
          label="Source / Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Salary, Freelance, Bonus…"
          multiline
          numberOfLines={3}
          style={{ height: 80, paddingTop: 12, textAlignVertical: 'top' }}
        />

        <DateTimeInput date={date} onChange={setDate} useCustomDate={useCustomDate} onUseCustomDateChange={setUseCustomDate} />

        <AppButton label="Save Income" onPress={save} loading={loading} />
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
  banner: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 14, marginBottom: 24,
  },
  bannerEmoji: { fontSize: 24, marginRight: 12 },
  bannerText: { fontSize: 14, fontWeight: '600', flex: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5,
  },
  pillEmoji: { fontSize: 16, marginRight: 6 },
  pillLabel: { fontSize: 14, fontWeight: '600' },
});