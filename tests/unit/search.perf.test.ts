import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { facetCounts, filterProviders, type Selection } from '../../src/domain/filter';
import { put, type DirectoryDoc, type Label, type Provider } from '../../src/domain/schema';
import { ProviderSearch } from '../../src/domain/search';
import { FACET_IDS, newDirectory } from '../../src/domain/schema';

/**
 * NFR-10: with 10,000 providers, a search or a filter change takes at most 100 ms on a
 * mid-range phone. Measured here on the machine running the tests, which is faster than a phone;
 * the numbers are printed so the margin can be judged (evidence/phase2-speed.txt).
 */
const BUDGET_MS = 100;
const N = 10_000;

const WORDS = [
  'Grădina',
  'Sălcii',
  'Florărie',
  'Fotograf',
  'Ștefan',
  'Bucureşti',
  'Events',
  'Studio',
  'Atelier',
  'Ballroom',
  'Cofetăria',
  'Muzică',
  'Lumină',
];

/** The record fields every synthetic record shares. */
const meta = (id: string) => ({ id, createdAt: '2026-11-16T00:00:00.000Z', updatedAt: '2026-11-16T00:00:00.000Z', updatedBy: 'owner' });

function syntheticDirectory(): DirectoryDoc {
  let seed = 42;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed / 2147483648);
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)]!;
  const sentence = (n: number) => Array.from({ length: n }, () => pick(WORDS)).join(' ');
  const doc = newDirectory('owner');
  const addLabel = (id: string, facetId: string) => {
    const l: Label = { ...meta(id), facetId, name: id, color: 'blue', aliases: [] };
    put(doc.labels, id, l);
    return id;
  };
  const categories = Array.from({ length: 25 }, (_, i) => addLabel(`cat-${i}`, FACET_IDS.category));
  const areas = Array.from({ length: 8 }, (_, i) => addLabel(`area-${i}`, FACET_IDS.area));
  const sources = Array.from({ length: 3 }, (_, i) => addLabel(`source-${i}`, FACET_IDS.source));
  for (let i = 0; i < N; i++) {
    const p: Provider = {
      ...meta(`p${i}`),
      name: `${pick(WORDS)} ${pick(WORDS)} ${i}`,
      contactPerson: `${pick(WORDS)} ${pick(WORDS)}`,
      phones: [`+40 721 ${String(i).padStart(6, '0')}`],
      emails: [`contact${i}@example.ro`],
      links: [`https://example${i}.ro`, `https://instagram.com/example${i}`],
      address: `Strada ${pick(WORDS)} ${i}`,
      notes: sentence(30),
      labelIds: [pick(categories), pick(areas), pick(sources)],
    };
    put(doc.providers, p.id, p);
  }
  return doc;
}

function time(fn: () => unknown, repeats: number): number {
  fn();
  const start = performance.now();
  for (let r = 0; r < repeats; r++) fn();
  return (performance.now() - start) / repeats;
}

describe(`speed with ${N} providers (NFR-10)`, () => {
  const doc = syntheticDirectory();
  const selection: Selection = { [FACET_IDS.category]: ['cat-1', 'cat-2-0'], [FACET_IDS.area]: ['area-3'] };

  it('filters and counts within the budget', () => {
    const ms = time(() => {
      filterProviders(doc, selection);
      facetCounts(doc, selection);
    }, 5);
    console.log(`filter + counts: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('takes one edit into the index within the budget, without building it again', () => {
    const search = new ProviderSearch(doc);
    const [first] = Object.keys(doc.providers);
    const edited = { ...doc, providers: { ...doc.providers } };
    put(edited.providers, first!, { ...doc.providers[first!]!, name: 'Renamed Unique Zanzibar' });
    const start = performance.now();
    const find = search.sync(edited);
    const ms = performance.now() - start;
    console.log(`one edit into the index: ${ms.toFixed(0)} ms`);
    expect(find('zanzibar')).toEqual([first]);
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('searches within the budget, after building the index once', () => {
    const start = performance.now();
    const search = new ProviderSearch(doc);
    console.log(`index build: ${(performance.now() - start).toFixed(0)} ms (once per page; edits are taken in one by one after it)`);
    const within = new Set(filterProviders(doc, selection).map((p) => p.id));
    for (const q of ['gradina', 'slacii', 'flor', 'fotgraf studio', 'example123']) {
      const ms = time(() => search.search(q, within), 5);
      const all = time(() => search.search(q), 5);
      console.log(`search "${q}": ${ms.toFixed(1)} ms within ${within.size} filtered, ${all.toFixed(1)} ms over all ${N}`);
      expect(ms).toBeLessThan(BUDGET_MS);
      expect(all).toBeLessThan(BUDGET_MS);
    }
  });
});

describe('import preview with 10,000 rows (NFR-10)', () => {
  it('finds the look-alikes of every row by lookup, not by comparing every pair', async () => {
    const { exportRows, planImport, facetWordsFrom } = await import('../../src/domain/transfer');
    const { parseCsv, toCsv } = await import('../../src/domain/csv');
    const doc = syntheticDirectory();
    const rows = parseCsv(toCsv(exportRows(doc, Object.values(doc.providers), (f) => f.name || f.key!)));
    const start = performance.now();
    const plan = planImport(
      doc,
      rows,
      facetWordsFrom([{ 'facet.category': 'category', 'facet.area': 'area', 'facet.source': 'source', 'facet.lists': 'lists' }]),
    );
    const ms = performance.now() - start;
    console.log(`import preview, ${plan.rows.length} rows onto ${N} providers: ${ms.toFixed(0)} ms`);
    expect(plan.rows.every((r) => r.duplicates.length >= 1)).toBe(true); // each row is a provider already here
    expect(ms).toBeLessThan(2_000); // 367 ms here; pair by pair it took 972 s
  });
});

describe('merging two versions of 10,000 providers', () => {
  it('merges value by value and checks label names within a second', async () => {
    const { hasLocalWins, merge } = await import('../../src/domain/merge');
    const { updateRecord } = await import('../../src/domain/records');
    const doc = syntheticDirectory();
    const device = (start: number, label: string) => {
      let d = doc;
      const clock = { by: 'owner', now: () => new Date(start), newId: () => 'unused' };
      for (let i = 0; i < N; i += 10) {
        const p = d.providers[`p${i}`]!;
        d = updateRecord(d, 'providers', p.id, { labelIds: [...p.labelIds, label] }, clock);
      }
      return d;
    };
    const phone = device(Date.UTC(2026, 10, 17), 'cat-1');
    const laptop = device(Date.UTC(2026, 10, 18), 'area-1');
    const start = performance.now();
    const merged = merge(phone, laptop);
    const needsSaving = hasLocalWins(phone, laptop);
    const ms = performance.now() - start;
    console.log(`merge + hasLocalWins, ${N / 10} providers changed on each side: ${ms.toFixed(0)} ms`);
    expect(needsSaving).toBe(true);
    expect(merged.providers.p0!.labelIds).toEqual(expect.arrayContaining(['cat-1', 'area-1']));
    expect(ms).toBeLessThan(1_000);
  });
});
