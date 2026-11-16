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
