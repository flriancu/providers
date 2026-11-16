import { fold } from './fold';
import { live, type DirectoryDoc, type Label, type Provider } from './schema';

const has = <T>(record: Record<string, T>, id: string) => Object.hasOwn(record, id);

/** A live label, or undefined (gone, deleted, or never there). */
export function labelById(doc: DirectoryDoc, id: string): Label | undefined {
  const label = has(doc.labels, id) ? doc.labels[id] : undefined;
  return label && !label.deleted ? label : undefined;
}

/** The label and every live label under it, at any depth. */
export function subtree(doc: DirectoryDoc, labelId: string): Set<string> {
  const out = new Set<string>();
  if (!labelById(doc, labelId)) return out;
  out.add(labelId);
  const all = live(doc.labels);
  let added = true;
  while (added) {
    added = false;
    for (const l of all) {
      if (l.parentId && out.has(l.parentId) && !out.has(l.id)) {
        out.add(l.id);
        added = true;
      }
    }
  }
  return out;
}

/** The label's parents, nearest first; stops at a missing parent or a loop. */
export function ancestors(doc: DirectoryDoc, labelId: string): string[] {
  const out: string[] = [];
  let current = labelById(doc, labelId)?.parentId;
  while (current && !out.includes(current) && current !== labelId && labelById(doc, current)) {
    out.push(current);
    current = labelById(doc, current)?.parentId;
  }
  return out;
}

/**
 * The labels a provider carries: its own, without any deleted since (D-33: a provider without a
 * category simply has none; no placeholder label stands in).
 */
export function effectiveLabels(doc: DirectoryDoc, provider: Provider): string[] {
  return provider.labelIds.filter((id) => labelById(doc, id));
}

/**
 * Labels whose name or alias matches what was typed (FR-07), ignoring case and diacritics:
 * exact matches first, then those starting with the text, then those containing it;
 * alphabetical within each group.
 */
export function matchLabels(doc: DirectoryDoc, typed: string, facetId?: string): Label[] {
  const q = fold(typed);
  if (!q) return [];
  const rank = (l: Label) => {
    const words = [l.name, ...l.aliases].map(fold);
    if (words.includes(q)) return 0;
    if (words.some((w) => w.startsWith(q))) return 1;
    if (words.some((w) => w.includes(q))) return 2;
    return 3;
  };
  return live(doc.labels)
    .filter((l) => !facetId || l.facetId === facetId)
    .map((l) => ({ l, r: rank(l) }))
    .filter(({ r }) => r < 3)
    .sort((a, b) => a.r - b.r || fold(a.l.name).localeCompare(fold(b.l.name)))
    .map(({ l }) => l);
}

/**
 * FR-08: labels on no live provider, or on just one, with how many carry each. A parent counts
 * the providers under its children too: it is in use while they are.
 */
export function rarelyUsedLabels(doc: DirectoryDoc): { label: Label; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of live(doc.providers)) {
    const reached = new Set<string>();
    for (const id of effectiveLabels(doc, p)) for (const r of [id, ...ancestors(doc, id)]) reached.add(r);
    for (const id of reached) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return live(doc.labels)
    .map((label) => ({ label, count: counts.get(label.id) ?? 0 }))
    .filter(({ count }) => count <= 1)
    .sort((a, b) => a.count - b.count || fold(a.label.name).localeCompare(fold(b.label.name)));
}
