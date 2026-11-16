import { fold } from './fold';
import { live, type DirectoryDoc, type Provider } from './schema';

/** Why two providers look like the same one (FR-23). */
export type Reason = 'name' | 'phone' | 'email' | 'link';

export interface PossibleDuplicate {
  provider: Provider;
  reasons: Reason[];
}

/** Enough of a provider to compare: a new one, or a row being imported. */
export type Candidate = Pick<Provider, 'name' | 'phones' | 'emails' | 'links'>;

/**
 * A phone number's last nine digits: the same subscriber written as 0721 234 567, +40 721 234 567
 * or 0040721234567 compares equal. Shorter numbers compare in full.
 */
export function phoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length > 9 ? digits.slice(-9) : digits;
}

/**
 * A link without its scheme, a leading "www.", the query, the fragment and a trailing slash, in
 * lower case: https://www.Example.ro/ and example.ro compare equal, while two Instagram
 * profiles (same host, different path) do not.
 */
export function linkKey(link: string): string {
  const trimmed = link.trim();
  let host = '';
  let path = '';
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    host = url.hostname;
    path = url.pathname;
  } catch {
    return fold(trimmed);
  }
  return `${host.toLowerCase().replace(/^www\./, '')}${path.replace(/\/+$/, '').toLowerCase()}`;
}

const nonEmpty = (keys: string[]) => new Set(keys.filter((k) => k !== ''));

/**
 * FR-23: live providers that look like the candidate, by name (ignoring case, diacritics and
 * spacing), phone, email or link, with every reason found. Nothing is merged here: the owner
 * decides (D-12). `exclude`: the candidate's own id, when it is already in the directory.
 */
export function findDuplicates(doc: DirectoryDoc, candidate: Candidate, exclude?: string): PossibleDuplicate[] {
  const name = fold(candidate.name);
  const phones = nonEmpty(candidate.phones.map(phoneKey));
  const emails = nonEmpty(candidate.emails.map(fold));
  const links = nonEmpty(candidate.links.map(linkKey));
  const out: PossibleDuplicate[] = [];
  for (const p of live(doc.providers)) {
    if (p.id === exclude) continue;
    const reasons: Reason[] = [];
    if (name !== '' && fold(p.name) === name) reasons.push('name');
    if (p.phones.some((x) => phones.has(phoneKey(x)))) reasons.push('phone');
    if (p.emails.some((x) => emails.has(fold(x)))) reasons.push('email');
    if (p.links.some((x) => links.has(linkKey(x)))) reasons.push('link');
    if (reasons.length) out.push({ provider: p, reasons });
  }
  return out.sort((a, b) => b.reasons.length - a.reasons.length || fold(a.provider.name).localeCompare(fold(b.provider.name)));
}
