import { describe, expect, it } from 'vitest';
import { mailtoHref, phoneNumbers, telHref } from '../../src/domain/contact';

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

describe('numbers written with notes, ranges and typos', () => {
  it('dials only the number, never digits of a note or a range', () => {
    expect(telHref('0721 234 567 (after 18:00)')).toBe('tel:0721234567');
    expect(telHref('0721 234 567 - 9 to 17')).toBe('tel:0721234567');
    expect(telHref('0721 234 567 și 0722 000 111')).toBe('tel:0721234567');
    expect(telHref('0721 234 567 | 0722 000 111')).toBe('tel:0721234567');
    expect(telHref('0721234567 int12')).toBe('tel:0721234567');
    expect(telHref('021.300.40.00')).toBe('tel:0213004000');
  });

  it('makes no link when the first digits are not a number to call', () => {
    expect(telHref('+4O 721 234 567')).toBeNull(); // a letter O for a zero: dialling the rest calls someone else
    expect(telHref('1-800-FLOWERS')).toBeNull();
  });

  it('finds every number in a field', () => {
    expect(phoneNumbers('0721 234 567, 0722 000 111 (after 18:00)')).toEqual(['0721234567', '0722000111']);
  });

  it('takes an address written with mailto: in front as the address', () => {
    expect(mailtoHref('mailto:ana@x.ro')).toBe('mailto:ana@x.ro');
  });
});
