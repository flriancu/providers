import { filterProviders, type Structure } from '../domain/filter';
import { sortedByFolded } from '../domain/fold';
import type { Provider } from '../domain/schema';
import type { Finder } from '../domain/search';
import type { ListQuery } from './route';

/**
 * The providers the list shows for a query (FR-10..13): filtered, then by name, or best search
 * match first when there is a search. Also what "export the providers shown" exports (FR-22).
 */
export function visibleProviders(doc: Structure, query: ListQuery, find: Finder | null): Provider[] {
  const filtered = filterProviders(doc, query.selection);
  if (!query.q.trim() || !find) return sortedByFolded(filtered, (p) => p.name);
  const byId = new Map(filtered.map((p) => [p.id, p]));
  return find(query.q, new Set(byId.keys())).map((id) => byId.get(id)!);
}
