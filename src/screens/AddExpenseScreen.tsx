import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import {
  addExpense,
  updateExpense,
  getCategories,
  getExpensesByMonth,
  getSubExpenses,
  getActiveAccounts,
} from '@/services/database';
import { currentMonthKey } from '@/services/constants';
import { parseExpression } from '@/services/mathParser';
import { Account, Category, Expense, SubExpenseInput } from '@/types';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import DateTimeInput from '@/components/DateTimeInput';
import AccountPicker from '@/components/AccountPicker';

interface SubItem {
  localId: string;
  title: string;
  amount: string;
}

export default function AddExpenseScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { expenseId } = useLocalSearchParams<{ expenseId?: string }>();

  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [price, setPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subItems, setSubItems] = useState<SubItem[]>([]);
  const [subItemErrors, setSubItemErrors] = useState<Record<string, { title?: string; amount?: string }>>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const subItemCounter = useRef(0);
  const makeLocalId = () => String(++subItemCounter.current);

  useEffect(() => {
    const init = async () => {
      const [cats, accts] = await Promise.all([
        getCategories(),
        getActiveAccounts(),
      ]);
      setCategories(cats);
      setAccounts(accts);

      if (expenseId) {
        const [expenses, existingSubs] = await Promise.all([
          getExpensesByMonth(currentMonthKey()),
          getSubExpenses(Number(expenseId)),
        ]);
        const found = expenses.find((e) => String(e.id) === expenseId);
        if (found) {
          setEditExpense(found);
          setPrice(String(found.price));
          setNote(found.note ?? '');
          setDate(new Date(found.createdAt));
          const cat = cats.find((c) => c.name === found.category);
          setSelectedCategory(cat ?? cats[0] ?? null);
          const acct = accts.find((a) => a.id === found.accountId);
          setSelectedAccount(acct ?? accts[0] ?? null);
          if (existingSubs.length > 0) {
            setSubItems(
              existingSubs.map((s) => ({
                localId: makeLocalId(),
                title: s.title,
                amount: String(s.amount),
              })),
            );
          }
          return;
        }
      }

      setSelectedCategory(cats[0] ?? null);
      const defaultAcct = accts.find((a) => a.isDefault === 1) ?? accts[0] ?? null;
      setSelectedAccount(defaultAcct);
    };
    init();
  }, [expenseId]);

  // ── Calculator (plain amount field) ──────────────────────────
  const isExpression = /[+\-*/]/.test(price);
  const calcResult = useMemo(
    () => (price.trim() ? parseExpression(price) : null),
    [price],
  );

  // ── Sub-items ────────────────────────────────────────────────
  const hasSubItems = subItems.length > 0;
  const subTotal = useMemo(() => {
    if (!hasSubItems) return null;
    let total = 0;
    for (const item of subItems) {
      const r = parseExpression(item.amount);
      if (!r.ok) return null;
      total += r.value;
    }
    return Math.round(total * 1e10) / 1e10;
  }, [subItems, hasSubItems]);

  const addSubItem = () => {
    // On first item: seed its amount with whatever was typed in the amount field
    const initialAmount = subItems.length === 0 ? price : '';
    setSubItems((prev) => [...prev, { localId: makeLocalId(), title: '', amount: initialAmount }]);
    setSubItemErrors({});
  };

  const removeSubItem = (localId: string) => {
    setSubItems((prev) => prev.filter((i) => i.localId !== localId));
    setSubItemErrors((prev) => {
      const next = { ...prev };
      delete next[localId];
      return next;
    });
  };

  const updateSubItemField = (localId: string, field: 'title' | 'amount', value: string) => {
    setSubItems((prev) =>
      prev.map((i) => (i.localId === localId ? { ...i, [field]: value } : i)),
    );
    if (subItemErrors[localId]?.[field]) {
      setSubItemErrors((prev) => ({
        ...prev,
        [localId]: { ...prev[localId], [field]: undefined },
      }));
    }
  };

  const validateSubItems = (): SubExpenseInput[] | null => {
    const errors: Record<string, { title?: string; amount?: string }> = {};
    let hasErrors = false;
    for (const item of subItems) {
      const err: { title?: string; amount?: string } = {};
      if (!item.title.trim()) {
        err.title = 'Required';
        hasErrors = true;
      }
      const parsed = parseExpression(item.amount);
      if (!parsed.ok) {
        err.amount = parsed.error || 'Invalid amount';
        hasErrors = true;
      }
      if (Object.keys(err).length > 0) errors[item.localId] = err;
    }
    if (hasErrors) {
      setSubItemErrors(errors);
      return null;
    }
    return subItems.map((item) => ({
      title: item.title.trim(),
      amount: (parseExpression(item.amount) as { ok: true; value: number }).value,
    }));
  };

  // ── Plain-amount validate ────────────────────────────────────
  const validate = (): number | null => {
    if (!price.trim()) {
      setPriceError('Please enter an amount');
      return null;
    }
    const result = parseExpression(price);
    if (!result.ok) {
      if (!isExpression) setPriceError(result.error || 'Enter a valid amount greater than 0');
      return null;
    }
    setPriceError('');
    return result.value;
  };

  // ── Save ────────────────────────────────────────────────────
  const save = async () => {
    let finalPrice: number;
    let subExpensesInput: SubExpenseInput[] | undefined;

    if (hasSubItems) {
      const subs = validateSubItems();
      if (subs === null) return;
      finalPrice = Math.round(subs.reduce((s, i) => s + i.amount, 0) * 1e10) / 1e10;
      subExpensesInput = subs;
    } else {
      const v = validate();
      if (v === null) return;
      finalPrice = v;
    }

    setLoading(true);
    try {
      const catName = selectedCategory?.name ?? 'Other';
      const createdAt = useCustomDate ? date.toISOString() : new Date().toISOString();
      if (editExpense) {
        await updateExpense(editExpense.id, finalPrice, catName, note.trim() || null, subExpensesInput, selectedAccount?.id ?? null);
      } else {
        await addExpense(finalPrice, catName, note.trim() || null, createdAt, subExpensesInput, selectedAccount?.id ?? null);
      }
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveDisabled =
    (hasSubItems && subTotal === null) ||
    (!hasSubItems && isExpression && calcResult !== null && !calcResult.ok);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name='arrow-back' size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {editExpense ? 'Edit Expense' : 'Add Expense'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Amount / Total ──────────────────────────────────── */}
        {hasSubItems ? (
          <View style={styles.totalSection}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TOTAL</Text>
            <View style={[styles.totalBox, {
              backgroundColor: colors.inputFill,
              borderColor: subTotal !== null ? colors.primary : colors.border,
            }]}>
              <Text style={[styles.totalValue, {
                color: subTotal !== null ? colors.primary : colors.textSecondary,
              }]}>
                {subTotal !== null
                  ? subTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                  : '—'}
              </Text>
            </View>
            <Text style={[styles.totalHint, { color: colors.textSecondary }]}>
              Auto-calculated from items below
            </Text>
          </View>
        ) : (
          <>
            <AppInput
              label='Amount'
              value={price}
              onChangeText={(text) => {
                setPrice(text);
                if (priceError) setPriceError('');
              }}
              placeholder='0.00'
              keyboardType='default'
              error={priceError}
              autoCorrect={false}
              autoCapitalize='none'
            />
            {isExpression && calcResult && (
              <View style={styles.calcRow}>
                {calcResult.ok ? (
                  <Text style={[styles.calcValue, { color: colors.primary }]}>
                    = {calcResult.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </Text>
                ) : calcResult.error ? (
                  <Text style={[styles.calcError, { color: colors.danger }]}>
                    ⚠ {calcResult.error}
                  </Text>
                ) : null}
              </View>
            )}
          </>
        )}

        {/* ── Sub-items ───────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 4 }]}>
          ITEMS (OPTIONAL)
        </Text>

        {subItems.map((item) => {
          const errs = subItemErrors[item.localId];
          const itemIsExpr = /[+\-*/]/.test(item.amount);
          const itemCalcResult = itemIsExpr && item.amount.trim() ? parseExpression(item.amount) : null;
          return (
            <View key={item.localId} style={styles.subItemBlock}>
              <View style={styles.subItemRow}>
                <TextInput
                  style={[styles.subTitleInput, {
                    backgroundColor: colors.inputFill,
                    borderColor: errs?.title ? colors.danger : colors.border,
                    color: colors.textPrimary,
                  }]}
                  value={item.title}
                  onChangeText={(t) => updateSubItemField(item.localId, 'title', t)}
                  placeholder='Item name'
                  placeholderTextColor={colors.textSecondary}
                  autoCorrect={false}
                />
                <TextInput
                  style={[styles.subAmountInput, {
                    backgroundColor: colors.inputFill,
                    borderColor: errs?.amount ? colors.danger : colors.border,
                    color: colors.textPrimary,
                  }]}
                  value={item.amount}
                  onChangeText={(t) => updateSubItemField(item.localId, 'amount', t)}
                  placeholder='0.00'
                  placeholderTextColor={colors.textSecondary}
                  keyboardType='default'
                  autoCorrect={false}
                  autoCapitalize='none'
                />
                <TouchableOpacity
                  onPress={() => removeSubItem(item.localId)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name='close-circle' size={22} color={colors.danger} />
                </TouchableOpacity>
              </View>
              {itemCalcResult && (
                <View style={styles.subCalcRow}>
                  {itemCalcResult.ok ? (
                    <Text style={[styles.subCalcValue, { color: colors.primary }]}>
                      = {itemCalcResult.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </Text>
                  ) : (
                    <Text style={[styles.subCalcError, { color: colors.danger }]}>
                      ⚠ {itemCalcResult.error}
                    </Text>
                  )}
                </View>
              )}
              {(errs?.title || errs?.amount) && (
                <View style={styles.subItemErrorRow}>
                  {errs?.title && (
                    <Text style={[styles.subItemError, { color: colors.danger }]}>
                      Name: {errs.title}
                    </Text>
                  )}
                  {errs?.amount && (
                    <Text style={[styles.subItemError, { color: colors.danger }]}>
                      Amount: {errs.amount}
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.addItemBtn, { borderColor: colors.primary }]}
          onPress={addSubItem}
        >
          <Ionicons name='add' size={18} color={colors.primary} />
          <Text style={[styles.addItemLabel, { color: colors.primary }]}>Add item</Text>
        </TouchableOpacity>

        {/* ── Category ────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 8 }]}>
          CATEGORY
        </Text>
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
        </View>

        {/* ── Account ─────────────────────────────────────────── */}
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
          placeholder='What was this for?'
          multiline
          numberOfLines={3}
          style={{ height: 80, paddingTop: 12, textAlignVertical: 'top' }}
        />

        {editExpense ? null : (
          <DateTimeInput
            date={date}
            onChange={setDate}
            useCustomDate={useCustomDate}
            onUseCustomDateChange={setUseCustomDate}
          />
        )}

        <AppButton
          label={editExpense ? 'Update Expense' : 'Save Expense'}
          onPress={save}
          loading={loading}
          disabled={saveDisabled}
        />
      </ScrollView>
    </View>
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
  calcRow: { marginTop: -10, marginBottom: 14, paddingHorizontal: 4 },
  calcValue: { fontSize: 15, fontWeight: '700' },
  calcError: { fontSize: 13, fontWeight: '500' },
  totalSection: { marginBottom: 20 },
  totalBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 8,
  },
  totalValue: { fontSize: 26, fontWeight: '800' },
  totalHint: { fontSize: 12, textAlign: 'center' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  subItemBlock: { marginBottom: 8 },
  subItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subTitleInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  subAmountInput: {
    width: 100,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  subItemErrorRow: { flexDirection: 'row', gap: 12, marginTop: 4, paddingHorizontal: 4 },
  subItemError: { fontSize: 12 },
  subCalcRow: { marginTop: 2, marginBottom: 2, paddingHorizontal: 4 },
  subCalcValue: { fontSize: 13, fontWeight: '700' },
  subCalcError: { fontSize: 12, fontWeight: '500' },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  addItemLabel: { fontSize: 14, fontWeight: '600' },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pillEmoji: { fontSize: 16, marginRight: 6 },
  pillLabel: { fontSize: 14, fontWeight: '600' },
});
