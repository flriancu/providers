import { describe, expect, it } from 'vitest';
import { mailtoHref, telHref } from '../../src/domain/contact';

describe('call links', () => {
  it('dial the number as written, digits and a leading +', () => {
    expect(telHref('0721 234 567')).toBe('tel:0721234567');
    expect(telHref('+40 721-234-567')).toBe('tel:+40721234567');
  });

  it('call the first of several numbers in one field', () => {
    expect(telHref('0721 234 567, 0722 000 111')).toBe('tel:0721234567');
    expect(telHref('0721 234 567; 0722 000 111')).toBe('tel:0721234567');
    expect(telHref('0721 234 567 / 0722 000 111')).toBe('tel:0721234567');
    expect(telHref('0721 234 567 sau 0722 000 111')).toBe('tel:0721234567');
  });

  it('leave out an extension and the trunk 0 in brackets', () => {
    expect(telHref('021 300 4000 int. 12')).toBe('tel:0213004000');
    expect(telHref('021 300 4000 ext 12')).toBe('tel:0213004000');
    expect(telHref('021 300 4000 x12')).toBe('tel:0213004000');
    expect(telHref('+40 (0)721 234 567')).toBe('tel:+40721234567');
  });

  it('make no link of a field without a number', () => {
    expect(telHref('call after 6 pm')).toBeNull();
    expect(telHref('')).toBeNull();
  });
});

describe('email links', () => {
  it('write to one address', () => {
    expect(mailtoHref(' hello@example.com ')).toBe('mailto:hello@example.com');
  });

  it('make no link that would add recipients, headers or text', () => {
    const hostile = ['a@b.ro?cc=x@y.ro', 'a@b.ro&body=hi', 'a@b.ro, c@d.ro', 'a@b.ro;c@d.ro', 'not an address', 'a b@c.ro'];
    expect(hostile.filter((e) => mailtoHref(e) !== null)).toEqual([]);
  });
});
