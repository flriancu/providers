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

/** Query parameters that only track a visit (campaign, click or share ids): they never tell pages apart. */
const TRACKING = /^(utm_.*|fbclid|gclid|igsh|igshid|si|ref)$/i;

/**
 * A link without its scheme, a leading "www.", tracking parameters, the fragment and a trailing
 * slash, in lower case: https://www.Example.ro/?utm_source=x and example.ro compare equal, while
 * two Instagram profiles (same host, different path) do not, nor two Facebook pages that differ
 * only in their query (facebook.com/profile.php?id=1 and ?id=2).
 */
export function linkKey(link: string): string {
  const trimmed = link.trim();
  let host = '';
  let path = '';
  let query = '';
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    host = url.hostname;
    path = url.pathname;
    const kept = [...url.searchParams].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => a.localeCompare(b));
    query = kept.length ? `?${new URLSearchParams(kept).toString()}` : '';
  } catch {
    return fold(trimmed);
  }
  return `${host.toLowerCase().replace(/^www\./, '')}${path.replace(/\/+$/, '').toLowerCase()}${query}`;
}

const nonEmpty = (keys: string[]) => new Set(keys.filter((k) => k !== ''));

/**
 * Why two candidates look like the same provider: the same name (ignoring case, diacritics and
 * spacing), phone, email or link. Empty when they share none.
 */
export function sameAs(a: Candidate, b: Candidate): Reason[] {
  const name = fold(a.name);
  const phones = nonEmpty(a.phones.map(phoneKey));
  const emails = nonEmpty(a.emails.map(fold));
  const links = nonEmpty(a.links.map(linkKey));
  const reasons: Reason[] = [];
  if (name !== '' && fold(b.name) === name) reasons.push('name');
  if (b.phones.some((x) => phones.has(phoneKey(x)))) reasons.push('phone');
  if (b.emails.some((x) => emails.has(fold(x)))) reasons.push('email');
  if (b.links.some((x) => links.has(linkKey(x)))) reasons.push('link');
  return reasons;
}

/**
 * FR-23: live providers that look like the candidate, with every reason found. Nothing is merged
 * here: the owner decides (D-12). `exclude`: the candidate's own id, when it is already in the
 * directory.
 */
export function findDuplicates(doc: DirectoryDoc, candidate: Candidate, exclude?: string): PossibleDuplicate[] {
  const out: PossibleDuplicate[] = [];
  for (const p of live(doc.providers)) {
    if (p.id === exclude) continue;
    const reasons = sameAs(candidate, p);
    if (reasons.length) out.push({ provider: p, reasons });
  }
  return out.sort((a, b) => b.reasons.length - a.reasons.length || fold(a.provider.name).localeCompare(fold(b.provider.name)));
}
