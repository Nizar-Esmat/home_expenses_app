import { Expense, Income, Category, IncomeCategory } from '@/types';

export const TRANSFER_FEE_CATEGORY = {
  name: 'Transfer Fee',
  emoji: '💸',
  color: '#EF4444',
};

export type TxType = 'expense' | 'income';

export interface TxItem {
  id: number;
  type: TxType;
  amount: number;
  category: string;
  note: string | null;
  createdAt: string;
  monthKey: string;
  expense?: Expense;
  income?: Income;
}

export interface CategoryBreakdownItem {
  key: string;
  type: TxType;
  category: string;
  total: number;
  percentage: number;
  categoryEmoji: string;
  categoryColor: string;
  typeTotal: number;
}

export interface DailyExpenseItem {
  dateKey: string;
  total: number;
  count: number;
}

export interface DailySpendingSummary {
  highestDay: DailyExpenseItem | null;
  averageDailySpend: number;
  topDays: DailyExpenseItem[];
  allDays: DailyExpenseItem[];
  maxTotal: number;
  totalSpent: number;
}

export type TransactionSort = 'date_desc' | 'date_asc' | 'category_asc' | 'amount_desc' | 'amount_asc';

export function mergeTransactions(expenses: Expense[], incomes: Income[]): TxItem[] {
  const expenseItems: TxItem[] = expenses.map((e) => ({ id: e.id, type: 'expense', amount: e.price, category: e.category, note: e.note, createdAt: e.createdAt, monthKey: e.monthKey, expense: e }));
  const incomeItems: TxItem[] = incomes.map((i) => ({ id: i.id, type: 'income', amount: i.amount, category: i.category, note: i.note, createdAt: i.createdAt, monthKey: i.monthKey, income: i }));
  return [...expenseItems, ...incomeItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function buildCategoryBreakdown(expenses: Expense[], incomes: Income[], expenseCategoryMap: Record<string, Category>, incomeCategoryMap: Record<string, IncomeCategory>): CategoryBreakdownItem[] {
  const expenseTotal = expenses.reduce((sum, e) => sum + e.price, 0);
  const incomeTotal = incomes.reduce((sum, i) => sum + i.amount, 0);
  const expenseByCategory: Record<string, number> = {};
  expenses.forEach((e) => { expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + e.price; });
  const incomeByCategory: Record<string, number> = {};
  incomes.forEach((i) => { incomeByCategory[i.category] = (incomeByCategory[i.category] ?? 0) + i.amount; });

  const expenseItems: CategoryBreakdownItem[] = Object.entries(expenseByCategory).map(([category, total]) => ({ key: `expense:${category}`, type: 'expense' as const, category, total, percentage: expenseTotal > 0 ? total / expenseTotal : 0, categoryEmoji: expenseCategoryMap[category]?.emoji ?? '📦', categoryColor: expenseCategoryMap[category]?.color ?? '#408A71', typeTotal: expenseTotal })).sort((a, b) => b.total - a.total);
  const incomeItemsArr: CategoryBreakdownItem[] = Object.entries(incomeByCategory).map(([category, total]) => ({ key: `income:${category}`, type: 'income' as const, category, total, percentage: incomeTotal > 0 ? total / incomeTotal : 0, categoryEmoji: incomeCategoryMap[category]?.emoji ?? '💰', categoryColor: incomeCategoryMap[category]?.color ?? '#10B981', typeTotal: incomeTotal })).sort((a, b) => b.total - a.total);
  return [...expenseItems, ...incomeItemsArr].sort((a, b) => b.total - a.total);
}

export function buildDailyExpenses(expenses: Expense[], transferFees?: Expense[]): DailyExpenseItem[] {
  const byDate: Record<string, { total: number; count: number }> = {};
  const allExpenses = transferFees ? [...expenses, ...transferFees] : expenses;
  allExpenses.forEach((e) => {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!byDate[key]) byDate[key] = { total: 0, count: 0 };
    byDate[key].total += e.price;
    byDate[key].count += 1;
  });
  return Object.entries(byDate).map(([dateKey, value]) => ({ dateKey, total: value.total, count: value.count })).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function getTopExpenses(expenses: Expense[], limit: number, transferFees?: Expense[]): Expense[] {
  const allExpenses = transferFees ? [...expenses, ...transferFees] : expenses;
  return allExpenses.sort((a, b) => b.price - a.price).slice(0, limit);
}

export function filterAndSortTransactions(txs: TxItem[], typeFilter: 'all' | TxType, search: string, sortBy: TransactionSort): TxItem[] {
  const q = search.trim().toLowerCase();
  let filtered = txs;
  if (typeFilter !== 'all') filtered = filtered.filter((t) => t.type === typeFilter);
  if (q.length > 0) filtered = filtered.filter((t) => t.category.toLowerCase().includes(q) || (t.note ?? '').toLowerCase().includes(q));
  const sorted = [...filtered];
  sorted.sort((a, b) => {
    if (sortBy === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === 'category_asc') return a.category.localeCompare(b.category);
    if (sortBy === 'amount_desc') return b.amount - a.amount;
    return a.amount - b.amount;
  });
  return sorted;
}

export function paginate<T>(items: T[], page: number, pageSize: number): { data: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return { data: items.slice(start, start + pageSize), totalPages };
}

// ── NEW: Statistics page helpers ──────────────────────────────

export interface QuickInsightsData {
  transactionCount: number;
  averageExpense: number;
  topCategory: string | null;
  biggestExpense: number;
}

export function getQuickInsights(expenses: Expense[], incomes: Income[], transferFees?: Expense[]): QuickInsightsData {
  const allExpenses = transferFees ? [...expenses, ...transferFees] : expenses;
  const transactionCount = allExpenses.length + incomes.length;
  const averageExpense = allExpenses.length > 0 ? allExpenses.reduce((sum, e) => sum + e.price, 0) / allExpenses.length : 0;

  const expenseByCategory: Record<string, number> = {};
  allExpenses.forEach((e) => { expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + e.price; });
  const topCategory = Object.entries(expenseByCategory).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  const biggestExpense = allExpenses.length > 0 ? Math.max(...allExpenses.map((e) => e.price)) : 0;

  return { transactionCount, averageExpense, topCategory, biggestExpense };
}

export interface SpendingCategoryItem {
  category: string;
  total: number;
  percentage: number;
  categoryEmoji: string;
  categoryColor: string;
}

export function buildSpendingByCategory(
  expenses: Expense[],
  categoryMap: Record<string, Category>,
  transferFees?: Expense[],
): SpendingCategoryItem[] {
  const allExpenses = transferFees ? [...expenses, ...transferFees] : expenses;
  const total = allExpenses.reduce((sum, e) => sum + e.price, 0);
  const byCategory: Record<string, number> = {};
  allExpenses.forEach((e) => { byCategory[e.category] = (byCategory[e.category] ?? 0) + e.price; });

  return Object.entries(byCategory)
    .map(([category, catTotal]) => ({
      category,
      total: catTotal,
      percentage: total > 0 ? catTotal / total : 0,
      categoryEmoji: category === TRANSFER_FEE_CATEGORY.name
        ? TRANSFER_FEE_CATEGORY.emoji
        : (categoryMap[category]?.emoji ?? '📦'),
      categoryColor: category === TRANSFER_FEE_CATEGORY.name
        ? TRANSFER_FEE_CATEGORY.color
        : (categoryMap[category]?.color ?? '#408A71'),
    }))
    .sort((a, b) => b.total - a.total);
}

export function getDailySpending(expenses: Expense[], transferFees?: Expense[]): DailyExpenseItem[] {
  return buildDailyExpenses(expenses, transferFees);
}

export function getDailySpendingSummary(expenses: Expense[], transferFees?: Expense[]): DailySpendingSummary {
  const allDays = buildDailyExpenses(expenses, transferFees);
  const sortedByTotal = [...allDays].sort((a, b) => b.total - a.total);
  const highestDay = sortedByTotal.length > 0 ? sortedByTotal[0] : null;
  const totalSpent = allDays.reduce((sum, d) => sum + d.total, 0);
  const daysWithSpending = allDays.filter((d) => d.total > 0).length;
  const averageDailySpend = daysWithSpending > 0 ? totalSpent / daysWithSpending : 0;
  const topDays = sortedByTotal.slice(0, 5);
  const maxTotal = sortedByTotal.length > 0 ? sortedByTotal[0].total : 0;

  return { highestDay, averageDailySpend, topDays, allDays, maxTotal, totalSpent };
}