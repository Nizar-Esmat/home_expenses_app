export const COLOR_PALETTES = {
  grey: {
    primary: '#18181B',       // Clean charcoal zinc
    primaryDark: '#E4E4E7',   // Radiant platinum zinc
    subtle: '#F4F4F5',
    subtleDark: '#27272A',
    darkBg: '#141416',       // Comfortable true-neutral canvas (0 blue, avoids obsidian glare)
    cardDark: '#1E1E22',     // Elevated neutral surface (0 blue)
    inputFill: '#F4F4F5',
    inputFillDark: '#1A1A1D',
  },
  green: {
    primary: '#059669',
    primaryDark: '#10B981',   // High-energy mint emerald (replaces muddy #408A71)
    subtle: '#ECFDF5',
    subtleDark: '#064E3B',
    darkBg: '#141416',
    cardDark: '#16221B',
    inputFill: '#F0FDF4',
    inputFillDark: '#121A16',
  },
  blue: {
    primary: '#2563EB',
    primaryDark: '#3B82F6',
    subtle: '#EFF6FF',
    subtleDark: '#1E3A8A',
    darkBg: '#141416',
    cardDark: '#161C28',
    inputFill: '#F8FAFC',
    inputFillDark: '#121720',
  },
  purple: {
    primary: '#9333EA',
    primaryDark: '#A855F7',
    subtle: '#F5F3FF',
    subtleDark: '#581C87',
    darkBg: '#141416',
    cardDark: '#1E1628',
    inputFill: '#FAFAFE',
    inputFillDark: '#171220',
  },
  orange: {
    primary: '#EA580C',
    primaryDark: '#F97316',
    subtle: '#FFF7ED',
    subtleDark: '#7C2D12',
    darkBg: '#141416',
    cardDark: '#221B16',
    inputFill: '#FFFBF5',
    inputFillDark: '#1A1512',
  },
  red: {
    primary: '#E11D48',       // Rose crimson (distinct from danger #EF4444)
    primaryDark: '#FB7185',
    subtle: '#FFF1F2',
    subtleDark: '#881337',
    darkBg: '#141416',
    cardDark: '#24171A',
    inputFill: '#FFF1F2',
    inputFillDark: '#1A1214',
  },
  teal: {
    primary: '#0D9488',
    primaryDark: '#14B8A6',
    subtle: '#F0FDFA',
    subtleDark: '#134E4A',
    darkBg: '#141416',
    cardDark: '#152120',
    inputFill: '#F0FDFA',
    inputFillDark: '#111A19',
  },
  pink: {
    primary: '#DB2777',
    primaryDark: '#F472B6',
    subtle: '#FDF2F8',
    subtleDark: '#831843',
    darkBg: '#141416',
    cardDark: '#231620',
    inputFill: '#FEF7FC',
    inputFillDark: '#1A1118',
  },
  yellow: {
    primary: '#D97706',       // Amber gold with WCAG AA light-mode contrast
    primaryDark: '#FBBF24',   // Warm radiant gold
    subtle: '#FEFCE8',
    subtleDark: '#713F12',
    darkBg: '#141416',
    cardDark: '#221F16',
    inputFill: '#FFFBEB',
    inputFillDark: '#1A1812',
  },
};

// Neutral backgrounds that don't depend on color palette (fallback)
export const NEUTRAL_LIGHT = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',
  primary: '',
  onPrimary: '#FFFFFF',
  highlight: '#18181B',
  border: '#E4E4E7',
  inputFill: '#F4F4F5',
  textPrimary: '#18181B',
  textSecondary: '#71717A',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  dangerBg: '#FEF2F2',
  successBg: '#ECFDF5',
};

export const NEUTRAL_DARK = {
  background: '#141416',
  surface: '#1E1E22',
  surfaceElevated: '#25252A',
  card: '#1E1E22',
  primary: '',
  onPrimary: '#FFFFFF',
  highlight: '#FFFFFF',
  border: '#2E2E34',
  inputFill: '#1A1A1D',
  textPrimary: '#F4F4F5',
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
