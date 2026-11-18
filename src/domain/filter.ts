import { effectiveLabels, labelById } from './labels';
import { live, own, put, type DirectoryDoc, type Provider } from './schema';

/** What filtering reads of a directory: its providers, labels and facets, never the log. */
export type Structure = Pick<DirectoryDoc, 'providers' | 'labels' | 'facets'>;

/** What is selected in the filter panel: label ids per facet id. */
export type Selection = Record<string, readonly string[]>;

export const NO_SELECTION: Selection = {};

/**
 * The selection without values that no longer exist (a label deleted, a facet gone, an old
 * bookmark): they are ignored rather than emptying the list.
 */
export function liveSelection(doc: Pick<DirectoryDoc, 'labels' | 'facets'>, selection: Selection): Selection {
  const out: Record<string, string[]> = {};
  for (const [facetId, ids] of Object.entries(selection)) {
    const facet = own(doc.facets, facetId);
    if (!facet || facet.deleted) continue;
    const kept = ids.filter((id) => id === NO_LABEL || labelById(doc, id)?.facetId === facetId);
    if (kept.length) put(out, facetId, kept);
  }
  return out;
}

/**
 * D-33: a value every facet offers, for the providers with no label in it ("No category",
 * "No area"). Selected and counted like a label; no record stands behind it.
 */
export const NO_LABEL = '(none)';

interface Wanted {
  labels: Set<string>;
  none: boolean;
}

/** Per facet: the label ids a provider must carry one of, or none at all. */
function wanted(doc: Pick<DirectoryDoc, 'labels'>, selection: Selection): Map<string, Wanted> {
  const out = new Map<string, Wanted>();
  for (const [facetId, ids] of Object.entries(selection)) {
    if (!ids.length) continue;
    const labels = new Set(ids.filter((id) => id !== NO_LABEL && labelById(doc, id)));
    out.set(facetId, { labels, none: ids.includes(NO_LABEL) });
  }
  return out;
}

interface Prepared {
  provider: Provider;
  labels: Set<string>;
  /** The facets the provider has at least one label in. */
  facets: Set<string>;
}

function prepare(doc: Structure): Prepared[] {
  return live(doc.providers).map((provider) => {
    const labels = effectiveLabels(doc, provider);
    return { provider, labels: new Set(labels), facets: new Set(labels.map((id) => labelById(doc, id)!.facetId)) };
  });
}

/** FR-10: OR within a facet, AND across facets. `skip`: ignore that facet's own selection. */
function matches(p: Prepared, want: Map<string, Wanted>, skip?: string): boolean {
  for (const [facetId, w] of want) {
    if (facetId === skip) continue;
    let any = w.none && !p.facets.has(facetId);
    for (const id of w.labels) {
      if (any) break;
      any = p.labels.has(id);
    }
    if (!any) return false;
  }
  return true;
}

/** The providers that match the selection. */
export function filterProviders(doc: Structure, selection: Selection): Provider[] {
  const want = wanted(doc, selection);
  return prepare(doc)
    .filter((p) => matches(p, want))
    .map((p) => p.provider);
}

/** facet id, then label id (or NO_LABEL): how many providers would match with that value also selected. */
export type FacetCounts = Record<string, Record<string, number>>;

/**
 * FR-11: the count next to each value. A value's count ignores its own facet's selection, so
 * it says how many providers ticking it would add (OR within a facet), and a value showing 0
 * can never lead to an empty list. NO_LABEL counts the providers with no label in the facet.
 * `within`: the providers a search found; only they count, as only they can be shown.
 */
export function facetCounts(doc: Structure, selection: Selection, within?: ReadonlySet<string>): FacetCounts {
  const want = wanted(doc, selection);
  const prepared = within ? prepare(doc).filter((p) => within.has(p.provider.id)) : prepare(doc);
  const out: FacetCounts = {};
  for (const facet of live(doc.facets)) {
    const counts: Record<string, number> = { [NO_LABEL]: 0 };
    for (const l of live(doc.labels)) if (l.facetId === facet.id) put(counts, l.id, 0);
    for (const p of prepared) {
      if (!matches(p, want, facet.id)) continue;
      if (!p.facets.has(facet.id)) counts[NO_LABEL]! += 1;
      for (const id of p.labels) if (Object.hasOwn(counts, id)) counts[id]! += 1;
    }
    put(out, facet.id, counts);
  }
  return out;
}
