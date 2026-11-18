import { describe, expect, it } from 'vitest';
import { createLabel, mergeLabels, moveLabel, renameLabel } from '../../src/domain/edits';
import { hasLocalWins, merge } from '../../src/domain/merge';
import { readDirectory, toFile } from '../../src/domain/migrate';
import { deleteRecord, updateRecord } from '../../src/domain/records';
import { FACET_IDS, live, type DirectoryDoc } from '../../src/domain/schema';
import { labelsJoined, withUniqueLabelNames } from '../../src/domain/unique';
import { OWNER, provider, testContext, weddingDirectory } from './fixture';

const at = (day: number) => testContext(OWNER, Date.UTC(2026, 10, day));
const named = (doc: DirectoryDoc, facetId: string, name: string) =>
  live(doc.labels)
    .filter((l) => l.facetId === facetId && l.name.toLowerCase() === name.toLowerCase())
    .map((l) => l.id);

/**
 * Before they sync, the phone renames Video to "Film" (other word: Movie) and the laptop makes a
 * Category label "Film" (other word: Cinema) and gives it to Lagoo: two Films in Category.
 */
function filmTwice() {
  const w = weddingDirectory();
  const phone = renameLabel(w.doc, w.labels.video, 'Film', 'blue', ['Movie'], at(17));
  const made = createLabel(w.doc, { facetId: FACET_IDS.category, name: 'Film', aliases: ['Cinema'] }, at(18));
  const laptop = updateRecord(made.doc, 'providers', w.providers.lagoo, { labelIds: [w.labels.fair, made.id] }, at(18));
  return { ...w, phone, laptop, film: made.id };
}

describe('two labels of one name in one group become one', () => {
  it('keeps the older label, with the providers and other words of both, whichever way the devices merge', () => {
    const { phone, laptop, labels, providers, film } = filmTwice();
    const ab = merge(phone, laptop);
    const ba = merge(laptop, phone);
    for (const merged of [ab, ba]) {
      expect(named(merged, FACET_IDS.category, 'Film')).toEqual([labels.video]);
      expect(merged.labels[film]).toMatchObject({ deleted: true, mergedInto: labels.video });
      expect([...merged.labels[labels.video]!.aliases].sort()).toEqual(['Cinema', 'Movie']);
      expect(merged.providers[providers.flashbox]!.labelIds).toContain(labels.video);
      expect(merged.providers[providers.lagoo]!.labelIds).toEqual([labels.fair, labels.video]);
    }
    expect(ab.labels).toEqual(ba.labels);
    expect(ab.providers).toEqual(ba.providers);
    expect(hasLocalWins(phone, laptop)).toBe(true);
    for (const side of [phone, laptop]) expect(hasLocalWins(side, ab)).toBe(false);
    expect(withUniqueLabelNames(ab)).toBe(ab);
  });

  it('makes one label when a label moves into a group that got one of its name on another device', () => {
    const { doc, labels } = weddingDirectory();
    const phone = moveLabel(doc, labels.shortlist, FACET_IDS.source, at(17));
    const laptop = createLabel(doc, { facetId: FACET_IDS.source, name: 'Shortlist' }, at(18)).doc;
    for (const merged of [merge(phone, laptop), merge(laptop, phone)])
      expect(named(merged, FACET_IDS.source, 'Shortlist')).toEqual([labels.shortlist]);
  });

  it('points a provider at the label kept, when a device that had not heard gives it the other', () => {
    const { phone, laptop, labels, providers, film } = filmTwice();
    const merged = merge(phone, laptop);
    // The laptop, before it hears of the merge, gives Bruno its Film label.
    const late = updateRecord(laptop, 'providers', providers.bruno, { labelIds: [labels.photo, labels.cluj, film] }, at(20));
    for (const again of [merge(late, merged), merge(merged, late)])
      expect(again.providers[providers.bruno]!.labelIds).toEqual([labels.photo, labels.cluj, labels.video]);
  });

  it('points a provider at the label a merge by hand kept, from a device that had not heard of it (FR-08)', () => {
    const { doc, labels, providers, ctx } = weddingDirectory();
    const merged = mergeLabels(doc, labels.video, labels.photo, ctx);
    expect(merged.labels[labels.video]).toMatchObject({ deleted: true, mergedInto: labels.photo });
    const late = updateRecord(doc, 'providers', providers.lagoo, { labelIds: [labels.fair, labels.video] }, at(20));
    for (const again of [merge(late, merged), merge(merged, late)])
      expect(again.providers[providers.lagoo]!.labelIds).toEqual([labels.fair, labels.photo]);
  });

  it('a label made again with the name of one merged away is a label of its own', () => {
    const { doc, labels, providers, ctx } = weddingDirectory();
    const video = doc.labels[labels.video]!;
    const merged = mergeLabels(doc, labels.video, labels.photo, ctx);
    // Made again with Video's name: Video's id (labelIdOf) is not that, so the merged one stays put.
    const again = createLabel(merged, { facetId: video.facetId, name: 'Video' }, ctx);
    const late = updateRecord(again.doc, 'providers', providers.lagoo, { labelIds: [labels.fair, again.id] }, ctx);
    expect(withUniqueLabelNames(late).providers[providers.lagoo]!.labelIds).toEqual([labels.fair, again.id]);
  });

  it('makes one of two labels of one name in a file, as a merge elsewhere may have saved them', () => {
    const { phone, laptop, labels, providers } = filmTwice();
    // The two Films side by side, as an earlier version's merge would have saved them.
    const both = { ...laptop, labels: { ...laptop.labels, [labels.video]: phone.labels[labels.video]! } };
    const read = readDirectory(JSON.parse(JSON.stringify(toFile(both))));
    expect(named(read, FACET_IDS.category, 'Film')).toEqual([labels.video]);
    expect(read.providers[providers.lagoo]!.labelIds).toEqual([labels.fair, labels.video]);
  });

  it('stops at labels merged into each other, without looping', () => {
    const { doc, labels, ctx } = weddingDirectory();
    let d = updateRecord(doc, 'labels', labels.video, { mergedInto: labels.plumber }, ctx);
    d = updateRecord(d, 'labels', labels.plumber, { mergedInto: labels.video }, ctx);
    d = deleteRecord(deleteRecord(d, 'labels', labels.video, ctx), 'labels', labels.plumber, ctx);
    const p = provider(d, ctx, 'X', { labelIds: [labels.video] });
    expect(withUniqueLabelNames(p.doc).providers[p.id]!.labelIds).toEqual([labels.video]);
  });
});

describe('telling the user which labels became one', () => {
  it('names the label kept when a merge joins two of one name, once', () => {
    const { phone, laptop, labels } = filmTwice();
    const merged = merge(phone, laptop);
    expect(labelsJoined(phone, merged)).toEqual([{ id: labels.video, name: 'Film', facetId: FACET_IDS.category }]);
    expect(labelsJoined(merged, merge(merged, laptop))).toEqual([]);
  });

  it('says nothing of a merge made by hand on the Labels page (FR-08)', () => {
    const { doc, labels, ctx } = weddingDirectory();
    expect(labelsJoined(doc, mergeLabels(doc, labels.video, labels.photo, ctx))).toEqual([]);
  });
});
