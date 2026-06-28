import { Loan, LoanRepayment, LoanStatus, LoanType } from '@/types';
import { getDb } from './client';
import { fromMinorUnits, nowIso, toMinorUnits, tzMonthKey } from './helpers';
import { recalculateBalance } from './accounts';

interface LoanRow {
  id: number;
  type: string;
  contactName: string;
  amountMinor: number;
  currencyCode: string;
  accountId: number;
  accountName: string | null;
  note: string | null;
  loanDate: string;
  paidAmountMinor: number;
  status: string;
  createdAt: string;
}

interface RepaymentRow {
  id: number;
  loanId: number;
  amountMinor: number;
  accountId: number;
  accountName: string | null;
  note: string | null;
  repaymentDate: string;
  createdAt: string;
}

function toLoan(row: LoanRow, repayments?: LoanRepayment[]): Loan {
  return {
    id: row.id,
    type: row.type as LoanType,
    contactName: row.contactName,
    amount: fromMinorUnits(row.amountMinor),
    currencyCode: row.currencyCode,
    accountId: row.accountId,
    accountName: row.accountName ?? undefined,
    note: row.note,
    loanDate: row.loanDate,
    paidAmount: fromMinorUnits(row.paidAmountMinor),
    status: row.status as LoanStatus,
    repayments,
    createdAt: row.createdAt,
  };
}

function toRepayment(row: RepaymentRow): LoanRepayment {
  return {
    id: row.id,
    loanId: row.loanId,
    amount: fromMinorUnits(row.amountMinor),
    accountId: row.accountId,
    accountName: row.accountName ?? undefined,
    note: row.note,
    repaymentDate: row.repaymentDate,
    createdAt: row.createdAt,
  };
}

const LOAN_SELECT = `
  SELECT l.*, COALESCE(a.name, 'Deleted account') AS accountName
  FROM loans l
  LEFT JOIN accounts a ON a.id = l.accountId
  WHERE l.deletedAt IS NULL
`;

const REPAYMENT_SELECT = `
  SELECT lr.*, COALESCE(a.name, 'Deleted account') AS accountName
  FROM loan_repayments lr
  LEFT JOIN accounts a ON a.id = lr.accountId
  WHERE lr.deletedAt IS NULL
`;

// ── Queries ───────────────────────────────────────────────────

export async function getLoans(filter?: 'PENDING' | 'PARTIAL' | 'SETTLED' | 'ACTIVE'): Promise<Loan[]> {
  const db = await getDb();
  let where = '';
  if (filter === 'ACTIVE') {
    where = "AND l.status IN ('PENDING','PARTIAL')";
  } else if (filter) {
    where = `AND l.status = '${filter}'`;
  }
  const rows = await db.getAllAsync<LoanRow>(
    `${LOAN_SELECT} ${where} ORDER BY l.loanDate DESC, l.id DESC`,
  );
  return rows.map((r) => toLoan(r));
}

export async function getLoanById(id: number): Promise<Loan | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<LoanRow>(
    `${LOAN_SELECT} AND l.id = ?`,
    [id],
  );
  if (!row) return null;

  const repaymentRows = await db.getAllAsync<RepaymentRow>(
    `${REPAYMENT_SELECT} AND lr.loanId = ? ORDER BY lr.repaymentDate ASC, lr.id ASC`,
    [id],
  );
  return toLoan(row, repaymentRows.map(toRepayment));
}

export async function getOutstandingLoanSummary(): Promise<{
  totalBorrowed: number;
  totalLent: number;
}> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ borrowed: number; lent: number }>(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'BORROWED' THEN (amountMinor - paidAmountMinor) ELSE 0 END), 0) / 100.0 AS borrowed,
      COALESCE(SUM(CASE WHEN type = 'LENT' THEN (amountMinor - paidAmountMinor) ELSE 0 END), 0) / 100.0 AS lent
    FROM loans
    WHERE deletedAt IS NULL AND status != 'SETTLED'`,
  );
  return {
    totalBorrowed: row?.borrowed ?? 0,
    totalLent: row?.lent ?? 0,
  };
}

// ── Mutations ─────────────────────────────────────────────────

export interface AddLoanInput {
  type: LoanType;
  contactName: string;
  amount: number;
  accountId: number;
  note?: string | null;
  loanDate?: string;
}

export async function addLoan(input: AddLoanInput): Promise<number> {
  const db = await getDb();
  const now = nowIso();
  const loanDate = input.loanDate ?? now;
  const result = await db.runAsync(
    `INSERT INTO loans
       (type, contactName, amountMinor, currencyCode, accountId, note, loanDate, paidAmountMinor, status, createdAt, updatedAt)
     VALUES (?, ?, ?, 'EGP', ?, ?, ?, 0, 'PENDING', ?, ?)`,
    [
      input.type,
      input.contactName.trim(),
      toMinorUnits(input.amount),
      input.accountId,
      input.note ?? null,
      loanDate,
      now,
      now,
    ],
  );
  await recalculateBalance(input.accountId);
  return result.lastInsertRowId;
}

export interface AddRepaymentInput {
  amount: number;
  accountId: number;
  note?: string | null;
  repaymentDate?: string;
}

export async function addRepayment(loanId: number, input: AddRepaymentInput): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  const repaymentDate = input.repaymentDate ?? now;

  const loan = await db.getFirstAsync<{ amountMinor: number; paidAmountMinor: number; accountId: number }>(
    'SELECT amountMinor, paidAmountMinor, accountId FROM loans WHERE id = ? AND deletedAt IS NULL',
    [loanId],
  );
  if (!loan) throw new Error('Loan not found.');

  await db.runAsync(
    `INSERT INTO loan_repayments (loanId, amountMinor, accountId, note, repaymentDate, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [loanId, toMinorUnits(input.amount), input.accountId, input.note ?? null, repaymentDate, now],
  );

  const newPaid = loan.paidAmountMinor + toMinorUnits(input.amount);
  const newStatus: LoanStatus =
    newPaid >= loan.amountMinor ? 'SETTLED' : newPaid > 0 ? 'PARTIAL' : 'PENDING';

  await db.runAsync(
    'UPDATE loans SET paidAmountMinor = ?, status = ?, updatedAt = ? WHERE id = ?',
    [newPaid, newStatus, now, loanId],
  );

  await recalculateBalance(input.accountId);
}

export interface UpdateLoanInput {
  type: LoanType;
  contactName: string;
  amount: number;
  accountId: number;
  note?: string | null;
  loanDate: string;
}

export async function updateLoan(id: number, input: UpdateLoanInput): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ accountId: number; paidAmountMinor: number }>(
    'SELECT accountId, paidAmountMinor FROM loans WHERE id = ? AND deletedAt IS NULL',
    [id],
  );
  if (!existing) throw new Error('Loan not found.');

  const now = nowIso();
  const newAmountMinor = toMinorUnits(input.amount);
  const newStatus: LoanStatus =
    existing.paidAmountMinor >= newAmountMinor
      ? 'SETTLED'
      : existing.paidAmountMinor > 0
      ? 'PARTIAL'
      : 'PENDING';

  await db.runAsync(
    `UPDATE loans SET type = ?, contactName = ?, amountMinor = ?, accountId = ?, note = ?, loanDate = ?, status = ?, updatedAt = ? WHERE id = ?`,
    [input.type, input.contactName.trim(), newAmountMinor, input.accountId, input.note ?? null, input.loanDate, newStatus, now, id],
  );

  for (const accId of new Set([existing.accountId, input.accountId])) {
    await recalculateBalance(accId);
  }
}

export async function softDeleteLoan(id: number): Promise<void> {
  const db = await getDb();
  const loan = await db.getFirstAsync<{ accountId: number }>(
    'SELECT accountId FROM loans WHERE id = ? AND deletedAt IS NULL',
    [id],
  );
  if (!loan) return;

  const now = nowIso();
  await db.runAsync('UPDATE loans SET deletedAt = ?, updatedAt = ? WHERE id = ?', [now, now, id]);
  await db.runAsync(
    'UPDATE loan_repayments SET deletedAt = ? WHERE loanId = ? AND deletedAt IS NULL',
    [now, id],
  );
  await recalculateBalance(loan.accountId);
}

export async function softDeleteRepayment(id: number): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ loanId: number; accountId: number; amountMinor: number }>(
    'SELECT loanId, accountId, amountMinor FROM loan_repayments WHERE id = ? AND deletedAt IS NULL',
    [id],
  );
  if (!row) return;

  const now = nowIso();
  await db.runAsync('UPDATE loan_repayments SET deletedAt = ? WHERE id = ?', [now, id]);

  const loan = await db.getFirstAsync<{ amountMinor: number; paidAmountMinor: number }>(
    'SELECT amountMinor, paidAmountMinor FROM loans WHERE id = ?',
    [row.loanId],
  );
  if (loan) {
    const newPaid = Math.max(0, loan.paidAmountMinor - row.amountMinor);
    const newStatus: LoanStatus =
      newPaid >= loan.amountMinor ? 'SETTLED' : newPaid > 0 ? 'PARTIAL' : 'PENDING';
    await db.runAsync(
      'UPDATE loans SET paidAmountMinor = ?, status = ?, updatedAt = ? WHERE id = ?',
      [newPaid, newStatus, now, row.loanId],
    );
  }

  await recalculateBalance(row.accountId);
}

export async function getAvailableLoanMonthKeys(): Promise<string[]> {
  const db = await getDb();
  const loanRows = await db.getAllAsync<{ monthKey: string }>(
    `SELECT DISTINCT ${tzMonthKey('loanDate')} AS monthKey FROM loans WHERE deletedAt IS NULL`,
  );
  const repaymentRows = await db.getAllAsync<{ monthKey: string }>(
    `SELECT DISTINCT ${tzMonthKey('repaymentDate')} AS monthKey FROM loan_repayments WHERE deletedAt IS NULL`,
  );
  const keys = new Set([...loanRows, ...repaymentRows].map((r) => r.monthKey));
  return Array.from(keys).sort((a, b) => b.localeCompare(a));
}
