import { getDb } from './client';
import { getMonthDateRange, tzMonthKey } from './helpers';
import { attachSubExpenses } from './expenses';
import { getExpenseTotalAll, getExpenseTotalByMonth } from './expenses';
import { Expense } from '@/types';
import { SPLIT_CATEGORY_NAME } from '@/services/constants';
import {
  DailyExpenseItem,
  DailySpendingSummary,
  QuickInsightsData,
  SpendingCategoryItem,
  TRANSFER_FEE_CATEGORY,
} from '@/services/reportUtils';

const TRANSFER_FEE_CATEGORY_NAME = 'Transfer Fee';

/**
 * Calculates the number of calendar days in a period.
 * For the current month: returns days elapsed so far (e.g. 25 if today is Nov 25).
 * For a past month: returns total days in that month (28, 29, 30, or 31).
 * For a future month: returns 1 to avoid division by zero.
 * For 'ALL': returns days between earliest recorded transaction date and today (or 1).
 */
export function getDaysInPeriod(monthKey?: string, earliestDateKey?: string): number {
  const now = new Date();
  if (!monthKey || monthKey === 'ALL') {
    if (!earliestDateKey) return 1;
    const earliest = new Date(earliestDateKey);
    if (isNaN(earliest.getTime())) return 1;
    const diffTime = Math.max(0, now.getTime() - earliest.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(diffDays, 1);
  }
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1 - 12
  if (isNaN(year) || isNaN(month)) return 1;

  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  if (isCurrentMonth) {
    return Math.max(now.getDate(), 1);
  }
  const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);
  if (isFuture) {
    return 1;
  }
  return new Date(year, month, 0).getDate();
}

function buildUnifiedCategoryCte(txWhere: string): string {
  return `
    WITH unified_expense_items AS (
      SELECT
        t.id AS txId,
        t.transactionDate,
        t.categoryId,
        t.amountMinor
      FROM transactions t
      WHERE ${txWhere}
        AND NOT EXISTS (SELECT 1 FROM transaction_items ti WHERE ti.transactionId = t.id)

      UNION ALL

      SELECT
        t.id AS txId,
        t.transactionDate,
        COALESCE(ti.categoryId, t.categoryId) AS categoryId,
        ti.amountMinor
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transactionId
      WHERE ${txWhere}
    )
  `;
}

function buildCategoryFilter(column: string, categoryIds?: number[]): { clause: string; params: number[] } {
  if (!categoryIds || categoryIds.length === 0) {
    return { clause: '', params: [] };
  }
  const placeholders = categoryIds.map(() => '?').join(', ');
  return {
    clause: `AND ${column} IN (${placeholders})`,
    params: [...categoryIds],
  };
}

/**
 * Computes category spending breakdown directly inside SQLite.
 * Splits multi-item transactions into their individual item categories without double counting.
 * Returns aggregated category summaries with percentage of total spending.
 */
export async function getCategorySpendingSql(
  monthKey?: string,
  categoryIds?: number[],
): Promise<SpendingCategoryItem[]> {
  const db = await getDb();
  const isAllTime = !monthKey || monthKey === 'ALL';
  const { startIso, endIso } = !isAllTime ? getMonthDateRange(monthKey) : { startIso: '', endIso: '' };

  const txWhere = isAllTime
    ? "t.type = 'EXPENSE' AND t.deletedAt IS NULL"
    : "t.type = 'EXPENSE' AND t.deletedAt IS NULL AND t.transactionDate >= ? AND t.transactionDate < ?";
  const txParams = isAllTime ? [] : [startIso, endIso, startIso, endIso];

  const hasCatFilter = Boolean(categoryIds && categoryIds.length > 0);
  const catFilter = buildCategoryFilter('c.id', categoryIds);

  const catRows = await db.getAllAsync<{
    category: string;
    categoryEmoji: string;
    categoryColor: string;
    total: number;
  }>(
    `${buildUnifiedCategoryCte(txWhere)}
     SELECT
       c.name AS category,
       c.icon AS categoryEmoji,
       c.color AS categoryColor,
       COALESCE(SUM(u.amountMinor), 0) / 100.0 AS total
     FROM unified_expense_items u
     JOIN categories c ON c.id = u.categoryId
     WHERE c.name != ? ${catFilter.clause}
     GROUP BY c.id
     HAVING total > 0
     ORDER BY total DESC`,
    [...txParams, SPLIT_CATEGORY_NAME, ...catFilter.params],
  );

  let feeTotal = 0;
  // Transfer fees are only included when no specific category filter is active
  if (!hasCatFilter) {
    const feeWhere = isAllTime
      ? 'deletedAt IS NULL AND feeAmountMinor > 0'
      : 'deletedAt IS NULL AND feeAmountMinor > 0 AND transferDate >= ? AND transferDate < ?';
    const feeParams = isAllTime ? [] : [startIso, endIso];

    const feeRow = await db.getFirstAsync<{ feeTotal: number }>(
      `SELECT COALESCE(SUM(feeAmountMinor), 0) / 100.0 AS feeTotal FROM transfers WHERE ${feeWhere}`,
      feeParams,
    );
    feeTotal = feeRow?.feeTotal ?? 0;
  }

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
 * Uses calendar days in the period for the true daily average spend (burn rate),
 * and supports filtering by selected category IDs.
 */
export async function getDailySpendingSummarySql(
  monthKey?: string,
  categoryIds?: number[],
): Promise<DailySpendingSummary> {
  const db = await getDb();
  const isAllTime = !monthKey || monthKey === 'ALL';
  const { startIso, endIso } = !isAllTime ? getMonthDateRange(monthKey) : { startIso: '', endIso: '' };

  const txWhere = isAllTime
    ? "t.type = 'EXPENSE' AND t.deletedAt IS NULL"
    : "t.type = 'EXPENSE' AND t.deletedAt IS NULL AND t.transactionDate >= ? AND t.transactionDate < ?";
  const txParams = isAllTime ? [] : [startIso, endIso, startIso, endIso];

  const hasCatFilter = Boolean(categoryIds && categoryIds.length > 0);
  const catFilter = buildCategoryFilter('u.categoryId', categoryIds);

  const dailyTxRows = await db.getAllAsync<{ dateKey: string; total: number; count: number }>(
    `${buildUnifiedCategoryCte(txWhere)}
     SELECT
       date(u.transactionDate) AS dateKey,
       COALESCE(SUM(u.amountMinor), 0) / 100.0 AS total,
       COUNT(DISTINCT u.txId) AS count
     FROM unified_expense_items u
     WHERE 1=1 ${catFilter.clause}
     GROUP BY date(u.transactionDate)`,
    [...txParams, ...catFilter.params],
  );

  const byDate = new Map<string, { total: number; count: number }>();
  for (const r of dailyTxRows) {
    byDate.set(r.dateKey, { total: r.total, count: r.count });
  }

  // Fees are only added when no category filter is applied
  if (!hasCatFilter) {
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

    for (const r of dailyFeeRows) {
      const existing = byDate.get(r.dateKey) ?? { total: 0, count: 0 };
      byDate.set(r.dateKey, { total: existing.total + r.total, count: existing.count + r.count });
    }
  }

  const allDays: DailyExpenseItem[] = Array.from(byDate.entries())
    .map(([dateKey, val]) => ({ dateKey, total: val.total, count: val.count }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const totalSpent = allDays.reduce((sum, d) => sum + d.total, 0);
  const earliestDateKey = allDays.length > 0 ? allDays[allDays.length - 1].dateKey : undefined;
  const daysInPeriod = getDaysInPeriod(monthKey, earliestDateKey);
  const averageDailySpend = daysInPeriod > 0 ? totalSpent / daysInPeriod : 0;

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
    daysInPeriod,
    activeSpendingDays: allDays.length,
  };
}

/**
 * Computes high-level KPI insights directly inside SQLite, optionally filtered by category.
 */
export async function getQuickInsightsSql(
  monthKey?: string,
  categoryIds?: number[],
): Promise<QuickInsightsData> {
  const db = await getDb();
  const isAllTime = !monthKey || monthKey === 'ALL';
  const { startIso, endIso } = !isAllTime ? getMonthDateRange(monthKey) : { startIso: '', endIso: '' };

  const txWhere = isAllTime
    ? "t.type = 'EXPENSE' AND t.deletedAt IS NULL"
    : "t.type = 'EXPENSE' AND t.deletedAt IS NULL AND t.transactionDate >= ? AND t.transactionDate < ?";
  const txParams = isAllTime ? [] : [startIso, endIso, startIso, endIso];

  const hasCatFilter = Boolean(categoryIds && categoryIds.length > 0);
  const catFilter = buildCategoryFilter('u.categoryId', categoryIds);

  const stats = await db.getFirstAsync<{
    txCount: number;
    avgExpense: number;
    maxExpense: number;
  }>(
    `${buildUnifiedCategoryCte(txWhere)}
     SELECT
       COUNT(DISTINCT u.txId) AS txCount,
       COALESCE(AVG(u.amountMinor), 0) / 100.0 AS avgExpense,
       COALESCE(MAX(u.amountMinor), 0) / 100.0 AS maxExpense
     FROM unified_expense_items u
     WHERE 1=1 ${catFilter.clause}`,
    [...txParams, ...catFilter.params],
  );

  // Top category
  const topCat = await db.getFirstAsync<{ name: string; total: number }>(
    `${buildUnifiedCategoryCte(txWhere)}
     SELECT c.name, COALESCE(SUM(u.amountMinor), 0) / 100.0 AS total
     FROM unified_expense_items u
     JOIN categories c ON c.id = u.categoryId
     WHERE c.name != ? ${catFilter.clause}
     GROUP BY c.id
     ORDER BY total DESC
     LIMIT 1`,
    [...txParams, SPLIT_CATEGORY_NAME, ...catFilter.params],
  );

  let feeCount = 0;
  let maxFee = 0;
  let feeTotal = 0;

  if (!hasCatFilter) {
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
    feeCount = feeStats?.feeCount ?? 0;
    maxFee = feeStats?.maxFee ?? 0;
    feeTotal = feeStats?.feeTotal ?? 0;
  }

  const topCatTotal = topCat?.total ?? 0;
  let topCategoryName: string | null = null;
  if (topCatTotal > 0 || feeTotal > 0) {
    topCategoryName = feeTotal > topCatTotal ? TRANSFER_FEE_CATEGORY_NAME : (topCat?.name ?? null);
  }

  const txCount = (stats?.txCount ?? 0) + feeCount;
  const maxExpense = Math.max(stats?.maxExpense ?? 0, maxFee);

  return {
    transactionCount: txCount,
    averageExpense: stats?.avgExpense ?? 0,
    topCategory: topCategoryName,
    biggestExpense: maxExpense,
  };
}

/**
 * Fetches the top biggest expenses using indexed ORDER BY, optionally filtered by category.
 */
export async function getTopExpensesSql(
  monthKey?: string,
  limit: number = 5,
  categoryIds?: number[],
): Promise<Expense[]> {
  const db = await getDb();
  const isAllTime = !monthKey || monthKey === 'ALL';
  const { startIso, endIso } = !isAllTime ? getMonthDateRange(monthKey) : { startIso: '', endIso: '' };

  const txWhere = isAllTime
    ? "t.type = 'EXPENSE' AND t.deletedAt IS NULL"
    : "t.type = 'EXPENSE' AND t.deletedAt IS NULL AND t.transactionDate >= ? AND t.transactionDate < ?";

  const hasCatFilter = Boolean(categoryIds && categoryIds.length > 0);
  const catPlaceholders = hasCatFilter ? categoryIds!.map(() => '?').join(', ') : '';

  const filterClause = hasCatFilter
    ? `AND (t.categoryId IN (${catPlaceholders}) OR EXISTS (
         SELECT 1 FROM transaction_items ti
         WHERE ti.transactionId = t.id AND ti.categoryId IN (${catPlaceholders})
       ))`
    : '';

  const queryParams = isAllTime
    ? (hasCatFilter ? [...categoryIds!, ...categoryIds!, limit] : [limit])
    : (hasCatFilter
        ? [startIso, endIso, ...categoryIds!, ...categoryIds!, limit]
        : [startIso, endIso, limit]);

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
     WHERE ${txWhere} ${filterClause}
     ORDER BY t.amountMinor DESC, t.id DESC
     LIMIT ?`,
    queryParams,
  );

  const expenses: Expense[] = rows.map((r) => ({
    id: r.id,
    price: r.price,
    category: r.category,
    note: r.note,
    createdAt: r.createdAt,
    monthKey: r.monthKey,
    accountId: r.accountId,
    subExpenses: [],
  }));
  await attachSubExpenses(expenses);
  return expenses;
}

/**
 * Computes total expense spent for a given month, optionally filtered by category.
 */
export async function getFilteredExpenseTotalSql(
  monthKey?: string,
  categoryIds?: number[],
): Promise<number> {
  const isAllTime = !monthKey || monthKey === 'ALL';
  const hasCatFilter = Boolean(categoryIds && categoryIds.length > 0);

  if (!hasCatFilter) {
    return isAllTime ? getExpenseTotalAll() : getExpenseTotalByMonth(monthKey!);
  }

  const db = await getDb();
  const { startIso, endIso } = !isAllTime ? getMonthDateRange(monthKey!) : { startIso: '', endIso: '' };

  const txWhere = isAllTime
    ? "t.type = 'EXPENSE' AND t.deletedAt IS NULL"
    : "t.type = 'EXPENSE' AND t.deletedAt IS NULL AND t.transactionDate >= ? AND t.transactionDate < ?";
  const txParams = isAllTime ? [] : [startIso, endIso, startIso, endIso];

  const catFilter = buildCategoryFilter('u.categoryId', categoryIds);
  const row = await db.getFirstAsync<{ total: number }>(
    `${buildUnifiedCategoryCte(txWhere)}
     SELECT COALESCE(SUM(u.amountMinor), 0) / 100.0 AS total
     FROM unified_expense_items u
     WHERE 1=1 ${catFilter.clause}`,
    [...txParams, ...catFilter.params],
  );

  return row?.total ?? 0;
}
