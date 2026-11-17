import type { Lang } from './index';

/**
 * Counted phrases, in each language's plural forms (CLDR, as Intl.PluralRules returns them):
 * English one/other ("1 provider", "2 providers"); Romanian one/few/other ("1 furnizor",
 * "2 furnizori", "20 de furnizori"). `{n}` is the number.
 */
const PLURALS = {
  en: {
    providers: { one: '{n} provider', other: '{n} providers' },
    rows: { one: '{n} row', other: '{n} rows' },
    labels: { one: '{n} label', other: '{n} labels' },
    phones: { one: '{n} phone', other: '{n} phones' },
    emails: { one: '{n} email', other: '{n} emails' },
    links: { one: '{n} link', other: '{n} links' },
  },
  ro: {
    providers: { one: '{n} furnizor', few: '{n} furnizori', other: '{n} de furnizori' },
    rows: { one: '{n} rând', few: '{n} rânduri', other: '{n} de rânduri' },
    labels: { one: '{n} etichetă', few: '{n} etichete', other: '{n} de etichete' },
    phones: { one: '{n} telefon', few: '{n} telefoane', other: '{n} de telefoane' },
    emails: { one: '{n} e-mail', few: '{n} e-mailuri', other: '{n} de e-mailuri' },
    links: { one: '{n} link', few: '{n} linkuri', other: '{n} de linkuri' },
  },
} satisfies Record<Lang, Record<string, Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }>>;

export type PluralKey = keyof (typeof PLURALS)['en'];

const LOCALES: Record<Lang, string> = { en: 'en-GB', ro: 'ro-RO' };

export function pluralize(lang: Lang, key: PluralKey, n: number): string {
  const forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string } = PLURALS[lang][key];
  const form = forms[new Intl.PluralRules(LOCALES[lang]).select(n)] ?? forms.other;
  return form.replace('{n}', new Intl.NumberFormat(LOCALES[lang]).format(n));
}
