import { describe, expect, it } from 'vitest';
import { firstLinks, handleOf, linkKind } from '../../src/domain/links';

describe('what a link is', () => {
  it('tells profiles on known networks from a website, with or without scheme or "www"', () => {
    expect(linkKind('https://www.instagram.com/aifunbox/')).toBe('instagram');
    expect(linkKind('instagram.com/aifunbox')).toBe('instagram');
    expect(linkKind('https://www.tiktok.com/@aifunbox')).toBe('tiktok');
    expect(linkKind('https://m.facebook.com/profile.php?id=1')).toBe('facebook');
    expect(linkKind('https://youtu.be/x')).toBe('youtube');
    expect(linkKind('https://allweddings.ro/foto/andrei-roman')).toBe('allweddings');
    expect(linkKind('aifunbox.ro')).toBe('website');
    expect(linkKind('https://notinstagram.com/x')).toBe('website');
  });

  it("reads the account name from a profile's address", () => {
    expect(handleOf('https://www.instagram.com/alina.vreju/')).toBe('alina.vreju');
    expect(handleOf('https://www.tiktok.com/@adrianscinteifotograf')).toBe('adrianscinteifotograf');
  });

  it('takes the first link of each kind, skipping text that is not an address', () => {
    expect(
      firstLinks([
        'https://www.instagram.com/a/',
        'a.ro',
        'b.ro',
        'https://www.tiktok.com/@a',
        'https://www.instagram.com/b/',
        'not an address at all',
      ]),
    ).toEqual({ instagram: 'https://www.instagram.com/a/', website: 'a.ro', tiktok: 'https://www.tiktok.com/@a' });
  });
});
