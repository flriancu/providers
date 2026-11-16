import { useCallback, useMemo, useState } from 'react';
import { facetCounts, filterProviders, liveSelection, type Selection } from '../domain/filter';
import { fold } from '../domain/fold';
import { effectiveLabels, labelById } from '../domain/labels';
import { live, type DirectoryDoc, type Provider } from '../domain/schema';
import { ProviderSearch } from '../domain/search';
import { useI18n } from '../i18n';
import { ActiveFilters, chosenCount, FilterPanel, toggled } from './FilterPanel';
import { FilterSheet } from './FilterSheet';
import { LabelChip } from './LabelChip';
import { labelPath, mainCategory, orderedFacets } from './labelText';
import { ProviderDetail } from './ProviderDetail';
import { ProviderForm } from './ProviderForm';
import { href, ListQueryProvider, replaceQuery, type ListQuery, type Route } from './route';
import type { Apply } from './types';
import { useListScroll } from './useListScroll';

/** A provider's labels for its row: the main category first (if any), then the others in facet order. */
function rowLabels(doc: DirectoryDoc, p: Provider): string[] {
  const order = new Map(orderedFacets(doc).map((f, i) => [f.id, i]));
  const main = mainCategory(doc, p);
  const rest = effectiveLabels(doc, p)
    .filter((id) => id !== main)
    .sort((a, b) => (order.get(labelById(doc, a)!.facetId) ?? 99) - (order.get(labelById(doc, b)!.facetId) ?? 99));
  return main ? [main, ...rest] : rest;
}

/** A web address without its scheme and "www.", short enough for a list row. */
function shortLink(link: string): string {
  return link
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
}

/**
 * Browse (FR-10..13) in an adaptive list-detail layout (D-29): filters, list and provider side
 * by side on a wide screen; below that the filters open from a button, and on a phone the list
 * and a provider take turns. Filters and search live in the address, so reload, bookmarks and
 * Back keep them, also across opening a provider.
 */
export function ProvidersPage({ doc, apply, route }: { doc: DirectoryDoc; apply: Apply; route: Route }) {
  const { t, plural } = useI18n();
  // Values that no longer exist are dropped, so an old address never empties the list.
  const query = useMemo(() => ({ ...route.query, selection: liveSelection(doc, route.query.selection) }), [doc, route.query]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const all = useMemo(() => live(doc.providers), [doc]);
  const search = useMemo(() => new ProviderSearch(doc), [doc]);
  const counts = useMemo(() => facetCounts(doc, query.selection), [doc, query.selection]);
  const shown = useMemo(() => {
    const filtered = filterProviders(doc, query.selection);
    if (!query.q.trim()) return filtered.sort((a, b) => fold(a.name).localeCompare(fold(b.name)));
    const byId = new Map(filtered.map((p) => [p.id, p]));
    return search.search(query.q, new Set(byId.keys())).map((id) => byId.get(id)!);
  }, [doc, query, search]);

  const selected = route.page === 'provider' || route.page === 'edit' ? route.id : undefined;
  const showing = route.page === 'list' ? 'list' : 'detail';
  useListScroll(route.page === 'list' ? 'list' : `${route.page}:${selected ?? ''}`);

  const setQuery = useCallback((next: ListQuery) => replaceQuery(route, next), [route]);
  const setSelection = useCallback((selection: Selection) => setQuery({ ...query, selection }), [query, setQuery]);
  const toggle = useCallback(
    (facetId: string, labelId: string, on: boolean) => setSelection(toggled(query.selection, facetId, labelId, on)),
    [query.selection, setSelection],
  );
  const clear = useCallback(() => setSelection({}), [setSelection]);
  const chosen = chosenCount(query.selection);
  const narrowed = chosen > 0 || query.q.trim() !== '';

  return (
    <ListQueryProvider value={query}>
      <div className="browse" data-showing={showing}>
        <aside className="pane filter-pane" aria-labelledby="filter-heading">
          <h2 id="filter-heading">{t('filter.heading')}</h2>
          <FilterPanel doc={doc} selection={query.selection} counts={counts} toggle={toggle} />
        </aside>

        <section className="pane list-pane" aria-labelledby="list-heading">
          <div className="pane-header">
            <h2 id="list-heading">
              {t('list.heading')}{' '}
              <span className="count">
                {narrowed
                  ? t('list.shownOf', { n: shown.length, total: plural('providers', all.length) })
                  : plural('providers', all.length)}
              </span>
            </h2>
            <a className="button" href={href({ page: 'new' }, query)}>
              {t('list.add')}
            </a>
          </div>
          <input
            type="search"
            className="search"
            aria-label={t('search.label')}
            placeholder={t('search.placeholder')}
            value={query.q}
            onChange={(e) => setQuery({ ...query, q: e.target.value })}
          />
          <div className="filter-bar">
            <button type="button" className="secondary filter-button" aria-haspopup="dialog" onClick={() => setSheetOpen(true)}>
              {chosen ? t('filter.openCount', { count: chosen }) : t('filter.open')}
            </button>
            <ActiveFilters doc={doc} selection={query.selection} toggle={toggle} clear={clear} />
          </div>

          {all.length === 0 ? (
            <p className="muted">{t('list.empty')}</p>
          ) : shown.length === 0 ? (
            <p className="muted">{t('list.noMatch')}</p>
          ) : (
            <ul className="provider-list">
              {shown.map((p) => {
                const contacts = [p.phones[0], p.emails[0], p.links[0] && shortLink(p.links[0])].filter(Boolean);
                return (
                  <li key={p.id}>
                    <a href={href({ page: 'provider', id: p.id }, query)} aria-current={p.id === selected ? 'true' : undefined}>
                      <span className="row-line">
                        <span className="provider-name">{p.name}</span>
                        {p.contactPerson && <span className="muted"> · {p.contactPerson}</span>}
                      </span>
                      <span className="chips">
                        {rowLabels(doc, p).map((id) => (
                          <LabelChip key={id} color={labelById(doc, id)?.color ?? 'grey'}>
                            {labelPath(doc, id)}
                          </LabelChip>
                        ))}
                      </span>
                      {contacts.length > 0 && <span className="row-line muted small">{contacts.join(' · ')}</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="pane detail-pane" aria-live="polite">
          {route.page === 'new' && <ProviderForm doc={doc} apply={apply} />}
          {route.page === 'edit' && <ProviderForm doc={doc} apply={apply} id={route.id} />}
          {route.page === 'provider' && <ProviderDetail doc={doc} apply={apply} id={route.id} />}
          {route.page === 'list' && <p className="muted placeholder">{t('detail.none')}</p>}
        </section>

        {sheetOpen && <FilterSheet doc={doc} selection={query.selection} setSelection={setSelection} close={() => setSheetOpen(false)} />}
      </div>
    </ListQueryProvider>
  );
}
