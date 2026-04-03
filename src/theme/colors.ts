// ── Dark Palette (primary) ───────────────────────────────────
export const dark = {
  background:    '#091413',
  surface:       '#285A48',
  card:          '#122820',   // elevated card background
  primary:       '#408A71',
  highlight:     '#B0E4CC',
  border:        '#1E3D30',
  inputFill:     '#0F2420',
  textPrimary:   '#B0E4CC',
  textSecondary: '#7BBFA0',
  danger:        '#F87171',
  warning:       '#FBB040',
  success:       '#34D399',
  dangerBg:      '#2D1515',
  successBg:     '#0F2D22',
};

// ── Light Palette ────────────────────────────────────────────
export const light = {
  background:    '#F8FAFC',
  surface:       '#FFFFFF',
  card:          '#EDF4F0',   // elevated card background
  primary:       '#2563EB',
  highlight:     '#1E293B',
  border:        '#E2E8F0',
  inputFill:     '#F1F5F9',
  textPrimary:   '#1E293B',
  textSecondary: '#64748B',
  danger:        '#EF4444',
  warning:       '#F59E0B',
  success:       '#10B981',
  dangerBg:      '#FEF2F2',
  successBg:     '#ECFDF5',
};

export type ColorScheme = typeof dark;
