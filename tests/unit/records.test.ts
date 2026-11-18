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

  it('never stamps an edit at or below the record it changes, even with a clock behind', () => {
    const { doc } = weddingDirectory();
    const behind = testContext(OWNER, Date.UTC(2020, 0, 1));
    for (const p of Object.values(doc.providers)) expect(nextStamp(p, behind.now()) > p.updatedAt).toBe(true);
  });

  it('keeps one record stamped far ahead from moving the stamps of any other', () => {
    const { doc, providers, ctx } = weddingDirectory();
    const ahead = { ...doc.providers[providers.bruno]!, updatedAt: '8999-12-31T23:59:59.999Z' };
    const poisoned = { ...doc, providers: { ...doc.providers, [providers.bruno]: ahead } };
    const now = ctx.now().toISOString();
    const next = updateRecord(poisoned, 'providers', providers.lagoo, { notes: 'x' }, testContext(OWNER, Date.parse(now)));
    expect(next.providers[providers.lagoo]!.updatedAt).toBe(now);
  });

  it('changes nothing, not even a stamp, when nothing differs (FR-03)', () => {
    const { doc, providers, ctx } = weddingDirectory();
    const same = doc.providers[providers.bruno]!;
    expect(updateRecord(doc, 'providers', providers.bruno, { name: same.name, phones: [...same.phones] }, ctx)).toBe(doc);
  });

  it('stamps only the fields that changed; a record written whole keeps its date on the others', () => {
    const { doc, providers } = weddingDirectory();
    const before = doc.providers[providers.bruno]!;
    const whole = { ...before, notes: 'old', updatedAt: '2026-11-16T12:00:00.000Z' }; // written by an earlier version
    const start = { ...doc, providers: { ...doc.providers, [providers.bruno]: whole } };
    const next = updateRecord(start, 'providers', providers.bruno, { contactPerson: 'Bruno' }, testContext(OWNER, Date.UTC(2026, 10, 17)));
    const stamps = next.providers[providers.bruno]!.stamps!;
    expect(stamps.contactPerson).toBe('2026-11-17T00:00:00.000Z');
    expect(stamps.notes).toBe('2026-11-16T12:00:00.000Z');
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

  it('keeps both changes when two devices change different fields of one record', () => {
    const { doc, providers } = weddingDirectory();
    const phone = updateRecord(doc, 'providers', providers.bruno, { notes: 'from the phone' }, testContext(OWNER, Date.UTC(2026, 10, 17)));
    const laptop = updateRecord(
      doc,
      'providers',
      providers.bruno,
      { phones: ['0721 000 000'] },
      testContext(OWNER, Date.UTC(2026, 10, 18)),
    );
    for (const merged of [merge(phone, laptop), merge(laptop, phone)]) {
      expect(merged.providers[providers.bruno]).toMatchObject({ notes: 'from the phone', phones: ['0721 000 000'] });
    }
    expect(hasLocalWins(phone, laptop)).toBe(true);
    expect(hasLocalWins(laptop, merge(phone, laptop))).toBe(false);
  });

  it('keeps a record deleted on one device when another edits it later', () => {
    const { doc, providers } = weddingDirectory();
    const laptop = deleteRecord(doc, 'providers', providers.lagoo, testContext(OWNER, Date.UTC(2026, 10, 17)));
    const phone = updateRecord(doc, 'providers', providers.lagoo, { notes: 'call back' }, testContext(OWNER, Date.UTC(2026, 10, 18)));
    expect(merge(phone, laptop).providers[providers.lagoo]!.deleted).toBe(true);
    expect(merge(laptop, phone).providers[providers.lagoo]!.deleted).toBe(true);
  });

  it('merges a field cleared on one side (no primary category) against an edit of another', () => {
    const { doc, providers } = weddingDirectory();
    const p = doc.providers[providers.gradina]!;
    expect(p.primaryCategoryId).toBeDefined();
    const cleared = updateRecord(doc, 'providers', p.id, { primaryCategoryId: undefined }, testContext(OWNER, Date.UTC(2026, 10, 18)));
    const noted = updateRecord(doc, 'providers', p.id, { notes: 'n' }, testContext(OWNER, Date.UTC(2026, 10, 17)));
    for (const merged of [merge(cleared, noted), merge(noted, cleared)]) {
      expect(merged.providers[p.id]!.primaryCategoryId).toBeUndefined();
      expect(merged.providers[p.id]!.notes).toBe('n');
    }
  });
});

describe('a form left open', () => {
  it('saves only what was changed in it, keeping a change made meanwhile elsewhere', async () => {
    const { providerInput, saveProvider } = await import('../../src/domain/edits');
    const { doc, providers } = weddingDirectory();
    const opened = providerInput(doc.providers[providers.bruno]!);
    const elsewhere = updateRecord(
      doc,
      'providers',
      providers.bruno,
      { phones: ['0721 000 000'] },
      testContext(OWNER, Date.UTC(2026, 10, 17)),
    );
    const saved = saveProvider(
      elsewhere,
      providers.bruno,
      opened,
      { ...opened, notes: 'typed in the form' },
      testContext(OWNER, Date.UTC(2026, 10, 18)),
    );
    expect(saved.providers[providers.bruno]).toMatchObject({ phones: ['0721 000 000'], notes: 'typed in the form' });
  });
});
