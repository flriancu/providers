import { createContext, useContext, useEffect, useState } from 'react';
import type { Selection } from '../domain/filter';
import { decodeOrKeep } from '../domain/uri';

/**
 * Where the app is, kept in the address's hash so it works on any static host, survives a
 * reload, can be bookmarked and goes back with the browser's Back button (FR-12).
 *   #/                      the provider list
 *   #/p/<id>                one provider
 *   #/p/<id>/edit, #/new    the provider form
 *   #/labels                labels and facets
 * The list's filters and search follow as a query on any page, so opening a provider and coming
 * back keeps them: ?f=<facet id>~<label id>&f=...&q=<search>.
 */
export type Page =
  | { page: 'list' }
  | { page: 'provider'; id: string }
  | { page: 'edit'; id: string }
  | { page: 'new' }
  | { page: 'labels' }
  | { page: 'data' };

export interface ListQuery {
  selection: Selection;
  q: string;
}

export type Route = Page & { query: ListQuery };

export const EMPTY_QUERY: ListQuery = { selection: {}, q: '' };

const SEP = '~';

export function parseQuery(search: string): ListQuery {
  const params = new URLSearchParams(search);
  // A Map, not an object: the ids come from the address, and "__proto__" or "constructor" must be plain keys.
  const selection = new Map<string, string[]>();
  for (const value of params.getAll('f')) {
    const at = value.indexOf(SEP);
    if (at <= 0 || at === value.length - 1) continue;
    const facetId = value.slice(0, at);
    const labelId = value.slice(at + 1);
    const list = selection.get(facetId) ?? [];
    if (!list.includes(labelId)) list.push(labelId);
    selection.set(facetId, list);
  }
  return { selection: Object.fromEntries(selection), q: params.get('q') ?? '' };
}

export function queryString(query: ListQuery): string {
  const params = new URLSearchParams();
  for (const [facetId, ids] of Object.entries(query.selection)) for (const id of ids) params.append('f', `${facetId}${SEP}${id}`);
  if (query.q.trim()) params.set('q', query.q);
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const at = raw.indexOf('?');
  const path = at === -1 ? raw : raw.slice(0, at);
  const query = parseQuery(at === -1 ? '' : raw.slice(at + 1));
  const parts = path.split('/').map(decodeOrKeep);
  let page: Page = { page: 'list' };
  if (parts[0] === 'labels') page = { page: 'labels' };
  else if (parts[0] === 'data') page = { page: 'data' };
  else if (parts[0] === 'new') page = { page: 'new' };
  else if (parts[0] === 'p' && parts[1]) page = parts[2] === 'edit' ? { page: 'edit', id: parts[1] } : { page: 'provider', id: parts[1] };
  return { ...page, query };
}

function pathOf(page: Page): string {
  switch (page.page) {
    case 'list':
      return '#/';
    case 'labels':
      return '#/labels';
    case 'data':
      return '#/data';
    case 'new':
      return '#/new';
    case 'provider':
      return `#/p/${encodeURIComponent(page.id)}`;
    case 'edit':
      return `#/p/${encodeURIComponent(page.id)}/edit`;
  }
}

/** The address of a page, keeping the list's filters and search (`query`) when given. */
export function href(page: Page, query: ListQuery = EMPTY_QUERY): string {
  return `${pathOf(page)}${queryString(query)}`;
}

export function go(page: Page, query?: ListQuery) {
  location.hash = href(page, query);
}

/**
 * How often the address follows typing, at most. Browsers limit history changes: WebKit refuses
 * more than 100 in 10 seconds (SecurityError) and Firefox drops some, so one per keystroke loses
 * characters to fast typing or key repeat. The app's route follows every key at once (QUERY_EVENT).
 */
const ADDRESS_EVERY_MS = 150;
/** The route as the app shows it, ahead of the address while the address waits to be written. */
const QUERY_EVENT = 'providers:query';
let pendingAddress: string | null = null;
let addressTimer: ReturnType<typeof setTimeout> | undefined;
let lastWrite = 0;

function writeAddress() {
  clearTimeout(addressTimer);
  if (pendingAddress === null) return;
  history.replaceState(history.state, '', pendingAddress);
  pendingAddress = null;
  lastWrite = Date.now();
}

/** A real navigation (a link, Back): an address still waiting from the old page must not overwrite it. */
function dropPendingAddress() {
  clearTimeout(addressTimer);
  pendingAddress = null;
}

/**
 * Changes the list's filters or search without a new history entry per keystroke or tick: the
 * app follows at once; the address follows within ADDRESS_EVERY_MS, and when the page is left.
 */
export function replaceQuery(page: Page, query: ListQuery) {
  pendingAddress = href(page, query);
  window.dispatchEvent(new CustomEvent(QUERY_EVENT, { detail: pendingAddress }));
  clearTimeout(addressTimer);
  const wait = lastWrite + ADDRESS_EVERY_MS - Date.now();
  if (wait <= 0) writeAddress();
  else addressTimer = setTimeout(writeAddress, wait);
}

/** The filters' part of a query, as text: two equal ones are the same filters. */
const filters = (q: ListQuery) => queryString({ selection: q.selection, q: '' });

/**
 * `next`, keeping the parts of `before` that did not change, as the same objects: typing in the
 * search changes the address on every key, and the filters' counts and the list are worked out
 * again only when what they depend on is a new object. The same address: `before` itself.
 */
export function steadyRoute(before: Route, next: Route): Route {
  const selection = filters(before.query) === filters(next.query) ? before.query.selection : next.query.selection;
  const query = selection === before.query.selection && before.query.q === next.query.q ? before.query : { ...next.query, selection };
  const same = href(before, before.query) === href(next, next.query);
  return same ? before : { ...next, query };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const follow = (hash: string) => setRoute((before) => steadyRoute(before, parseRoute(hash)));
    const onHash = () => {
      dropPendingAddress();
      follow(location.hash);
    };
    const onQuery = (e: Event) => follow((e as CustomEvent<string>).detail);
    window.addEventListener('hashchange', onHash);
    window.addEventListener(QUERY_EVENT, onQuery);
    window.addEventListener('pagehide', writeAddress);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener(QUERY_EVENT, onQuery);
      window.removeEventListener('pagehide', writeAddress);
    };
  }, []);
  return route;
}

/** The list's current filters and search, for links that should keep them. */
const QueryContext = createContext<ListQuery>(EMPTY_QUERY);
export const ListQueryProvider = QueryContext.Provider;
export const useListQuery = () => useContext(QueryContext);
