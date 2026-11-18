import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LANGS, translate, translateParts } from '../../src/i18n';
import { en } from '../../src/i18n/en';

describe('translations', () => {
  it('has a non-empty text for every key in every language', () => {
    for (const lang of LANGS) {
      for (const key of Object.keys(en) as (keyof typeof en)[]) expect(translate(lang, key).trim(), `${lang} ${key}`).not.toBe('');
    }
  });

  it('puts an element (a label chip) where a placeholder is, in the word order of each language', () => {
    const chip = createElement('b', null, 'Sample fair');
    const html = (lang: 'en' | 'ro') =>
      renderToStaticMarkup(createElement(Fragment, null, translateParts(lang, 'labels.mergeHelp', { label: chip })));
    expect(html('en')).toBe('Every provider with <b>Sample fair</b> gets the label you choose, and <b>Sample fair</b> is deleted.');
    expect(html('ro')).toContain('<b>Sample fair</b>');
    expect(html('ro')).not.toContain('{label}');
  });
});

describe('Romanian summaries', () => {
  it('name each count, so no word has to agree with the number', () => {
    const text = translate('ro', 'import.done', {
      added: '',
      merged: '',
      skipped: '',
      labels: '',
      addedCount: 1,
      mergedCount: 0,
      skippedCount: 2,
      labelsCount: 1,
    });
    expect(text).toBe('Import făcut. Furnizori adăugați: 1; furnizori uniți: 0; rânduri lăsate deoparte: 2; etichete create: 1.');
  });
});
