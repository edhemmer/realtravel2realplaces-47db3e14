/**
 * ThemeContext — system-aware light/dark mode.
 *
 * - Default: follow OS (`prefers-color-scheme`)
 * - User override persisted in localStorage ('rt2rp-theme')
 * - Applies `dark` class to <html> for Tailwind dark variants
 * - On Capacitor iOS, also syncs StatusBar style + background color
 *
 * Single source of truth for theme. Mounted once near the root of App.tsx.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemePref = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** What the user picked (or 'system' to follow OS). */
  preference: ThemePref;
  /** Actual mode currently applied. */
  theme: ResolvedTheme;
  setPreference: (pref: ThemePref) => void;
  /** Toggle between light and dark (sets explicit preference). */
  toggle: () => void;
}

const STORAGE_KEY = 'rt2rp-theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPref(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // SSR or storage blocked — fall through
  }
  return 'system';
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(pref: ThemePref): ResolvedTheme {
  return pref === 'system' ? getSystemTheme() : pref;
}

async function syncNativeStatusBar(theme: ResolvedTheme): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    // Style.Dark = dark glyphs on light bg; Style.Light = light glyphs on dark bg.
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Light : Style.Dark }).catch(() => {});
    await StatusBar.setBackgroundColor({
      color: theme === 'dark' ? '#0B1220' : '#F6F8FB',
    }).catch(() => {});
  } catch {
    // Native plugins unavailable — safe to ignore on web.
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePref>(() => readStoredPref());
  const [theme, setTheme] = useState<ResolvedTheme>(() => resolve(readStoredPref()));

  // Apply class + native status bar whenever resolved theme changes.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    root.style.colorScheme = theme;
    void syncNativeStatusBar(theme);
  }, [theme]);

  // React to OS scheme changes only while in 'system' mode.
  useEffect(() => {
    if (preference !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setTheme(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    onChange();
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  // Recompute theme on preference change.
  useEffect(() => {
    setTheme(resolve(preference));
  }, [preference]);

  const setPreference = (pref: ThemePref) => {
    try {
      if (pref === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // Storage blocked — keep in-memory state regardless.
    }
    setPreferenceState(pref);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      theme,
      setPreference,
      toggle: () => setPreference(theme === 'dark' ? 'light' : 'dark'),
    }),
    [preference, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
