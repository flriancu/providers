import { describe, expect, it } from 'vitest';
import { absorb } from '../../src/domain/absorb';
import { demoCarry } from '../../src/domain/carry';
import { directoryModel } from '../../src/domain/document';
import { addLogEntry, createLabel, createProvider, emptyProvider, providerInput, saveProvider } from '../../src/domain/edits';
import { labelById } from '../../src/domain/labels';
import { FACET_IDS, live, newDirectory, type DirectoryDoc } from '../../src/domain/schema';
import { DEMO_OWNER, sampleDirectory } from '../../src/ui/demoDirectory';
import { OWNER, testContext } from './fixture';

const names = (doc: DirectoryDoc) =>
  live(doc.providers)
    .map((p) => p.name)
    .sort();
const labelNames = (doc: DirectoryDoc) =>
  live(doc.labels)
    .map((l) => l.name)
    .sort();
const labelOf = (doc: DirectoryDoc, name: string) => live(doc.labels).find((l) => l.name === name)!;

/** The demo after a visit: the sample, plus what the visitor did. */
function visited() {
  const sample = sampleDirectory();
  let n = 0;
  const ctx = { ...testContext(DEMO_OWNER), newId: () => `visit-${++n}` }; // ids never repeat across directories
  let doc = sample;
  const photo = labelOf(doc, 'Photo').id;
  const video = createLabel(doc, { facetId: FACET_IDS.category, name: 'Video' }, ctx);
  doc = video.doc;
  const lagoo = createProvider(doc, { ...emptyProvider(), name: 'Lagoo', labelIds: [photo, video.id] }, ctx);
  doc = addLogEntry(lagoo.doc, lagoo.id, '2026-11-16', 'Asked for a quote.', ctx).doc;
  // The visitor also edited the sample and logged a call on it: still the sample.
  const sampleProvider = live(doc.providers).find((p) => p.name === 'Sample Photo Studio')!;
  doc = saveProvider(doc, sampleProvider.id, providerInput(sampleProvider), { ...providerInput(sampleProvider), notes: 'mine now?' }, ctx);
  doc = addLogEntry(doc, sampleProvider.id, '2026-11-16', 'Called the sample.', ctx).doc;
  return { sample, doc };
}

describe('carrying the demo into an account (D-25)', () => {
  it("keeps what the visitor added, and none of the sample's own records", () => {
    const { sample, doc } = visited();
    const carried = demoCarry(doc, sample);
    expect(names(carried)).toEqual(['Lagoo']);
    expect(live(carried.log).map((e) => e.text)).toEqual(['Asked for a quote.']);
    // Photo is the sample's, but Lagoo carries it; Bucharest and Sample fair stay behind.
    expect(labelNames(carried)).toEqual(['Photo', 'Video']);
    expect(Object.keys(carried.facets)).toEqual([]);
    expect(directoryModel.contentCount(carried)).toBe(2);
  });

  it('carries nothing from a demo nobody touched', () => {
    const sample = sampleDirectory();
    expect(directoryModel.contentCount(demoCarry(sampleDirectory(), sample))).toBe(0);
  });

  it('lands in the account with its labels matched by name, not doubled', () => {
    const ctx = testContext(OWNER);
    let mine = newDirectory(OWNER);
    const photo = createLabel(mine, { facetId: FACET_IDS.category, name: 'photo' }, ctx); // other case
    mine = photo.doc;
    const { sample, doc } = visited();
    const after = directoryModel.absorb(mine, demoCarry(doc, sample));

    expect(labelNames(after)).toEqual(['Video', 'photo']);
    const lagoo = live(after.providers).find((p) => p.name === 'Lagoo')!;
    expect(lagoo.labelIds.map((id) => labelById(after, id)!.name).sort()).toEqual(['Video', 'photo']);
    expect(after.owner.googleSub).toBe(OWNER);
    // Absorbing it again changes nothing more.
    expect(directoryModel.absorb(after, demoCarry(doc, sample))).toEqual(after);
  });
});

describe('a second visit to the demo', () => {
  // Every demo starts its sample with the same ids; a first visit carried the sample's Photo in.
  it('never renames back or brings back a sample label the owner changed since', async () => {
    const { renameLabel, deleteLabel } = await import('../../src/domain/edits');
    const first = visited();
    const ctx = testContext(OWNER, Date.UTC(2026, 10, 17));
    const mine = directoryModel.absorb(newDirectory(OWNER), demoCarry(first.doc, first.sample));
    const photo = labelOf(mine, 'Photo').id;
    const renamed = renameLabel(mine, photo, 'Photography', labelById(mine, photo)!.color, [], ctx);
    const deleted = deleteLabel(mine, photo, ctx);

    // A later visit: a newer sample, and a provider with its Photo.
    const sample = sampleDirectory(() => new Date(Date.UTC(2026, 10, 20)));
    const later = { ...testContext(DEMO_OWNER, Date.UTC(2026, 10, 20)), newId: () => 'second-visit' };
    const demo = createProvider(sample, { ...emptyProvider(), name: 'Bruno', labelIds: [labelOf(sample, 'Photo').id] }, later).doc;

    const afterRename = directoryModel.absorb(renamed, demoCarry(demo, sample));
    expect(labelById(afterRename, photo)!.name).toBe('Photography');
    const bruno = live(afterRename.providers).find((p) => p.name === 'Bruno')!;
    expect(bruno.labelIds.map((id) => labelById(afterRename, id)!.name)).toEqual(['Photo']);

    const afterDelete = directoryModel.absorb(deleted, demoCarry(demo, sample));
    expect(afterDelete.labels[photo]!.deleted).toBe(true);
  });
});

describe('absorbing another version of my directory', () => {
  it('takes a label of the same name in another facet as a different label', () => {
    const ctx = testContext(OWNER);
    const a = createLabel(newDirectory(OWNER), { facetId: FACET_IDS.category, name: 'Shortlist' }, ctx).doc;
    let n = 0;
    const other = { ...testContext(OWNER), newId: () => `other-${++n}` };
    const b = createLabel(newDirectory(OWNER), { facetId: FACET_IDS.lists, name: 'Shortlist' }, other).doc;
    expect(labelNames(absorb(a, b))).toEqual(['Shortlist', 'Shortlist']);
  });

  it("keeps the account's own settings when absorbing another account's directory", () => {
    const mine = { ...newDirectory(OWNER), settings: { updatedAt: '2026-01-01T00:00:00.000Z', replaces: ['old'] } };
    const demo = { ...newDirectory(DEMO_OWNER), settings: { updatedAt: '2026-12-01T00:00:00.000Z' } };
    expect(absorb(mine, demo).settings).toEqual(mine.settings);
  });
});
