import { describe, expect, it } from 'vitest';
import { providerLog } from '../../src/domain/edits';
import { labelById } from '../../src/domain/labels';
import { readDirectory, toFile } from '../../src/domain/migrate';
import { live } from '../../src/domain/schema';
import { demoDirectory } from '../../src/ui/demoDirectory';
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
