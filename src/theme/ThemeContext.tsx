import React, { createContext, useContext, useState, useEffect } from 'react';
import { COLOR_PALETTES, ColorPaletteName, NEUTRAL_LIGHT, NEUTRAL_DARK, ColorScheme } from './colors';
import { getSettings, saveSetting } from '@/services/database';

interface ThemeContextType {
  colors: ColorScheme;
  isDark: boolean;
  toggleTheme: () => void;
  colorPalette: ColorPaletteName;
  changeColorPalette: (palette: ColorPaletteName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: { ...NEUTRAL_DARK, primary: '#E4E4E7', onPrimary: '#111827' },
  isDark: true,
  toggleTheme: () => {},
  colorPalette: 'grey',
  changeColorPalette: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [colorPalette, setPalette] = useState<ColorPaletteName>('grey');

  useEffect(() => {
    getSettings()
      .then((s) => {
        if (s.colorPalette && COLOR_PALETTES[s.colorPalette as ColorPaletteName]) {
          setPalette(s.colorPalette as ColorPaletteName);
        }
        if (s.themeMode) {
          setIsDark(s.themeMode !== 'light');
        }
      })
      .catch(() => {
        // Use defaults
      });
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    saveSetting('themeMode', next ? 'dark' : 'light').catch(() => {});
  };

  const changeColorPalette = (paletteName: ColorPaletteName) => {
    setPalette(paletteName);
    saveSetting('colorPalette', paletteName).catch(() => {});
  };

  const baseColors = isDark ? NEUTRAL_DARK : NEUTRAL_LIGHT;
  const palette = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.grey;

  // High-contrast text on primary across Yellow, Grey (Dark), Orange, Green, Teal vs Dark palettes
  const isLightPrimary =
    colorPalette === 'yellow' ||
    (isDark && colorPalette === 'grey') ||
    (!isDark && (colorPalette === 'orange' || colorPalette === 'green' || colorPalette === 'teal'));
  const onPrimary = isLightPrimary ? '#111827' : '#FFFFFF';

  const colors: ColorScheme = {
    ...baseColors,
    primary: isDark ? palette.primaryDark : palette.primary,
    onPrimary,
    background: isDark ? palette.darkBg : baseColors.background,
    card: isDark ? palette.cardDark : baseColors.card,
    inputFill: isDark ? palette.inputFillDark : palette.inputFill,
    successBg: baseColors.successBg,
    dangerBg: baseColors.dangerBg,
  };

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme, colorPalette, changeColorPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);