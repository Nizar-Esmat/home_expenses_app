export const COLOR_PALETTES = {
  grey: {
    primary: '#6B7280',
    primaryDark: '#9CA3AF',
    subtle: '#FFFFFF',
    subtleDark: '#374151',
    darkBg: '#111827',
    inputFill: '#FFFFFF',
    inputFillDark: '#070808',
  },
  green: {
    primary: '#059669',
    primaryDark: '#408A71',
    subtle: '#ECFDF5',
    subtleDark: '#064E3B',
    darkBg: '#0A1F1A',
    inputFill: '#F0FDF4',
    inputFillDark: '#051612',
  },
  blue: {
    primary: '#2563EB',
    primaryDark: '#3B82F6',
    subtle: '#EFF6FF',
    subtleDark: '#1E3A8A',
    darkBg: '#0A1428',
    inputFill: '#F8FAFC',
    inputFillDark: '#050A14',
  },
  purple: {
    primary: '#9333EA',
    primaryDark: '#A855F7',
    subtle: '#F5F3FF',
    subtleDark: '#581C87',
    darkBg: '#140A1F',
    inputFill: '#FAFAFE',
    inputFillDark: '#0A050F',
  },
  orange: {
    primary: '#EA580C',
    primaryDark: '#F97316',
    subtle: '#FFF7ED',
    subtleDark: '#7C2D12',
    darkBg: '#1A0F08',
    inputFill: '#FFFBF5',
    inputFillDark: '#0A0604',
  },
  red: {
    primary: '#DC2626',
    primaryDark: '#EF4444',
    subtle: '#FEF2F2',
    subtleDark: '#7F1D1D',
    darkBg: '#1A0A0A',
    inputFill: '#FEFafa',
    inputFillDark: '#0A0505',
  },
  teal: {
    primary: '#0D9488',
    primaryDark: '#14B8A6',
    subtle: '#F0FDFA',
    subtleDark: '#134E4A',
    darkBg: '#081A18',
    inputFill: '#F5FDFB',
    inputFillDark: '#030B0A',
  },
  pink: {
    primary: '#DB2777',
    primaryDark: '#EC4899',
    subtle: '#FDF2F8',
    subtleDark: '#831843',
    darkBg: '#1A0714',
    inputFill: '#FEF7FC',
    inputFillDark: '#0A0308',
  },
  yellow: {
    primary: '#CA8A04',
    primaryDark: '#EAB308',
    subtle: '#FEFCE8',
    subtleDark: '#713F12',
    darkBg: '#141204',
    inputFill: '#FFFEF5',
    inputFillDark: '#0A0A02',
  },
};

// Neutral backgrounds that don't depend on color palette (fallback)
export const NEUTRAL_LIGHT = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  card: '#F8FAFC',
  primary: '',
  highlight: '#1E293B',
  border: '#E2E8F0',
  inputFill: '#F1F5F9',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  dangerBg: '#FEF2F2',
  successBg: '#ECFDF5',
};

export const NEUTRAL_DARK = {
  background: '#000000',
  surface: '#111111',
  card: '#0A0A0A',
  primary: '',
  highlight: '#FFFFFF',
  border: '#262626',
  inputFill: '#171717',
  textPrimary: '#FFFFFF',
  textSecondary: '#A3A3A3',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  dangerBg: '#1F0000',
  successBg: '#052316',
};

export type ColorPaletteName = keyof typeof COLOR_PALETTES;

export const PALETTE_COLORS: Record<ColorPaletteName, string> = {
  grey: '#6B7280',
  green: '#059669',
  blue: '#2563EB',
  purple: '#9333EA',
  orange: '#EA580C',
  red: '#DC2626',
  teal: '#0D9488',
  pink: '#DB2777',
  yellow: '#CA8A04',
};

export const PALETTE_COLORS_DARK: Record<ColorPaletteName, string> = {
  grey: '#9CA3AF',
  green: '#408A71',
  blue: '#3B82F6',
  purple: '#A855F7',
  orange: '#F97316',
  red: '#EF4444',
  teal: '#14B8A6',
  pink: '#EC4899',
  yellow: '#EAB308',
};

// ── Fallback ───────────────────────────────────
export const dark = { ...NEUTRAL_DARK, primary: '#408A71' };
export const light = { ...NEUTRAL_LIGHT, primary: '#059669' };

export type ColorScheme = typeof light;