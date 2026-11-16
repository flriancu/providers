import MiniSearch from 'minisearch';
import { fold } from './fold';
import { ancestors, effectiveLabels, labelById } from './labels';
import { live, type DirectoryDoc, type Provider } from './schema';

/**
 * D-23: typo tolerance as a share of each word's length. 0.34 allows two edits in a word of six
 * letters, enough for two swapped letters ("slacii" finds "Salcii"); measured on seed-like names
 * on 2026-11-16.
 */
export const FUZZY = 0.34;

interface Indexed {
  id: string;
  name: string;
  contactPerson: string;
  address: string;
  links: string;
  notes: string;
  log: string;
  labels: string;
}

const FIELDS = ['name', 'contactPerson', 'address', 'links', 'notes', 'log', 'labels'] as const;

/**
 * The words a provider's labels add: each label's name and aliases, and its parents' names, so
 * "foto" finds a provider labelled Wedding, Photo (alias Foto).
 */
function labelWords(doc: DirectoryDoc, p: Provider): string {
  const ids = new Set<string>();
  for (const id of effectiveLabels(doc, p)) for (const l of [id, ...ancestors(doc, id)]) ids.add(l);
  return [...ids]
    .flatMap((id) => {
      const l = labelById(doc, id)!;
      return [l.name, ...l.aliases];
    })
    .join(' ');
}

/**
 * FR-13 search over a directory: words match from their beginning and with typos, in any order,
 * ignoring case and diacritics; every word typed must match; matches in the name rank first.
 * Label names and aliases count too, below the provider's own fields.
 * Built once per directory version, then queried as the user types.
 */
export class ProviderSearch {
  private readonly index = new MiniSearch<Indexed>({
    fields: [...FIELDS],
    processTerm: (term) => fold(term) || null,
    searchOptions: { prefix: true, fuzzy: FUZZY, combineWith: 'AND', boost: { name: 3, contactPerson: 2, labels: 0.5 } },
  });

  constructor(doc: DirectoryDoc) {
    const logByProvider = new Map<string, string[]>();
    for (const entry of live(doc.log)) logByProvider.set(entry.providerId, [...(logByProvider.get(entry.providerId) ?? []), entry.text]);
    this.index.addAll(
      live(doc.providers).map((p) => ({
        id: p.id,
        name: p.name,
        contactPerson: p.contactPerson,
        address: p.address,
        links: p.links.join(' '),
        notes: p.notes,
        log: (logByProvider.get(p.id) ?? []).join('\n'),
        labels: labelWords(doc, p),
      })),
    );
  }

  /**
   * Provider ids matching `query`, best first. `within`: only these (the providers left by the
   * current filters). An empty query returns nothing: the caller shows the filtered list as is.
   */
  search(query: string, within?: ReadonlySet<string>): string[] {
    if (!fold(query)) return [];
    const results = this.index.search(query, within ? { filter: (r) => within.has(r.id as string) } : {});
    return results.map((r) => r.id as string);
  }
}
