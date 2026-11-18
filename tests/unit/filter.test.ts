import { describe, expect, it } from 'vitest';
import { facetCounts, filterProviders, liveSelection, NO_LABEL, NO_SELECTION, type Selection } from '../../src/domain/filter';
import { addRecord } from '../../src/domain/records';
import { FACET_IDS, newDirectory, own } from '../../src/domain/schema';
import { label, OWNER, provider, testContext, weddingDirectory } from './fixture';

const names = (list: { name: string }[]) => list.map((p) => p.name).sort();
const count = (counts: ReturnType<typeof facetCounts>, facetId: string, labelId: string) => counts[facetId]?.[labelId];

describe('facet filtering (FR-10)', () => {
  const { doc, labels } = weddingDirectory();
  const select = (selection: Selection) => names(filterProviders(doc, selection));

  it('shows everyone when nothing is selected', () => {
    expect(filterProviders(doc, NO_SELECTION)).toHaveLength(5);
  });

  it('combines values of one facet with OR, and facets with AND', () => {
    expect(select({ [FACET_IDS.category]: [labels.photo, labels.plumber] })).toEqual([
      'Ana Instalații',
      'BRUNO PHOTOGRAPHY',
      'GRĂDINA CU SĂLCII',
    ]);
    expect(select({ [FACET_IDS.category]: [labels.photo, labels.video], [FACET_IDS.area]: [labels.bucharest] })).toEqual([
      'FLASHBOX',
      'GRĂDINA CU SĂLCII',
    ]);
  });

  it('finds the providers with no label in a facet (D-33), alone or with other values', () => {
    expect(select({ [FACET_IDS.category]: [NO_LABEL] })).toEqual(['LAGOO']);
    expect(select({ [FACET_IDS.category]: [NO_LABEL, labels.plumber] })).toEqual(['Ana Instalații', 'LAGOO']);
    expect(select({ [FACET_IDS.lists]: [NO_LABEL] })).toHaveLength(4);
  });
});

describe('counts next to each value (FR-11)', () => {
  const { doc, labels } = weddingDirectory();

  it('counts the providers carrying each label, and those with none in the facet', () => {
    const counts = facetCounts(doc, NO_SELECTION);
    expect(count(counts, FACET_IDS.category, labels.photo)).toBe(2);
    expect(count(counts, FACET_IDS.category, labels.video)).toBe(1);
    expect(count(counts, FACET_IDS.category, NO_LABEL)).toBe(1);
    expect(count(counts, FACET_IDS.lists, NO_LABEL)).toBe(4);
  });

  it("ignores a facet's own selection, so ticking another value of it says how many it adds", () => {
    const counts = facetCounts(doc, { [FACET_IDS.area]: [labels.bucharest] });
    // Area values still count as if no area were selected...
    expect(count(counts, FACET_IDS.area, labels.cluj)).toBe(1);
    expect(count(counts, FACET_IDS.area, labels.bucharest)).toBe(3);
    // ...while other facets count within București.
    expect(count(counts, FACET_IDS.category, labels.photo)).toBe(1);
    expect(count(counts, FACET_IDS.category, labels.plumber)).toBe(1);
  });

  it('shows for each value exactly how many providers selecting only it would list', () => {
    const selection: Selection = { [FACET_IDS.area]: [labels.cluj] };
    const counts = facetCounts(doc, selection);
    for (const [facetId, values] of Object.entries(counts)) {
      for (const [labelId, n] of Object.entries(values)) {
        const onlyThis = { ...selection, [facetId]: [labelId] };
        expect(filterProviders(doc, onlyThis).length, `${facetId}/${labelId}`).toBe(n);
      }
    }
  });
});

describe('selections that outlive their labels', () => {
  it('drops values whose label or facet is gone, keeping "none" and live labels', () => {
    const { doc, labels } = weddingDirectory();
    expect(
      liveSelection(doc, {
        [FACET_IDS.category]: [labels.photo, 'deleted-label', NO_LABEL, labels.cluj],
        'facet-gone': [labels.photo],
        [FACET_IDS.area]: ['also-gone'],
      }),
    ).toEqual({ [FACET_IDS.category]: [labels.photo, NO_LABEL] });
  });
});

describe('ids that are names of built-in properties', () => {
  // A directory file comes from anywhere; its ids are plain keys, never Object.prototype's members.
  it('filters and counts labels and facets named "__proto__" or "constructor"', () => {
    const ids = ['constructor', '__proto__', 'p1', 'p2'];
    const ctx = { ...testContext(), newId: () => ids.shift()! };
    let doc = addRecord(newDirectory(OWNER), 'facets', { name: 'Hall', order: 9 }, ctx).doc; // facet "constructor"
    doc = label(doc, ctx, 'constructor', 'Big').doc; // label "__proto__"
    doc = provider(doc, ctx, 'Inside', { labelIds: ['__proto__'] }).doc;
    doc = provider(doc, ctx, 'Outside').doc;

    const selection = liveSelection(doc, Object.fromEntries([['constructor', ['__proto__']]]));
    expect(Object.keys(selection)).toEqual(['constructor']);
    expect(names(filterProviders(doc, selection))).toEqual(['Inside']);
    const hall = own(facetCounts(doc, NO_SELECTION), 'constructor');
    expect(hall && own(hall, '__proto__')).toBe(1);
    expect(hall?.[NO_LABEL]).toBe(1);
  });
});
