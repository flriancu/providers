import { describe, expect, it } from 'vitest';
import { ancestors, effectiveLabels, matchLabels, rarelyUsedLabels, subtree } from '../../src/domain/labels';
import { updateRecord } from '../../src/domain/records';
import { FACET_IDS } from '../../src/domain/schema';
import { label, weddingDirectory } from './fixture';

describe('labels', () => {
  it('knows a label with everything under it, and its parents', () => {
    const { doc, labels } = weddingDirectory();
    expect([...subtree(doc, labels.wedding)].sort()).toEqual([labels.wedding, labels.photo, labels.video].sort());
    expect(ancestors(doc, labels.photo)).toEqual([labels.wedding]);
    expect(ancestors(doc, labels.wedding)).toEqual([]);
  });

  it('stops at a loop of parents instead of hanging', () => {
    const { doc, labels, ctx } = weddingDirectory();
    const looped = updateRecord(doc, 'labels', labels.wedding, { parentId: labels.photo }, ctx);
    expect(ancestors(looped, labels.photo)).toEqual([labels.wedding]);
    expect([...subtree(looped, labels.wedding)].sort()).toEqual([labels.wedding, labels.photo, labels.video].sort());
  });

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
    expect(matchLabels(doc, 'nunta').map((l) => l.id)).toEqual([labels.wedding]);
    expect(matchLabels(doc, '   ')).toEqual([]);
  });

  it('puts exact matches before those that start with, and those before those that contain the text', () => {
    const { doc } = weddingDirectory();
    expect(matchLabels(doc, 'o', FACET_IDS.category).length).toBeGreaterThan(0);
    const ranked = matchLabels(doc, 'video');
    expect(ranked[0]!.name).toBe('Video');
  });

  it('lists labels on one provider or none, least used first; a parent counts its children (FR-08)', () => {
    const { doc, ctx } = weddingDirectory();
    const withUnused = label(doc, ctx, FACET_IDS.area, 'Iasi').doc;
    expect(rarelyUsedLabels(withUnused).map(({ label: l, count }) => [l.name, count])).toEqual([
      ['Iasi', 0],
      ['Cluj', 1],
      ['Home', 1],
      ['Plumber', 1],
      ['Shortlist', 1],
      ['Video', 1],
    ]);
  });
});
