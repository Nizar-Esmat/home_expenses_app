export interface Expense {
  id: number;
  price: number;
  category: string;
  note: string | null;
  createdAt: string;   // ISO string
  monthKey: string;    // "YYYY-MM"
}

export interface Settings {
  salary: number;
  currency: string;
  themeMode: 'dark' | 'light' | 'system';
  customCategories: string[];
  customCategoryEmojis: Record<string, string>;
}

export interface MonthSummary {
  monthKey: string;
  totalSpent: number;
  count: number;
}
