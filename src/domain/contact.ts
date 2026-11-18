/**
 * Links that call or write to a provider. Phone and email fields hold what people typed, so a
 * field can hold two numbers, an extension or a note; the link takes only what dials or
 * addresses one recipient, and the text shows as typed. Pure.
 */

/**
 * A phone number as written: an optional +, then digit groups joined by at most one space, dot
 * or hyphen, a group perhaps in brackets ("+40 (0)721 234 567", "021.300.40.00"). It stops at
 * anything else, so a note ("after 18:00"), a second number ("or 0722 ..."), an extension
 * ("int. 12", "x12") or a range ("9 - 17") is not read as more digits.
 */
const NUMBER = /\+?\(?\d+\)?(?:[ .-]?\(?\d+\)?)*/g;

/** Fewer digits than this is not a number to call (a time, an extension, "1-800"). */
const MIN_DIGITS = 6;

/**
 * The phone numbers in a field, in order, each as its digits with a leading + kept and the
 * trunk 0 written in brackets after a country code dropped: "0721 234 567, 0722 000 111" holds
 * two. A field whose first digits are not a number to call (a typo such as "+4O 721...") holds
 * none: dialling what follows would be another number.
 */
export function phoneNumbers(field: string): string[] {
  const out: string[] = [];
  for (const [text] of field.matchAll(NUMBER)) {
    const digits = text.replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
    if (digits.replace('+', '').length >= MIN_DIGITS) out.push(digits);
    else if (out.length === 0) return [];
  }
  return out;
}

/** The first number in a phone field, as a tel: address (RFC 3966); null when there is none. */
export function telHref(phone: string): string | null {
  const [first] = phoneNumbers(phone);
  return first ? `tel:${first}` : null;
}

/**
 * An email address as a mailto: address, or null when the field is not one address (RFC 6068:
 * "?" starts header fields, so an address with "?cc=" or "&body=" would add recipients or text
 * to the message; a comma or semicolon would add recipients). An address written with
 * "mailto:" in front counts as the address.
 */
export function mailtoHref(email: string): string | null {
  const address = email.trim().replace(/^mailto:/i, '');
  return /^[^\s@?&,;:<>"()[\]\\]+@[^\s@?&,;:<>"()[\]\\]+\.[^\s@?&,;:<>"()[\]\\]+$/.test(address) ? `mailto:${address}` : null;
}
