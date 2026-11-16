import { effectiveLabels, labelById, subtree } from './labels';
import { live, type DirectoryDoc, type Provider } from './schema';

/** What is selected in the filter panel: label ids per facet id. */
export type Selection = Record<string, readonly string[]>;

export const NO_SELECTION: Selection = {};

/**
 * The selection without values that no longer exist (a label deleted, a facet gone, an old
 * bookmark): they are ignored rather than emptying the list.
 */
export function liveSelection(doc: DirectoryDoc, selection: Selection): Selection {
  const out: Record<string, string[]> = {};
  for (const [facetId, ids] of Object.entries(selection)) {
    const facet = Object.hasOwn(doc.facets, facetId) ? doc.facets[facetId] : undefined;
    if (!facet || facet.deleted) continue;
    const kept = ids.filter((id) => id === NO_LABEL || labelById(doc, id)?.facetId === facetId);
    if (kept.length) out[facetId] = kept;
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

/** Per facet: the label ids a provider must carry one of (a selected label or any label under it), or none at all. */
function wanted(doc: DirectoryDoc, selection: Selection): Map<string, Wanted> {
  const out = new Map<string, Wanted>();
  for (const [facetId, ids] of Object.entries(selection)) {
    if (!ids.length) continue;
    const labels = new Set<string>();
    for (const id of ids) if (id !== NO_LABEL) for (const d of subtree(doc, id)) labels.add(d);
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

function prepare(doc: DirectoryDoc): Prepared[] {
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
export function filterProviders(doc: DirectoryDoc, selection: Selection): Provider[] {
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
 * can never lead to an empty list. A parent label counts the providers under any of its
 * children; NO_LABEL counts the providers with no label in the facet.
 */
export function facetCounts(doc: DirectoryDoc, selection: Selection): FacetCounts {
  const want = wanted(doc, selection);
  const prepared = prepare(doc);
  const parents = new Map(live(doc.labels).map((l) => [l.id, l.parentId]));
  const out: FacetCounts = {};
  for (const facet of live(doc.facets)) {
    const counts: Record<string, number> = { [NO_LABEL]: 0 };
    for (const l of live(doc.labels)) if (l.facetId === facet.id) counts[l.id] = 0;
    for (const p of prepared) {
      if (!matches(p, want, facet.id)) continue;
      if (!p.facets.has(facet.id)) counts[NO_LABEL]! += 1;
      // Each label the provider carries, and its ancestors, once per provider.
      const seen = new Set<string>();
      for (const id of p.labels) {
        let current: string | undefined = id;
        while (current && !seen.has(current)) {
          seen.add(current);
          current = parents.get(current);
        }
      }
      for (const id of seen) if (Object.hasOwn(counts, id)) counts[id]! += 1;
    }
    out[facet.id] = counts;
  }
  return out;
}
