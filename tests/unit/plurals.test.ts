import { describe, expect, it } from 'vitest';
import { pluralize } from '../../src/i18n/plurals';

describe('counted phrases', () => {
  it('use the English singular for one, plural otherwise', () => {
    expect([0, 1, 2, 21].map((n) => pluralize('en', 'providers', n))).toEqual(['0 providers', '1 provider', '2 providers', '21 providers']);
  });

  it('use the three Romanian forms: "de" when the last two digits are 00 or 20 to 99', () => {
    expect([0, 1, 2, 19, 20, 101, 1000].map((n) => pluralize('ro', 'providers', n))).toEqual([
      '0 furnizori',
      '1 furnizor',
      '2 furnizori',
      '19 furnizori',
      '20 de furnizori',
      '101 furnizori',
      '1.000 de furnizori',
    ]);
  });
});
