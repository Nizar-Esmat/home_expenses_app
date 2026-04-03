export const DEFAULT_CATEGORIES = ['Food', 'Bills', 'Transport', 'Shopping', 'Home', 'Other'];

export const CURRENCY_OPTIONS = ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'];

export const CATEGORY_EMOJIS: Record<string, string> = {
  Food: '🍔',
  Bills: '💡',
  Transport: '🚗',
  Shopping: '🛍️',
  Home: '🏠',
  Other: '📦',
};

export function monthKeyToLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatCurrency(amount: number, currency = 'EGP'): string {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return (
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' +
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
}
