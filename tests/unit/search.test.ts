import { describe, expect, it } from 'vitest';
import { addRecord, deleteRecord, updateRecord } from '../../src/domain/records';
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

describe('the index kept in step with edits', () => {
  it('finds what an edit added, forgets what it removed, and hands out a new search only then', () => {
    const { doc, ctx, providers } = weddingDirectory();
    const index = new ProviderSearch(doc);
    const first = index.sync(doc);
    expect(index.sync(doc)).toBe(first); // nothing changed: the same search
    expect(first('portfolio')).toEqual([]);

    const logged = addRecord(doc, 'log', { providerId: providers.bruno, date: '2026-11-20', text: 'Sends the portfolio' }, ctx).doc;
    const second = index.sync(logged);
    expect(second).not.toBe(first);
    expect(second('portfolio')).toEqual([providers.bruno]);

    const renamed = updateRecord(logged, 'providers', providers.flashbox, { name: 'Lightbox' }, ctx);
    const gone = deleteRecord(renamed, 'providers', providers.lagoo, ctx);
    const third = index.sync(gone);
    expect(third('lightbox')).toEqual([providers.flashbox]);
    expect(third('lightbox flashbox')).toEqual([providers.flashbox]); // new name, and the email it keeps
    expect(third('lagoo')).toEqual([]);
  });
});

describe('finding by contact details', () => {
  it('finds a provider by a phone number in any of its usual forms, and by email', () => {
    const { doc, ctx } = weddingDirectory();
    const added = addRecord(
      doc,
      'providers',
      {
        name: 'Phoned',
        contactPerson: '',
        phones: ['+40 744 555 666'],
        emails: ['office@phoned.ro'],
        links: [],
        address: '',
        notes: '',
        labelIds: [],
      },
      ctx,
    );
    const find = new ProviderSearch(added.doc);
    for (const q of ['0744 555 666', '0744555666', '+40744555666', '744 555', 'office@phoned.ro', 'phoned.ro'])
      expect(find.search(q)[0]).toBe(added.id);
  });
});
