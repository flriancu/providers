import { byFolded, fold } from './fold';
import { live, own, type DirectoryDoc, type Label, type Provider } from './schema';

/** A live label, or undefined (gone, deleted, or never there). */
export function labelById(doc: Pick<DirectoryDoc, 'labels'>, id: string): Label | undefined {
  const label = own(doc.labels, id);
  return label && !label.deleted ? label : undefined;
}

/**
 * The labels a provider carries: its own, without any deleted since (D-33: a provider without a
 * category simply has none; no placeholder label stands in).
 */
export function effectiveLabels(doc: Pick<DirectoryDoc, 'labels'>, provider: Provider): string[] {
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
    .sort((a, b) => a.r - b.r || byFolded(a.l.name, b.l.name))
    .map(({ l }) => l);
}

/**
 * FR-08: labels on no live provider, or on just one, with how many carry each.
 */
export function rarelyUsedLabels(doc: DirectoryDoc): { label: Label; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of live(doc.providers)) {
    for (const id of effectiveLabels(doc, p)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return live(doc.labels)
    .map((label) => ({ label, count: counts.get(label.id) ?? 0 }))
    .filter(({ count }) => count <= 1)
    .sort((a, b) => a.count - b.count || byFolded(a.label.name, b.label.name));
}
