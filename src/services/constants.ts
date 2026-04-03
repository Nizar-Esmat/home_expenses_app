export const DEFAULT_CATEGORIES = ['Food', 'Bills', 'Transport', 'Shopping', 'Home', 'Other'];

export const CATEGORY_EMOJIS: Record<string, string> = {
  Food: '🍔',
  Bills: '💡',
  Transport: '🚗',
  Shopping: '🛍️',
  Home: '🏠',
  Other: '📦',
};

export const CUSTOM_EMOJI_OPTIONS = [
  '🎮','🏋️','💊','🐾','📚','✈️',
  '🎁','🔧','🎓','👗','🍕','💈',
  '🎵','🌿','🏖️','🚀','💻','🐶',
];

export const MONTH_EMOJIS: Record<string, string> = {
  '01': '❄️', '02': '💘', '03': '🌸', '04': '🌧️',
  '05': '🌻', '06': '☀️', '07': '🏖️', '08': '🌴',
  '09': '🍂', '10': '🎃', '11': '🦃', '12': '🎄',
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
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
