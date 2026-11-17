import { useCallback, useState } from 'react';
import { STORAGE_PREFIX } from '../config';

/** D-36: light, dark, or the same as this device (the default). */
export const THEMES = ['device', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/** Also read by the script in index.html's head, which sets the theme before the first paint. */
const THEME_KEY = `${STORAGE_PREFIX}.theme`;

/** The theme chosen on this device; "device" when none was chosen or storage is blocked. */
export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return THEMES.find((t) => t === stored) ?? 'device';
  } catch {
    return 'device';
  }
}

const deviceDark = () => window.matchMedia('(prefers-color-scheme: dark)');
let followDevice: (() => void) | null = null;

/**
 * Puts the theme on the page: `data-theme` is light or dark, and app.css holds the dark colours
 * under it. "device" takes the device's setting and follows it when it changes (an evening
 * switch to dark, say). The page's color-scheme follows, so native controls and scrollbars match.
 */
export function applyTheme(theme: Theme) {
  const query = deviceDark();
  if (followDevice) query.removeEventListener('change', followDevice);
  followDevice = null;
  const set = () => {
    const dark = theme === 'dark' || (theme === 'device' && query.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', dark ? 'dark' : 'light');
  };
  set();
  if (theme === 'device') {
    followDevice = set;
    query.addEventListener('change', set);
  }
}

/** The theme and a setter that applies and remembers it on this device. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // not remembered: the choice holds until the page closes
    }
  }, []);
  return [theme, setTheme];
}
