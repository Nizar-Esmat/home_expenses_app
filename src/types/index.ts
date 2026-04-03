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
  note: string | null;
  createdAt: string;
  monthKey: string;
}

export interface Settings {
  salary: number;          // kept as optional budget reference
  currency: string;
  themeMode: 'dark' | 'light' | 'system';
  customCategories: string[];
  customCategoryEmojis: Record<string, string>;
}

export interface MonthSummary {
  monthKey: string;
  totalSpent: number;
  totalIncome: number;
  count: number;
}
