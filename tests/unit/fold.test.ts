import { describe, expect, it } from 'vitest';
import { fold } from '../../src/domain/fold';

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
