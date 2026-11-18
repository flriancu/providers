import { describe, expect, it } from 'vitest';
import { providerInput, renameLabel, saveProvider } from '../../src/domain/edits';
import { hasLocalWins, merge } from '../../src/domain/merge';
import { readDirectory, toFile } from '../../src/domain/migrate';
import { updateRecord } from '../../src/domain/records';
import type { DirectoryDoc } from '../../src/domain/schema';
import { OWNER, testContext, weddingDirectory } from './fixture';

const at = (day: number) => testContext(OWNER, Date.UTC(2026, 10, day));
const labelsOf = (doc: DirectoryDoc, id: string) => [...doc.providers[id]!.labelIds].sort();

describe('lists merge value by value', () => {
  it('keeps both labels when two devices each add one to a provider', () => {
    const { doc, providers, labels } = weddingDirectory();
    const bruno = doc.providers[providers.bruno]!;
    const phone = updateRecord(doc, 'providers', bruno.id, { labelIds: [...bruno.labelIds, labels.shortlist] }, at(17));
    const laptop = updateRecord(doc, 'providers', bruno.id, { labelIds: [...bruno.labelIds, labels.fair] }, at(18));
    const want = [...bruno.labelIds, labels.shortlist, labels.fair].sort();
    for (const merged of [merge(phone, laptop), merge(laptop, phone)]) expect(labelsOf(merged, bruno.id)).toEqual(want);
    expect(hasLocalWins(phone, laptop)).toBe(true);
    expect(hasLocalWins(laptop, phone)).toBe(true);
    const merged = merge(phone, laptop);
    expect(hasLocalWins(phone, merged)).toBe(false);
    expect(hasLocalWins(laptop, merged)).toBe(false);
  });

  it('keeps a label removed on one device removed when another adds a different one later', () => {
    const { doc, providers, labels } = weddingDirectory();
    const bruno = doc.providers[providers.bruno]!;
    const phone = updateRecord(doc, 'providers', bruno.id, { labelIds: [labels.photo] }, at(17)); // Cluj off
    const laptop = updateRecord(doc, 'providers', bruno.id, { labelIds: [...bruno.labelIds, labels.fair] }, at(18));
    for (const merged of [merge(phone, laptop), merge(laptop, phone)])
      expect(labelsOf(merged, bruno.id)).toEqual([labels.photo, labels.fair].sort());
  });

  it('takes the later of an add and a remove of one label, and keeps it when both are at one moment', () => {
    const { doc, providers, labels } = weddingDirectory();
    const bruno = doc.providers[providers.bruno]!;
    const added = (day: number) => updateRecord(doc, 'providers', bruno.id, { labelIds: [...bruno.labelIds, labels.fair] }, at(day));
    const withFair = added(17);
    const removed = (day: number) =>
      updateRecord(withFair, 'providers', bruno.id, { labelIds: bruno.labelIds }, testContext(OWNER, Date.UTC(2026, 10, day)));
    // Removed after the add was seen: gone on both.
    expect(merge(removed(19), added(17)).providers[bruno.id]!.labelIds).not.toContain(labels.fair);
    expect(merge(added(17), removed(19)).providers[bruno.id]!.labelIds).not.toContain(labels.fair);
    // Added again later on a device that had not seen the remove: there.
    const again = updateRecord(doc, 'providers', bruno.id, { labelIds: [...bruno.labelIds, labels.fair] }, at(20));
    expect(merge(removed(19), again).providers[bruno.id]!.labelIds).toContain(labels.fair);
    expect(merge(again, removed(19)).providers[bruno.id]!.labelIds).toContain(labels.fair);
  });

  it('keeps phone numbers two devices added, the last writer’s order first', () => {
    const { doc, providers } = weddingDirectory();
    const gradina = doc.providers[providers.gradina]!;
    const phone = updateRecord(doc, 'providers', gradina.id, { phones: [...gradina.phones, '0722 111 111'] }, at(17));
    const laptop = updateRecord(doc, 'providers', gradina.id, { phones: ['0733 222 222', ...gradina.phones] }, at(18));
    for (const merged of [merge(phone, laptop), merge(laptop, phone)])
      expect(merged.providers[gradina.id]!.phones).toEqual(['0733 222 222', ...gradina.phones, '0722 111 111']);
  });

  it('keeps the other words two devices gave one label', () => {
    const { doc, ctx, labels } = weddingDirectory();
    const photo = doc.labels[labels.photo]!;
    const phone = renameLabel(doc, photo.id, photo.name, photo.color, [...photo.aliases, 'Fotograf'], at(17));
    const laptop = renameLabel(doc, photo.id, photo.name, photo.color, [...photo.aliases, 'Photographer'], at(18));
    void ctx;
    for (const merged of [merge(phone, laptop), merge(laptop, phone)])
      expect([...merged.labels[photo.id]!.aliases].sort()).toEqual(['Foto', 'Fotograf', 'Photographer']);
  });

  it('keeps, from a form left open, a label another device added meanwhile', () => {
    const { doc, providers, labels } = weddingDirectory();
    const bruno = doc.providers[providers.bruno]!;
    const opened = providerInput(bruno);
    const elsewhere = updateRecord(doc, 'providers', bruno.id, { labelIds: [...bruno.labelIds, labels.fair] }, at(17));
    const saved = saveProvider(elsewhere, bruno.id, opened, { ...opened, labelIds: [labels.photo, labels.shortlist] }, at(18));
    expect(labelsOf(saved, bruno.id)).toEqual([labels.photo, labels.shortlist, labels.fair].sort());
  });

  it('reads a list written by an earlier version as a whole, as before', () => {
    const { doc, providers, labels } = weddingDirectory();
    const bruno = doc.providers[providers.bruno]!;
    // An earlier version removed Cluj (no value stamps); this one added the fair before that.
    const earlier = {
      ...doc,
      providers: {
        ...doc.providers,
        [bruno.id]: {
          ...bruno,
          labelIds: [labels.photo],
          updatedAt: '2026-11-19T00:00:00.000Z',
          stamps: { labelIds: '2026-11-19T00:00:00.000Z' },
        },
      },
    };
    const now = updateRecord(doc, 'providers', bruno.id, { labelIds: [...bruno.labelIds, labels.fair] }, at(18));
    for (const merged of [merge(earlier, now), merge(now, earlier)]) expect(labelsOf(merged, bruno.id)).toEqual([labels.photo]);
  });

  it('ignores value stamps an earlier version left behind when it changed the list', () => {
    const { doc, providers, labels } = weddingDirectory();
    const bruno = doc.providers[providers.bruno]!;
    const tracked = updateRecord(doc, 'providers', bruno.id, { labelIds: [...bruno.labelIds, labels.fair] }, at(17));
    const t = tracked.providers[bruno.id]!;
    // Then an earlier version took the fair off again: field stamp moved, value stamps did not.
    const stale = {
      ...tracked,
      providers: {
        ...tracked.providers,
        [bruno.id]: {
          ...t,
          labelIds: bruno.labelIds,
          updatedAt: '2026-11-19T00:00:00.000Z',
          stamps: { ...t.stamps, labelIds: '2026-11-19T00:00:00.000Z' },
        },
      },
    };
    for (const merged of [merge(stale, tracked), merge(tracked, stale)])
      expect(merged.providers[bruno.id]!.labelIds).not.toContain(labels.fair);
  });

  it('keeps value stamps through the file, and reads a list whose value stamps are damaged as a whole', () => {
    const { doc, providers, labels } = weddingDirectory();
    const bruno = doc.providers[providers.bruno]!;
    const edited = updateRecord(doc, 'providers', bruno.id, { labelIds: [labels.photo] }, at(17));
    const back = readDirectory(JSON.parse(JSON.stringify(toFile(edited))));
    expect(back.providers[bruno.id]).toEqual(edited.providers[bruno.id]);
    const file = JSON.parse(JSON.stringify(toFile(edited)));
    file.providers[bruno.id].members.labelIds.stamps[labels.cluj] = 'yesterday';
    const damaged = readDirectory(file);
    expect(damaged.providers[bruno.id]!.labelIds).toEqual([labels.photo]);
    expect(damaged.providers[bruno.id]!.members).toBeUndefined();
  });

  it('ends the same whichever way two devices merge, and merging again changes nothing', () => {
    const { doc, providers, labels } = weddingDirectory();
    const all = Object.values(labels);
    let seed = 7;
    const random = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed % n);
    for (let round = 0; round < 300; round++) {
      const device = (start: number) => {
        let d = doc;
        const clock = testContext(OWNER, Date.UTC(2026, 10, 17) + start);
        for (let i = random(4); i >= 0; i--) {
          const now = d.providers[providers.bruno]!.labelIds;
          const id = all[random(all.length)]!;
          const next = now.includes(id) ? now.filter((x) => x !== id) : [...now, id];
          d = updateRecord(d, 'providers', providers.bruno, { labelIds: next }, clock);
        }
        return d;
      };
      const a = device(random(5));
      const b = device(random(5));
      const ab = merge(a, b).providers[providers.bruno]!;
      const ba = merge(b, a).providers[providers.bruno]!;
      expect(ab.labelIds).toEqual(ba.labelIds);
      expect(ab.members).toEqual(ba.members);
      const once = merge(a, b);
      for (const side of [a, b]) {
        expect(merge(once, side).providers[providers.bruno]!.labelIds).toEqual(ab.labelIds);
        expect(merge(side, once).providers[providers.bruno]!.labelIds).toEqual(ab.labelIds);
        expect(hasLocalWins(side, once)).toBe(false);
      }
    }
  });
});
