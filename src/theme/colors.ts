export const COLOR_PALETTES = {
  grey: {
    primary: '#18181B',       // Clean charcoal zinc
    primaryDark: '#E4E4E7',   // Radiant platinum zinc
    subtle: '#F4F4F5',
    subtleDark: '#27272A',
    darkBg: '#09090B',       // Pure neutral obsidian canvas (0 blue)
    cardDark: '#18181B',     // Elevated neutral surface (0 blue)
    inputFill: '#F4F4F5',
    inputFillDark: '#141416',
  },
  green: {
    primary: '#059669',
    primaryDark: '#10B981',   // High-energy mint emerald (replaces muddy #408A71)
    subtle: '#ECFDF5',
    subtleDark: '#064E3B',
    darkBg: '#09090B',
    cardDark: '#141916',
    inputFill: '#F0FDF4',
    inputFillDark: '#101412',
  },
  blue: {
    primary: '#2563EB',
    primaryDark: '#3B82F6',
    subtle: '#EFF6FF',
    subtleDark: '#1E3A8A',
    darkBg: '#09090B',
    cardDark: '#121722',
    inputFill: '#F8FAFC',
    inputFillDark: '#0D111A',
  },
  purple: {
    primary: '#9333EA',
    primaryDark: '#A855F7',
    subtle: '#F5F3FF',
    subtleDark: '#581C87',
    darkBg: '#09090B',
    cardDark: '#171322',
    inputFill: '#FAFAFE',
    inputFillDark: '#110D1A',
  },
  orange: {
    primary: '#EA580C',
    primaryDark: '#F97316',
    subtle: '#FFF7ED',
    subtleDark: '#7C2D12',
    darkBg: '#09090B',
    cardDark: '#191512',
    inputFill: '#FFFBF5',
    inputFillDark: '#14100D',
  },
  red: {
    primary: '#E11D48',       // Rose crimson (distinct from danger #EF4444)
    primaryDark: '#FB7185',
    subtle: '#FFF1F2',
    subtleDark: '#881337',
    darkBg: '#09090B',
    cardDark: '#1A1315',
    inputFill: '#FFF1F2',
    inputFillDark: '#140D0F',
  },
  teal: {
    primary: '#0D9488',
    primaryDark: '#14B8A6',
    subtle: '#F0FDFA',
    subtleDark: '#134E4A',
    darkBg: '#09090B',
    cardDark: '#121818',
    inputFill: '#F0FDFA',
    inputFillDark: '#0E1414',
  },
  pink: {
    primary: '#DB2777',
    primaryDark: '#F472B6',
    subtle: '#FDF2F8',
    subtleDark: '#831843',
    darkBg: '#09090B',
    cardDark: '#1A1218',
    inputFill: '#FEF7FC',
    inputFillDark: '#140D12',
  },
  yellow: {
    primary: '#D97706',       // Amber gold with WCAG AA light-mode contrast
    primaryDark: '#FBBF24',   // Warm radiant gold
    subtle: '#FEFCE8',
    subtleDark: '#713F12',
    darkBg: '#09090B',
    cardDark: '#181610',
    inputFill: '#FFFBEB',
    inputFillDark: '#14120D',
  },
};

// Neutral backgrounds that don't depend on color palette (fallback)
export const NEUTRAL_LIGHT = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  card: '#F8FAFC',
  primary: '',
  onPrimary: '#FFFFFF',
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
  background: '#09090B',
  surface: '#141416',
  card: '#18181B',
  primary: '',
  onPrimary: '#FFFFFF',
  highlight: '#FFFFFF',
  border: '#27272A',
  inputFill: '#141416',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  dangerBg: '#1F0000',
  successBg: '#052316',
};

export type ColorPaletteName = keyof typeof COLOR_PALETTES;

export const PALETTE_COLORS: Record<ColorPaletteName, string> = {
  grey: '#18181B',
  green: '#059669',
  blue: '#2563EB',
  purple: '#9333EA',
  orange: '#EA580C',
  red: '#E11D48',
  teal: '#0D9488',
  pink: '#DB2777',
  yellow: '#D97706',
};

export const PALETTE_COLORS_DARK: Record<ColorPaletteName, string> = {
  grey: '#E4E4E7',
  green: '#10B981',
  blue: '#3B82F6',
  purple: '#A855F7',
  orange: '#F97316',
  red: '#FB7185',
  teal: '#14B8A6',
  pink: '#F472B6',
  yellow: '#FBBF24',
};

// ── Fallback ───────────────────────────────────
export const dark = { ...NEUTRAL_DARK, primary: '#10B981' };
export const light = { ...NEUTRAL_LIGHT, primary: '#059669' };

export type ColorScheme = typeof light;
