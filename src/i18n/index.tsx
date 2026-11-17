import { createContext, Fragment, useContext, useMemo, type ReactNode } from 'react';
import { en, type MessageKey } from './en';
import { pluralize, type PluralKey } from './plurals';
import { ro } from './ro';

export type Lang = 'en' | 'ro';
export type { MessageKey };

export const LANGS: readonly Lang[] = ['en', 'ro'];

const DICTS: Record<Lang, Record<MessageKey, string>> = { en, ro };
const LOCALES: Record<Lang, string> = { en: 'en-GB', ro: 'ro-RO' };

/** A message with its `{name}` placeholders filled in; an unknown placeholder stays visible. */
export function translate(lang: Lang, key: MessageKey, params?: Record<string, string | number>): string {
  return DICTS[lang][key].replace(/\{(\w+)\}/g, (_, p: string) => String(params?.[p] ?? `{${p}}`));
}

/**
 * A message with placeholders filled by elements (a label chip inside a sentence), so the word
 * order stays the translation's. Text-only places (buttons' names, aria-label) use `translate`.
 */
export function translateParts(lang: Lang, key: MessageKey, params: Record<string, ReactNode>): ReactNode {
  const parts = DICTS[lang][key].split(/\{(\w+)\}/);
  // split with a capture group: even indexes are text, odd ones placeholder names
  return parts.map((part, i) => <Fragment key={i}>{i % 2 ? (params[part] ?? `{${part}}`) : part}</Fragment>);
}

export interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  /** `t` with elements in the placeholders, e.g. a label chip. */
  tx: (key: MessageKey, params: Record<string, ReactNode>) => ReactNode;
  /** A counted phrase in the language's plural form: "1 provider", "20 de furnizori". */
  plural: (key: PluralKey, n: number) => string;
  /** A calendar day (YYYY-MM-DD) with full day and month names, e.g. "Friday 20 November 2026". */
  date: (isoDate: string) => string;
  /** Items joined as the language lists them: "a, b and c", "a, b și c". */
  list: (items: readonly string[]) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ lang, setLang, children }: { lang: Lang; setLang: (lang: Lang) => void; children: ReactNode }) {
  const value = useMemo<I18n>(() => {
    // Calendar days are whole UTC days: formatting in UTC keeps the day the user picked.
    const format = new Intl.DateTimeFormat(LOCALES[lang], {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const listFormat = new Intl.ListFormat(LOCALES[lang], { type: 'conjunction' });
    return {
      lang,
      setLang,
      t: (key, params) => translate(lang, key, params),
      tx: (key, params) => translateParts(lang, key, params),
      plural: (key, n) => pluralize(lang, key, n),
      date: (isoDate) => format.format(new Date(`${isoDate}T00:00:00Z`)),
      list: (items) => listFormat.format(items),
    };
  }, [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n outside I18nProvider');
  return value;
}
