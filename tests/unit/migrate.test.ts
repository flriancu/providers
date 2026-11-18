import { describe, expect, it } from 'vitest';
import { UnsupportedDocumentError } from 'drive-doc-sync/errors';
import { directoryModel } from '../../src/domain/document';
import { readDirectory, skippedCount, toFile } from '../../src/domain/migrate';
import { FACET_IDS, live, newDirectory } from '../../src/domain/schema';
import { OWNER, weddingDirectory } from './fixture';

const roundTrip = (doc: unknown) => readDirectory(JSON.parse(JSON.stringify(doc)));

describe('reading and writing the directory file', () => {
  it('reads back exactly what it wrote', () => {
    const { doc } = weddingDirectory();
    expect(roundTrip(toFile(doc))).toEqual(doc);
  });

  it('reads labels saved under a parent as top-level labels, and writes them without it (D-35)', () => {
    const { doc, labels } = weddingDirectory();
    const file = JSON.parse(JSON.stringify(toFile(doc)));
    file.facets[FACET_IDS.category].kind = 'tree'; // as an earlier version wrote them
    file.labels[labels.video].parentId = labels.photo;
    const read = readDirectory(file);
    expect(skippedCount(read)).toBe(0);
    expect(read.labels[labels.video]!.name).toBe('Video');
    expect(Object.keys(read.labels[labels.video]!)).not.toContain('parentId');
    expect(Object.keys(read.facets[FACET_IDS.category]!)).not.toContain('kind');
    expect(toFile(read)).toEqual(toFile(doc));
  });

  it('sets aside a record it cannot read, says how many, and writes it back unchanged', () => {
    const { doc, providers } = weddingDirectory();
    const file = JSON.parse(JSON.stringify(toFile(doc)));
    file.providers[providers.bruno].phones = '0721 234 567'; // a shape a newer version might write
    file.labels.broken = { id: 'other-id' };
    const read = readDirectory(file);
    expect(read.providers[providers.bruno]).toBeUndefined();
    expect(skippedCount(read)).toBe(2);
    expect(directoryModel.openNotices!(read, read)).toEqual([{ kind: 'skipped', count: 2 }]);
    expect(JSON.parse(JSON.stringify(toFile(read)))).toEqual(file);
  });

  it.each([
    ['not an object', 'text', 'notDirectory'],
    ['no schema version', { owner: { googleSub: OWNER } }, 'notDirectory'],
    ['a newer schema', { schemaVersion: 2, owner: { googleSub: OWNER } }, 'version'],
    ['no owner', { schemaVersion: 1 }, 'notDirectory'],
  ])('refuses a file with %s', (_, raw, reason) => {
    const e = (() => {
      try {
        readDirectory(raw);
      } catch (x) {
        return x;
      }
      return null;
    })();
    expect(e).toBeInstanceOf(UnsupportedDocumentError);
    expect((e as UnsupportedDocumentError).reason).toBe(reason);
  });

  it('gives a missing collection or settings safe defaults', () => {
    const read = readDirectory({ schemaVersion: 1, owner: { googleSub: OWNER } });
    expect(read.providers).toEqual({});
    expect(read.settings.updatedAt).toBe('1970-01-01T00:00:00.000Z');
  });
});

describe('the directory as drive-doc-sync sees it', () => {
  it('merges two directories created separately into one set of starting facets', () => {
    const a = weddingDirectory().doc;
    const b = newDirectory(OWNER);
    const joined = directoryModel.absorb(a, b);
    expect(
      live(joined.facets)
        .map((f) => f.id)
        .sort(),
    ).toEqual(Object.values(FACET_IDS).sort());
    expect(live(joined.providers)).toHaveLength(5);
  });

  it("never takes the demo's settings into an account's directory", () => {
    const mine = { ...newDirectory(OWNER), settings: { updatedAt: '2026-01-01T00:00:00.000Z', replaces: ['old-file'] } };
    const demo = { ...newDirectory('demo'), settings: { updatedAt: '2027-01-01T00:00:00.000Z' } };
    expect(directoryModel.absorb(mine, demo).settings.replaces).toEqual(['old-file']);
  });

  it('counts providers and log entries as content worth keeping', () => {
    expect(directoryModel.contentCount(newDirectory(OWNER))).toBe(0);
    expect(directoryModel.contentCount(weddingDirectory().doc)).toBe(5);
  });
});

describe('stamps in a file', () => {
  it('reads every stamp in the one form that compares as text', () => {
    const { doc, providers } = weddingDirectory();
    const file = JSON.parse(JSON.stringify(toFile(doc)));
    // Written by hand or another tool: no milliseconds, an offset instead of Z.
    file.providers[providers.bruno].updatedAt = '2026-11-17T00:00:00Z';
    file.providers[providers.bruno].stamps = { notes: '2026-11-17T02:00:00+02:00' };
    const read = readDirectory(file);
    expect(read.providers[providers.bruno]).toMatchObject({
      updatedAt: '2026-11-17T00:00:00.000Z',
      stamps: { notes: '2026-11-17T00:00:00.000Z' },
    });
    // Compared as text, the short form would sort after any stamp with milliseconds in that second.
    expect(read.providers[providers.bruno]!.updatedAt < '2026-11-17T00:00:00.500Z').toBe(true);
  });

  it('sets aside a record stamped in the year 9000 or later, or with stamps that are not times', () => {
    const { doc, providers } = weddingDirectory();
    const file = JSON.parse(JSON.stringify(toFile(doc)));
    file.providers[providers.bruno].updatedAt = '9999-12-31T23:59:59.999Z';
    file.providers[providers.lagoo].stamps = { notes: 'yesterday' };
    const read = readDirectory(file);
    expect(read.providers[providers.bruno]).toBeUndefined();
    expect(read.providers[providers.lagoo]).toBeUndefined();
    expect(skippedCount(read)).toBe(2);
    expect(read.providers[providers.flashbox]).toBeDefined();
  });
});

describe('days in a file', () => {
  it('sets aside a log entry dated on a day the calendar does not have', () => {
    const { doc, providers } = weddingDirectory();
    const file = JSON.parse(JSON.stringify(toFile(doc)));
    const stamp = '2026-11-16T10:00:00.000Z';
    file.log.bad = {
      id: 'bad',
      createdAt: stamp,
      updatedAt: stamp,
      updatedBy: OWNER,
      providerId: providers.bruno,
      date: '2026-02-31',
      text: 'x',
    };
    const read = readDirectory(file);
    expect(read.log.bad).toBeUndefined();
    expect(skippedCount(read)).toBe(1);
  });
});
