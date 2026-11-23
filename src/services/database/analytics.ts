import { getDb } from './client';
import { getMonthDateRange, tzMonthKey } from './helpers';
import { Expense } from '@/types';
import {
  DailyExpenseItem,
  DailySpendingSummary,
  QuickInsightsData,
  SpendingCategoryItem,
  TRANSFER_FEE_CATEGORY,
} from '@/services/reportUtils';

const TRANSFER_FEE_CATEGORY_NAME = 'Transfer Fee';

/**
 * Computes category spending breakdown directly inside SQLite.
 * Returns aggregated category summaries with percentage of total spending.
 */
export async function getCategorySpendingSql(monthKey?: string): Promise<SpendingCategoryItem[]> {
  const db = await getDb();
  const isAllTime = !monthKey || monthKey === 'ALL';
  const { startIso, endIso } = !isAllTime ? getMonthDateRange(monthKey) : { startIso: '', endIso: '' };

  const txWhere = isAllTime
    ? "t.type = 'EXPENSE' AND t.deletedAt IS NULL"
    : "t.type = 'EXPENSE' AND t.deletedAt IS NULL AND t.transactionDate >= ? AND t.transactionDate < ?";
  const txParams = isAllTime ? [] : [startIso, endIso];

  const catRows = await db.getAllAsync<{
    category: string;
    categoryEmoji: string;
    categoryColor: string;
    total: number;
  }>(
    `SELECT
       c.name AS category,
       c.icon AS categoryEmoji,
       c.color AS categoryColor,
       COALESCE(SUM(t.amountMinor), 0) / 100.0 AS total
     FROM transactions t
     JOIN categories c ON c.id = t.categoryId
     WHERE ${txWhere}
     GROUP BY c.id
     HAVING total > 0
     ORDER BY total DESC`,
    txParams,
  );

  // Check transfer fees for the same period
  const feeWhere = isAllTime
    ? 'deletedAt IS NULL AND feeAmountMinor > 0'
    : 'deletedAt IS NULL AND feeAmountMinor > 0 AND transferDate >= ? AND transferDate < ?';
  const feeParams = isAllTime ? [] : [startIso, endIso];

  const feeRow = await db.getFirstAsync<{ feeTotal: number }>(
    `SELECT COALESCE(SUM(feeAmountMinor), 0) / 100.0 AS feeTotal FROM transfers WHERE ${feeWhere}`,
    feeParams,
  );

  const feeTotal = feeRow?.feeTotal ?? 0;
  const items: SpendingCategoryItem[] = catRows.map((r) => ({
    category: r.category,
    total: r.total,
    percentage: 0,
    categoryEmoji: r.categoryEmoji ?? '📦',
    categoryColor: r.categoryColor ?? '#408A71',
  }));

  if (feeTotal > 0) {
    items.push({
      category: TRANSFER_FEE_CATEGORY_NAME,
      total: feeTotal,
      percentage: 0,
      categoryEmoji: TRANSFER_FEE_CATEGORY.emoji,
      categoryColor: TRANSFER_FEE_CATEGORY.color,
    });
  }

  items.sort((a, b) => b.total - a.total);
  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  if (grandTotal > 0) {
    for (const item of items) {
      item.percentage = item.total / grandTotal;
    }
  }

  return items;
}

/**
 * Computes daily spending summary directly inside SQLite.
 */
export async function getDailySpendingSummarySql(monthKey?: string): Promise<DailySpendingSummary> {
  const db = await getDb();
  const isAllTime = !monthKey || monthKey === 'ALL';
  const { startIso, endIso } = !isAllTime ? getMonthDateRange(monthKey) : { startIso: '', endIso: '' };

  const txWhere = isAllTime
    ? "t.type = 'EXPENSE' AND t.deletedAt IS NULL"
    : "t.type = 'EXPENSE' AND t.deletedAt IS NULL AND t.transactionDate >= ? AND t.transactionDate < ?";
  const txParams = isAllTime ? [] : [startIso, endIso];

  const dailyTxRows = await db.getAllAsync<{ dateKey: string; total: number; count: number }>(
    `SELECT
       date(t.transactionDate) AS dateKey,
       COALESCE(SUM(t.amountMinor), 0) / 100.0 AS total,
       COUNT(t.id) AS count
     FROM transactions t
     WHERE ${txWhere}
     GROUP BY date(t.transactionDate)`,
    txParams,
  );

  const feeWhere = isAllTime
    ? 'deletedAt IS NULL AND feeAmountMinor > 0'
    : 'deletedAt IS NULL AND feeAmountMinor > 0 AND transferDate >= ? AND transferDate < ?';
  const feeParams = isAllTime ? [] : [startIso, endIso];

  const dailyFeeRows = await db.getAllAsync<{ dateKey: string; total: number; count: number }>(
    `SELECT
       date(transferDate) AS dateKey,
       COALESCE(SUM(feeAmountMinor), 0) / 100.0 AS total,
       COUNT(id) AS count
     FROM transfers
     WHERE ${feeWhere}
     GROUP BY date(transferDate)`,
    feeParams,
  );

  const byDate = new Map<string, { total: number; count: number }>();
  for (const r of dailyTxRows) {
    byDate.set(r.dateKey, { total: r.total, count: r.count });
  }
  for (const r of dailyFeeRows) {
    const existing = byDate.get(r.dateKey) ?? { total: 0, count: 0 };
    byDate.set(r.dateKey, { total: existing.total + r.total, count: existing.count + r.count });
  }

  const allDays: DailyExpenseItem[] = Array.from(byDate.entries())
    .map(([dateKey, val]) => ({ dateKey, total: val.total, count: val.count }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const totalSpent = allDays.reduce((sum, d) => sum + d.total, 0);
  const averageDailySpend = allDays.length > 0 ? totalSpent / allDays.length : 0;
  const sortedByAmount = [...allDays].sort((a, b) => b.total - a.total);
  const highestDay = sortedByAmount[0] ?? null;
  const maxTotal = highestDay?.total ?? 0;
  const topDays = sortedByAmount.slice(0, 5);

  return {
    highestDay,
    averageDailySpend,
    topDays,
    allDays,
    maxTotal,
    totalSpent,
  };
}

/**
 * Computes high-level KPI insights directly inside SQLite.
 */
export async function getQuickInsightsSql(monthKey?: string): Promise<QuickInsightsData> {
  const db = await getDb();
  const isAllTime = !monthKey || monthKey === 'ALL';
  const { startIso, endIso } = !isAllTime ? getMonthDateRange(monthKey) : { startIso: '', endIso: '' };

  const txWhere = isAllTime
    ? 't.deletedAt IS NULL'
    : 't.deletedAt IS NULL AND t.transactionDate >= ? AND t.transactionDate < ?';
  const txParams = isAllTime ? [] : [startIso, endIso];

  const stats = await db.getFirstAsync<{
    txCount: number;
    avgExpense: number;
    maxExpense: number;
  }>(
    `SELECT
       COUNT(t.id) AS txCount,
       COALESCE(AVG(CASE WHEN t.type = 'EXPENSE' THEN t.amountMinor ELSE NULL END), 0) / 100.0 AS avgExpense,
       COALESCE(MAX(CASE WHEN t.type = 'EXPENSE' THEN t.amountMinor ELSE 0 END), 0) / 100.0 AS maxExpense
     FROM transactions t
     WHERE ${txWhere}`,
    txParams,
  );

  // Top category
  const topCatWhere = isAllTime
    ? "t.type = 'EXPENSE' AND t.deletedAt IS NULL"
    : "t.type = 'EXPENSE' AND t.deletedAt IS NULL AND t.transactionDate >= ? AND t.transactionDate < ?";
  const topCat = await db.getFirstAsync<{ name: string; total: number }>(
    `SELECT c.name, COALESCE(SUM(t.amountMinor), 0) / 100.0 AS total
     FROM transactions t
     JOIN categories c ON c.id = t.categoryId
     WHERE ${topCatWhere}
     GROUP BY c.id
     ORDER BY total DESC
     LIMIT 1`,
    txParams,
  );

  const feeWhere = isAllTime
    ? 'deletedAt IS NULL AND feeAmountMinor > 0'
    : 'deletedAt IS NULL AND feeAmountMinor > 0 AND transferDate >= ? AND transferDate < ?';
  const feeParams = isAllTime ? [] : [startIso, endIso];

  const feeStats = await db.getFirstAsync<{ feeCount: number; maxFee: number; feeTotal: number }>(
    `SELECT
       COUNT(id) AS feeCount,
       COALESCE(MAX(feeAmountMinor), 0) / 100.0 AS maxFee,
       COALESCE(SUM(feeAmountMinor), 0) / 100.0 AS feeTotal
     FROM transfers
     WHERE ${feeWhere}`,
    feeParams,
  );

  const feeTotal = feeStats?.feeTotal ?? 0;
  const topCatTotal = topCat?.total ?? 0;
  let topCategoryName: string | null = null;
  if (topCatTotal > 0 || feeTotal > 0) {
    topCategoryName = feeTotal > topCatTotal ? TRANSFER_FEE_CATEGORY_NAME : (topCat?.name ?? null);
  }

  const txCount = (stats?.txCount ?? 0) + (feeStats?.feeCount ?? 0);
  const maxExpense = Math.max(stats?.maxExpense ?? 0, feeStats?.maxFee ?? 0);

  return {
    transactionCount: txCount,
    averageExpense: stats?.avgExpense ?? 0,
    topCategory: topCategoryName,
    biggestExpense: maxExpense,
  };
}

/**
 * Fetches the top biggest expenses using indexed ORDER BY.
 */
export async function getTopExpensesSql(monthKey?: string, limit: number = 5): Promise<Expense[]> {
  const db = await getDb();
  const isAllTime = !monthKey || monthKey === 'ALL';
  const { startIso, endIso } = !isAllTime ? getMonthDateRange(monthKey) : { startIso: '', endIso: '' };

  const txWhere = isAllTime
    ? "t.type = 'EXPENSE' AND t.deletedAt IS NULL"
    : "t.type = 'EXPENSE' AND t.deletedAt IS NULL AND t.transactionDate >= ? AND t.transactionDate < ?";
  const txParams = isAllTime ? [limit] : [startIso, endIso, limit];

  const rows = await db.getAllAsync<{
    id: number;
    price: number;
    category: string;
    note: string | null;
    createdAt: string;
    monthKey: string;
    accountId: number | null;
  }>(
    `SELECT
       t.id,
       t.amountMinor / 100.0 AS price,
       c.name AS category,
       t.note,
       t.transactionDate AS createdAt,
       ${tzMonthKey('t.transactionDate')} AS monthKey,
       t.accountId
     FROM transactions t
     JOIN categories c ON c.id = t.categoryId
     WHERE ${txWhere}
     ORDER BY t.amountMinor DESC, t.id DESC
     LIMIT ?`,
    txParams,
  );

  return rows.map((r) => ({
    id: r.id,
    price: r.price,
    category: r.category,
    note: r.note,
    createdAt: r.createdAt,
    monthKey: r.monthKey,
    accountId: r.accountId,
    subExpenses: [],
  }));
}
