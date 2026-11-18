/**
 * A random record id: a version 4 UUID (RFC 9562, section 5.4), from `crypto.getRandomValues`,
 * which every page has. `crypto.randomUUID` exists only on secure pages (https, localhost), so a
 * phone trying the app over the local network's plain http could not save anything with it.
 */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant: the RFC's
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
