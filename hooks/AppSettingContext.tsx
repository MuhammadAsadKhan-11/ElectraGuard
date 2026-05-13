// context/AppSettingsContext.tsx
// ─────────────────────────────────────────────────────────────
// ElectraGuard — Global App Settings (Language + Theme)
// Wrap your root layout with <AppSettingsProvider>
// ─────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { I18nManager } from 'react-native';
import {
  Language,
  Theme,
  Translations,
  isRTL,
  translationsMap,
} from '../constants/translations';

// ─────────────────────────────────────────────────────────────
// THEME COLORS
// ─────────────────────────────────────────────────────────────
export interface ThemeColors {
  background:   string;
  card:         string;
  text:         string;
  subText:      string;
  border:       string;
  primary:      string;
  inputBg:      string;
  statusBar:    'light-content' | 'dark-content';
}

export const lightColors: ThemeColors = {
  background: '#F7F8FC',
  card:       '#FFFFFF',
  text:       '#1A202C',
  subText:    '#718096',
  border:     '#F1F5F9',
  primary:    '#0B3C5D',
  inputBg:    '#F9FAFB',
  statusBar:  'dark-content',
};

export const darkColors: ThemeColors = {
  background: '#0F1923',
  card:       '#1A2535',
  text:       '#F0F4F8',
  subText:    '#A0AEC0',
  border:     '#2D3748',
  primary:    '#2EC4B6',
  inputBg:    '#1E2D3D',
  statusBar:  'light-content',
};

// ─────────────────────────────────────────────────────────────
// CONTEXT TYPE
// ─────────────────────────────────────────────────────────────
interface AppSettingsContextType {
  language:     Language;
  theme:        Theme;
  colors:       ThemeColors;
  t:            Translations;
  isRtl:        boolean;
  setLanguage:  (lang: Language) => void;
  setTheme:     (theme: Theme) => void;
}

const AppSettingsContext = createContext<AppSettingsContextType>({
  language:    'en',
  theme:       'system',
  colors:      lightColors,
  t:           translationsMap['en'],
  isRtl:       false,
  setLanguage: () => {},
  setTheme:    () => {},
});

// ─────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────
export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme                  = useColorScheme();
  const [language, setLangState]      = useState<Language>('en');
  const [theme, setThemeState]        = useState<Theme>('system');

  // ── Load saved settings on mount ──────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [savedLang, savedTheme] = await Promise.all([
          AsyncStorage.getItem('app_language'),
          AsyncStorage.getItem('app_theme'),
        ]);
        if (savedLang)  setLangState(savedLang as Language);
        if (savedTheme) setThemeState(savedTheme as Theme);
      } catch (e) {
        console.error('Settings load error:', e);
      }
    };
    load();
  }, []);

  // ── Set language + save ────────────────────────────────────
  const setLanguage = useCallback(async (lang: Language) => {
    setLangState(lang);
    await AsyncStorage.setItem('app_language', lang);
    // Apply RTL layout direction
    const rtl = isRTL(lang);
    if (I18nManager.isRTL !== rtl) {
      I18nManager.forceRTL(rtl);
      // Note: full RTL flip requires app restart; strings will switch immediately
    }
  }, []);

  // ── Set theme + save ───────────────────────────────────────
  const setTheme = useCallback(async (t: Theme) => {
    setThemeState(t);
    await AsyncStorage.setItem('app_theme', t);
  }, []);

  // ── Resolve active colors ──────────────────────────────────
  const resolvedDark =
    theme === 'dark' ? true :
    theme === 'light' ? false :
    systemScheme === 'dark';

  const colors = resolvedDark ? darkColors : lightColors;
  const t      = translationsMap[language];
  const isRtl  = isRTL(language);

  return (
    <AppSettingsContext.Provider value={{ language, theme, colors, t, isRtl, setLanguage, setTheme }}>
      {children}
    </AppSettingsContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────
export const useAppSettings = () => useContext(AppSettingsContext);