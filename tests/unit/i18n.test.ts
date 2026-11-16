import { describe, expect, it } from 'vitest';
import { LANGS, translate } from '../../src/i18n';
import { en } from '../../src/i18n/en';

describe('translations', () => {
  it('has a non-empty text for every key in every language', () => {
    for (const lang of LANGS) {
      for (const key of Object.keys(en) as (keyof typeof en)[]) expect(translate(lang, key).trim(), `${lang} ${key}`).not.toBe('');
    }
  });
});
