import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { SPLIT_CATEGORY_NAME } from '@/services/constants';
import {
  addExpense,
  updateExpense,
  getCategories,
  getExpenseById,
  getSubExpenses,
  getActiveAccounts,
  getAccountById,
  checkCategoryBudgetWarning,
  CategoryBudgetCheckResult,
} from '@/services/database';
import { notifyBudgetWarning } from '@/services/notifications';
import { Account, Category, Expense, SubExpenseInput } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import DateTimeInput from '@/components/DateTimeInput';
import AccountPicker from '@/components/AccountPicker';
import { useAppDialog } from '@/components/AppDialog';
import ScreenHeader from '@/components/ScreenHeader';

interface SubItem {
  localId: string;
  title: string;
  amount: string;
  categoryId: number | null;
}

export default function AddExpenseScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showDialog } = useAppDialog();
  const { expenseId } = useLocalSearchParams<{ expenseId?: string }>();

  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [price, setPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subItems, setSubItems] = useState<SubItem[]>([]);
  const [subItemErrors, setSubItemErrors] = useState<
    Record<string, { title?: string; amount?: string }>
  >({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [perItemCategoryMode, setPerItemCategoryMode] = useState(false);
  const [pickerItemId, setPickerItemId] = useState<string | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<CategoryBudgetCheckResult | null>(null);

  const subItemCounter = useRef(0);
  const makeLocalId = () => String(++subItemCounter.current);

  useEffect(() => {
    const init = async () => {
      const [cats, accts] = await Promise.all([
        getCategories(),
        getActiveAccounts(),
      ]);
      const selectableCats = cats.filter((c) => c.name !== SPLIT_CATEGORY_NAME);
      setCategories(selectableCats);
      setAccounts(accts);

      if (expenseId) {
        const [expense, existingSubs] = await Promise.all([
          getExpenseById(Number(expenseId)),
          getSubExpenses(Number(expenseId)),
        ]);
        if (expense) {
          setEditExpense(expense);
          setPrice(String(expense.price));
          setNote(expense.note ?? '');
          setDate(new Date(expense.createdAt));
          const acct = accts.find((a) => a.id === expense.accountId);
          setSelectedAccount(acct ?? accts[0] ?? null);
          if (existingSubs.length > 0) {
            const mappedSubs = existingSubs.map((s) => ({
              localId: makeLocalId(),
              title: s.title,
              amount: String(s.amount),
              categoryId: s.categoryId ?? null,
            }));
            setSubItems(mappedSubs);
            const uniqueCatIds = new Set(
              mappedSubs
                .map((s) => s.categoryId)
                .filter((id): id is number => id != null),
            );
            const isSplit =
              expense.category === SPLIT_CATEGORY_NAME || uniqueCatIds.size > 1;
            setPerItemCategoryMode(isSplit);
            const fallbackCat =
              selectableCats.find((c) => c.name === expense.category) ??
              selectableCats.find((c) => c.id === mappedSubs[0]?.categoryId) ??
              selectableCats[0] ??
              null;
            setSelectedCategory(fallbackCat);
          } else {
            const cat = selectableCats.find((c) => c.name === expense.category);
            setSelectedCategory(cat ?? selectableCats[0] ?? null);
          }
          return;
        }

        showDialog({
          title: 'Expense Not Found',
          message: 'This expense was not found or may have been deleted.',
          icon: '⚠️',
          type: 'warning',
          buttons: [
            { text: 'OK', style: 'default', onPress: () => router.back() },
          ],
        });
        return;
      }

      setSelectedCategory(selectableCats[0] ?? null);
      const defaultAcct =
        accts.find((a) => a.isDefault === 1) ?? accts[0] ?? null;
      setSelectedAccount(defaultAcct);
    };
    init();
  }, [expenseId, router, showDialog]);

  // ── Sub-items ────────────────────────────────────────────────
  const hasSubItems = subItems.length > 0;
  const subTotal = useMemo(() => {
    if (!hasSubItems) return null;
    let total = 0;
    for (const item of subItems) {
      const v = parseFloat(item.amount.replace(',', '.'));
      if (isNaN(v) || v <= 0) return null;
      total += v;
    }
    return Math.round(total * 1e10) / 1e10;
  }, [subItems, hasSubItems]);

  useEffect(() => {
    if (!selectedCategory?.id || !selectedCategory.budgetLimit) {
      setBudgetStatus(null);
      return;
    }
    const amt =
      hasSubItems && subTotal != null
        ? subTotal
        : parseFloat(price.replace(',', '.')) || 0;

    checkCategoryBudgetWarning(
      selectedCategory.id,
      amt,
      undefined,
      editExpense?.id,
    )
      .then(setBudgetStatus)
      .catch(() => setBudgetStatus(null));
  }, [selectedCategory, price, subTotal, hasSubItems, editExpense]);

  const addSubItem = () => {
    const initialAmount = subItems.length === 0 ? price : '';
    const defaultCategoryId = selectedCategory?.id ?? categories[0]?.id ?? null;
    setSubItems((prev) => [
      ...prev,
      {
        localId: makeLocalId(),
        title: '',
        amount: initialAmount,
        categoryId: defaultCategoryId,
      },
    ]);
    setSubItemErrors({});
  };

  const toggleCategoryMode = (perItem: boolean) => {
    setPerItemCategoryMode(perItem);
    if (perItem) {
      const fallbackId = selectedCategory?.id ?? categories[0]?.id ?? null;
      setSubItems((prev) =>
        prev.map((item) => ({
          ...item,
          categoryId: item.categoryId ?? fallbackId,
        })),
      );
    }
  };

  const updateSubItemCategory = (localId: string, categoryId: number) => {
    setSubItems((prev) =>
      prev.map((i) => (i.localId === localId ? { ...i, categoryId } : i)),
    );
    setPickerItemId(null);
  };

  const removeSubItem = (localId: string) => {
    setSubItems((prev) => prev.filter((i) => i.localId !== localId));
    setSubItemErrors((prev) => {
      const next = { ...prev };
      delete next[localId];
      return next;
    });
  };

  const updateSubItemField = (
    localId: string,
    field: 'title' | 'amount',
    value: string,
  ) => {
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
      const v = parseFloat(item.amount.replace(',', '.'));
      if (isNaN(v) || v <= 0) {
        err.amount = 'Enter a valid amount greater than 0';
        hasErrors = true;
      }
      if (Object.keys(err).length > 0) errors[item.localId] = err;
    }
    if (hasErrors) {
      setSubItemErrors(errors);
      return null;
    }
    const fallbackCategoryId = selectedCategory?.id ?? categories[0]?.id ?? null;
    return subItems.map((item) => ({
      title: item.title.trim(),
      amount: parseFloat(item.amount.replace(',', '.')),
      categoryId: perItemCategoryMode
        ? (item.categoryId ?? fallbackCategoryId)
        : fallbackCategoryId,
    }));
  };

  // ── Validate amount field ────────────────────────────────────
  const validate = (): number | null => {
    if (!price.trim()) {
      setPriceError('Please enter an amount');
      return null;
    }
    const v = parseFloat(price.replace(',', '.'));
    if (isNaN(v) || v <= 0) {
      setPriceError('Enter a valid amount greater than 0');
      return null;
    }
    setPriceError('');
    return v;
  };

  // ── Save ────────────────────────────────────────────────────
  const save = async () => {
    let finalPrice: number;
    let subExpensesInput: SubExpenseInput[] | undefined;

    if (hasSubItems) {
      const subs = validateSubItems();
      if (subs === null) return;
      finalPrice =
        Math.round(subs.reduce((s, i) => s + i.amount, 0) * 1e10) / 1e10;
      subExpensesInput = subs;
    } else {
      const v = validate();
      if (v === null) return;
      finalPrice = v;
    }

    // Balance check — fetch fresh balance from DB
    if (selectedAccount != null) {
      const freshAcc = await getAccountById(selectedAccount.id);
      if (freshAcc) {
        // For edits on the same account, the old expense amount is already deducted,
        // so the effective available balance is currentBalance + oldAmount.
        const isEditSameAccount =
          editExpense != null && editExpense.accountId === freshAcc.id;
        const available = isEditSameAccount
          ? freshAcc.currentBalance + editExpense!.price
          : freshAcc.currentBalance;

        if (finalPrice > available) {
          showDialog({
            title: 'Insufficient Balance',
            message: `"${freshAcc.name}" only has ${available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} available. The expense of ${finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} exceeds it.`,
            icon: '💸',
            type: 'warning',
            buttons: [{ text: 'OK', style: 'default' }],
          });
          return;
        }
      }
    }

    const executeSave = async () => {
      setLoading(true);
      try {
        const catName = selectedCategory?.name ?? 'Other';
        const createdAt = useCustomDate
          ? date.toISOString()
          : new Date().toISOString();
        if (editExpense) {
          await updateExpense(
            editExpense.id,
            finalPrice,
            catName,
            note.trim() || null,
            subExpensesInput,
            selectedAccount?.id ?? null,
          );
        } else {
          await addExpense(
            finalPrice,
            catName,
            note.trim() || null,
            createdAt,
            subExpensesInput,
            selectedAccount?.id ?? null,
          );
        }
        router.back();
      } catch {
        showDialog({
          title: 'Error',
          message: 'Failed to save expense. Please try again.',
          icon: '❌',
          type: 'danger',
          buttons: [{ text: 'OK', style: 'default' }],
        });
      } finally {
        setLoading(false);
      }
    };

    // Budget limit check & warning
    if (selectedCategory?.id) {
      const budgetCheck = await checkCategoryBudgetWarning(
        selectedCategory.id,
        finalPrice,
        undefined,
        editExpense?.id,
      );

      if (budgetCheck && budgetCheck.isWarning) {
        const pctLabel = `${Math.round(budgetCheck.percentage * 100)}%`;
        const isExceeded = budgetCheck.isExceeded;
        const alertTitle = isExceeded ? 'Budget Exceeded!' : 'Budget Warning!';
        const alertMsg = isExceeded
          ? `This expense will exceed the monthly budget for "${budgetCheck.categoryName}" by ${(budgetCheck.projectedSpent - budgetCheck.budgetLimit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.\n\nProjected: ${budgetCheck.projectedSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${budgetCheck.budgetLimit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pctLabel}).`
          : `This expense will bring "${budgetCheck.categoryName}" spending to ${pctLabel} of its monthly budget.\n\nProjected: ${budgetCheck.projectedSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${budgetCheck.budgetLimit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;

        // Send push notification in background
        notifyBudgetWarning(
          budgetCheck.categoryName,
          budgetCheck.percentage,
          budgetCheck.projectedSpent,
          budgetCheck.budgetLimit,
        ).catch(() => {});

        showDialog({
          title: alertTitle,
          message: alertMsg,
          icon: isExceeded ? '🚨' : '⚠️',
          type: 'warning',
          buttons: [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Save Anyway',
              style: 'default',
              onPress: executeSave,
            },
          ],
        });
        return;
      }
    }

    await executeSave();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title={editExpense ? 'Edit Expense' : 'Add Expense'}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        {/* ── Amount / Total ──────────────────────────────────── */}
        {hasSubItems ? (
          <View style={styles.totalSection}>
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              Total Amount
            </Text>
            <View
              style={[
                styles.totalBox,
                {
                  backgroundColor: colors.inputFill,
                  borderColor:
                    subTotal !== null ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.totalValue,
                  {
                    color:
                      subTotal !== null ? colors.primary : colors.textSecondary,
                  },
                ]}
              >
                {subTotal !== null
                  ? subTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })
                  : '0.00'}
              </Text>
            </View>
            <Text style={[styles.totalHint, { color: colors.textSecondary }]}>
              Auto-calculated from items below
            </Text>
          </View>
        ) : (
          <AppInput
            label='Amount'
            value={price}
            onChangeText={(text) => {
              setPrice(text);
              if (priceError) setPriceError('');
            }}
            placeholder='0.00'
            keyboardType='decimal-pad'
            error={priceError}
            autoCorrect={false}
            autoCapitalize='none'
            textAlign='center'
            style={{
              height: 59,
              paddingVertical: 14,
              fontSize: 26,
              fontWeight: '800',
            }}
          />
        )}

        {/* ── Sub-items ───────────────────────────────────────── */}
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.textSecondary, marginTop: 4 },
          ]}
        >
          Items (optional)
        </Text>

        {hasSubItems && (
          <View
            style={[
              styles.modeToggleRow,
              { backgroundColor: colors.inputFill, borderColor: colors.border },
            ]}
            accessibilityRole="radiogroup"
            accessibilityLabel="Item category mode"
          >
            <TouchableOpacity
              style={[
                styles.modeOption,
                !perItemCategoryMode && { backgroundColor: colors.primary },
              ]}
              onPress={() => toggleCategoryMode(false)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: !perItemCategoryMode }}
            >
              <Text
                style={[
                  styles.modeOptionText,
                  { color: !perItemCategoryMode ? '#fff' : colors.textSecondary },
                ]}
              >
                Same category for all
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeOption,
                perItemCategoryMode && { backgroundColor: colors.primary },
              ]}
              onPress={() => toggleCategoryMode(true)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: perItemCategoryMode }}
            >
              <Text
                style={[
                  styles.modeOptionText,
                  { color: perItemCategoryMode ? '#fff' : colors.textSecondary },
                ]}
              >
                Category per item
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {subItems.map((item) => {
          const errs = subItemErrors[item.localId];
          const itemCat =
            categories.find((c) => c.id === item.categoryId) ??
            selectedCategory ??
            categories[0];
          return (
            <View key={item.localId} style={styles.subItemBlock}>
              <View style={styles.subItemRow}>
                <TextInput
                  style={[
                    styles.subTitleInput,
                    {
                      backgroundColor: colors.inputFill,
                      borderColor: errs?.title ? colors.danger : colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={item.title}
                  onChangeText={(t) =>
                    updateSubItemField(item.localId, 'title', t)
                  }
                  placeholder='Item name'
                  placeholderTextColor={colors.textSecondary}
                  autoCorrect={false}
                />
                <TextInput
                  style={[
                    styles.subAmountInput,
                    {
                      backgroundColor: colors.inputFill,
                      borderColor: errs?.amount ? colors.danger : colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={item.amount}
                  onChangeText={(t) =>
                    updateSubItemField(item.localId, 'amount', t)
                  }
                  placeholder='0.00'
                  placeholderTextColor={colors.textSecondary}
                  keyboardType='decimal-pad'
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => removeSubItem(item.localId)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove item ${item.title || 'row'}`}
                >
                  <Ionicons
                    name='close-circle'
                    size={22}
                    color={colors.danger}
                  />
                </TouchableOpacity>
              </View>
              {perItemCategoryMode && itemCat && (
                <TouchableOpacity
                  style={[
                    styles.itemCatChip,
                    {
                      backgroundColor: itemCat.color + '1A',
                      borderColor: itemCat.color + '55',
                    },
                  ]}
                  onPress={() => setPickerItemId(item.localId)}
                  activeOpacity={0.75}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Category for ${item.title || 'item'}: ${itemCat.name}. Tap to change.`}
                >
                  <Text style={styles.itemCatEmoji}>{itemCat.emoji}</Text>
                  <Text
                    style={[styles.itemCatLabel, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {itemCat.name}
                  </Text>
                  <Ionicons name='chevron-down' size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              {(errs?.title || errs?.amount) && (
                <View style={styles.subItemErrorRow}>
                  {errs?.title && (
                    <Text
                      style={[styles.subItemError, { color: colors.danger }]}
                    >
                      Name: {errs.title}
                    </Text>
                  )}
                  {errs?.amount && (
                    <Text
                      style={[styles.subItemError, { color: colors.danger }]}
                    >
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
          <Text style={[styles.addItemLabel, { color: colors.primary }]}>
            Add item
          </Text>
        </TouchableOpacity>

        {/* ── Category ────────────────────────────────────────── */}
        {!(hasSubItems && perItemCategoryMode) && (
          <>
            <Text
              style={[
                styles.sectionLabel,
                { color: colors.textSecondary, marginTop: 8 },
              ]}
            >
              {hasSubItems ? 'Category (all items)' : 'Category'}
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

            {/* Live Budget Warning / Status Indicator */}
            {budgetStatus && budgetStatus.hasBudget && (
              <View
                style={[
                  styles.budgetBanner,
                  {
                    backgroundColor: budgetStatus.isExceeded
                      ? colors.dangerBg
                      : budgetStatus.isWarning
                        ? colors.inputFill
                        : colors.inputFill,
                    borderColor: budgetStatus.isExceeded
                      ? colors.danger
                      : budgetStatus.isWarning
                        ? '#F59E0B'
                        : colors.primary,
                  },
                ]}
              >
                <Ionicons
                  name={
                    budgetStatus.isExceeded
                      ? 'alert-circle'
                      : budgetStatus.isWarning
                        ? 'warning'
                        : 'pie-chart'
                  }
                  size={20}
                  color={
                    budgetStatus.isExceeded
                      ? colors.danger
                      : budgetStatus.isWarning
                        ? '#F59E0B'
                        : colors.primary
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.budgetBannerTitle,
                      {
                        color: budgetStatus.isExceeded
                          ? colors.danger
                          : budgetStatus.isWarning
                            ? '#F59E0B'
                            : colors.textPrimary,
                      },
                    ]}
                  >
                    {budgetStatus.isExceeded
                      ? `Budget Exceeded (${Math.round(budgetStatus.percentage * 100)}%)`
                      : budgetStatus.isWarning
                        ? `Budget Warning (${Math.round(budgetStatus.percentage * 100)}%)`
                        : `Monthly Budget (${Math.round(budgetStatus.percentage * 100)}%)`}
                  </Text>
                  <Text style={[styles.budgetBannerSub, { color: colors.textSecondary }]}>
                    {budgetStatus.projectedSpent.toLocaleString(undefined, { maximumFractionDigits: 1 })} / {budgetStatus.budgetLimit.toLocaleString(undefined, { maximumFractionDigits: 1 })} EGP
                    {budgetStatus.isExceeded
                      ? ` · Over by ${(budgetStatus.projectedSpent - budgetStatus.budgetLimit).toLocaleString(undefined, { maximumFractionDigits: 1 })} EGP`
                      : ` · ${(budgetStatus.budgetLimit - budgetStatus.projectedSpent).toLocaleString(undefined, { maximumFractionDigits: 1 })} EGP left`}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

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
          style={{ textAlignVertical: 'top', textAlign: 'auto', minHeight: 64 }}
        />

        {editExpense ? null : (
          <DateTimeInput
            date={date}
            onChange={setDate}
            useCustomDate={useCustomDate}
            onUseCustomDateChange={setUseCustomDate}
          />
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

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
          label={editExpense ? 'Update Expense' : 'Save Expense'}
          onPress={save}
          loading={loading}
        />
      </View>

      <Modal
        visible={pickerItemId !== null}
        transparent
        animationType='slide'
        onRequestClose={() => setPickerItemId(null)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setPickerItemId(null)}
        >
          <Pressable
            style={[
              styles.sheetContainer,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
            onPress={() => {}}
          >
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.border }]}
            />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                Select Item Category
              </Text>
              <TouchableOpacity
                onPress={() => setPickerItemId(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole='button'
                accessibilityLabel='Close category picker'
              >
                <Ionicons name='close' size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={styles.sheetGrid}
              showsVerticalScrollIndicator={false}
            >
              {categories.map((cat) => {
                const activeItem = subItems.find(
                  (s) => s.localId === pickerItemId,
                );
                const isSelected = activeItem?.categoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: isSelected
                          ? cat.color
                          : colors.inputFill,
                        borderColor: isSelected ? cat.color : colors.border,
                      },
                    ]}
                    onPress={() => {
                      if (pickerItemId) {
                        updateSubItemCategory(pickerItemId, cat.id);
                      }
                    }}
                    accessibilityRole='button'
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={styles.pillEmoji}>{cat.emoji}</Text>
                    <Text
                      style={[
                        styles.pillLabel,
                        { color: isSelected ? '#fff' : colors.textPrimary },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20 },
  pinnedFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  totalSection: {},
  totalBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  totalValue: { fontSize: 26, fontWeight: '800' },
  totalHint: {
    fontSize: 12,
    textAlign: 'center',
    paddingTop: 4,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
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
  subItemErrorRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  subItemError: { fontSize: 12 },
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
  modeToggleRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  modeOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  modeOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 34,
  },
  itemCatEmoji: { fontSize: 14 },
  itemCatLabel: { fontSize: 13, fontWeight: '600', maxWidth: 160 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '65%',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 12,
  },
  budgetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  budgetBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  budgetBannerSub: {
    fontSize: 12,
    fontWeight: '500',
  },
});
