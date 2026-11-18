import MiniSearch from 'minisearch';
import { fold } from './fold';
import { effectiveLabels, labelById } from './labels';
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
 * The words a provider's labels add: each label's name and aliases, so "foto" finds a provider
 * labelled Photo (alias Foto).
 */
function labelWords(doc: DirectoryDoc, p: Provider): string {
  return effectiveLabels(doc, p)
    .flatMap((id) => {
      const l = labelById(doc, id)!;
      return [l.name, ...l.aliases];
    })
    .join(' ');
}

/** What the index holds of each provider, as text. */
function indexed(doc: DirectoryDoc): Map<string, Indexed> {
  const logByProvider = new Map<string, string[]>();
  for (const entry of live(doc.log)) {
    const texts = logByProvider.get(entry.providerId);
    if (texts) texts.push(entry.text);
    else logByProvider.set(entry.providerId, [entry.text]);
  }
  return new Map(
    live(doc.providers).map((p) => [
      p.id,
      {
        id: p.id,
        name: p.name,
        contactPerson: p.contactPerson,
        address: p.address,
        links: p.links.join(' '),
        notes: p.notes,
        log: (logByProvider.get(p.id) ?? []).join('\n'),
        labels: labelWords(doc, p),
      },
    ]),
  );
}

const sameIndexed = (a: Indexed, b: Indexed) => FIELDS.every((f) => a[f] === b[f]);

/**
 * A search over the index as it is at one moment: provider ids matching the query, best first,
 * within the given ids. A new Finder comes with every change to the index, so what depends on
 * search results can tell when they may have changed.
 */
export type Finder = (query: string, within?: ReadonlySet<string>) => string[];

/**
 * FR-13 search over a directory: words match from their beginning and with typos, in any order,
 * ignoring case and diacritics; every word typed must match; matches in the name rank first.
 * Label names and aliases count too, below the provider's own fields.
 * Built once, then kept in step with the directory (`sync`): only the providers whose text
 * changed are indexed again, so one edit in a large directory does not rebuild the whole index.
 */
export class ProviderSearch {
  private readonly index = new MiniSearch<Indexed>({
    fields: [...FIELDS],
    processTerm: (term) => fold(term) || null,
    searchOptions: { prefix: true, fuzzy: FUZZY, combineWith: 'AND', boost: { name: 3, contactPerson: 2, labels: 0.5 } },
  });
  /** What is in the index now, per provider id. */
  private held = new Map<string, Indexed>();
  /** A search over the index as it is now (see Finder). */
  private finder: Finder = (query, within) => this.search(query, within);

  constructor(doc: DirectoryDoc) {
    this.held = indexed(doc);
    this.index.addAll([...this.held.values()]);
  }

  /**
   * Brings the index in step with `doc`: providers added, changed or gone since the last time.
   * Returns the Finder for the index now: the same one when nothing changed.
   */
  sync(doc: DirectoryDoc): Finder {
    const next = indexed(doc);
    let changed = false;
    for (const [id, entry] of next) {
      const before = this.held.get(id);
      if (before && sameIndexed(before, entry)) continue;
      if (before) this.index.replace(entry);
      else this.index.add(entry);
      changed = true;
    }
    for (const id of this.held.keys()) {
      if (next.has(id)) continue;
      this.index.discard(id);
      changed = true;
    }
    this.held = next;
    if (changed) this.finder = (query, within) => this.search(query, within);
    return this.finder;
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
