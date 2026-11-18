import { decodeOrKeep } from './uri';

/**
 * What a provider's link is: its own website, or a profile on a known network or directory, and
 * the profile's handle. Pure; no network access, only the address is read.
 */
export type LinkKind = 'website' | 'instagram' | 'tiktok' | 'facebook' | 'youtube' | 'allweddings';

const HOSTS: [RegExp, Exclude<LinkKind, 'website'>][] = [
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)(facebook\.com|fb\.com)$/, 'facebook'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)allweddings\.ro$/, 'allweddings'],
];

/**
 * A scheme at the start: the link says what it is (https:, mailto:, tel:0721), with or without
 * "//" ("https:/x.ro" opens x.ro, as browsers read it). A host with a dot, or localhost, and a
 * port ("example.ro:8080") is an address without one.
 */
const SCHEME = /^(?![^:/]*\.[^:/]*:\d|localhost:\d)[a-z][a-z0-9+.-]*:/i;

/** The link as a URL, with https:// added when it has no scheme; null when it is not an address. */
export function toUrl(link: string): URL | null {
  const trimmed = link.trim();
  if (!trimmed) return null;
  try {
    return new URL(SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

/**
 * The address to open for a link: http or https only, with https:// added when it has no scheme;
 * null for anything else (javascript:, file:, intent:, or text that is no address). Links come
 * from people and imported files, so no other scheme ever becomes a link.
 */
export function webHref(link: string): string | null {
  const url = toUrl(link);
  if (url?.protocol !== 'http:' && url?.protocol !== 'https:') return null;
  const trimmed = link.trim();
  return SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function linkKind(link: string): LinkKind {
  const host = toUrl(link)?.hostname.toLowerCase() ?? '';
  return HOSTS.find(([pattern]) => pattern.test(host))?.[1] ?? 'website';
}

/** The account name in an Instagram or TikTok profile address ("bruno" for instagram.com/bruno/). */
export function handleOf(link: string): string {
  const first =
    toUrl(link)
      ?.pathname.split('/')
      .find((part) => part !== '') ?? '';
  return decodeOrKeep(first).replace(/^@/, '');
}

/** A provider's first web link of each kind, in the order they are stored. */
export function firstLinks(links: readonly string[]): Partial<Record<LinkKind, string>> {
  const out: Partial<Record<LinkKind, string>> = {};
  for (const link of links) {
    if (!webHref(link)) continue;
    const kind = linkKind(link);
    out[kind] ??= link;
  }
  return out;
}
