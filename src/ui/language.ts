import { STORAGE_PREFIX } from '../config';
import type { Lang } from '../i18n';

/** Where this device keeps the language chosen. */
export const LANG_KEY = `${STORAGE_PREFIX}.lang`;

/** The language chosen on this device, else the browser's if it is Romanian, else English. */
export function initialLang(): Lang {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(LANG_KEY);
  } catch {
    // storage blocked: the browser's language decides
  }
  if (stored === 'en' || stored === 'ro') return stored;
  return navigator.language.toLowerCase().startsWith('ro') ? 'ro' : 'en';
}
