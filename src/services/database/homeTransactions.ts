import { HomeTransaction, SubExpense } from '@/types';
import { getDb } from './client';
import { tzMonthKey } from './helpers';

interface SubExpenseRow {
  id: number;
  transactionId: number;
  title: string;
  amount: number;
  sortOrder: number;
}

async function attachSubExpensesToHomeTransactions(
  txs: HomeTransaction[],
): Promise<void> {
  const expenseIds = txs.filter((t) => t.type === 'expense').map((t) => t.id);
  if (expenseIds.length === 0) return;

  const db = await getDb();
  const rows = await db.getAllAsync<SubExpenseRow>(
    `SELECT id, transactionId, name AS title, amountMinor / 100.0 AS amount, sortOrder
     FROM transaction_items
     WHERE transactionId IN (${expenseIds.map(() => '?').join(',')})
     ORDER BY transactionId ASC, sortOrder ASC`,
    expenseIds,
  );

  const byId = new Map<number, SubExpense[]>();
  for (const r of rows) {
    const list = byId.get(r.transactionId) ?? [];
    list.push({
      id: r.id,
      expenseId: r.transactionId,
      title: r.title,
      amount: r.amount,
      sortOrder: r.sortOrder,
    });
    byId.set(r.transactionId, list);
  }

  for (const tx of txs) {
    if (tx.type === 'expense' && byId.has(tx.id)) {
      tx.subExpenses = byId.get(tx.id)!;
    }
  }
}

export async function getRecentTransactions(
  monthKey?: string,
  limit: number = 5,
): Promise<HomeTransaction[]> {
  const db = await getDb();

  const hasMonthFilter = monthKey !== undefined && monthKey !== 'ALL';

  const sql = `
    SELECT id, type, category, emoji, amount, feeAmount, note, createdAt, accountId, fromAccountId, toAccountId, feeAccountId, accountName, accountIcon, accountColor, loanId, contactName FROM (
      SELECT
        t.id,
        'expense' AS type,
        c.name AS category,
        c.icon AS emoji,
        t.amountMinor / 100.0 AS amount,
        NULL AS feeAmount,
        t.note,
        t.transactionDate AS createdAt,
        t.accountId,
        NULL AS fromAccountId,
        NULL AS toAccountId,
        NULL AS feeAccountId,
        COALESCE(a.name, 'Deleted account') AS accountName,
        a.icon AS accountIcon,
        a.color AS accountColor,
        NULL AS loanId,
        NULL AS contactName
      FROM transactions t
      JOIN categories c ON c.id = t.categoryId
      LEFT JOIN accounts a ON a.id = t.accountId
      WHERE t.type = 'EXPENSE' AND t.deletedAt IS NULL
      ${hasMonthFilter ? `AND ${tzMonthKey('t.transactionDate')} = '${monthKey}'` : ''}
      UNION ALL
      SELECT
        t.id,
        'income' AS type,
        c.name AS category,
        c.icon AS emoji,
        t.amountMinor / 100.0 AS amount,
        NULL AS feeAmount,
        t.note,
        t.transactionDate AS createdAt,
        t.accountId,
        NULL AS fromAccountId,
        NULL AS toAccountId,
        NULL AS feeAccountId,
        COALESCE(a.name, 'Deleted account') AS accountName,
        a.icon AS accountIcon,
        a.color AS accountColor,
        NULL AS loanId,
        NULL AS contactName
      FROM transactions t
      JOIN categories c ON c.id = t.categoryId
      LEFT JOIN accounts a ON a.id = t.accountId
      WHERE t.type = 'INCOME' AND t.deletedAt IS NULL
      ${hasMonthFilter ? `AND ${tzMonthKey('t.transactionDate')} = '${monthKey}'` : ''}
      UNION ALL
      SELECT
        tr.id,
        'transfer' AS type,
        'Transfer' AS category,
        '🔄' AS emoji,
        tr.amountMinor / 100.0 AS amount,
        tr.feeAmountMinor / 100.0 AS feeAmount,
        tr.note,
        tr.transferDate AS createdAt,
        NULL AS accountId,
        tr.fromAccountId,
        tr.toAccountId,
        tr.feeAccountId,
        COALESCE(fromAcc.name, '?') || ' ➛ ' || COALESCE(toAcc.name, '?') AS accountName,
        NULL AS accountIcon,
        NULL AS accountColor,
        NULL AS loanId,
        NULL AS contactName
      FROM transfers tr
      LEFT JOIN accounts fromAcc ON fromAcc.id = tr.fromAccountId
      LEFT JOIN accounts toAcc ON toAcc.id = tr.toAccountId
      WHERE tr.deletedAt IS NULL
      ${hasMonthFilter ? `AND ${tzMonthKey('tr.transferDate')} = '${monthKey}'` : ''}
      UNION ALL
      SELECT
        l.id,
        'loan' AS type,
        CASE WHEN l.type = 'BORROWED' THEN 'Loan from ' || l.contactName ELSE 'Loan to ' || l.contactName END AS category,
        '🤝' AS emoji,
        l.amountMinor / 100.0 AS amount,
        NULL AS feeAmount,
        l.note,
        l.loanDate AS createdAt,
        l.accountId,
        NULL AS fromAccountId,
        NULL AS toAccountId,
        NULL AS feeAccountId,
        COALESCE(a.name, 'Deleted account') AS accountName,
        a.icon AS accountIcon,
        a.color AS accountColor,
        l.id AS loanId,
        l.contactName
      FROM loans l
      LEFT JOIN accounts a ON a.id = l.accountId
      WHERE l.deletedAt IS NULL
      ${hasMonthFilter ? `AND ${tzMonthKey('l.loanDate')} = '${monthKey}'` : ''}
      UNION ALL
      SELECT
        lr.id,
        'loan_repayment' AS type,
        CASE WHEN l.type = 'BORROWED' THEN 'Repaid ' || l.contactName ELSE l.contactName || ' repaid' END AS category,
        '↩️' AS emoji,
        lr.amountMinor / 100.0 AS amount,
        NULL AS feeAmount,
        lr.note,
        lr.repaymentDate AS createdAt,
        lr.accountId,
        NULL AS fromAccountId,
        NULL AS toAccountId,
        NULL AS feeAccountId,
        COALESCE(a.name, 'Deleted account') AS accountName,
        a.icon AS accountIcon,
        a.color AS accountColor,
        l.id AS loanId,
        l.contactName
      FROM loan_repayments lr
      JOIN loans l ON l.id = lr.loanId
      LEFT JOIN accounts a ON a.id = lr.accountId
      WHERE lr.deletedAt IS NULL AND l.deletedAt IS NULL
      ${hasMonthFilter ? `AND ${tzMonthKey('lr.repaymentDate')} = '${monthKey}'` : ''}
    ) src
    ORDER BY src.createdAt DESC
    LIMIT ?
  `;

  const txs = await db.getAllAsync<HomeTransaction>(sql, [limit]);
  await attachSubExpensesToHomeTransactions(txs);
  return txs;
}

export async function getTransactionsByDate(dateKey: string): Promise<HomeTransaction[]> {
  const db = await getDb();

  const sql = `
  SELECT id, type, category, emoji, amount, feeAmount, note, createdAt, accountId, fromAccountId, toAccountId, feeAccountId, accountName, accountIcon, accountColor, loanId, contactName FROM (
    SELECT
      t.id, 'expense' AS type, c.name AS category, c.icon AS emoji,
      t.amountMinor / 100.0 AS amount, NULL AS feeAmount, t.note,
      t.transactionDate AS createdAt, t.accountId,
      NULL AS fromAccountId, NULL AS toAccountId, NULL AS feeAccountId,
      COALESCE(a.name, 'Deleted account') AS accountName, a.icon AS accountIcon, a.color AS accountColor,
      NULL AS loanId, NULL AS contactName
    FROM transactions t JOIN categories c ON c.id = t.categoryId LEFT JOIN accounts a ON a.id = t.accountId
    WHERE t.type = 'EXPENSE' AND t.deletedAt IS NULL AND date(t.transactionDate) = ?
    UNION ALL
    SELECT
      t.id, 'income' AS type, c.name AS category, c.icon AS emoji,
      t.amountMinor / 100.0 AS amount, NULL AS feeAmount, t.note,
      t.transactionDate AS createdAt, t.accountId,
      NULL AS fromAccountId, NULL AS toAccountId, NULL AS feeAccountId,
      COALESCE(a.name, 'Deleted account') AS accountName, a.icon AS accountIcon, a.color AS accountColor,
      NULL AS loanId, NULL AS contactName
    FROM transactions t JOIN categories c ON c.id = t.categoryId LEFT JOIN accounts a ON a.id = t.accountId
    WHERE t.type = 'INCOME' AND t.deletedAt IS NULL AND date(t.transactionDate) = ?
    UNION ALL
    SELECT
      tr.id, 'transfer' AS type, 'Transfer' AS category, '🔄' AS emoji,
      tr.amountMinor / 100.0 AS amount, tr.feeAmountMinor / 100.0 AS feeAmount, tr.note,
      tr.transferDate AS createdAt, NULL AS accountId,
      tr.fromAccountId, tr.toAccountId, tr.feeAccountId,
      COALESCE(fromAcc.name, '?') || ' → ' || COALESCE(toAcc.name, '?') AS accountName,
      NULL AS accountIcon, NULL AS accountColor, NULL AS loanId, NULL AS contactName
    FROM transfers tr
    LEFT JOIN accounts fromAcc ON fromAcc.id = tr.fromAccountId
    LEFT JOIN accounts toAcc ON toAcc.id = tr.toAccountId
    WHERE tr.deletedAt IS NULL AND date(tr.transferDate) = ?
    UNION ALL
    SELECT
      l.id, 'loan' AS type,
      CASE WHEN l.type = 'BORROWED' THEN 'Loan from ' || l.contactName ELSE 'Loan to ' || l.contactName END AS category,
      '🤝' AS emoji, l.amountMinor / 100.0 AS amount, NULL AS feeAmount, l.note,
      l.loanDate AS createdAt, l.accountId,
      NULL AS fromAccountId, NULL AS toAccountId, NULL AS feeAccountId,
      COALESCE(a.name, 'Deleted account') AS accountName, a.icon AS accountIcon, a.color AS accountColor,
      l.id AS loanId, l.contactName
    FROM loans l LEFT JOIN accounts a ON a.id = l.accountId
    WHERE l.deletedAt IS NULL AND date(l.loanDate) = ?
    UNION ALL
    SELECT
      lr.id, 'loan_repayment' AS type,
      CASE WHEN l.type = 'BORROWED' THEN 'Repaid ' || l.contactName ELSE l.contactName || ' repaid' END AS category,
      '↩️' AS emoji, lr.amountMinor / 100.0 AS amount, NULL AS feeAmount, lr.note,
      lr.repaymentDate AS createdAt, lr.accountId,
      NULL AS fromAccountId, NULL AS toAccountId, NULL AS feeAccountId,
      COALESCE(a.name, 'Deleted account') AS accountName, a.icon AS accountIcon, a.color AS accountColor,
      l.id AS loanId, l.contactName
    FROM loan_repayments lr JOIN loans l ON l.id = lr.loanId LEFT JOIN accounts a ON a.id = lr.accountId
    WHERE lr.deletedAt IS NULL AND l.deletedAt IS NULL AND date(lr.repaymentDate) = ?
  ) src
  ORDER BY src.createdAt DESC
  `;

  const txs = await db.getAllAsync<HomeTransaction>(sql, [dateKey, dateKey, dateKey, dateKey, dateKey]);
  await attachSubExpensesToHomeTransactions(txs);
  return txs;
}

export async function getTransactionsByCategory(
  monthKey: string | undefined,
  categoryName: string,
): Promise<HomeTransaction[]> {
  const db = await getDb();
  const hasMonthFilter = monthKey !== undefined && monthKey !== 'ALL';

  const sql = `
  SELECT id, type, category, emoji, amount, feeAmount, note, createdAt, accountId, accountName, accountIcon, accountColor FROM (
    SELECT
      t.id,
      'expense' AS type,
      c.name AS category,
      c.icon AS emoji,
      t.amountMinor / 100.0 AS amount,
      NULL AS feeAmount,
      t.note,
      t.transactionDate AS createdAt,
      t.accountId,
      COALESCE(a.name, 'Deleted account') AS accountName,
      a.icon AS accountIcon,
      a.color AS accountColor
    FROM transactions t
    JOIN categories c ON c.id = t.categoryId
    LEFT JOIN accounts a ON a.id = t.accountId
    WHERE t.type = 'EXPENSE' AND t.deletedAt IS NULL
      AND c.name = ?
      ${hasMonthFilter ? `AND ${tzMonthKey('t.transactionDate')} = '${monthKey}'` : ''}
    UNION ALL
    SELECT
      t.id,
      'income' AS type,
      c.name AS category,
      c.icon AS emoji,
      t.amountMinor / 100.0 AS amount,
      NULL AS feeAmount,
      t.note,
      t.transactionDate AS createdAt,
      t.accountId,
      COALESCE(a.name, 'Deleted account') AS accountName,
      a.icon AS accountIcon,
      a.color AS accountColor
    FROM transactions t
    JOIN categories c ON c.id = t.categoryId
    LEFT JOIN accounts a ON a.id = t.accountId
    WHERE t.type = 'INCOME' AND t.deletedAt IS NULL
      AND c.name = ?
      ${hasMonthFilter ? `AND ${tzMonthKey('t.transactionDate')} = '${monthKey}'` : ''}
  ) src
  ORDER BY src.createdAt DESC
  `;

  const txs = await db.getAllAsync<HomeTransaction>(sql, [categoryName, categoryName]);
  await attachSubExpensesToHomeTransactions(txs);
  return txs;
}

export async function getTransactions(
  monthKey?: string,
): Promise<HomeTransaction[]> {
  const db = await getDb();

  const hasMonthFilter = monthKey !== undefined && monthKey !== 'ALL';

  const sql = `
  SELECT id, type, category, emoji, amount, feeAmount, note, createdAt, accountId, fromAccountId, toAccountId, feeAccountId, accountName, accountIcon, accountColor, loanId, contactName FROM (
  SELECT
  t.id, 'expense' AS type, c.name AS category, c.icon AS emoji,
  t.amountMinor / 100.0 AS amount, NULL AS feeAmount, t.note,
  t.transactionDate AS createdAt, t.accountId,
  NULL AS fromAccountId, NULL AS toAccountId, NULL AS feeAccountId,
  COALESCE(a.name, 'Deleted account') AS accountName, a.icon AS accountIcon, a.color AS accountColor,
  NULL AS loanId, NULL AS contactName
  FROM transactions t JOIN categories c ON c.id = t.categoryId LEFT JOIN accounts a ON a.id = t.accountId
  WHERE t.type = 'EXPENSE' AND t.deletedAt IS NULL
  ${hasMonthFilter ? `AND ${tzMonthKey('t.transactionDate')} = '${monthKey}'` : ''}
  UNION ALL
  SELECT
  t.id, 'income' AS type, c.name AS category, c.icon AS emoji,
  t.amountMinor / 100.0 AS amount, NULL AS feeAmount, t.note,
  t.transactionDate AS createdAt, t.accountId,
  NULL AS fromAccountId, NULL AS toAccountId, NULL AS feeAccountId,
  COALESCE(a.name, 'Deleted account') AS accountName, a.icon AS accountIcon, a.color AS accountColor,
  NULL AS loanId, NULL AS contactName
  FROM transactions t JOIN categories c ON c.id = t.categoryId LEFT JOIN accounts a ON a.id = t.accountId
  WHERE t.type = 'INCOME' AND t.deletedAt IS NULL
  ${hasMonthFilter ? `AND ${tzMonthKey('t.transactionDate')} = '${monthKey}'` : ''}
  UNION ALL
  SELECT
  tr.id, 'transfer' AS type, 'Transfer' AS category, '🔄' AS emoji,
  tr.amountMinor / 100.0 AS amount, tr.feeAmountMinor / 100.0 AS feeAmount, tr.note,
  tr.transferDate AS createdAt, NULL AS accountId,
  tr.fromAccountId, tr.toAccountId, tr.feeAccountId,
  COALESCE(fromAcc.name, '?') || ' → ' || COALESCE(toAcc.name, '?') AS accountName,
  NULL AS accountIcon, NULL AS accountColor, NULL AS loanId, NULL AS contactName
  FROM transfers tr
  LEFT JOIN accounts fromAcc ON fromAcc.id = tr.fromAccountId
  LEFT JOIN accounts toAcc ON toAcc.id = tr.toAccountId
  WHERE tr.deletedAt IS NULL
  ${hasMonthFilter ? `AND ${tzMonthKey('tr.transferDate')} = '${monthKey}'` : ''}
  UNION ALL
  SELECT
  l.id, 'loan' AS type,
  CASE WHEN l.type = 'BORROWED' THEN 'Loan from ' || l.contactName ELSE 'Loan to ' || l.contactName END AS category,
  '🤝' AS emoji, l.amountMinor / 100.0 AS amount, NULL AS feeAmount, l.note,
  l.loanDate AS createdAt, l.accountId,
  NULL AS fromAccountId, NULL AS toAccountId, NULL AS feeAccountId,
  COALESCE(a.name, 'Deleted account') AS accountName, a.icon AS accountIcon, a.color AS accountColor,
  l.id AS loanId, l.contactName
  FROM loans l LEFT JOIN accounts a ON a.id = l.accountId
  WHERE l.deletedAt IS NULL
  ${hasMonthFilter ? `AND ${tzMonthKey('l.loanDate')} = '${monthKey}'` : ''}
  UNION ALL
  SELECT
  lr.id, 'loan_repayment' AS type,
  CASE WHEN l.type = 'BORROWED' THEN 'Repaid ' || l.contactName ELSE l.contactName || ' repaid' END AS category,
  '↩️' AS emoji, lr.amountMinor / 100.0 AS amount, NULL AS feeAmount, lr.note,
  lr.repaymentDate AS createdAt, lr.accountId,
  NULL AS fromAccountId, NULL AS toAccountId, NULL AS feeAccountId,
  COALESCE(a.name, 'Deleted account') AS accountName, a.icon AS accountIcon, a.color AS accountColor,
  l.id AS loanId, l.contactName
  FROM loan_repayments lr JOIN loans l ON l.id = lr.loanId LEFT JOIN accounts a ON a.id = lr.accountId
  WHERE lr.deletedAt IS NULL AND l.deletedAt IS NULL
  ${hasMonthFilter ? `AND ${tzMonthKey('lr.repaymentDate')} = '${monthKey}'` : ''}
  ) src
  ORDER BY src.createdAt DESC
  `;

  const txs = await db.getAllAsync<HomeTransaction>(sql);
  await attachSubExpensesToHomeTransactions(txs);
  return txs;
}
