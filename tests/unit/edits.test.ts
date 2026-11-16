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
  nextColor,
  moveLabel,
  providerLog,
  renameLabel,
  saveProvider,
  type EditErrorCode,
} from '../../src/domain/edits';
import { addRecord } from '../../src/domain/records';
import { FACET_IDS, live } from '../../src/domain/schema';
import { weddingDirectory } from './fixture';

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
    const two = saveProvider(doc, p.id, { ...p, labelIds: [labels.photo, labels.video], primaryCategoryId: labels.video }, ctx);
    expect(two.providers[p.id]!.primaryCategoryId).toBe(labels.video);
    const none = saveProvider(two, p.id, { ...p, labelIds: [labels.bucharest], primaryCategoryId: labels.video }, ctx);
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
    const { doc, ctx, labels } = weddingDirectory();
    const { doc: next, id } = createLabel(
      doc,
      { facetId: FACET_IDS.category, parentId: labels.wedding, name: ' Venue ', color: 'green', aliases: [' Sala ', ''] },
      ctx,
    );
    expect(next.labels[id]).toMatchObject({ name: 'Venue', color: 'green', parentId: labels.wedding, aliases: ['Sala'] });
  });

  it('keeps two levels, in tree facets only, with unique names among siblings', () => {
    const { doc, ctx, labels } = weddingDirectory();
    fails('tooDeep', () => createLabel(doc, { facetId: FACET_IDS.category, parentId: labels.photo, name: 'Drone' }, ctx));
    fails('notATreeFacet', () => createLabel(doc, { facetId: FACET_IDS.area, parentId: labels.bucharest, name: 'Sector 1' }, ctx));
    fails('labelNameTaken', () => createLabel(doc, { facetId: FACET_IDS.category, parentId: labels.wedding, name: 'PHOTO' }, ctx));
    fails('parentInOtherFacet', () => createLabel(doc, { facetId: FACET_IDS.category, parentId: labels.bucharest, name: 'X' }, ctx));
  });

  it('renames a label without touching the providers that carry it', () => {
    const { doc, ctx, labels, providers } = weddingDirectory();
    const next = renameLabel(doc, labels.photo, 'Photographer', 'teal', ['Foto', 'Photo'], ctx);
    expect(next.labels[labels.photo]).toMatchObject({ name: 'Photographer', color: 'teal' });
    expect(next.providers[providers.bruno]!.labelIds).toContain(labels.photo);
  });

  it('moves a label to the top or under another top-level label, never deeper', () => {
    const { doc, ctx, labels } = weddingDirectory();
    const top = moveLabel(doc, labels.photo, undefined, ctx);
    expect(top.labels[labels.photo]!.parentId).toBeUndefined();
    expect(moveLabel(top, labels.photo, labels.home, ctx).labels[labels.photo]!.parentId).toBe(labels.home);
    fails('tooDeep', () => moveLabel(doc, labels.wedding, labels.home, ctx)); // Wedding has sub-labels
  });

  it('merges one label into another: providers, sub-labels, shares and names follow', () => {
    const { doc: base, ctx, labels, providers } = weddingDirectory();
    const shared = addRecord(base, 'shares', { labelId: labels.video, kind: 'link', role: 'reader' }, ctx);
    const next = mergeLabels(shared.doc, labels.video, labels.photo, ctx);
    expect(next.labels[labels.video]!.deleted).toBe(true);
    expect(next.providers[providers.flashbox]!.labelIds).toContain(labels.photo);
    expect(next.providers[providers.flashbox]!.labelIds).not.toContain(labels.video);
    expect(next.shares[shared.id]!.labelId).toBe(labels.photo);
    expect(next.labels[labels.photo]!.aliases).toEqual(['Foto', 'Video']);
    fails('otherFacet', () => mergeLabels(base, labels.cluj, labels.photo, ctx));
    fails('tooDeep', () => mergeLabels(base, labels.wedding, labels.photo, ctx));
  });

  it('deletes a label without sub-labels: it leaves its providers and its shares end', () => {
    const { doc: base, ctx, labels, providers } = weddingDirectory();
    const shared = addRecord(base, 'shares', { labelId: labels.cluj, kind: 'person', email: 'a@x', role: 'reader' }, ctx);
    const next = deleteLabel(shared.doc, labels.cluj, ctx);
    expect(next.providers[providers.bruno]!.labelIds).not.toContain(labels.cluj);
    expect(next.shares[shared.id]!.deleted).toBe(true);
    fails('hasSubLabels', () => deleteLabel(base, labels.wedding, ctx));
  });
});

describe('label colours (D-31)', () => {
  it('gives a new label the colour least used in its facet, in palette order, unless one is chosen', () => {
    const { doc, ctx } = weddingDirectory();
    // Area has two blue labels: grey is the first of the unused colours.
    expect(nextColor(doc, FACET_IDS.area)).toBe('grey');
    const { doc: next, id } = createLabel(doc, { facetId: FACET_IDS.area, name: 'Iasi' }, ctx);
    expect(next.labels[id]!.color).toBe('grey');
    expect(nextColor(next, FACET_IDS.area)).toBe('red');
  });
});

describe('facets', () => {
  it('adds a flat facet after the others, with a unique name', () => {
    const { doc, ctx } = weddingDirectory();
    const { doc: next, id } = createFacet(doc, 'Price band', ctx);
    expect(next.facets[id]).toMatchObject({ kind: 'flat', order: 5 });
    fails('labelNameTaken', () => createFacet(next, 'price BAND', ctx));
    fails('labelNameTaken', () => createFacet(next, 'Area', ctx)); // a starting facet's word
  });
});
