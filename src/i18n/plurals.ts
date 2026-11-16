import type { Lang } from './index';

/**
 * Counted phrases, in each language's plural forms (CLDR, as Intl.PluralRules returns them):
 * English one/other ("1 provider", "2 providers"); Romanian one/few/other ("1 furnizor",
 * "2 furnizori", "20 de furnizori"). `{n}` is the number.
 */
const PLURALS = {
  en: {
    providers: { one: '{n} provider', other: '{n} providers' },
  },
  ro: {
    providers: { one: '{n} furnizor', few: '{n} furnizori', other: '{n} de furnizori' },
  },
} satisfies Record<Lang, Record<string, Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }>>;

export type PluralKey = keyof (typeof PLURALS)['en'];

const LOCALES: Record<Lang, string> = { en: 'en-GB', ro: 'ro-RO' };

export function pluralize(lang: Lang, key: PluralKey, n: number): string {
  const forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string } = PLURALS[lang][key];
  const form = forms[new Intl.PluralRules(LOCALES[lang]).select(n)] ?? forms.other;
  return form.replace('{n}', new Intl.NumberFormat(LOCALES[lang]).format(n));
}
