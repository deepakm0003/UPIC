import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkPalette, lightPalette, Palette, TextSize, textSizeFactor } from '../theme/tokens';

export type ThemePreference = 'system' | 'dark' | 'light';

interface ThemeContextType {
  theme: Palette;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  /** Scales a font size by the user's text-size preference. */
  fs: (size: number) => number;
}

const PREF_KEY = '@upic_theme_pref';
const TEXT_SIZE_KEY = '@upic_text_size';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const [textSize, setTextSizeState] = useState<TextSize>('standard');

  useEffect(() => {
    (async () => {
      try {
        const [pref, size] = await Promise.all([
          AsyncStorage.getItem(PREF_KEY),
          AsyncStorage.getItem(TEXT_SIZE_KEY),
        ]);
        if (pref === 'system' || pref === 'dark' || pref === 'light') setPreferenceState(pref);
        if (size === 'standard' || size === 'large' || size === 'xlarge') setTextSizeState(size);
      } catch {
        // Defaults are fine if storage is unavailable.
      }
    })();
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(PREF_KEY, pref).catch(() => undefined);
  }, []);

  const setTextSize = useCallback((size: TextSize) => {
    setTextSizeState(size);
    AsyncStorage.setItem(TEXT_SIZE_KEY, size).catch(() => undefined);
  }, []);

  const resolved = preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;
  const theme = resolved === 'light' ? lightPalette : darkPalette;
  const factor = textSizeFactor[textSize];

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      preference,
      setPreference,
      textSize,
      setTextSize,
      fs: (size: number) => Math.round(size * factor),
    }),
    [theme, preference, setPreference, textSize, setTextSize, factor]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

/**
 * Forces a palette for a part of the app — onboarding and sign-in are always
 * the white "ink" style, while the main app follows the user's preference.
 */
export const ThemeScope: React.FC<{ mode: 'light' | 'dark'; children: ReactNode }> = ({ mode, children }) => {
  const parent = useTheme();
  const value = useMemo(() => ({ ...parent, theme: mode === 'light' ? lightPalette : darkPalette }), [parent, mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
