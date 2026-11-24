import * as SQLite from 'expo-sqlite';
import { nowIso, toMinorUnits } from './helpers';
import { recalculateBalanceOnDb } from './balance';

export async function populateSampleData(database: SQLite.SQLiteDatabase): Promise<void> {

  // 1. Get or create accounts
  const now = nowIso();
  const nowDate = new Date();

  // Helper for generating ISO dates relative to now
  const daysAgo = (days: number, hour = 14, min = 30) => {
    const d = new Date(nowDate);
    d.setDate(d.getDate() - days);
    d.setHours(hour, min, 0, 0);
    return d.toISOString();
  };

  // Helper for current month first day
  const firstOfCurrentMonth = () => {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1, 10, 0, 0);
    return d.toISOString();
  };

  // Ensure accounts
  let cashAccount = await database.getFirstAsync<{ id: number }>(
    "SELECT id FROM accounts WHERE name = 'Cash Wallet' OR name = 'Cash' LIMIT 1",
  );
  if (!cashAccount) {
    const res = await database.runAsync(
      `INSERT INTO accounts (name, type, currencyCode, openingBalanceMinor, currentBalanceMinor, icon, color, isPrimary, isArchived, createdAt, updatedAt)
       VALUES (?, ?, 'EGP', ?, ?, ?, ?, 1, 0, ?, ?)`,
      ['Cash Wallet', 'CASH', toMinorUnits(3500), toMinorUnits(3500), '💵', '#10B981', now, now],
    );
    cashAccount = { id: res.lastInsertRowId };
  } else {
    await database.runAsync(
      "UPDATE accounts SET name = 'Cash Wallet', openingBalanceMinor = ?, icon = '💵', color = '#10B981' WHERE id = ?",
      [toMinorUnits(3500), cashAccount.id],
    );
  }

  let bankAccount = await database.getFirstAsync<{ id: number }>(
    "SELECT id FROM accounts WHERE name = 'CIB Bank' LIMIT 1",
  );
  if (!bankAccount) {
    const res = await database.runAsync(
      `INSERT INTO accounts (name, type, currencyCode, openingBalanceMinor, currentBalanceMinor, icon, color, isPrimary, isArchived, createdAt, updatedAt)
       VALUES (?, ?, 'EGP', ?, ?, ?, ?, 0, 0, ?, ?)`,
      ['CIB Bank', 'BANK', toMinorUnits(45000), toMinorUnits(45000), '🏦', '#3B82F6', now, now],
    );
    bankAccount = { id: res.lastInsertRowId };
  }

  let walletAccount = await database.getFirstAsync<{ id: number }>(
    "SELECT id FROM accounts WHERE name = 'Vodafone Cash' LIMIT 1",
  );
  if (!walletAccount) {
    const res = await database.runAsync(
      `INSERT INTO accounts (name, type, currencyCode, openingBalanceMinor, currentBalanceMinor, icon, color, isPrimary, isArchived, createdAt, updatedAt)
       VALUES (?, ?, 'EGP', ?, ?, ?, ?, 0, 0, ?, ?)`,
      ['Vodafone Cash', 'EWALLET', toMinorUnits(2200), toMinorUnits(2200), '📱', '#EF4444', now, now],
    );
    walletAccount = { id: res.lastInsertRowId };
  }

  // Pin all 3 accounts on Home screen
  const allAccountIds = [cashAccount.id, bankAccount.id, walletAccount.id];
  await database.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('homeAccountIds', ?)",
    [JSON.stringify(allAccountIds)],
  );

  // 2. Fetch categories
  const categories = await database.getAllAsync<{ id: number; name: string; type: string }>(
    'SELECT id, name, type FROM categories',
  );

  const getCatId = (type: 'EXPENSE' | 'INCOME', name: string): number => {
    const found = categories.find((c) => c.type === type && c.name.toLowerCase() === name.toLowerCase());
    return found ? found.id : 1;
  };

  const foodCat = getCatId('EXPENSE', 'Food');
  const billsCat = getCatId('EXPENSE', 'Bills');
  const transportCat = getCatId('EXPENSE', 'Transport');
  const shoppingCat = getCatId('EXPENSE', 'Shopping');
  const homeCat = getCatId('EXPENSE', 'Home');

  const salaryCat = getCatId('INCOME', 'Salary');
  const freelanceCat = getCatId('INCOME', 'Freelance');
  const investmentCat = getCatId('INCOME', 'Investment');

  // 3. Clear old transactions and loans if we are seeding fresh test data
  await database.execAsync(`
    DELETE FROM transaction_items;
    DELETE FROM transactions;
    DELETE FROM transfers;
    DELETE FROM loan_repayments;
    DELETE FROM loans;
  `);

  // 4. Insert Income Transactions
  // A. Monthly Salary
  await database.runAsync(
    `INSERT INTO transactions (accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt)
     VALUES (?, ?, 'INCOME', ?, 'EGP', ?, ?, ?, ?, ?)`,
    [
      bankAccount.id,
      salaryCat,
      toMinorUnits(35000),
      'Monthly Salary',
      'Direct deposit from employer',
      firstOfCurrentMonth(),
      now,
      now,
    ],
  );

  // B. Freelance Web Project
  await database.runAsync(
    `INSERT INTO transactions (accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt)
     VALUES (?, ?, 'INCOME', ?, 'EGP', ?, ?, ?, ?, ?)`,
    [
      bankAccount.id,
      freelanceCat,
      toMinorUnits(12500),
      'Client Web Project',
      'Milestone 2 payment',
      daysAgo(8, 11, 0),
      now,
      now,
    ],
  );

  // C. Investment Dividends
  await database.runAsync(
    `INSERT INTO transactions (accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt)
     VALUES (?, ?, 'INCOME', ?, 'EGP', ?, ?, ?, ?, ?)`,
    [
      bankAccount.id,
      investmentCat,
      toMinorUnits(2400),
      'Quarterly Dividend',
      'Stock portfolio dividend',
      daysAgo(14, 9, 30),
      now,
      now,
    ],
  );

  // 5. Insert Expense Transactions with Sub-Items
  // A. Supermarket & Groceries with Sub-Items
  const groceryTx = await database.runAsync(
    `INSERT INTO transactions (accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt)
     VALUES (?, ?, 'EXPENSE', ?, 'EGP', ?, ?, ?, ?, ?)`,
    [
      bankAccount.id,
      foodCat,
      toMinorUnits(2850),
      'Supermarket & Groceries',
      'Weekly grocery haul',
      daysAgo(2, 16, 45),
      now,
      now,
    ],
  );

  const groceryId = groceryTx.lastInsertRowId;
  await database.runAsync(
    `INSERT INTO transaction_items (transactionId, categoryId, name, amountMinor, quantity, sortOrder, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 1, 0, ?, ?)`,
    [groceryId, foodCat, 'Fresh Fruits & Vegetables', toMinorUnits(650), now, now],
  );
  await database.runAsync(
    `INSERT INTO transaction_items (transactionId, categoryId, name, amountMinor, quantity, sortOrder, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 1, 1, ?, ?)`,
    [groceryId, foodCat, 'Dairy & Cheese', toMinorUnits(1200), now, now],
  );
  await database.runAsync(
    `INSERT INTO transaction_items (transactionId, categoryId, name, amountMinor, quantity, sortOrder, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 1, 2, ?, ?)`,
    [groceryId, foodCat, 'Meat & Poultry', toMinorUnits(1000), now, now],
  );

  // B. Electricity & Utilities
  await database.runAsync(
    `INSERT INTO transactions (accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt)
     VALUES (?, ?, 'EXPENSE', ?, 'EGP', ?, ?, ?, ?, ?)`,
    [
      walletAccount.id,
      billsCat,
      toMinorUnits(1200),
      'Electricity Bill',
      'Paid via mobile wallet',
      daysAgo(5, 12, 10),
      now,
      now,
    ],
  );

  // C. Fiber Internet
  await database.runAsync(
    `INSERT INTO transactions (accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt)
     VALUES (?, ?, 'EXPENSE', ?, 'EGP', ?, ?, ?, ?, ?)`,
    [
      walletAccount.id,
      billsCat,
      toMinorUnits(650),
      'High-Speed Home Fiber',
      'Monthly subscription',
      daysAgo(6, 14, 0),
      now,
      now,
    ],
  );

  // D. Car Maintenance & Fuel
  await database.runAsync(
    `INSERT INTO transactions (accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt)
     VALUES (?, ?, 'EXPENSE', ?, 'EGP', ?, ?, ?, ?, ?)`,
    [
      bankAccount.id,
      transportCat,
      toMinorUnits(950),
      'Gas & Oil Change',
      'Full tank at gas station',
      daysAgo(4, 18, 30),
      now,
      now,
    ],
  );

  // E. Uber Ride
  await database.runAsync(
    `INSERT INTO transactions (accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt)
     VALUES (?, ?, 'EXPENSE', ?, 'EGP', ?, ?, ?, ?, ?)`,
    [
      cashAccount.id,
      transportCat,
      toMinorUnits(280),
      'Uber to Downtown',
      'Meeting commute',
      daysAgo(1, 19, 15),
      now,
      now,
    ],
  );

  // F. Weekend Dinner
  await database.runAsync(
    `INSERT INTO transactions (accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt)
     VALUES (?, ?, 'EXPENSE', ?, 'EGP', ?, ?, ?, ?, ?)`,
    [
      bankAccount.id,
      foodCat,
      toMinorUnits(1450),
      'Family Dinner',
      'Italian restaurant',
      daysAgo(1, 21, 0),
      now,
      now,
    ],
  );

  // G. Winter Clothes Shopping
  await database.runAsync(
    `INSERT INTO transactions (accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt)
     VALUES (?, ?, 'EXPENSE', ?, 'EGP', ?, ?, ?, ?, ?)`,
    [
      bankAccount.id,
      shoppingCat,
      toMinorUnits(3200),
      'Winter Jacket & Boots',
      'Shopping mall purchase',
      daysAgo(9, 17, 30),
      now,
      now,
    ],
  );

  // H. Home Tools
  await database.runAsync(
    `INSERT INTO transactions (accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt)
     VALUES (?, ?, 'EXPENSE', ?, 'EGP', ?, ?, ?, ?, ?)`,
    [
      cashAccount.id,
      homeCat,
      toMinorUnits(450),
      'Plumbing & Tools',
      'Hardware store fixes',
      daysAgo(11, 13, 0),
      now,
      now,
    ],
  );

  // I. Specialty Coffee
  await database.runAsync(
    `INSERT INTO transactions (accountId, categoryId, type, amountMinor, currencyCode, title, note, transactionDate, createdAt, updatedAt)
     VALUES (?, ?, 'EXPENSE', ?, 'EGP', ?, ?, ?, ?, ?)`,
    [
      cashAccount.id,
      foodCat,
      toMinorUnits(120),
      'Espresso & Croissant',
      'Morning café',
      daysAgo(0, 9, 15),
      now,
      now,
    ],
  );

  // 6. Insert Transfers with Fee
  // Transfer 1: Bank to Cash ATM
  await database.runAsync(
    `INSERT INTO transfers (fromAccountId, toAccountId, amountMinor, currencyCode, feeAmountMinor, feeAccountId, note, transferDate, createdAt, updatedAt)
     VALUES (?, ?, ?, 'EGP', ?, ?, ?, ?, ?, ?)`,
    [
      bankAccount.id,
      cashAccount.id,
      toMinorUnits(3000),
      toMinorUnits(5),
      bankAccount.id,
      'ATM Cash Withdrawal',
      daysAgo(7, 15, 0),
      now,
      now,
    ],
  );

  // Transfer 2: Bank to Vodafone Cash Wallet
  await database.runAsync(
    `INSERT INTO transfers (fromAccountId, toAccountId, amountMinor, currencyCode, feeAmountMinor, feeAccountId, note, transferDate, createdAt, updatedAt)
     VALUES (?, ?, ?, 'EGP', 0, NULL, ?, ?, ?, ?)`,
    [
      bankAccount.id,
      walletAccount.id,
      toMinorUnits(2000),
      'Wallet top-up for bills',
      daysAgo(10, 10, 0),
      now,
      now,
    ],
  );

  // 7. Insert Loans & Repayments
  // Loan 1: BORROWED (You Owe) from Ahmed Hassan (Original 10,000, 4,000 repaid, 6,000 remaining)
  const borrowedLoan = await database.runAsync(
    `INSERT INTO loans (type, contactName, amountMinor, currencyCode, accountId, note, loanDate, paidAmountMinor, status, createdAt, updatedAt)
     VALUES ('BORROWED', ?, ?, 'EGP', ?, ?, ?, ?, 'PARTIAL', ?, ?)`,
    [
      'Ahmed Hassan',
      toMinorUnits(10000),
      bankAccount.id,
      'Borrowed for home appliance',
      daysAgo(20, 12, 0),
      toMinorUnits(4000),
      now,
      now,
    ],
  );
  await database.runAsync(
    `INSERT INTO loan_repayments (loanId, amountMinor, accountId, note, repaymentDate, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [borrowedLoan.lastInsertRowId, toMinorUnits(4000), bankAccount.id, 'Partial installment paid', daysAgo(5, 14, 0), now],
  );

  // Loan 2: LENT (Owed to you) to Omar Khaled (Original 5,000, 2,000 repaid, 3,000 remaining)
  const lentLoan1 = await database.runAsync(
    `INSERT INTO loans (type, contactName, amountMinor, currencyCode, accountId, note, loanDate, paidAmountMinor, status, createdAt, updatedAt)
     VALUES ('LENT', ?, ?, 'EGP', ?, ?, ?, ?, 'PARTIAL', ?, ?)`,
    [
      'Omar Khaled',
      toMinorUnits(5000),
      walletAccount.id,
      'Emergency car repair loan',
      daysAgo(16, 11, 0),
      toMinorUnits(2000),
      now,
      now,
    ],
  );
  await database.runAsync(
    `INSERT INTO loan_repayments (loanId, amountMinor, accountId, note, repaymentDate, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [lentLoan1.lastInsertRowId, toMinorUnits(2000), walletAccount.id, 'Partially paid back', daysAgo(3, 16, 0), now],
  );

  // Loan 3: LENT (Owed to you) to Sara Mostafa (Original 1,500, 0 repaid, 1,500 remaining)
  await database.runAsync(
    `INSERT INTO loans (type, contactName, amountMinor, currencyCode, accountId, note, loanDate, paidAmountMinor, status, createdAt, updatedAt)
     VALUES ('LENT', ?, ?, 'EGP', ?, ?, ?, 0, 'PENDING', ?, ?)`,
    [
      'Sara Mostafa',
      toMinorUnits(1500),
      cashAccount.id,
      'Flight ticket booking assistance',
      daysAgo(6, 18, 0),
      now,
      now,
    ],
  );

  // 8. Recalculate all account balances to ensure mathematical accuracy
  await recalculateBalanceOnDb(database, cashAccount.id);
  await recalculateBalanceOnDb(database, bankAccount.id);
  await recalculateBalanceOnDb(database, walletAccount.id);
}
