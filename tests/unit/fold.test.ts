import { describe, expect, it } from 'vitest';
import { fold, isBlank } from '../../src/domain/fold';

describe('fold', () => {
  it('ignores case, diacritics and extra white space', () => {
    expect(fold('  Grădina cu   Sălcii ')).toBe('gradina cu salcii');
  });

  it('folds both Romanian s and t forms, comma below and cedilla', () => {
    expect(fold('Ștefan Țărână')).toBe('stefan tarana');
    expect(fold('Şerban Ţugui')).toBe('serban tugui');
  });

  it('keeps letters without diacritics as they are', () => {
    expect(fold('AIFUNBOX CABINĂ FOTO CU AI')).toBe('aifunbox cabina foto cu ai');
  });
});

describe('invisible characters', () => {
  it('never tell two names apart, and a name of them alone is empty', () => {
    expect(fold('Sample\u200bPhoto Studio')).toBe(fold('SamplePhoto Studio'));
    expect(isBlank('\u0301\u0308')).toBe(true); // combining marks with no letter
    expect(isBlank('é')).toBe(false);
  });
});
