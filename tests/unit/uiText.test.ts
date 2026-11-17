import { describe, expect, it } from 'vitest';
import { en } from '../../src/i18n/en';
import { ro } from '../../src/i18n/ro';

/**
 * NFR-08 in the build: interface text is full sentences without abbreviations, and "·" never
 * joins a status to an action ("Not saved · Try again"); say each in its own words.
 */
const BANNED: [RegExp, string][] = [
  [/\be\.g\./i, 'e.g.'],
  [/\bi\.e\./i, 'i.e.'],
  [/\betc\b/i, 'etc.'],
  [/\binfo\b/i, 'info'],
  [/\bapprox\b/i, 'approx.'],
  [/\bex\./i, 'ex. (Romanian "de exemplu")'],
  [/\bnr\./i, 'nr. (Romanian "număr")'],
  [/ & /, '&'],
  [/·/, '"·" as a joiner'],
];

describe('interface text (NFR-08)', () => {
  for (const [lang, dict] of [
    ['en', en],
    ['ro', ro],
  ] as const) {
    it(`has no abbreviations or joined phrases in ${lang}`, () => {
      const found = Object.entries(dict).flatMap(([key, text]) =>
        BANNED.filter(([pattern]) => pattern.test(text)).map(([, what]) => `${key}: ${what} in "${text}"`),
      );
      expect(found).toEqual([]);
    });
  }
});
