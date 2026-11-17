import { effectiveLabels, labelById } from '../domain/labels';
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

/** A live label's name by id; empty for a label that is gone. */
export function labelNameById(doc: DirectoryDoc, labelId: string): string {
  const label = labelById(doc, labelId);
  return label ? labelName(label) : '';
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

/** A facet's labels, by name: one level, no sub-labels (D-35). */
export function facetLabels(doc: DirectoryDoc, facetId: string): Label[] {
  return live(doc.labels)
    .filter((l) => l.facetId === facetId)
    .sort((a, b) => labelName(a).localeCompare(labelName(b)));
}
