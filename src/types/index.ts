export interface Category {
  id: number;
  name: string;
  emoji: string;
  color: string;
  isDefault: number; // 1 = built-in (no rename/delete), 0 = custom
  sortOrder: number;
  createdAt: string;
}

export interface IncomeCategory {
  id: number;
  name: string;
  emoji: string;
  color: string;
  isDefault: number;
  sortOrder: number;
  createdAt: string;
}

export interface SubExpense {
  id: number;
  expenseId: number;
  title: string;
  amount: number;
  sortOrder: number;
}

export interface SubExpenseInput {
  title: string;
  amount: number;
}

export interface Expense {
  id: number;
  price: number;
  category: string;
  note: string | null;
  createdAt: string;
  monthKey: string;
  accountId: number | null;
  subExpenses?: SubExpense[];
}

export interface Income {
  id: number;
  amount: number;
  category: string;
  note: string | null;
  createdAt: string;
  monthKey: string;
  accountId: number | null;
}

export type AccountType = 'cash' | 'bank_account' | 'e_wallet';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number;
  icon: string | null;
  color: string | null;
  isDefault: number; // 1 = cannot be deleted, only archived
  isArchived: number; // 1 = archived (hidden from selectors)
  createdAt: string;
  updatedAt: string;
}

export interface Transfer {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  note: string | null;
  createdAt: string;
  monthKey: string;
}

export interface Settings {
  currency: string;
  themeMode: 'dark' | 'light' | 'system';
  colorPalette?: string;
  customCategories: string[];
  customCategoryEmojis: Record<string, string>;
}

export interface MonthSummary {
  monthKey: string;
  totalSpent: number;
  totalIncome: number;
  count: number;
}
