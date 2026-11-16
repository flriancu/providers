import { ancestors, effectiveLabels, labelById } from '../domain/labels';
import { FACET_IDS, live, type DirectoryDoc, type Facet, type Label, type Provider } from '../domain/schema';
import type { I18n } from '../i18n';

type T = I18n['t'];

/** A label's name: the owner's, as typed (D-30). */
export function labelName(label: Pick<Label, 'name'>): string {
  return label.name;
}

/** A facet's name: the owner's, else the interface's word for a starting facet (D-30). */
export function facetName(facet: Facet, t: T): string {
  return facet.name || (facet.key ? t(`facet.${facet.key}`) : '');
}

/**
 * Between a label and its parent: a right-pointing triangle (U+25B6), large enough to read,
 * in text style (U+FE0E) so no system draws it as an emoji.
 */
export const PATH_SEPARATOR = ` ${String.fromCodePoint(0x25b6, 0xfe0e)} `;

/** A label with its parent, e.g. "Wedding", the triangle, "Photo". */
export function labelPath(doc: DirectoryDoc, labelId: string): string {
  if (!labelById(doc, labelId)) return '';
  return [...ancestors(doc, labelId).toReversed(), labelId].map((id) => labelName(labelById(doc, id)!)).join(PATH_SEPARATOR);
}

/** The category shown first for a provider: its main one, else its first; none if it has no category. */
export function mainCategory(doc: DirectoryDoc, provider: Provider): string | undefined {
  const categories = effectiveLabels(doc, provider).filter((id) => labelById(doc, id)?.facetId === FACET_IDS.category);
  return provider.primaryCategoryId && categories.includes(provider.primaryCategoryId) ? provider.primaryCategoryId : categories[0];
}

/** Facets in panel order. */
export function orderedFacets(doc: DirectoryDoc): Facet[] {
  return live(doc.facets).sort((a, b) => a.order - b.order);
}

/** A facet's labels as a tree: top-level labels by name, each followed by its sub-labels. */
/** Labels by name. */
const byName = (a: Label, b: Label) => labelName(a).localeCompare(labelName(b));

export function facetTree(doc: DirectoryDoc, facetId: string) {
  const labels = live(doc.labels).filter((l) => l.facetId === facetId);
  const top = labels.filter((l) => !l.parentId || !labelById(doc, l.parentId)).sort(byName);
  return top.map((parent) => ({ label: parent, children: labels.filter((l) => l.parentId === parent.id).sort(byName) }));
}
