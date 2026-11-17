import { describe, expect, it } from 'vitest';
import { addRecord } from '../../src/domain/records';
import { ProviderSearch } from '../../src/domain/search';
import { weddingDirectory } from './fixture';

describe('search (FR-13, D-23)', () => {
  const { doc, ctx, providers } = weddingDirectory();
  const withLog = addRecord(
    doc,
    'log',
    { providerId: providers.bruno, date: '2026-11-20', text: 'Sends the portfolio on Friday' },
    ctx,
  ).doc;
  const search = new ProviderSearch(withLog);
  const find = (q: string, within?: Set<string>) => search.search(q, within);

  it('ignores case and diacritics', () => {
    expect(find('gradina salcii')).toEqual([providers.gradina]);
  });

  it('matches the beginning of words', () => {
    expect(find('flash')).toEqual([providers.flashbox]);
  });

  it('tolerates typos, including two swapped letters', () => {
    expect(find('photografy')).toEqual([providers.bruno]);
    expect(find('slacii')).toEqual([providers.gradina]);
  });

  it('takes the words in any order, and needs every one of them', () => {
    expect(find('salcii gradina')).toEqual([providers.gradina]);
    expect(find('gradina zzzz')).toEqual([]);
  });

  it('finds words in notes, links and the log', () => {
    expect(find('expensive')).toEqual([providers.gradina]);
    expect(find('brunophoto')).toEqual([providers.bruno]);
    expect(find('portfolio')).toEqual([providers.bruno]);
  });

  it("finds providers by their labels' names and aliases", () => {
    expect(find('foto').sort()).toEqual([providers.bruno, providers.gradina].sort()); // alias of Photo
    expect(find('instalator')).toEqual([providers.plumberAna]); // alias of Plumber
    expect(find('shortlist')).toEqual([providers.flashbox]);
  });

  it('searches only within the providers left by the filters', () => {
    expect(find('gradina', new Set([providers.bruno]))).toEqual([]);
    expect(find('bruno', new Set([providers.bruno]))).toEqual([providers.bruno]);
  });

  it('ranks a match in the name above a match in the notes', () => {
    const { doc: d2, ctx: c2 } = weddingDirectory();
    const extra = addRecord(
      d2,
      'providers',
      {
        name: 'Studio Nord',
        contactPerson: '',
        phones: [],
        emails: [],
        links: [],
        address: '',
        notes: 'like Flashbox',
        labelIds: [],
      },
      c2,
    );
    const ranked = new ProviderSearch(extra.doc).search('flashbox');
    expect(ranked[0]).toBe(providers.flashbox);
    expect(ranked).toContain(extra.id);
  });

  it('returns nothing for an empty query', () => {
    expect(find('   ')).toEqual([]);
  });
});
