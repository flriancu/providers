import { describe, expect, it } from 'vitest';
import { hasLocalWins, merge } from '../../src/domain/merge';
import { deleteRecord, nextStamp, restoreRecord, updateRecord } from '../../src/domain/records';
import { newDirectory } from '../../src/domain/schema';
import { OWNER, provider, testContext, weddingDirectory } from './fixture';

describe('edits', () => {
  it('stamps who changed a record and when (FR-03)', () => {
    const { doc, providers } = weddingDirectory();
    const editor = testContext('sub-editor', Date.UTC(2026, 10, 17));
    const next = updateRecord(doc, 'providers', providers.bruno, { contactPerson: 'Bruno' }, editor);
    expect(next.providers[providers.bruno]).toMatchObject({
      contactPerson: 'Bruno',
      updatedBy: 'sub-editor',
      updatedAt: '2026-11-17T00:00:00.000Z',
    });
    expect(doc.providers[providers.bruno]!.contactPerson).toBe(''); // the old version is untouched
  });

  it('never stamps an edit at or below what the document already holds, even with a clock behind', () => {
    const { doc } = weddingDirectory();
    const behind = testContext(OWNER, Date.UTC(2020, 0, 1));
    const stamp = nextStamp(doc, behind.now());
    for (const p of Object.values(doc.providers)) expect(stamp > p.updatedAt).toBe(true);
  });

  it('keeps a deleted record as a marker that wins over an older edit on another device', () => {
    const { doc, providers } = weddingDirectory();
    const phone = updateRecord(doc, 'providers', providers.lagoo, { notes: 'call back' }, testContext(OWNER, Date.UTC(2026, 10, 17)));
    const laptop = deleteRecord(doc, 'providers', providers.lagoo, testContext(OWNER, Date.UTC(2026, 10, 18)));
    expect(merge(phone, laptop).providers[providers.lagoo]!.deleted).toBe(true);
    expect(merge(laptop, phone).providers[providers.lagoo]!.deleted).toBe(true);
  });

  it('brings back a deleted record with a newer stamp, so the undo reaches other devices too', () => {
    const { doc, providers } = weddingDirectory();
    const deleted = deleteRecord(doc, 'providers', providers.lagoo, testContext(OWNER, Date.UTC(2026, 10, 18)));
    const back = restoreRecord(deleted, 'providers', providers.lagoo, testContext(OWNER, Date.UTC(2026, 10, 19)));
    expect(back.providers[providers.lagoo]!.deleted).toBeUndefined();
    expect(back.providers[providers.lagoo]!.updatedAt > deleted.providers[providers.lagoo]!.updatedAt).toBe(true);
    expect(merge(deleted, back).providers[providers.lagoo]!.deleted).toBeUndefined();
    expect(restoreRecord(doc, 'providers', providers.lagoo, testContext())).toBe(doc); // not deleted: unchanged
  });

  it('refuses to update a record that is not there', () => {
    expect(() => updateRecord(newDirectory(OWNER), 'providers', 'nope', { name: 'x' }, testContext())).toThrow('No providers record nope');
  });
});

/** Two devices editing at the same millisecond. */
const sameMoment = () => testContext(OWNER, Date.UTC(2026, 10, 17));

describe('merge', () => {
  it('keeps the newer version of each record, from either side', () => {
    const { doc, providers } = weddingDirectory();
    const a = updateRecord(doc, 'providers', providers.bruno, { notes: 'A' }, testContext(OWNER, Date.UTC(2026, 10, 17)));
    const b = updateRecord(doc, 'providers', providers.flashbox, { notes: 'B' }, testContext(OWNER, Date.UTC(2026, 10, 18)));
    const merged = merge(a, b);
    expect(merged.providers[providers.bruno]!.notes).toBe('A');
    expect(merged.providers[providers.flashbox]!.notes).toBe('B');
    expect(hasLocalWins(a, b)).toBe(true);
    expect(hasLocalWins(merged, b)).toBe(true);
    expect(hasLocalWins(b, merged)).toBe(false);
  });

  it('lets the remote version win a tie', () => {
    const base = newDirectory(OWNER);
    const local = provider(base, sameMoment(), 'local').doc;
    const remote = provider(base, sameMoment(), 'remote').doc;
    expect(merge(local, remote).providers['id-1']!.name).toBe('remote');
  });

  it('never replaces a record the remote version could not read with an older readable copy', () => {
    const { doc, providers } = weddingDirectory();
    const newer = { ...doc.providers[providers.bruno]!, updatedAt: '2027-01-01T00:00:00.000Z', futureField: 1 };
    const { [providers.bruno]: _gone, ...rest } = doc.providers;
    const remote = { ...doc, providers: rest, skipped: { providers: { [providers.bruno]: newer } } };
    expect(merge(doc, remote).providers[providers.bruno]).toBeUndefined();
    expect(hasLocalWins(doc, remote)).toBe(false);
  });
});
