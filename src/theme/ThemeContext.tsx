import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, ColorScheme } from './colors';
import { getSettings, saveSetting } from '@/services/database';

interface ThemeContextType {
  colors: ColorScheme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: dark,
  isDark: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => {
        if (s.themeMode === 'system') {
          setIsDark(systemScheme === 'dark');
        } else {
          setIsDark(s.themeMode !== 'light');
        }
      })
      .catch(() => {
        // DB failed — fall back to dark mode
        setIsDark(true);
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

  // Don't render children until theme is loaded from DB
  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ colors: isDark ? dark : light, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
