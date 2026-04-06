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
  colors: { ...NEUTRAL_DARK, primary: '#9CA3AF' },
  isDark: true,
  toggleTheme: () => {},
  colorPalette: 'grey',
  changeColorPalette: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [colorPalette, setPalette] = useState<ColorPaletteName>('grey');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => {
        if (s.colorPalette) {
          setPalette(s.colorPalette as ColorPaletteName);
        }
      })
      .catch(() => {
        // Use defaults
      })
      .finally(() => {
        setReady(true);
      });
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    saveSetting('themeMode', next ? 'dark' : 'light').catch(() => {});
  };

  const changeColorPalette = (palette: ColorPaletteName) => {
    setPalette(palette);
    saveSetting('colorPalette', palette).catch(() => {});
  };

  const baseColors = isDark ? NEUTRAL_DARK : NEUTRAL_LIGHT;
  const palette = COLOR_PALETTES[colorPalette];
  const colors: ColorScheme = {
    ...baseColors,
    primary: isDark ? palette.primaryDark : palette.primary,
    background: isDark ? palette.darkBg : palette.subtle,
    card: isDark ? palette.darkBg : palette.subtle,
    inputFill: isDark ? palette.inputFillDark : palette.inputFill,
    successBg: isDark ? palette.subtleDark : palette.subtle,
    dangerBg: isDark ? palette.subtleDark : palette.subtle,
  };

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme, colorPalette, changeColorPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);