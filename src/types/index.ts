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

export interface Expense {
  id: number;
  price: number;
  category: string;
  note: string | null;
  createdAt: string;
  monthKey: string;
}

export interface Income {
  id: number;
  amount: number;
  category: string;
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
