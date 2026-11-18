import { describe, expect, it } from 'vitest';
import { providerLog } from '../../src/domain/edits';
import { labelById } from '../../src/domain/labels';
import { readDirectory, toFile } from '../../src/domain/migrate';
import { live } from '../../src/domain/schema';
import { demoCarry } from '../../src/domain/carry';
import { directoryModel } from '../../src/domain/document';
import { demoDirectory, sampleDirectory } from '../../src/ui/demoDirectory';
import { testContext } from './fixture';

describe('the demo directory', () => {
  const doc = demoDirectory('demo', testContext('demo'));
  const [sample] = live(doc.providers);

  it('holds one made-up provider with labels and a log entry', () => {
    expect(live(doc.providers)).toHaveLength(1);
    expect(sample!.name).toBe('Sample Photo Studio');
    expect(sample!.labelIds.map((id) => labelById(doc, id)!.name)).toEqual(['Photo', 'Bucharest', 'Sample fair']);
    expect(providerLog(doc, sample!.id)).toHaveLength(1);
  });

  it('has contact details that reach nobody', () => {
    expect(sample!.emails.every((e) => e.endsWith('@example.com'))).toBe(true);
    expect(sample!.links.every((l) => new URL(l).hostname.endsWith('example.com'))).toBe(true);
    expect(sample!.phones).toEqual(['+40 000 000 000']);
  });

  it('is a valid directory file', () => {
    expect(readDirectory(JSON.parse(JSON.stringify(toFile(doc))))).toEqual(doc);
  });
});

describe('the demo in Romanian', () => {
  it('is written in the language the page opened in, under the same ids', () => {
    const ro = sampleDirectory('ro');
    const en = sampleDirectory('en');
    expect(live(ro.providers)[0]!.name).toBe('Studio Foto Exemplu');
    expect(
      live(ro.labels)
        .map((l) => l.name)
        .sort(),
    ).toEqual(['București', 'Foto', 'Târg demonstrativ']);
    expect(Object.keys(ro.labels).sort()).toEqual(Object.keys(en.labels).sort());
    expect(Object.keys(ro.providers)).toEqual(Object.keys(en.providers));
  });

  it('is told apart from what the visitor added at sign-in, whatever the language now', () => {
    expect(directoryModel.contentCount(demoCarry(sampleDirectory('ro'), sampleDirectory('en')))).toBe(0);
  });
});
