import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import {
  addIncome,
  getIncomeCategories,
  getActiveAccounts,
  getIncomeById,
  updateIncome,
} from '@/services/database';
import { Account, Income, IncomeCategory } from '@/types';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import DateTimeInput from '@/components/DateTimeInput';
import AccountPicker from '@/components/AccountPicker';
import { useAppDialog } from '@/components/AppDialog';

export default function AddIncomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { incomeId } = useLocalSearchParams<{ incomeId?: string }>();
  const { showDialog } = useAppDialog();

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<IncomeCategory | null>(null);
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [date, setDate] = useState(new Date());
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [editIncome, setEditIncome] = useState<Income | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [cats, accts] = await Promise.all([
        getIncomeCategories(),
        getActiveAccounts(),
      ]);
      setCategories(cats);
      setAccounts(accts);

      if (incomeId) {
        const existing = await getIncomeById(Number(incomeId));
        if (existing) {
          setEditIncome(existing);
          setAmount(String(existing.amount));
          setNote(existing.note ?? '');
          setDate(new Date(existing.createdAt));
          const cat = cats.find((c) => c.name === existing.category);
          setSelectedCategory(cat ?? cats[0] ?? null);
          const acct = accts.find((a) => a.id === existing.accountId);
          setSelectedAccount(
            acct ?? accts.find((a) => a.isDefault === 1) ?? accts[0] ?? null,
          );
          return;
        }
        showDialog({
          title: 'Income Not Found',
          message: 'This income was not found or may have been deleted.',
          icon: '⚠️',
          type: 'warning',
          buttons: [
            { text: 'OK', style: 'default', onPress: () => router.back() },
          ],
        });
        return;
      }

      setSelectedCategory(cats[0] ?? null);
      setSelectedAccount(
        accts.find((a) => a.isDefault === 1) ?? accts[0] ?? null,
      );
    };
    init();
  }, [incomeId, router, showDialog]);

  const validate = (): boolean => {
    const v = parseFloat(amount.replace(',', '.'));
    if (!amount.trim()) {
      setAmountError('Please enter an amount');
      return false;
    }
    if (isNaN(v) || v <= 0) {
      setAmountError('Enter a valid amount greater than 0');
      return false;
    }
    setAmountError('');
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const v = parseFloat(amount.replace(',', '.'));
      const catName = selectedCategory?.name ?? 'Other';
      if (editIncome) {
        await updateIncome(
          editIncome.id,
          v,
          catName,
          note.trim() || null,
          selectedAccount?.id ?? null,
        );
      } else {
        const createdAt = useCustomDate
          ? date.toISOString()
          : new Date().toISOString();
        await addIncome(
          v,
          catName,
          note.trim() || null,
          createdAt,
          selectedAccount?.id ?? null,
        );
      }
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
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name='arrow-back' size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {editIncome ? 'Edit Income' : 'Add Income'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AppInput
          label='Amount'
          value={amount}
          onChangeText={setAmount}
          placeholder='0.00'
          keyboardType='decimal-pad'
          error={amountError}
          textAlign='center'
          style={{
            height: 59,
            paddingVertical: 14,
            fontSize: 26,
            fontWeight: '800',
          }}
        />

        <Text
          style={[
            styles.sectionLabel,
            { color: colors.textSecondary, marginTop: 8 },
          ]}
        >
          Category
        </Text>
        <View style={styles.categoryGrid}>
          {categories
            .slice(0, showAllCategories ? categories.length : 6)
            .map((cat) => {
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
                  <Text
                    style={[
                      styles.pillLabel,
                      { color: selected ? '#fff' : colors.textPrimary },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          {categories.length > 6 && !showAllCategories && (
            <TouchableOpacity
              style={[styles.showMoreBtn, { borderColor: colors.primary }]}
              onPress={() => setShowAllCategories(true)}
            >
              <Ionicons name='chevron-down' size={12} color={colors.primary} />
              <Text style={[styles.showMoreLabel, { color: colors.primary }]}>
                More
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {accounts.length > 0 && (
          <AccountPicker
            accounts={accounts}
            selectedAccount={selectedAccount}
            onSelect={setSelectedAccount}
          />
        )}

        <AppInput
          label='Note (optional)'
          value={note}
          onChangeText={setNote}
          placeholder='e.g. Salary, Freelance, Bonus…'
          multiline
          numberOfLines={3}
          style={{ textAlignVertical: 'center' }}
        />

        {editIncome ? null : (
          <DateTimeInput
            date={date}
            onChange={setDate}
            useCustomDate={useCustomDate}
            onUseCustomDateChange={setUseCustomDate}
          />
        )}

        <AppButton
          label={editIncome ? 'Update Income' : 'Save Income'}
          onPress={save}
          loading={loading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 24,
  },
  bannerEmoji: { fontSize: 24, marginRight: 12 },
  bannerText: { fontSize: 14, fontWeight: '600', flex: 1 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryPill: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  showMoreBtn: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  showMoreLabel: { fontSize: 14, fontWeight: '600' },
  pillEmoji: { fontSize: 16, marginRight: 6 },
  pillLabel: { fontSize: 14, fontWeight: '600' },
});
