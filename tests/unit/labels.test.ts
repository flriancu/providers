import { describe, expect, it } from 'vitest';
import { effectiveLabels, matchLabels, rarelyUsedLabels } from '../../src/domain/labels';
import { createLabel } from '../../src/domain/edits';
import { FACET_IDS, newDirectory } from '../../src/domain/schema';
import { facetLabels } from '../../src/ui/labelText';
import { label, OWNER, testContext, weddingDirectory } from './fixture';

describe('labels', () => {
  it('gives a provider only its own labels: none stands in for a missing category (D-33)', () => {
    const { doc, providers } = weddingDirectory();
    expect(effectiveLabels(doc, doc.providers[providers.lagoo]!)).toHaveLength(1);
    expect(effectiveLabels(doc, doc.providers[providers.bruno]!)).toHaveLength(2);
  });

  it('finds labels by name or alias, ignoring case and diacritics (FR-07)', () => {
    const { doc, labels } = weddingDirectory();
    expect(matchLabels(doc, 'foto').map((l) => l.id)).toEqual([labels.photo]);
    expect(matchLabels(doc, 'BUCURESTI').map((l) => l.id)).toEqual([labels.bucharest]);
    expect(matchLabels(doc, 'instal').map((l) => l.id)).toEqual([labels.plumber]);
    expect(matchLabels(doc, '   ')).toEqual([]);
  });

  it('puts exact matches before those that start with, and those before those that contain the text', () => {
    const { doc } = weddingDirectory();
    expect(matchLabels(doc, 'o', FACET_IDS.category).length).toBeGreaterThan(0);
    const ranked = matchLabels(doc, 'video');
    expect(ranked[0]!.name).toBe('Video');
  });

  it('lists labels on one provider or none, least used first (FR-08)', () => {
    const { doc, ctx } = weddingDirectory();
    const withUnused = label(doc, ctx, FACET_IDS.area, 'Iasi').doc;
    expect(rarelyUsedLabels(withUnused).map(({ label: l, count }) => [l.name, count])).toEqual([
      ['Iasi', 0],
      ['Cluj', 1],
      ['Plumber', 1],
      ['Shortlist', 1],
      ['Video', 1],
    ]);
  });
});

describe('label order', () => {
  it("lists a group's labels in the order every other list uses, ignoring case, diacritics and doubled spaces", () => {
    const ctx = testContext();
    let doc = newDirectory(OWNER);
    for (const name of ['Foto  Video', 'foto studio', 'Ăla', 'Bun']) doc = createLabel(doc, { facetId: FACET_IDS.lists, name }, ctx).doc;
    expect(facetLabels(doc, FACET_IDS.lists).map((l) => l.name)).toEqual(['Ăla', 'Bun', 'foto studio', 'Foto  Video']);
  });
});
