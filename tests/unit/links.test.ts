import { describe, expect, it } from 'vitest';
import { firstLinks, handleOf, linkKind, webHref } from '../../src/domain/links';

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
    expect(handleOf('https://www.instagram.com/caf%C3%A9/')).toBe('café');
    // A stray % is not an escape: the handle shows as typed, it does not fail.
    expect(handleOf('https://www.instagram.com/50%off/')).toBe('50%off');
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

describe('what a link opens', () => {
  it('opens web addresses only, with https:// added when the scheme is missing', () => {
    expect(webHref('https://www.example.com')).toBe('https://www.example.com');
    expect(webHref('http://a.ro/x')).toBe('http://a.ro/x');
    expect(webHref(' gradina.ro ')).toBe('https://gradina.ro');
  });

  it('never makes a link of another scheme, from a person or an imported file', () => {
    const others = [
      'javascript://%0Aalert(1)',
      'javascript:alert(1)',
      'file:///C:/Windows/win.ini',
      'intent://scan#Intent;end',
      'ms-msdt://x',
      'not an address',
    ];
    expect(others.filter((link) => webHref(link) !== null)).toEqual([]);
    expect(firstLinks(['file:///C:/x', 'javascript://%0Aalert(1)', 'b.ro'])).toEqual({ website: 'b.ro' });
  });
});

describe('links typed with a scheme', () => {
  it('reads mailto: and tel: as what they are, not as a website', () => {
    expect(webHref('mailto:ana@example.net')).toBeNull();
    expect(webHref('tel:0721')).toBeNull();
  });

  it('opens https:/x as browsers do, and a host with a port as a website', () => {
    expect(webHref('https:/x.example')).toBe('https:/x.example');
    expect(webHref('example.ro:8080/oferta')).toBe('https://example.ro:8080/oferta');
  });
});
