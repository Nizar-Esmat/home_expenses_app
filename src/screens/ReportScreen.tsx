import React, { useCallback, useEffect, useState } from 'react';
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
  getExpensesByMonth,
  getIncomesByMonth,
  getSettings,
  deleteExpense,
  deleteIncome,
  getCategories,
  getIncomeCategories,
  getAllExpenses,
  getAllIncomes,
} from '@/services/database';
import { monthKeyToLabel, formatCurrency } from '@/services/constants';
import { Category, Expense, Income, IncomeCategory, Settings } from '@/types';
import ExpenseTile from '@/components/ExpenseTile';
import IncomeTile from '@/components/IncomeTile';
import CategoryBar from '@/components/CategoryBar';
import {
  buildCategoryBreakdown,
  buildDailyExpenses,
  filterAndSortTransactions,
  formatDayLabel,
  getTopExpenses,
  mergeTransactions,
  paginate,
  TransactionSort,
  TxItem,
} from '@/services/reportUtils';

const ALL_MONTHS_KEY = 'all';
const PAGE_SIZE = 10;

function getVisiblePages(totalPages: number, currentPage: number): number[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function ReportScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { monthKey } = useLocalSearchParams<{ monthKey: string }>();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [incomeCategoryMap, setIncomeCategoryMap] = useState<Record<string, IncomeCategory>>({});
  const [loading, setLoading] = useState(true);
  const isAllTime = monthKey === ALL_MONTHS_KEY;

  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<TransactionSort>('date_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [page, setPage] = useState(1);

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
      const incomeMap: Record<string, IncomeCategory> = {};
      incomeCats.forEach((c) => (incomeMap[c.name] = c));
      setIncomeCategoryMap(incomeMap);
      setLoading(false);
    });
  }, [isAllTime, monthKey]);

  useFocusEffect(load);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, search, sortBy, monthKey]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}> 
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const totalSpent = expenses.reduce((s, e) => s + e.price, 0);
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const available = totalIncome - totalSpent;
  const currency = settings?.currency ?? 'EGP';

  const categoryBreakdown = buildCategoryBreakdown(expenses, incomes, categoryMap, incomeCategoryMap);
  const biggestExpenses = getTopExpenses(expenses, 5);
  const dailyExpenses = buildDailyExpenses(expenses);

  const allTransactions = mergeTransactions(expenses, incomes);
  const filteredTransactions = filterAndSortTransactions(allTransactions, typeFilter, search, sortBy);
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const paged = paginate(filteredTransactions, currentPage, PAGE_SIZE);
  const pagedTransactions = paged.data;
  const visiblePages = getVisiblePages(totalPages, currentPage);

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
          currency={currency}
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
          currency={currency}
          category={incomeCategoryMap[tx.category]}
          onDelete={() => handleDeleteIncome(tx.id)}
        />
      );
    }

    return null;
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}> 
          {isAllTime ? 'All Time Report' : monthKeyToLabel(monthKey ?? '')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBox, { backgroundColor: colors.successBg }]}> 
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Income</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(totalIncome, currency)}
            </Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: colors.dangerBg }]}> 
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Spent</Text>
            <Text style={[styles.summaryValue, { color: colors.danger }]}>
              {formatCurrency(totalSpent, currency)}
            </Text>
          </View>
        </View>

        <View style={[styles.balanceCard, { backgroundColor: colors.card }]}> 
          <View style={styles.balanceHeader}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Net Available</Text>
            <Text style={styles.balanceEmoji}>{available >= 0 ? '💰' : '⚠️'}</Text>
          </View>
          <Text style={[styles.balanceValue, { color: colors.textPrimary }]}>
            {available >= 0 ? '' : '-'}{formatCurrency(Math.abs(available), currency)}
          </Text>
        </View>

        {categoryBreakdown.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>By Category</Text>
            {categoryBreakdown.map((c) => (
              <CategoryBar
                key={c.key}
                category={c.category}
                total={c.total}
                percentage={c.percentage}
                categoryEmoji={c.categoryEmoji}
                categoryColor={c.categoryColor}
                currency={currency}
                typeLabel={c.type === 'expense' ? 'Expense' : 'Income'}
                typeTotal={c.typeTotal}
              />
            ))}
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Biggest Expenses</Text>
        {biggestExpenses.length === 0 ? (
          <EmptyRow text="No expenses" />
        ) : (
          biggestExpenses.map((exp) => (
            <ExpenseTile
              key={`biggest-${exp.id}`}
              expense={exp}
              currency={currency}
              categoryEmoji={categoryMap[exp.category]?.emoji ?? '📦'}
              categoryColor={categoryMap[exp.category]?.color ?? '#408A71'}
              onEdit={() => router.push({ pathname: '/add-expense', params: { expenseId: String(exp.id) } })}
              onDelete={() => handleDeleteExpense(exp.id)}
            />
          ))
        )}

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Daily Expenses</Text>
        {dailyExpenses.length === 0 ? (
          <EmptyRow text="No daily expenses" />
        ) : (
          dailyExpenses.map((d) => (
            <View key={d.dateKey} style={[styles.dailyRow, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <View>
                <Text style={[styles.dailyDate, { color: colors.textPrimary }]}>{formatDayLabel(d.dateKey)}</Text>
                <Text style={[styles.dailyMeta, { color: colors.textSecondary }]}> 
                  {d.count} expense{d.count !== 1 ? 's' : ''}
                </Text>
              </View>
              <Text style={[styles.dailyAmount, { color: colors.danger }]}>-{formatCurrency(d.total, currency)}</Text>
            </View>
          ))
        )}

        <View style={styles.txHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Transactions</Text>
          <TouchableOpacity
            style={[styles.showAllBtn, { borderColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/all-transactions', params: { monthKey } })}
          >
            <Text style={[styles.showAllText, { color: colors.primary }]}>Show All</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.search, { backgroundColor: colors.inputFill, borderColor: colors.border, color: colors.textPrimary }]}
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
                    style={[styles.sortItem, sortBy === opt.key && { backgroundColor: colors.inputFill }]}
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
          Showing {pagedTransactions.length} of {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
        </Text>

        {pagedTransactions.length === 0 ? (
          <EmptyRow text="No transactions match your filters" />
        ) : (
          pagedTransactions.map(renderTx)
        )}

        {totalPages > 1 && (
          <View style={styles.paginationWrap}>
            <TouchableOpacity
              style={[styles.pageControl, { borderColor: colors.border, opacity: currentPage <= 1 ? 0.5 : 1 }]}
              disabled={currentPage <= 1}
              onPress={() => setPage(Math.max(1, currentPage - 1))}
            >
              <Text style={[styles.pageControlText, { color: colors.textSecondary }]}>Prev</Text>
            </TouchableOpacity>

            <View style={styles.pageNumbersRow}>
              {visiblePages.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.pageNumber,
                    {
                      borderColor: colors.border,
                      backgroundColor: p === currentPage ? colors.primary + '20' : colors.card,
                    },
                  ]}
                  onPress={() => setPage(p)}
                >
                  <Text style={[styles.pageNumberText, { color: p === currentPage ? colors.primary : colors.textSecondary }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.pageControl, { borderColor: colors.border, opacity: currentPage >= totalPages ? 0.5 : 1 }]}
              disabled={currentPage >= totalPages}
              onPress={() => setPage(Math.min(totalPages, currentPage + 1))}
            >
              <Text style={[styles.pageControlText, { color: colors.textSecondary }]}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function EmptyRow({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 12, fontSize: 14 }}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '700' },
  content: { padding: 20 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryBox: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  summaryLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '800' },
  balanceCard: { borderRadius: 16, padding: 18, marginBottom: 20 },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  balanceLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  balanceEmoji: { fontSize: 14, marginLeft: 6 },
  balanceValue: { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 4 },
  dailyRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyDate: { fontSize: 14, fontWeight: '700' },
  dailyMeta: { fontSize: 12, marginTop: 2 },
  dailyAmount: { fontSize: 14, fontWeight: '800' },
  txHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 10 },
  showAllBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  showAllText: { fontSize: 12, fontWeight: '700' },
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
  paginationWrap: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageControl: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pageControlText: { fontSize: 12, fontWeight: '600' },
  pageNumbersRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageNumber: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    minWidth: 34,
    alignItems: 'center',
  },
  pageNumberText: { fontSize: 12, fontWeight: '700' },
});
