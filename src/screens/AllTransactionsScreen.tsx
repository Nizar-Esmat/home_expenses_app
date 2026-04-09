import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import {
  getAllExpenses,
  getAllIncomes,
  getExpensesByMonth,
  getIncomesByMonth,
  getSettings,
  getCategories,
  getIncomeCategories,
  deleteExpense,
  deleteIncome,
} from '@/services/database';
import { monthKeyToLabel } from '@/services/constants';
import { Category, Expense, Income, IncomeCategory, Settings } from '@/types';
import ExpenseTile from '@/components/ExpenseTile';
import IncomeTile from '@/components/IncomeTile';
import {
  mergeTransactions,
  filterAndSortTransactions,
  TransactionSort,
  TxItem,
} from '@/services/reportUtils';

const ALL_MONTHS_KEY = 'all';
const BATCH_SIZE = 50;

export default function AllTransactionsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { monthKey } = useLocalSearchParams<{ monthKey: string }>();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [incomeCategoryMap, setIncomeCategoryMap] = useState<Record<string, IncomeCategory>>({});
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<TransactionSort>('date_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  const isAllTime = monthKey === ALL_MONTHS_KEY;

  const load = useCallback(() => {
    if (!monthKey) return;
    setLoading(true);

    const expensePromise = isAllTime ? getAllExpenses() : getExpensesByMonth(monthKey);
    const incomePromise = isAllTime ? getAllIncomes() : getIncomesByMonth(monthKey);

    Promise.all([
      expensePromise,
      incomePromise,
      getSettings(),
      getCategories(),
      getIncomeCategories(),
    ]).then(([exps, incs, sets, cats, incomeCats]) => {
      setExpenses(exps);
      setIncomes(incs);
      setSettings(sets);
      const map: Record<string, Category> = {};
      cats.forEach((c) => (map[c.name] = c));
      setCategoryMap(map);
      const incMap: Record<string, IncomeCategory> = {};
      incomeCats.forEach((c) => (incMap[c.name] = c));
      setIncomeCategoryMap(incMap);
      setVisibleCount(BATCH_SIZE);
      setLoading(false);
    });
  }, [isAllTime, monthKey]);

  useFocusEffect(load);

  const allTransactions = useMemo(() => mergeTransactions(expenses, incomes), [expenses, incomes]);

  const filtered = useMemo(
    () => filterAndSortTransactions(allTransactions, typeFilter, search, sortBy),
    [allTransactions, typeFilter, search, sortBy],
  );

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const handleDeleteExpense = (id: number) => {
    deleteExpense(id).then(load);
  };

  const handleDeleteIncome = (id: number) => {
    deleteIncome(id).then(load);
  };

  const renderTx = (tx: TxItem) => {
    if (tx.type === 'expense' && tx.expense) {
      return (
        <ExpenseTile
          key={`expense-${tx.id}`}
          expense={tx.expense}
          currency={settings?.currency ?? 'EGP'}
          categoryEmoji={categoryMap[tx.category]?.emoji ?? '📦'}
          categoryColor={categoryMap[tx.category]?.color ?? '#408A71'}
          onEdit={() => router.push({ pathname: '/add-expense', params: { expenseId: String(tx.id) } })}
          onDelete={() => handleDeleteExpense(tx.id)}
        />
      );
    }

    if (tx.type === 'income' && tx.income) {
      return (
        <IncomeTile
          key={`income-${tx.id}`}
          income={tx.income}
          currency={settings?.currency ?? 'EGP'}
          category={incomeCategoryMap[tx.category]}
          onDelete={() => handleDeleteIncome(tx.id)}
        />
      );
    }

    return null;
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}> 
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const title = isAllTime ? 'All Transactions' : `${monthKeyToLabel(monthKey ?? '')} Transactions`;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={({ nativeEvent }) => {
          const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
          const nearEnd = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
          if (nearEnd && visibleCount < filtered.length) {
            setVisibleCount((c) => Math.min(c + BATCH_SIZE, filtered.length));
          }
        }}
      >
        <TextInput
          style={[
            styles.search,
            { backgroundColor: colors.inputFill, borderColor: colors.border, color: colors.textPrimary },
          ]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search category or note"
          placeholderTextColor={colors.textSecondary}
        />

        <View style={styles.filterRow}>
          {(['all', 'expense', 'income'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                { borderColor: colors.border, backgroundColor: typeFilter === f ? colors.primary + '20' : colors.card },
              ]}
              onPress={() => setTypeFilter(f)}
            >
              <Text style={[styles.filterChipText, { color: typeFilter === f ? colors.primary : colors.textSecondary }]}> 
                {f === 'all' ? 'All' : f === 'expense' ? 'Expenses' : 'Income'}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.sortWrap}>
            <TouchableOpacity
              style={[styles.sortBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setShowSortMenu((s) => !s)}
            >
              <Ionicons name="swap-vertical-outline" size={15} color={colors.textSecondary} />
              <Text style={[styles.sortBtnText, { color: colors.textSecondary }]}>Sort</Text>
            </TouchableOpacity>

            {showSortMenu && (
              <View style={[styles.sortMenu, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                {[
                  { key: 'date_desc', label: 'Date (newest)' },
                  { key: 'date_asc', label: 'Date (oldest)' },
                  { key: 'category_asc', label: 'Category' },
                  { key: 'amount_desc', label: 'Amount (high)' },
                  { key: 'amount_asc', label: 'Amount (low)' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.sortItem,
                      sortBy === opt.key && { backgroundColor: colors.inputFill },
                    ]}
                    onPress={() => {
                      setSortBy(opt.key as TransactionSort);
                      setShowSortMenu(false);
                    }}
                  >
                    <Text style={[styles.sortItemText, { color: colors.textPrimary }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.resultCount, { color: colors.textSecondary }]}> 
          Showing {visible.length} of {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </Text>

        {visible.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transactions match your filters.</Text>
        ) : (
          visible.map(renderTx)
        )}

        {visibleCount < filtered.length && (
          <TouchableOpacity
            style={[styles.loadHint, { borderColor: colors.border }]}
            onPress={() => setVisibleCount((c) => Math.min(c + BATCH_SIZE, filtered.length))}
          >
            <Text style={[styles.loadHintText, { color: colors.textSecondary }]}>Scroll to end or tap to load more</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center', marginHorizontal: 10 },
  content: { padding: 20 },
  search: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 12,
    fontSize: 14,
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  sortWrap: { marginLeft: 'auto', position: 'relative' },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  sortBtnText: { fontSize: 12, fontWeight: '600' },
  sortMenu: {
    position: 'absolute',
    top: 38,
    right: 0,
    width: 160,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
    zIndex: 20,
    elevation: 8,
  },
  sortItem: { paddingHorizontal: 10, paddingVertical: 9, borderRadius: 8, marginHorizontal: 6 },
  sortItemText: { fontSize: 13, fontWeight: '600' },
  resultCount: { fontSize: 12, marginBottom: 10 },
  emptyText: { textAlign: 'center', fontSize: 14, paddingVertical: 24 },
  loadHint: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  loadHintText: { fontSize: 12, fontWeight: '600' },
});
