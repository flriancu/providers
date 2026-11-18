import { phoneNumbers } from './contact';
import { byFolded, fold } from './fold';
import { linkKind, toUrl } from './links';
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

/** The numbers in a phone field ("0721 234 567, 0722 000 111" holds two), each by its phoneKey. */
const phoneKeys = (field: string) => phoneNumbers(field).map(phoneKey);

/** Query parameters that only track a visit (campaign, click or share ids): they never tell pages apart. */
const TRACKING = /^(utm_.*|fbclid|gclid|igsh|igshid|si|ref)$/i;

/**
 * A link without its scheme, a leading "www.", tracking parameters, the fragment and a trailing
 * slash, its host in lower case: https://www.Example.ro/?utm_source=x and example.ro compare
 * equal, while two Instagram profiles (same host, different path) do not, nor two Facebook pages
 * that differ only in their query (facebook.com/profile.php?id=1 and ?id=2). The path keeps its
 * case, except on networks whose account names ignore it (instagram.com/Bruno is /bruno).
 */
export function linkKey(link: string): string {
  const url = toUrl(link);
  if (!url) return fold(link);
  const kept = [...url.searchParams].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => a.localeCompare(b));
  const query = kept.length ? `?${new URLSearchParams(kept).toString()}` : '';
  // Account names on these networks ignore case; elsewhere a path's case can matter (youtu.be/AbC).
  const path = url.pathname.replace(/\/+$/, '');
  const caseless = ['instagram', 'tiktok', 'facebook', 'allweddings'].includes(linkKind(link));
  return `${url.hostname.toLowerCase().replace(/^www\./, '')}${caseless ? path.toLowerCase() : path}${query}`;
}

const nonEmpty = (keys: string[]) => new Set(keys.filter((k) => k !== ''));

/**
 * Why two candidates look like the same provider: the same name (ignoring case, diacritics and
 * spacing), phone, email or link. Empty when they share none.
 */
export function sameAs(a: Candidate, b: Candidate): Reason[] {
  const name = fold(a.name);
  const phones = nonEmpty(a.phones.flatMap(phoneKeys));
  const emails = nonEmpty(a.emails.map(fold));
  const links = nonEmpty(a.links.map(linkKey));
  const reasons: Reason[] = [];
  if (name !== '' && fold(b.name) === name) reasons.push('name');
  if (b.phones.some((x) => phoneKeys(x).some((k) => phones.has(k)))) reasons.push('phone');
  if (b.emails.some((x) => emails.has(fold(x)))) reasons.push('email');
  if (b.links.some((x) => links.has(linkKey(x)))) reasons.push('link');
  return reasons;
}

/** What a candidate can be recognised by, each with the reason a match on it gives (as sameAs). */
function keysOf(c: Candidate): [Reason, string][] {
  const name = fold(c.name);
  return [
    ...(name ? [['name', name] as [Reason, string]] : []),
    ...[...nonEmpty(c.phones.flatMap(phoneKeys))].map((k): [Reason, string] => ['phone', k]),
    ...[...nonEmpty(c.emails.map(fold))].map((k): [Reason, string] => ['email', k]),
    ...[...nonEmpty(c.links.map(linkKey))].map((k): [Reason, string] => ['link', k]),
  ];
}

const REASONS: readonly Reason[] = ['name', 'phone', 'email', 'link'];

/**
 * Look-alikes found by what they can be recognised by, as sameAs finds them, but looked up
 * rather than compared pair by pair: a file of 10,000 rows against 10,000 providers is a lookup
 * per row, not a hundred million comparisons.
 */
export class LookalikeIndex<T> {
  private readonly byKey = new Map<string, T[]>();

  add(item: T, candidate: Candidate) {
    for (const [reason, key] of keysOf(candidate)) {
      const k = `${reason} ${key}`;
      const items = this.byKey.get(k);
      if (items) items.push(item);
      else this.byKey.set(k, [item]);
    }
  }

  /** Every item that looks like the candidate, with its reasons in sameAs's order. */
  find(candidate: Candidate): { item: T; reasons: Reason[] }[] {
    const found = new Map<T, Set<Reason>>();
    for (const [reason, key] of keysOf(candidate))
      for (const item of this.byKey.get(`${reason} ${key}`) ?? []) {
        const reasons = found.get(item);
        if (reasons) reasons.add(reason);
        else found.set(item, new Set([reason]));
      }
    return [...found].map(([item, reasons]) => ({ item, reasons: REASONS.filter((r) => reasons.has(r)) }));
  }
}

/** Look-alikes as FR-23 lists them: most reasons first, then by name. */
export const byLikeness = (out: PossibleDuplicate[]) =>
  out.sort((a, b) => b.reasons.length - a.reasons.length || byFolded(a.provider.name, b.provider.name));

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
  return byLikeness(out);
}
