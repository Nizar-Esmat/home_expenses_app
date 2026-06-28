import React, { useCallback, useMemo, useState, useRef, useDeferredValue } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
} from 'react-native';
import TransactionsSkeleton from '@/components/skeletons/TransactionsSkeleton';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import {
  getTransactions,
  getSettings,
  deleteExpense,
  deleteIncome,
  deleteTransfer,
  getAvailableMonthKeys,
  getCategories,
  getActiveAccounts,
  categoryInternals,
} from '@/services/database';
import {
  monthKeyToLabel,
  currentMonthKey,
  formatCurrency,
} from '@/services/constants';
import { HomeTransaction, Settings, Category, Account } from '@/types';
import TransactionRow from '@/components/TransactionRow';
import { useAppDialog } from '@/components/AppDialog';

const ALL_MONTHS_KEY = 'ALL';
const BATCH_SIZE = 50;

type TypeFilter = 'all' | 'income' | 'expense' | 'transfer';
type SortField = 'date' | 'amount' | 'category' | 'account';
type SortOrder = 'asc' | 'desc';

interface FilterState {
  selectedCategories: Set<string>;
  selectedAccounts: Set<number>;
  dateFrom: string | null;
  dateTo: string | null;
  amountMin: number | null;
  amountMax: number | null;
  sortField: SortField;
  sortOrder: SortOrder;
}

const initialFilterState: FilterState = {
  selectedCategories: new Set(),
  selectedAccounts: new Set(),
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
  sortField: 'date',
  sortOrder: 'desc',
};

function getSortLabel(field: SortField, order: SortOrder): string {
  if (field === 'date')
    return `Date · ${order === 'asc' ? 'Newest → Oldest' : 'Oldest → Newest'}`;
  if (field === 'amount')
    return `Amount · ${order === 'asc' ? 'High → Low' : 'Low → High'}`;
  return `${field.charAt(0).toUpperCase() + field.slice(1)} · ${order === 'asc' ? 'A → Z' : 'Z → A'}`;
}

function getSortSubtitle(field: SortField, order: SortOrder): string {
  if (field === 'date')
    return order === 'asc' ? 'Newest → Oldest' : 'Oldest → Newest';
  if (field === 'amount') return order === 'asc' ? 'High → Low' : 'Low → High';
  return order === 'asc' ? 'A → Z' : 'Z → A';
}

function getCategoryColor(type: string): string {
  if (type === 'CASH') return '#10B981';
  if (type === 'BANK') return '#3B82F6';
  if (type === 'EWALLET') return '#A855F7';
  return '#6B7280';
}

interface SortSectionProps {
  sortField: SortField;
  colors: any;
  onSortFieldChange: (field: SortField) => void;
}

const SortSection = React.memo(
  function SortSection({ sortField, colors, onSortFieldChange }: SortSectionProps) {
    return (
      <View style={styles.sheetSection}>
        <Text style={[styles.sheetSectionLabel, { color: colors.textPrimary }]}>
          Sort by
        </Text>
        <View style={styles.sortChipsRow}>
          {(['date', 'amount', 'category', 'account'] as SortField[]).map(
            (field) => (
              <TouchableOpacity
                key={field}
                style={[
                  styles.sortChip,
                  sortField === field && {
                    backgroundColor: colors.primary + '20',
                    borderColor: colors.primary,
                  },
                  { borderColor: colors.border },
                ]}
                onPress={() => onSortFieldChange(field)}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    {
                      color:
                        sortField === field
                          ? colors.primary
                          : colors.textPrimary,
                    },
                  ]}
                >
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </View>
      </View>
    );
  },
);

interface OrderSectionProps {
  sortField: SortField;
  sortOrder: SortOrder;
  colors: any;
  onSortOrderChange: (order: SortOrder) => void;
}

const OrderSection = React.memo(
  function OrderSection({ sortField, sortOrder, colors, onSortOrderChange }: OrderSectionProps) {
    return (
      <View style={styles.sheetSection}>
        <Text style={[styles.sheetSectionLabel, { color: colors.textPrimary }]}>
          Order
        </Text>
        {(['asc', 'desc'] as SortOrder[]).map((order) => (
          <TouchableOpacity
            key={order}
            style={[
              styles.orderRow,
              sortOrder === order && {
                backgroundColor: colors.inputFill,
              },
            ]}
            onPress={() => onSortOrderChange(order)}
          >
            <Ionicons
              name={order === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={18}
              color={colors.textSecondary}
              style={{ marginRight: 8 }}
            />
            <View style={styles.orderContent}>
              <Text style={[styles.orderTitle, { color: colors.textPrimary }]}>
                {order === 'asc' ? 'Ascending' : 'Descending'}
              </Text>
              <Text
                style={[styles.orderSubtitle, { color: colors.textSecondary }]}
              >
                {getSortSubtitle(sortField, order)}
              </Text>
            </View>
            {sortOrder === order && (
              <Ionicons name='checkmark' size={18} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  },
);

interface CategorySectionProps {
  allCategories: Category[];
  selectedCategories: Set<string>;
  colors: any;
  onToggleCategory: (catName: string) => void;
}

const areSetsEqual = <T,>(a: Set<T>, b: Set<T>): boolean => {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
};

const CategorySection = React.memo(
  function CategorySection({ allCategories, selectedCategories, colors, onToggleCategory }: CategorySectionProps) {
    return (
      <View style={styles.sheetSection}>
        <Text style={[styles.sheetSectionLabel, { color: colors.textPrimary }]}>
          Categories{' '}
          {selectedCategories.size > 0 && `(${selectedCategories.size})`}
        </Text>
        <View style={styles.categoryGrid}>
          {allCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategories.has(cat.name) && {
                  backgroundColor: colors.primary + '20',
                  borderColor: colors.primary,
                },
                { borderColor: colors.border },
              ]}
              onPress={() => onToggleCategory(cat.name)}
            >
              <View style={styles.categoryChipLeft}>
                <Ionicons
                  name={
                    selectedCategories.has(cat.name)
                      ? 'checkbox'
                      : 'square-outline'
                  }
                  size={16}
                  color={
                    selectedCategories.has(cat.name)
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Text style={{ fontSize: 16, marginLeft: 6 }}>{cat.emoji}</Text>
              </View>
              <Text
                style={[styles.categoryChipText, { color: colors.textPrimary }]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  },
  (prev, next) =>
    prev.allCategories === next.allCategories &&
    prev.onToggleCategory === next.onToggleCategory &&
    prev.colors === next.colors &&
    areSetsEqual(prev.selectedCategories, next.selectedCategories),
);

interface AccountSectionProps {
  allAccounts: Account[];
  selectedAccounts: Set<number>;
  colors: any;
  onToggleAccount: (accId: number) => void;
}

const AccountSection = React.memo(
  function AccountSection({ allAccounts, selectedAccounts, colors, onToggleAccount }: AccountSectionProps) {
    return (
      <View style={styles.sheetSection}>
        <Text style={[styles.sheetSectionLabel, { color: colors.textPrimary }]}>
          Accounts{' '}
          {selectedAccounts.size > 0 && `(${selectedAccounts.size})`}
        </Text>
        <View style={styles.accountRow}>
          {allAccounts.map((acc) => {
            const color = getCategoryColor(acc.type);
            return (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.accountChip,
                  selectedAccounts.has(acc.id) && {
                    backgroundColor: color + '20',
                    borderColor: color,
                  },
                  { borderColor: colors.border },
                ]}
                onPress={() => onToggleAccount(acc.id)}
              >
                <Ionicons
                  name={
                    selectedAccounts.has(acc.id)
                      ? 'checkbox'
                      : 'square-outline'
                  }
                  size={16}
                  color={
                    selectedAccounts.has(acc.id)
                      ? color
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[styles.accountChipText, { color: colors.textPrimary }]}
                >
                  {acc.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  },
  (prev, next) =>
    prev.allAccounts === next.allAccounts &&
    prev.onToggleAccount === next.onToggleAccount &&
    prev.colors === next.colors &&
    areSetsEqual(prev.selectedAccounts, next.selectedAccounts),
);

interface DateRangeSectionProps {
  dateFrom: string | null;
  dateTo: string | null;
  colors: any;
  onChange: (from: string | null, to: string | null) => void;
}

const DateRangeSection = React.memo(
  function DateRangeSection({ dateFrom, dateTo, colors, onChange }: DateRangeSectionProps) {
    return (
      <View style={styles.sheetSection}>
        <Text style={[styles.sheetSectionLabel, { color: colors.textPrimary }]}>
          Date range
        </Text>
        <View style={styles.rangeRow}>
          <View style={styles.rangeInput}>
            <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>
              From
            </Text>
            <TextInput
              style={[
                styles.dateInput,
                {
                  backgroundColor: colors.inputFill,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={dateFrom ?? ''}
              onChangeText={(text) => onChange(text || null, dateTo)}
              placeholder='YYYY-MM-DD'
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <Text style={[styles.rangeSeparator, { color: colors.textSecondary }]}>
            —
          </Text>
          <View style={styles.rangeInput}>
            <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>
              To
            </Text>
            <TextInput
              style={[
                styles.dateInput,
                {
                  backgroundColor: colors.inputFill,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={dateTo ?? ''}
              onChangeText={(text) => onChange(dateFrom, text || null)}
              placeholder='YYYY-MM-DD'
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
      </View>
    );
  },
);

interface AmountRangeSectionProps {
  amountMin: number | null;
  amountMax: number | null;
  colors: any;
  onChange: (min: number | null, max: number | null) => void;
}

const AmountRangeSection = React.memo(
  function AmountRangeSection({ amountMin, amountMax, colors, onChange }: AmountRangeSectionProps) {
    return (
      <View style={styles.sheetSection}>
        <Text style={[styles.sheetSectionLabel, { color: colors.textPrimary }]}>
          Amount range (EGP)
        </Text>
        <View style={styles.rangeRow}>
          <View style={styles.rangeInput}>
            <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>
              Minimum
            </Text>
            <TextInput
              style={[
                styles.amountInput,
                {
                  backgroundColor: colors.inputFill,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={amountMin?.toString() ?? ''}
              onChangeText={(text) => {
                const val = text === '' ? null : parseFloat(text);
                onChange(val, amountMax);
              }}
              placeholder='0'
              placeholderTextColor={colors.textSecondary}
              keyboardType='decimal-pad'
            />
          </View>
          <Text style={[styles.rangeSeparator, { color: colors.textSecondary }]}>
            —
          </Text>
          <View style={styles.rangeInput}>
            <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>
              Maximum
            </Text>
            <TextInput
              style={[
                styles.amountInput,
                {
                  backgroundColor: colors.inputFill,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={amountMax?.toString() ?? ''}
              onChangeText={(text) => {
                const val = text === '' ? null : parseFloat(text);
                onChange(amountMin, val);
              }}
              placeholder='999999'
              placeholderTextColor={colors.textSecondary}
              keyboardType='decimal-pad'
            />
          </View>
        </View>
      </View>
    );
  },
);

export default function AllTransactionsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { monthKey: routeMonthKey, typeFilter: routeTypeFilter } =
    useLocalSearchParams<{ monthKey?: string; typeFilter?: string }>();
  const { showDialog } = useAppDialog();

  const initialMonthKey = routeMonthKey
    ? routeMonthKey === 'all'
      ? ALL_MONTHS_KEY
      : routeMonthKey
    : currentMonthKey();

  const [selectedMonthKey, setSelectedMonthKey] =
    useState<string>(initialMonthKey);
  const [availableMonthKeys, setAvailableMonthKeys] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<HomeTransaction[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>(
    (routeTypeFilter as TypeFilter) || 'all',
  );
  const [search, setSearch] = useState('');
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [summaryOpen, setSummaryOpen] = useState(true);

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);

  const [activeFilters, setActiveFilters] = useState<FilterState>({
    ...initialFilterState,
  });
  const [tempFilters, setTempFilters] = useState<FilterState>({
    ...initialFilterState,
  });
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const deferredTempFilters = useDeferredValue(tempFilters);

  const sheetAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const isAllTime = selectedMonthKey === ALL_MONTHS_KEY;

  const load = useCallback(() => {
    setLoading(true);
    setError(false);

    Promise.all([
      getTransactions(isAllTime ? undefined : selectedMonthKey),
      getSettings(),
      getAvailableMonthKeys(),
      getCategories(),
      getActiveAccounts(),
      categoryInternals.getCategoriesByType('INCOME'),
    ])
      .then(([txs, sets, monthKeys, expenseCats, accs, incomeCats]) => {
        setTransactions(txs);
        setSettings(sets);
        const mergedMonths = Array.from(
          new Set([ALL_MONTHS_KEY, currentMonthKey(), ...monthKeys]),
        ).sort((a, b) => b.localeCompare(a));
        setAvailableMonthKeys(mergedMonths);
        setAllCategories([...expenseCats, ...incomeCats]);
        setAllAccounts(accs);
        setVisibleCount(BATCH_SIZE);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [isAllTime, selectedMonthKey]);

  useFocusEffect(load);

  const filtered = useMemo(() => {
    let result = transactions;

    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
    }

    const q = search.trim().toLowerCase();
    if (q.length > 0) {
      result = result.filter(
        (t) =>
          t.category.toLowerCase().includes(q) ||
          (t.note ?? '').toLowerCase().includes(q),
      );
    }

    if (activeFilters.selectedCategories.size > 0) {
      result = result.filter((t) =>
        activeFilters.selectedCategories.has(t.category),
      );
    }

    if (activeFilters.selectedAccounts.size > 0) {
      result = result.filter((t) => {
        if (t.type !== 'transfer') {
          return t.accountId === null || activeFilters.selectedAccounts.has(t.accountId);
        }
        return (
          (t.fromAccountId && activeFilters.selectedAccounts.has(t.fromAccountId)) ||
          (t.toAccountId && activeFilters.selectedAccounts.has(t.toAccountId)) ||
          (t.feeAccountId && activeFilters.selectedAccounts.has(t.feeAccountId))
        );
      });
    }

    if (activeFilters.dateFrom || activeFilters.dateTo) {
      result = result.filter((t) => {
        const txDate = new Date(t.createdAt);
        const from = activeFilters.dateFrom
          ? new Date(activeFilters.dateFrom)
          : null;
        const to = activeFilters.dateTo ? new Date(activeFilters.dateTo) : null;
        if (from && txDate < from) return false;
        if (to && txDate > to) return false;
        return true;
      });
    }

    if (activeFilters.amountMin !== null || activeFilters.amountMax !== null) {
      result = result.filter((t) => {
        const absAmount = Math.abs(t.amount);
        if (
          activeFilters.amountMin !== null &&
          absAmount < activeFilters.amountMin
        )
          return false;
        if (
          activeFilters.amountMax !== null &&
          absAmount > activeFilters.amountMax
        )
          return false;
        return true;
      });
    }

    const sorted = [...result];
    sorted.sort((a, b) => {
      const multiplier = activeFilters.sortOrder === 'desc' ? -1 : 1;
      if (activeFilters.sortField === 'date') {
        return (
          multiplier *
          (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      }
      if (activeFilters.sortField === 'amount') {
        return multiplier * (b.amount - a.amount);
      }
      if (activeFilters.sortField === 'category') {
        return multiplier * a.category.localeCompare(b.category);
      }
      if (activeFilters.sortField === 'account') {
        return multiplier * a.accountName.localeCompare(b.accountName);
      }
      return 0;
    });

    return sorted;
  }, [transactions, typeFilter, search, activeFilters]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const summaryStats = useMemo(() => {
    const income = filtered.filter((t) => t.type === 'income');
    const expenses = filtered.filter((t) => t.type === 'expense');
    const transfers = filtered.filter((t) => t.type === 'transfer');

    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

    const transfersWithFees = transfers.filter(
      (t) => t.feeAmount && t.feeAmount > 0,
    );
    const transferFeesTotal = transfersWithFees.reduce(
      (sum, t) => sum + (t.feeAmount ?? 0),
      0,
    );
    const transferFeesCount = transfersWithFees.length;

    return {
      totalIncome,
      totalExpenses: totalExpenses + transferFeesTotal,
      incomeCount: income.length,
      expenseCount: expenses.length + transferFeesCount,
    };
  }, [filtered]);

  const activeFilterGroupsCount = useMemo(() => {
    let count = 0;
    if (activeFilters.selectedCategories.size > 0) count++;
    if (activeFilters.selectedAccounts.size > 0) count++;
    if (activeFilters.dateFrom || activeFilters.dateTo) count++;
    if (activeFilters.amountMin !== null || activeFilters.amountMax !== null)
      count++;
    return count;
  }, [activeFilters]);

  const tempPreviewCount = useMemo(() => {
    let result = transactions;

    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
    }

    const q = search.trim().toLowerCase();
    if (q.length > 0) {
      result = result.filter(
        (t) =>
          t.category.toLowerCase().includes(q) ||
          (t.note ?? '').toLowerCase().includes(q),
      );
    }

    if (deferredTempFilters.selectedCategories.size > 0) {
      result = result.filter((t) =>
        deferredTempFilters.selectedCategories.has(t.category),
      );
    }

    if (deferredTempFilters.selectedAccounts.size > 0) {
      result = result.filter(
        (t) =>
          t.accountId === null || deferredTempFilters.selectedAccounts.has(t.accountId),
      );
    }

    if (deferredTempFilters.dateFrom || deferredTempFilters.dateTo) {
      result = result.filter((t) => {
        const txDate = new Date(t.createdAt);
        const from = deferredTempFilters.dateFrom
          ? new Date(deferredTempFilters.dateFrom)
          : null;
        const to = deferredTempFilters.dateTo ? new Date(deferredTempFilters.dateTo) : null;
        if (from && txDate < from) return false;
        if (to && txDate > to) return false;
        return true;
      });
    }

    if (deferredTempFilters.amountMin !== null || deferredTempFilters.amountMax !== null) {
      result = result.filter((t) => {
        const absAmount = Math.abs(t.amount);
        if (
          deferredTempFilters.amountMin !== null &&
          absAmount < deferredTempFilters.amountMin
        )
          return false;
        if (
          deferredTempFilters.amountMax !== null &&
          absAmount > deferredTempFilters.amountMax
        )
          return false;
        return true;
      });
    }

    return result.length;
  }, [transactions, typeFilter, search, deferredTempFilters]);

  const handleDelete = (tx: HomeTransaction) => {
    if (tx.type === 'expense') {
      deleteExpense(tx.id).then(load);
    } else if (tx.type === 'income') {
      deleteIncome(tx.id).then(load);
    } else if (tx.type === 'transfer') {
      deleteTransfer(tx.id).then(load);
    }
  };

  const handleDeleteConfirm = (tx: HomeTransaction) => {
    showDialog({
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction?',
      type: 'danger',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(tx),
        },
      ],
    });
  };

  const handleEdit = (tx: HomeTransaction) => {
    if (tx.type === 'expense') {
      router.push({
        pathname: '/add-expense',
        params: { expenseId: String(tx.id) },
      });
    } else if (tx.type === 'income') {
      router.push({
        pathname: '/add-income',
        params: { incomeId: String(tx.id) },
      });
    } else if (tx.type === 'transfer') {
      router.push({
        pathname: '/transfer',
        params: { transferId: String(tx.id) },
      });
    }
  };

  const resetTempFilters = () => {
    setTempFilters({ ...initialFilterState });
  };

  const applyFilters = () => {
    setActiveFilters({ ...tempFilters });
    setShowFilterSheet(false);
  };

  const handleSortFieldChange = useCallback((field: SortField) => {
    setTempFilters((prev) => ({ ...prev, sortField: field }));
  }, []);

  const handleSortOrderChange = useCallback((order: SortOrder) => {
    setTempFilters((prev) => ({ ...prev, sortOrder: order }));
  }, []);

  const handleToggleCategory = useCallback((catName: string) => {
    setTempFilters((prev) => {
      const newCats = new Set(prev.selectedCategories);
      if (newCats.has(catName)) newCats.delete(catName);
      else newCats.add(catName);
      return { ...prev, selectedCategories: newCats };
    });
  }, []);

  const handleToggleAccount = useCallback((accId: number) => {
    setTempFilters((prev) => {
      const newAccs = new Set(prev.selectedAccounts);
      if (newAccs.has(accId)) newAccs.delete(accId);
      else newAccs.add(accId);
      return { ...prev, selectedAccounts: newAccs };
    });
  }, []);

  const handleDateRangeChange = useCallback(
    (from: string | null, to: string | null) => {
      setTempFilters((prev) => ({ ...prev, dateFrom: from, dateTo: to }));
    },
    [],
  );

  const handleAmountRangeChange = useCallback(
    (min: number | null, max: number | null) => {
      setTempFilters((prev) => ({
        ...prev,
        amountMin: min,
        amountMax: max,
      }));
    },
    [],
  );

  const removeFilter = (
    type: 'category' | 'account',
    value: string | number,
  ) => {
    const newFilters = { ...activeFilters };
    if (type === 'category') {
      newFilters.selectedCategories = new Set(activeFilters.selectedCategories);
      newFilters.selectedCategories.delete(value as string);
    } else {
      newFilters.selectedAccounts = new Set(activeFilters.selectedAccounts);
      newFilters.selectedAccounts.delete(value as number);
    }
    setActiveFilters(newFilters);
  };

  const removeDateRange = () => {
    setActiveFilters({
      ...activeFilters,
      dateFrom: null,
      dateTo: null,
    });
  };

  const removeAmountRange = () => {
    setActiveFilters({
      ...activeFilters,
      amountMin: null,
      amountMax: null,
    });
  };

  const openFilterSheet = () => {
    setTempFilters({ ...activeFilters });
    sheetAnim.setValue(0);
    setShowFilterSheet(true);
    Animated.timing(sheetAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeFilterSheet = () => {
    setShowFilterSheet(false);
    sheetAnim.setValue(0);
  };

  const dismissSheetImmediate = () => {
    setShowFilterSheet(false);
    sheetAnim.setValue(0);
  };

  const dragHandlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          sheetAnim.setValue(Math.max(0, 1 - gs.dy / 300));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          dismissSheetImmediate();
        } else {
          Animated.spring(sheetAnim, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const scrollAreaPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => {
        return (
          gs.dy > 10 &&
          scrollY.current <= 0 &&
          Math.abs(gs.dy) > Math.abs(gs.dx)
        );
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0 && scrollY.current <= 0) {
          sheetAnim.setValue(Math.max(0, 1 - gs.dy / 300));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          dismissSheetImmediate();
        } else {
          Animated.spring(sheetAnim, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const periodLabel = isAllTime
    ? 'All Time'
    : monthKeyToLabel(selectedMonthKey);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <TransactionsSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name='alert-circle-outline' size={48} color='#EF4444' />
        <Text style={styles.errorTitle}>Couldn&apos;t load transactions</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={load}
          activeOpacity={0.8}
        >
          <Ionicons name='refresh' size={18} color='#F8FAFC' />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name='arrow-back' size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          Transactions
        </Text>
        <TouchableOpacity
          style={styles.periodPill}
          onPress={() => setShowMonthModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.periodPillText} numberOfLines={1}>
            {periodLabel}
          </Text>
          <Ionicons name='chevron-down' size={14} color='#9CA3AF' />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={({ nativeEvent }) => {
          const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
          const nearEnd =
            contentOffset.y + layoutMeasurement.height >=
            contentSize.height - 40;
          if (nearEnd && visibleCount < filtered.length) {
            setVisibleCount((c) => Math.min(c + BATCH_SIZE, filtered.length));
          }
        }}
      >
        <View
          style={[
            styles.summaryStrip,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={styles.summaryHeader}
            onPress={() => setSummaryOpen(!summaryOpen)}
          >
            <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
              Summary
            </Text>
            <Ionicons
              name={summaryOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {summaryOpen && (
            <View
              style={[styles.summaryContent, { borderColor: colors.border }]}
            >
              <View style={styles.summaryStat}>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Total Income
                </Text>
                <Text style={[styles.summaryAmount, { color: '#10B981' }]}>
                  {formatCurrency(summaryStats.totalIncome, settings?.currency)}
                </Text>
                <Text
                  style={[styles.summaryCount, { color: colors.textSecondary }]}
                >
                  {summaryStats.incomeCount} transaction
                  {summaryStats.incomeCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.summaryStat}>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Total Expenses
                </Text>
                <Text style={[styles.summaryAmount, { color: '#EF4444' }]}>
                  {formatCurrency(
                    summaryStats.totalExpenses,
                    settings?.currency,
                  )}
                </Text>
                <Text
                  style={[styles.summaryCount, { color: colors.textSecondary }]}
                >
                  {summaryStats.expenseCount} transaction
                  {summaryStats.expenseCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          )}
        </View>

        <TextInput
          style={[
            styles.search,
            {
              backgroundColor: colors.inputFill,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          value={search}
          onChangeText={setSearch}
          placeholder='Search category or note'
          placeholderTextColor={colors.textSecondary}
        />

        <View style={styles.filterRow}>
          {(['all', 'income', 'expense', 'transfer'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                {
                  borderColor: colors.border,
                  backgroundColor:
                    typeFilter === f ? colors.primary + '20' : colors.card,
                },
              ]}
              onPress={() => setTypeFilter(f)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      typeFilter === f ? colors.primary : colors.textSecondary,
                  },
                ]}
              >
                {f === 'all'
                  ? 'All'
                  : f === 'income'
                    ? 'Income'
                    : f === 'expense'
                      ? 'Expenses'
                      : 'Transfers'}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[
              styles.filtersBtn,
              activeFilterGroupsCount > 0
                ? {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  }
                : { borderColor: colors.border },
            ]}
            onPress={openFilterSheet}
            activeOpacity={0.8}
          >
            <Ionicons
              name='filter'
              size={14}
              color={
                activeFilterGroupsCount > 0 ? '#FFFFFF' : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.filtersBtnText,
                {
                  color:
                    activeFilterGroupsCount > 0
                      ? '#FFFFFF'
                      : colors.textSecondary,
                },
              ]}
            >
              Filters
            </Text>
            {activeFilterGroupsCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {Math.min(activeFilterGroupsCount, 4)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.sortRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sortRowText, { color: colors.textSecondary }]}>
            Sorted by{' '}
            {getSortLabel(activeFilters.sortField, activeFilters.sortOrder)}
          </Text>
        </View>

        {activeFilterGroupsCount > 0 && (
          <View style={styles.activeChipsRow}>
            {Array.from(activeFilters.selectedCategories).map((cat) => (
              <TouchableOpacity
                key={`cat-${cat}`}
                style={[
                  styles.activeChip,
                  {
                    backgroundColor: colors.inputFill,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => removeFilter('category', cat)}
              >
                <Text
                  style={[styles.activeChipText, { color: colors.textPrimary }]}
                >
                  {cat}
                </Text>
                <Ionicons name='close' size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
            {Array.from(activeFilters.selectedAccounts).map((accId) => {
              const acc = allAccounts.find((a) => a.id === accId);
              if (!acc) return null;
              return (
                <TouchableOpacity
                  key={`acc-${accId}`}
                  style={[
                    styles.activeChip,
                    {
                      backgroundColor: colors.inputFill,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => removeFilter('account', accId)}
                >
                  <Text
                    style={[
                      styles.activeChipText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {acc.name}
                  </Text>
                  <Ionicons
                    name='close'
                    size={14}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              );
            })}
            {(activeFilters.dateFrom || activeFilters.dateTo) && (
              <TouchableOpacity
                style={[
                  styles.activeChip,
                  {
                    backgroundColor: colors.inputFill,
                    borderColor: colors.border,
                  },
                ]}
                onPress={removeDateRange}
              >
                <Text
                  style={[styles.activeChipText, { color: colors.textPrimary }]}
                >
                  {activeFilters.dateFrom || '...'} →{' '}
                  {activeFilters.dateTo || '...'}
                </Text>
                <Ionicons name='close' size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            {(activeFilters.amountMin !== null ||
              activeFilters.amountMax !== null) && (
              <TouchableOpacity
                style={[
                  styles.activeChip,
                  {
                    backgroundColor: colors.inputFill,
                    borderColor: colors.border,
                  },
                ]}
                onPress={removeAmountRange}
              >
                <Text
                  style={[styles.activeChipText, { color: colors.textPrimary }]}
                >
                  {activeFilters.amountMin ?? '...'} –{' '}
                  {activeFilters.amountMax ?? '...'} EGP
                </Text>
                <Ionicons name='close' size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
          Showing {visible.length} of {filtered.length} transaction
          {filtered.length !== 1 ? 's' : ''}
        </Text>

        {visible.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No transactions match your filters.
          </Text>
        ) : (
          visible.map((tx, index) => (
            <TransactionRow
              key={`${tx.type}-${tx.id}`}
              tx={tx}
              currency={settings?.currency ?? 'EGP'}
              onEdit={() => handleEdit(tx)}
              onDelete={() => handleDeleteConfirm(tx)}
              showDivider={index < visible.length - 1}
            />
          ))
        )}

        {visibleCount < filtered.length && (
          <TouchableOpacity
            style={[styles.loadHint, { borderColor: colors.border }]}
            onPress={() =>
              setVisibleCount((c) => Math.min(c + BATCH_SIZE, filtered.length))
            }
          >
            <Text
              style={[styles.loadHintText, { color: colors.textSecondary }]}
            >
              Load more
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      <Modal
        visible={showMonthModal}
        transparent
        animationType='fade'
        onRequestClose={() => setShowMonthModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthModal(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Select Period
              </Text>
              <TouchableOpacity onPress={() => setShowMonthModal(false)}>
                <Ionicons name='close' size={22} color='#9CA3AF' />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableMonthKeys.map((key) => {
                const isSelected =
                  key === selectedMonthKey ||
                  (key === ALL_MONTHS_KEY && isAllTime);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.monthOption,
                      isSelected && {
                        backgroundColor: colors.inputFill,
                        borderColor: colors.primary,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => {
                      setSelectedMonthKey(key);
                      setShowMonthModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.monthOptionText,
                        { color: colors.textPrimary },
                        isSelected && { color: colors.primary },
                      ]}
                    >
                      {key === ALL_MONTHS_KEY
                        ? 'All Time'
                        : monthKeyToLabel(key)}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name='checkmark'
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showFilterSheet}
        transparent
        animationType='none'
        onRequestClose={closeFilterSheet}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeFilterSheet}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <View
              onStartShouldSetResponder={() => true}
              style={styles.sheetContainer}
            >
              <Animated.View
                style={[
                  styles.sheetContent,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    transform: [
                      {
                        translateY: sheetAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [300, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View {...dragHandlePanResponder.panHandlers}>
                  <View style={styles.dragHandlePill} />
                  <View style={styles.sheetHeader}>
                    <Text
                      style={[styles.sheetTitle, { color: colors.textPrimary }]}
                    >
                      Advanced Filters
                    </Text>
                    <TouchableOpacity onPress={resetTempFilters}>
                      <Text
                        style={[
                          styles.sheetReset,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Reset all
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View
                  {...scrollAreaPanResponder.panHandlers}
                  style={{ flex: 1 }}
                >
                  <ScrollView
                    ref={scrollViewRef}
                    showsVerticalScrollIndicator={false}
                    style={styles.sheetScroll}
                    onScroll={(event) => {
                      scrollY.current = event.nativeEvent.contentOffset.y;
                    }}
                    scrollEventThrottle={16}
                  >
                    <SortSection
                      sortField={tempFilters.sortField}
                      colors={colors}
                      onSortFieldChange={handleSortFieldChange}
                    />

                    <OrderSection
                      sortField={tempFilters.sortField}
                      sortOrder={tempFilters.sortOrder}
                      colors={colors}
                      onSortOrderChange={handleSortOrderChange}
                    />

                    <CategorySection
                      allCategories={allCategories}
                      selectedCategories={tempFilters.selectedCategories}
                      colors={colors}
                      onToggleCategory={handleToggleCategory}
                    />

                    <AccountSection
                      allAccounts={allAccounts}
                      selectedAccounts={tempFilters.selectedAccounts}
                      colors={colors}
                      onToggleAccount={handleToggleAccount}
                    />

                    <DateRangeSection
                      dateFrom={tempFilters.dateFrom}
                      dateTo={tempFilters.dateTo}
                      colors={colors}
                      onChange={handleDateRangeChange}
                    />

                    <AmountRangeSection
                      amountMin={tempFilters.amountMin}
                      amountMax={tempFilters.amountMax}
                      colors={colors}
                      onChange={handleAmountRangeChange}
                    />

                    <View style={{ height: 80 }} />
                  </ScrollView>
                </View>

                <View style={styles.sheetFooter}>
                  <TouchableOpacity
                    style={[
                      styles.applyBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={applyFilters}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.applyBtnText}>
                      Show {tempPreviewCount} transaction
                      {tempPreviewCount !== 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#263247',
    borderRadius: 12,
    marginTop: 4,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#1A2332',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#263247',
  },
  periodPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  content: { padding: 20 },
  search: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 12,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  filtersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginLeft: 'auto',
  },
  filtersBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  sortRowText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryStrip: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryContent: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  summaryStat: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 12,
    fontWeight: '400',
  },
  summaryDivider: {
    width: 1,
    marginHorizontal: 16,
  },
  resultCount: { fontSize: 12, marginBottom: 10 },
  emptyText: { textAlign: 'center', fontSize: 14, paddingVertical: 24 },
  loadHint: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  loadHintText: { fontSize: 12, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '70%',
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  monthOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 6,
  },
  monthOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 80,
    height: '85%',
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  dragHandlePill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6B7280',
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
    fontSize: 18,
    fontWeight: '700',
  },
  sheetReset: {
    fontSize: 14,
    fontWeight: '600',
  },
  sheetScroll: {
    maxHeight: '100%',
  },
  sheetSection: {
    marginBottom: 20,
  },
  sheetSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  sortChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 6,
  },
  orderContent: {
    flex: 1,
    marginLeft: 4,
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  orderSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  categoryChipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  accountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  accountChipText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rangeInput: {
    flex: 1,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  dateInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  amountInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  rangeSeparator: {
    fontSize: 16,
    fontWeight: '600',
  },
  sheetFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  applyBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
