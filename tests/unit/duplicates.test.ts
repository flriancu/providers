import { describe, expect, it } from 'vitest';
import { findDuplicates, linkKey, phoneKey, sameAs, type Candidate } from '../../src/domain/duplicates';
import { weddingDirectory } from './fixture';

/** A Facebook page without a custom name: only its query tells it apart. */
const page = (id: number) => `https://www.facebook.com/profile.php?id=${id}`;

const candidate = (extra: Partial<Candidate>): Candidate => ({ name: '', phones: [], emails: [], links: [], ...extra });

describe('likely duplicates (FR-23)', () => {
  const { doc, providers } = weddingDirectory();
  const found = (c: Candidate, exclude?: string) => findDuplicates(doc, c, exclude).map((d) => [d.provider.id, d.reasons]);

  it('matches a name ignoring case, diacritics and spacing', () => {
    expect(found(candidate({ name: '  gradina cu  salcii ' }))).toEqual([[providers.gradina, ['name']]]);
  });

  it('matches the same phone number however it is written', () => {
    for (const phone of ['+40 721 234 567', '0040721234567', '0721-234-567'])
      expect(found(candidate({ phones: [phone] }))).toEqual([[providers.gradina, ['phone']]]);
  });

  it('matches emails ignoring case, and websites ignoring scheme, www and a trailing slash', () => {
    expect(found(candidate({ emails: ['hello@flashbox.ro'] }))).toEqual([[providers.flashbox, ['email']]]);
    expect(found(candidate({ links: ['brunophoto.ro'] }))).toEqual([[providers.bruno, ['link']]]);
  });

  it('tells two profiles on the same site apart', () => {
    expect(linkKey('https://instagram.com/bruno')).not.toBe(linkKey('https://instagram.com/flashbox'));
    expect(linkKey('HTTPS://WWW.Instagram.com/Bruno/')).toBe(linkKey('instagram.com/bruno'));
  });

  it('tells pages apart by their query, and ignores only tracking parameters', () => {
    expect(linkKey(page(1))).not.toBe(linkKey(page(2)));
    expect(linkKey(`${page(1)}&fbclid=abc`)).toBe(linkKey(page(1)));
    expect(linkKey('https://brunophoto.ro/?utm_source=fair&utm_medium=qr')).toBe(linkKey('brunophoto.ro'));
    expect(linkKey('https://www.instagram.com/bruno/?igsh=xyz')).toBe(linkKey('instagram.com/bruno'));
  });

  it('lists every reason, best match first, and leaves out the provider itself', () => {
    const c = candidate({ name: 'Flashbox', emails: ['HELLO@flashbox.ro'] });
    expect(found(c)).toEqual([[providers.flashbox, ['name', 'email']]]);
    expect(found(c, providers.flashbox)).toEqual([]);
  });

  it('ignores empty values', () => {
    expect(found(candidate({ phones: [''], emails: [' '], links: [''] }))).toEqual([]);
    expect(phoneKey('n/a')).toBe('');
  });
});

describe('link paths and case', () => {
  it('compare profile names without case, and other paths with it', () => {
    expect(linkKey('https://www.instagram.com/Bruno.Foto/')).toBe(linkKey('instagram.com/bruno.foto'));
    expect(linkKey('https://youtu.be/AbCdEf')).not.toBe(linkKey('https://youtu.be/abcdef'));
    expect(linkKey('https://Example.ro/Oferta')).not.toBe(linkKey('https://example.ro/oferta'));
  });
});

describe('phones in a field with two numbers or a note', () => {
  it('are each compared', () => {
    const base = { name: 'A', contactPerson: '', emails: [], links: [], address: '', notes: '', labelIds: [] };
    expect(sameAs({ ...base, phones: ['0721 234 567'] }, { ...base, name: 'B', phones: ['0722 000 111, 0721 234 567'] })).toEqual([
      'phone',
    ]);
    expect(sameAs({ ...base, phones: ['0733 111 222'] }, { ...base, name: 'B', phones: ['0733 111 222 (după ora 18)'] })).toEqual([
      'phone',
    ]);
  });
});
