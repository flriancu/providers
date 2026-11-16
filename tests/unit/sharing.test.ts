import { describe, expect, it } from 'vitest';
import { addRecord, type EditContext } from '../../src/domain/records';
import { type DirectoryDoc } from '../../src/domain/schema';
import { coverage, labelSnapshot, newAudiences, whatCanSee, whoCanSee } from '../../src/domain/sharing';
import { weddingDirectory } from './fixture';

const NOW = new Date('2026-11-16T12:00:00Z');

function share(
  doc: DirectoryDoc,
  ctx: EditContext,
  fields: { labelId?: string; kind: 'person' | 'link'; email?: string; role: 'reader' | 'writer' },
) {
  return addRecord(doc, 'shares', fields, ctx).doc;
}

describe('the file written for a shared label (FR-16, FR-18)', () => {
  const { doc, labels, providers } = weddingDirectory();
  const snapshot = labelSnapshot(doc, labels.wedding, NOW);
  const text = JSON.stringify(snapshot);

  it('holds every provider under the label and its children, by name', () => {
    expect(snapshot.providers.map((p) => p.name)).toEqual(['BRUNO PHOTOGRAPHY', 'FLASHBOX', 'GRĂDINA CU SĂLCII']);
    expect(snapshot.labels.map((l) => [l.name, l.color]).sort()).toEqual([
      ['Photo', 'blue'],
      ['Video', 'blue'],
      ['Wedding', 'pink'],
    ]);
  });

  it('never holds notes, the log, other labels or the shares', () => {
    expect(text).not.toContain('too expensive');
    expect(text).not.toContain(labels.bucharest);
    expect(text).not.toContain(labels.shortlist);
    expect(text).not.toContain('AllWeddings');
    expect(Object.keys(snapshot.providers[0]!).sort()).toEqual([
      'address',
      'contactPerson',
      'emails',
      'id',
      'labelIds',
      'links',
      'name',
      'phones',
    ]);
    expect(snapshot.providers.find((p) => p.id === providers.flashbox)!.labelIds).toEqual([labels.video]);
  });

  it("names the label's place in the tree", () => {
    expect(labelSnapshot(doc, labels.photo, NOW).label.path).toEqual(['Wedding']);
  });
});

describe('who sees what (FR-17, FR-19)', () => {
  const base = weddingDirectory();
  let doc = base.doc;
  doc = share(doc, base.ctx, { labelId: base.labels.wedding, kind: 'person', email: 'Ana@Example.test', role: 'reader' });
  doc = share(doc, base.ctx, { labelId: base.labels.shortlist, kind: 'link', role: 'reader' });
  doc = share(doc, base.ctx, { kind: 'person', email: 'partner@example.test', role: 'writer' });
  const { labels, providers } = base;

  const who = (id: string) =>
    whoCanSee(doc, id)
      .map((s) => s.email ?? `link:${s.labelId}`)
      .sort();

  it('sees a provider through any of its labels or their parents, or the whole directory', () => {
    expect(who(providers.flashbox)).toEqual(['Ana@Example.test', `link:${labels.shortlist}`, 'partner@example.test'].sort());
    expect(who(providers.plumberAna)).toEqual(['partner@example.test']);
  });

  it('lists what one person sees, whatever the case of their address', () => {
    expect(
      whatCanSee(doc, 'ana@example.test')
        .map((p) => p.name)
        .sort(),
    ).toEqual(['BRUNO PHOTOGRAPHY', 'FLASHBOX', 'GRĂDINA CU SĂLCII']);
    expect(whatCanSee(doc, 'partner@example.test')).toHaveLength(5);
    expect(whatCanSee(doc, 'nobody@example.test')).toEqual([]);
  });

  it('says how many more people or links would see a provider given a shared label', () => {
    expect(newAudiences(doc, providers.plumberAna, labels.photo)).toBe(1); // Ana, through Wedding
    expect(newAudiences(doc, providers.plumberAna, labels.shortlist)).toBe(1); // the Shortlist link
    expect(newAudiences(doc, providers.bruno, labels.video)).toBe(0); // Ana sees Bruno already
    expect(newAudiences(doc, providers.plumberAna, labels.cluj)).toBe(0); // Cluj is not shared
  });

  it('says how many providers sharing a label would show', () => {
    expect(coverage(doc, labels.wedding)).toBe(3);
    expect(coverage(doc, labels.home)).toBe(1);
  });
});
