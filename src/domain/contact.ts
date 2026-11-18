/**
 * Links that call or write to a provider. Phone and email fields hold what people typed, so a
 * field can hold two numbers, an extension or a note; the link takes only what dials or
 * addresses one recipient, and the text shows as typed. Pure.
 */

/**
 * The first number in a phone field, as a tel: address (RFC 3966: digits with an optional
 * leading +): "0721 234 567, 0722 000 111" calls the first; "+40 (0)721 234 567" drops the
 * trunk 0 written in brackets after the country code; an extension ("int. 12", "ext 12",
 * "x12") and anything after it is left out, so the call reaches the switchboard rather than a
 * wrong number. Null when there are no digits to call.
 */
export function telHref(phone: string): string | null {
  const first = phone.split(/[,;/]|\s(?:or|sau)\s/i)[0] ?? '';
  const main = first.split(/\b(?:int|interior|ext|extension)\b\.?|\bx(?=\s*\d)|#/i)[0] ?? '';
  const number = main
    .replace(/\(0\)/g, '')
    .replace(/[^\d+]/g, '')
    .replace(/(?!^)\+/g, '');
  return /\d{3,}/.test(number) ? `tel:${number}` : null;
}

/**
 * An email address as a mailto: address, or null when the field is not one address (RFC 6068:
 * "?" starts header fields, so an address with "?cc=" or "&body=" would add recipients or text
 * to the message; a comma or semicolon would add recipients).
 */
export function mailtoHref(email: string): string | null {
  const address = email.trim();
  return /^[^\s@?&,;<>"()[\]\\]+@[^\s@?&,;<>"()[\]\\]+\.[^\s@?&,;<>"()[\]\\]+$/.test(address) ? `mailto:${address}` : null;
}
