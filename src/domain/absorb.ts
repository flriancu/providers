import { fold } from './fold';
import { merge } from './merge';
import { live, put, type DirectoryDoc, type Label, type Provider, type Share } from './schema';

/**
 * Another version of my directory added into mine (drive-doc-sync's `absorb`): a second file
 * made on another device, this device's copy, or what was added in the signed-out demo.
 *
 * A label of `from` that `into` lacks, but `into` already has under the same name (ignoring
 * case and diacritics) in the same facet, is taken as that label: its providers get `into`'s
 * label, and no second "Photo" appears. Settings come along only from a directory of the same
 * account, never from the demo. Pure; absorbing twice changes nothing more.
 */
export function absorb(into: DirectoryDoc, from: DirectoryDoc): DirectoryDoc {
  const same = sameLabels(into, from);
  const mapped = same.size ? relabel(from, same) : from;
  const settings = from.owner.googleSub === into.owner.googleSub ? mapped.settings : into.settings;
  return merge({ ...mapped, settings }, into);
}

/** What makes two labels the same: facet, and name ignoring case and diacritics. */
const key = (l: Pick<Label, 'facetId' | 'name'>) => JSON.stringify([l.facetId, fold(l.name)]);

/** Label ids of `from` that stand for a label `into` already has: from id to into id. */
function sameLabels(into: DirectoryDoc, from: DirectoryDoc): Map<string, string> {
  const existing = new Map(live(into.labels).map((l) => [key(l), l.id]));
  const out = new Map<string, string>();
  for (const l of live(from.labels)) {
    if (Object.hasOwn(into.labels, l.id)) continue;
    const match = existing.get(key(l));
    if (match) out.set(l.id, match);
  }
  return out;
}

/** `doc` with every label in `same` replaced by its counterpart, and those labels left out. */
function relabel(doc: DirectoryDoc, same: Map<string, string>): DirectoryDoc {
  const to = (id: string) => same.get(id) ?? id;
  const labels: Record<string, Label> = {};
  for (const [id, l] of Object.entries(doc.labels)) if (!same.has(id)) put(labels, id, l);
  const providers: Record<string, Provider> = {};
  for (const [id, p] of Object.entries(doc.providers)) {
    const touched = p.labelIds.some((l) => same.has(l));
    put(
      providers,
      id,
      touched
        ? {
            ...p,
            labelIds: [...new Set(p.labelIds.map(to))],
            ...(p.primaryCategoryId && { primaryCategoryId: to(p.primaryCategoryId) }),
          }
        : p,
    );
  }
  const shares: Record<string, Share> = {};
  for (const [id, s] of Object.entries(doc.shares))
    put(shares, id, s.labelId && same.has(s.labelId) ? { ...s, labelId: to(s.labelId) } : s);
  return { ...doc, labels, providers, shares };
}
