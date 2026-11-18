import { describe, expect, it } from 'vitest';
import {
  addLogEntry,
  createFacet,
  createLabel,
  createProvider,
  deleteLabel,
  deleteProvider,
  EditError,
  emptyProvider,
  mergeLabels,
  moveLabel,
  nextColor,
  providerLog,
  renameFacet,
  renameLabel,
  providerInput,
  saveProvider,
  type EditErrorCode,
} from '../../src/domain/edits';
import { addRecord } from '../../src/domain/records';
import { FACET_IDS, live } from '../../src/domain/schema';
import { FACET_WORDS as WORDS } from '../../src/ui/labelText';
import { merge } from '../../src/domain/merge';
import { testContext, weddingDirectory } from './fixture';

const fails = (code: EditErrorCode, fn: () => unknown) => {
  let error: unknown;
  try {
    fn();
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(EditError);
  expect((error as EditError).code).toBe(code);
};

describe('providers', () => {
  it('stores a new provider tidied: trimmed text, no empty or repeated entries', () => {
    const { doc, ctx, labels } = weddingDirectory();
    const { doc: next, id } = createProvider(
      doc,
      {
        ...emptyProvider(),
        name: '  Ze Caffe ',
        phones: ['0721 000 000', ' ', '0721 000 000'],
        labelIds: [labels.photo, labels.photo, 'gone'],
      },
      ctx,
    );
    expect(next.providers[id]).toMatchObject({
      name: 'Ze Caffe',
      phones: ['0721 000 000'],
      labelIds: [labels.photo],
      primaryCategoryId: labels.photo,
    });
  });

  it('needs a name, and nothing else (FR-01)', () => {
    const { doc, ctx } = weddingDirectory();
    fails('nameRequired', () => createProvider(doc, { ...emptyProvider(), name: '   ' }, ctx));
  });

  it('keeps the primary category one of its Category labels, and drops it when they go (FR-05)', () => {
    const { doc, ctx, labels, providers } = weddingDirectory();
    const p = doc.providers[providers.gradina]!;
    const two = saveProvider(
      doc,
      p.id,
      providerInput(p),
      { ...providerInput(p), labelIds: [labels.photo, labels.video], primaryCategoryId: labels.video },
      ctx,
    );
    expect(two.providers[p.id]!.primaryCategoryId).toBe(labels.video);
    const none = saveProvider(
      two,
      p.id,
      providerInput(two.providers[p.id]!),
      { ...providerInput(p), labelIds: [labels.bucharest], primaryCategoryId: labels.video },
      ctx,
    );
    expect(none.providers[p.id]!.primaryCategoryId).toBeUndefined();
  });

  it('deletes a provider together with its log', () => {
    const { doc, ctx, providers } = weddingDirectory();
    const withLog = addLogEntry(doc, providers.lagoo, '2026-11-20', 'Called', ctx).doc;
    const after = deleteProvider(withLog, providers.lagoo, ctx);
    expect(live(after.providers).map((p) => p.id)).not.toContain(providers.lagoo);
    expect(live(after.log)).toEqual([]);
  });
});

describe('the interaction log (FR-02)', () => {
  it('keeps dated entries with their author, newest day first', () => {
    const { doc, ctx, providers } = weddingDirectory();
    let d = addLogEntry(doc, providers.bruno, '2026-11-18', 'First call', ctx).doc;
    d = addLogEntry(d, providers.bruno, '2026-11-20', 'Quote 900 EUR', ctx).doc;
    d = addLogEntry(d, providers.bruno, '2026-11-18', 'Second call that day', ctx).doc;
    expect(providerLog(d, providers.bruno).map((e) => e.text)).toEqual(['Quote 900 EUR', 'Second call that day', 'First call']);
    expect(providerLog(d, providers.bruno)[0]!.updatedBy).toBe(ctx.by);
  });

  it('refuses an empty text or an impossible date', () => {
    const { doc, ctx, providers } = weddingDirectory();
    fails('logTextRequired', () => addLogEntry(doc, providers.bruno, '2026-11-20', '  ', ctx));
    fails('badDate', () => addLogEntry(doc, providers.bruno, '2026-02-30', 'x', ctx));
  });
});

describe('labels (FR-04..08)', () => {
  it('adds a label with one name, its colour and its aliases', () => {
    const { doc, ctx } = weddingDirectory();
    const { doc: next, id } = createLabel(
      doc,
      { facetId: FACET_IDS.category, name: ' Venue ', color: 'green', aliases: [' Sala ', ''] },
      ctx,
    );
    expect(next.labels[id]).toEqual(expect.objectContaining({ name: 'Venue', color: 'green', aliases: ['Sala'] }));
    expect(Object.keys(next.labels[id]!)).not.toContain('parentId'); // one level (D-35)
  });

  it('keeps label names unique within a facet, ignoring case and diacritics', () => {
    const { doc, ctx } = weddingDirectory();
    fails('labelNameTaken', () => createLabel(doc, { facetId: FACET_IDS.category, name: 'PHOTO' }, ctx));
    fails('labelNameTaken', () => createLabel(doc, { facetId: FACET_IDS.area, name: 'bucuresti' }, ctx));
    expect(() => createLabel(doc, { facetId: FACET_IDS.area, name: 'Photo' }, ctx)).not.toThrow(); // another facet
  });

  it('renames a label without touching the providers that carry it', () => {
    const { doc, ctx, labels, providers } = weddingDirectory();
    const next = renameLabel(doc, labels.photo, 'Photographer', 'teal', ['Foto', 'Photo'], ctx);
    expect(next.labels[labels.photo]).toMatchObject({ name: 'Photographer', color: 'teal' });
    expect(next.providers[providers.bruno]!.labelIds).toContain(labels.photo);
  });

  it('merges one label into another: providers, shares and names follow', () => {
    const { doc: base, ctx, labels, providers } = weddingDirectory();
    const shared = addRecord(base, 'shares', { labelId: labels.video, kind: 'link', role: 'reader' }, ctx);
    const next = mergeLabels(shared.doc, labels.video, labels.photo, ctx);
    expect(next.labels[labels.video]!.deleted).toBe(true);
    expect(next.providers[providers.flashbox]!.labelIds).toContain(labels.photo);
    expect(next.providers[providers.flashbox]!.labelIds).not.toContain(labels.video);
    expect(next.shares[shared.id]!.labelId).toBe(labels.photo);
    expect(next.labels[labels.photo]!.aliases).toEqual(['Foto', 'Video']);
    fails('otherFacet', () => mergeLabels(base, labels.cluj, labels.photo, ctx));
    fails('sameLabel', () => mergeLabels(base, labels.photo, labels.photo, ctx));
  });

  it('deletes a label: it leaves its providers and its shares end', () => {
    const { doc: base, ctx, labels, providers } = weddingDirectory();
    const shared = addRecord(base, 'shares', { labelId: labels.cluj, kind: 'person', email: 'a@x', role: 'reader' }, ctx);
    const next = deleteLabel(shared.doc, labels.cluj, ctx);
    expect(next.providers[providers.bruno]!.labelIds).not.toContain(labels.cluj);
    expect(next.shares[shared.id]!.deleted).toBe(true);
  });
});

describe('label colours (D-31)', () => {
  it('gives a new label the colour least used over all groups, in palette order, never grey unless chosen (D-41)', () => {
    const { doc, ctx } = weddingDirectory();
    // Every label is blue: red is the first unused colour; grey, first in the palette, is skipped.
    expect(nextColor(doc)).toBe('red');
    const { doc: next, id } = createLabel(doc, { facetId: FACET_IDS.area, name: 'Iasi' }, ctx);
    expect(next.labels[id]!.color).toBe('red');
    // Counted over all groups: a new category does not get the red the new area took.
    const { doc: after, id: dj } = createLabel(next, { facetId: FACET_IDS.category, name: 'DJ' }, ctx);
    expect(after.labels[dj]!.color).toBe('orange');
    const chosen = createLabel(after, { facetId: FACET_IDS.lists, name: 'Maybe', color: 'grey' }, ctx);
    expect(chosen.doc.labels[chosen.id]!.color).toBe('grey');
  });
});

describe('facets', () => {
  it('adds a flat facet after the others, with a unique name', () => {
    const { doc, ctx } = weddingDirectory();
    const { doc: next, id } = createFacet(doc, 'Price band', WORDS, ctx);
    expect(next.facets[id]).toMatchObject({ name: 'Price band', order: 5 });
    fails('labelNameTaken', () => createFacet(next, 'price BAND', WORDS, ctx));
    fails('labelNameTaken', () => createFacet(next, 'Area', WORDS, ctx)); // a starting facet's word
  });

  // A group's CSV column must never be read as another column (FR-21).
  it('refuses a group name its column would be read by as a field or another group, in either language', () => {
    const { doc, ctx } = weddingDirectory();
    fails('labelNameTaken', () => createFacet(doc, 'Categorie', WORDS, ctx));
    fails('nameIsField', () => createFacet(doc, 'Notes', WORDS, ctx));
    fails('nameIsField', () => createFacet(doc, 'telefon', WORDS, ctx));
    fails('labelNameTaken', () => renameFacet(doc, FACET_IDS.lists, 'Area', WORDS, ctx));
    fails('nameIsField', () => renameFacet(doc, FACET_IDS.source, 'Website', WORDS, ctx));
  });

  it('renamed to its own word in any language, a starting group shows the word of each language again', () => {
    const { doc, ctx } = weddingDirectory();
    const renamed = renameFacet(doc, FACET_IDS.category, 'Trade', WORDS, ctx);
    expect(renamed.facets[FACET_IDS.category]!.name).toBe('Trade');
    expect(renameFacet(renamed, FACET_IDS.category, 'Categorie', WORDS, ctx).facets[FACET_IDS.category]!.name).toBe('');
    expect(renameFacet(doc, FACET_IDS.category, 'Category', WORDS, ctx)).toBe(doc); // nothing to change
  });

  it('refuses a semicolon in a label name: in a CSV file it separates labels', () => {
    const { doc, ctx, labels } = weddingDirectory();
    fails('nameSemicolon', () => createLabel(doc, { facetId: FACET_IDS.lists, name: 'Call back; urgent' }, ctx));
    fails('nameSemicolon', () => renameLabel(doc, labels.photo, 'Photo; video', 'blue', [], ctx));
  });
});

describe('the same label made on two devices', () => {
  it('is one label once they sync', () => {
    const { doc } = weddingDirectory();
    const phone = createLabel(doc, { facetId: FACET_IDS.lists, name: 'Call back' }, testContext('sub-owner', Date.UTC(2026, 10, 17)));
    const laptop = createLabel(doc, { facetId: FACET_IDS.lists, name: 'call  BACK' }, testContext('sub-owner', Date.UTC(2026, 10, 18)));
    expect(phone.id).toBe(laptop.id);
    const merged = merge(phone.doc, laptop.doc);
    expect(live(merged.labels).filter((l) => l.facetId === FACET_IDS.lists && l.name.toLowerCase().includes('call'))).toHaveLength(1);
  });

  it('comes back as the same label when made again after a delete, and as a new one after a rename', () => {
    const { doc, ctx } = weddingDirectory();
    const first = createLabel(doc, { facetId: FACET_IDS.lists, name: 'Call back' }, ctx);
    const again = createLabel(deleteLabel(first.doc, first.id, ctx), { facetId: FACET_IDS.lists, name: 'Call back' }, ctx);
    expect(again.id).toBe(first.id);
    expect(again.doc.labels[first.id]!.deleted).toBeUndefined();
    const renamed = renameLabel(first.doc, first.id, 'Called', 'red', [], ctx);
    const fresh = createLabel(renamed, { facetId: FACET_IDS.lists, name: 'Call back' }, ctx);
    expect(fresh.id).not.toBe(first.id);
    expect(fresh.doc.labels[first.id]!.name).toBe('Called');
  });
});

describe('names that show nothing', () => {
  it('are refused, like an empty name', () => {
    const { doc, ctx } = weddingDirectory();
    fails('nameRequired', () => createProvider(doc, { ...emptyProvider(), name: '\u200B \u200D' }, ctx));
    fails('nameRequired', () => createLabel(doc, { facetId: FACET_IDS.lists, name: '\u200B' }, ctx));
    expect(createProvider(doc, { ...emptyProvider(), name: '👩‍🎤 Band' }, ctx).id).toBeTruthy(); // a joiner inside a name is fine
  });
});

describe('a label this version cannot read', () => {
  it('stays on a provider whose other labels are edited', () => {
    const { doc, ctx, providers, labels } = weddingDirectory();
    const p = doc.providers[providers.bruno]!;
    const withUnread = {
      ...doc,
      providers: { ...doc.providers, [p.id]: { ...p, labelIds: [...p.labelIds, 'from-newer'] } },
      skipped: { labels: { 'from-newer': { id: 'from-newer' } } },
    };
    const before = providerInput(withUnread.providers[p.id]!);
    const saved = saveProvider(withUnread, p.id, before, { ...before, labelIds: [...before.labelIds, labels.shortlist] }, ctx);
    expect(saved.providers[p.id]!.labelIds).toContain('from-newer');
    expect(saved.providers[p.id]!.labelIds).toContain(labels.shortlist);
  });
});

describe('moving a label to another group (FR-08)', () => {
  it('keeps it on its providers; out of Category, it is no longer a main category', () => {
    const { doc, ctx, labels, providers } = weddingDirectory();
    expect(doc.providers[providers.gradina]!.primaryCategoryId).toBe(labels.photo);
    const moved = moveLabel(doc, labels.photo, FACET_IDS.lists, ctx);
    expect(moved.labels[labels.photo]!.facetId).toBe(FACET_IDS.lists);
    expect(moved.providers[providers.gradina]!.labelIds).toContain(labels.photo);
    expect(moved.providers[providers.gradina]!.primaryCategoryId).toBeUndefined();
    expect(moveLabel(doc, labels.photo, FACET_IDS.category, ctx)).toBe(doc); // already there
  });

  it('refuses a group that has a label of that name', () => {
    const { doc, ctx, labels } = weddingDirectory();
    const clash = createLabel(doc, { facetId: FACET_IDS.lists, name: 'photo' }, ctx).doc;
    fails('labelNameTaken', () => moveLabel(clash, labels.photo, FACET_IDS.lists, ctx));
  });
});
