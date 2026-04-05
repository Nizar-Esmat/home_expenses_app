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

/** 10-color accent palette for categories */
export const CATEGORY_COLORS = [
  '#408A71', // green  (primary)
  '#4A90E2', // blue
  '#E2844A', // orange
  '#E24A4A', // red
  '#9B59B6', // purple
  '#F39C12', // amber
  '#1ABC9C', // teal
  '#E91E63', // pink
  '#7F8C8D', // slate
  '#2ECC71', // lime
];

/** Default seed colors per built-in category */
export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  Food:      '#E2844A',
  Bills:     '#4A90E2',
  Transport: '#9B59B6',
  Shopping:  '#E91E63',
  Home:      '#408A71',
  Other:     '#7F8C8D',
};

/** 10-color accent palette for income categories */
export const INCOME_CATEGORY_COLORS = [
  '#10B981', // green (primary)
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#F59E0B', // amber
  '#EF4444', // red
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#6B7280', // grey
  '#F97316', // orange
  '#84CC16', // lime
];

/** Emoji groups for the picker */
export const EMOJI_GROUPS: { label: string; icon: string; emojis: string[] }[] = [
  { label: 'Food',          icon: '🍔', emojis: ['🍔','🍕','🍣','🥗','🍜','🍰','☕','🍺','🥤','🍷','🧁','🥪','🌮','🥩','🍱'] },
  { label: 'Transport',     icon: '🚗', emojis: ['🚗','🚕','🚌','✈️','🚂','🛵','🚢','🚲','⛽','🛺','🚁','🛸','🚐','🏎️','⛵'] },
  { label: 'Home',          icon: '🏠', emojis: ['🏠','💡','🔧','🛁','🛋️','🏡','🔑','🪴','🧹','🛒','🪟','🛏️','🚿','🧺','🔒'] },
  { label: 'Shopping',      icon: '🛍️', emojis: ['🛍️','👗','👟','👜','💄','🕶️','💍','🧴','👒','🎽','👔','🧥','💎','👓','🎒'] },
  { label: 'Entertainment', icon: '🎮', emojis: ['🎮','🎬','🎵','📚','⚽','🎾','🏋️','🎭','🎲','🏊','🎸','🎯','🏀','🎤','🎨'] },
  { label: 'Health',        icon: '💊', emojis: ['💊','🏥','🧘','🩺','💉','🩹','🧬','🌡️','🏃','🥦','🧪','🧠','❤️','🦷','🩻'] },
  { label: 'Work',          icon: '💼', emojis: ['💼','💻','📱','🖥️','🎓','📝','📊','🗂️','🖨️','⌨️','📌','📎','🖊️','🗃️','🔬'] },
  { label: 'Finance',       icon: '💰', emojis: ['💰','💳','🏦','📈','💵','🪙','💎','📉','🤑','🏧','🧾','💸','📊','🏷️','💱'] },
  { label: 'Other',         icon: '📦', emojis: ['📦','🎁','🐾','👶','🌟','💯','🎪','🔮','🌈','✨','🎀','🌺','🍀','⚡','🔥'] },
];

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
