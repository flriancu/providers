import { filterProviders } from '../domain/filter';
import { byFolded } from '../domain/fold';
import type { DirectoryDoc, Provider } from '../domain/schema';
import type { ProviderSearch } from '../domain/search';
import type { ListQuery } from './route';

/**
 * The providers the list shows for a query (FR-10..13): filtered, then by name, or best search
 * match first when there is a search. Also what "export the providers shown" exports (FR-22).
 */
export function visibleProviders(doc: DirectoryDoc, query: ListQuery, search: ProviderSearch): Provider[] {
  const filtered = filterProviders(doc, query.selection);
  if (!query.q.trim()) return filtered.sort((a, b) => byFolded(a.name, b.name));
  const byId = new Map(filtered.map((p) => [p.id, p]));
  return search.search(query.q, new Set(byId.keys())).map((id) => byId.get(id)!);
}
