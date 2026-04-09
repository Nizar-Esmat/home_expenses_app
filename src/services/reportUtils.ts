import { Expense, Income, Category, IncomeCategory } from '@/types';

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

export type TransactionSort = 'date_desc' | 'date_asc' | 'category_asc' | 'amount_desc' | 'amount_asc';

export function mergeTransactions(expenses: Expense[], incomes: Income[]): TxItem[] {
  const expenseItems: TxItem[] = expenses.map((e) => ({
    id: e.id,
    type: 'expense',
    amount: e.price,
    category: e.category,
    note: e.note,
    createdAt: e.createdAt,
    monthKey: e.monthKey,
    expense: e,
  }));

  const incomeItems: TxItem[] = incomes.map((i) => ({
    id: i.id,
    type: 'income',
    amount: i.amount,
    category: i.category,
    note: i.note,
    createdAt: i.createdAt,
    monthKey: i.monthKey,
    income: i,
  }));

  return [...expenseItems, ...incomeItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function buildCategoryBreakdown(
  expenses: Expense[],
  incomes: Income[],
  expenseCategoryMap: Record<string, Category>,
  incomeCategoryMap: Record<string, IncomeCategory>,
): CategoryBreakdownItem[] {
  const expenseTotal = expenses.reduce((sum, e) => sum + e.price, 0);
  const incomeTotal = incomes.reduce((sum, i) => sum + i.amount, 0);

  const expenseByCategory: Record<string, number> = {};
  expenses.forEach((e) => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + e.price;
  });

  const incomeByCategory: Record<string, number> = {};
  incomes.forEach((i) => {
    incomeByCategory[i.category] = (incomeByCategory[i.category] ?? 0) + i.amount;
  });

  const expenseItems: CategoryBreakdownItem[] = Object.entries(expenseByCategory)
    .map(([category, total]) => ({
      key: `expense:${category}`,
      type: 'expense' as const,
      category,
      total,
      percentage: expenseTotal > 0 ? total / expenseTotal : 0,
      categoryEmoji: expenseCategoryMap[category]?.emoji ?? '📦',
      categoryColor: expenseCategoryMap[category]?.color ?? '#408A71',
      typeTotal: expenseTotal,
    }))
    .sort((a, b) => b.total - a.total);

  const incomeItems: CategoryBreakdownItem[] = Object.entries(incomeByCategory)
    .map(([category, total]) => ({
      key: `income:${category}`,
      type: 'income' as const,
      category,
      total,
      percentage: incomeTotal > 0 ? total / incomeTotal : 0,
      categoryEmoji: incomeCategoryMap[category]?.emoji ?? '💰',
      categoryColor: incomeCategoryMap[category]?.color ?? '#10B981',
      typeTotal: incomeTotal,
    }))
    .sort((a, b) => b.total - a.total);

  return [...expenseItems, ...incomeItems].sort((a, b) => b.total - a.total);
}

export function buildDailyExpenses(expenses: Expense[]): DailyExpenseItem[] {
  const byDate: Record<string, { total: number; count: number }> = {};

  expenses.forEach((e) => {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!byDate[key]) byDate[key] = { total: 0, count: 0 };
    byDate[key].total += e.price;
    byDate[key].count += 1;
  });

  return Object.entries(byDate)
    .map(([dateKey, value]) => ({
      dateKey,
      total: value.total,
      count: value.count,
    }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function getTopExpenses(expenses: Expense[], limit: number): Expense[] {
  return [...expenses].sort((a, b) => b.price - a.price).slice(0, limit);
}

export function filterAndSortTransactions(
  txs: TxItem[],
  typeFilter: 'all' | TxType,
  search: string,
  sortBy: TransactionSort,
): TxItem[] {
  const q = search.trim().toLowerCase();

  let filtered = txs;
  if (typeFilter !== 'all') {
    filtered = filtered.filter((t) => t.type === typeFilter);
  }

  if (q.length > 0) {
    filtered = filtered.filter((t) =>
      t.category.toLowerCase().includes(q) ||
      (t.note ?? '').toLowerCase().includes(q),
    );
  }

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
  return {
    data: items.slice(start, start + pageSize),
    totalPages,
  };
}
