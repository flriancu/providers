import { describe, expect, it } from 'vitest';
import { facetCounts, filterProviders, NO_LABEL, NO_SELECTION, type Selection } from '../../src/domain/filter';
import { FACET_IDS } from '../../src/domain/schema';
import { weddingDirectory } from './fixture';

const names = (list: { name: string }[]) => list.map((p) => p.name).sort();
const count = (counts: ReturnType<typeof facetCounts>, facetId: string, labelId: string) => counts[facetId]?.[labelId];

describe('facet filtering (FR-10)', () => {
  const { doc, labels } = weddingDirectory();
  const select = (selection: Selection) => names(filterProviders(doc, selection));

  it('shows everyone when nothing is selected', () => {
    expect(filterProviders(doc, NO_SELECTION)).toHaveLength(5);
  });

  it('includes everything under a selected parent label', () => {
    expect(select({ [FACET_IDS.category]: [labels.wedding] })).toEqual(['BRUNO PHOTOGRAPHY', 'FLASHBOX', 'GRĂDINA CU SĂLCII']);
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

  it('counts a parent label by the providers under its children', () => {
    const counts = facetCounts(doc, NO_SELECTION);
    expect(count(counts, FACET_IDS.category, labels.wedding)).toBe(3);
    expect(count(counts, FACET_IDS.category, labels.photo)).toBe(2);
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
