import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { facetCounts, liveSelection, type Selection } from '../domain/filter';
import { live, type DirectoryDoc } from '../domain/schema';
import { useI18n } from '../i18n';
import { ActiveFilters, chosenCount, FilterPanel, toggled } from './FilterPanel';
import { FilterSheet } from './FilterSheet';
import { ProviderDetail } from './ProviderDetail';
import { ProviderForm } from './ProviderForm';
import { ProviderList } from './ProviderRow';
import { href, ListQueryProvider, replaceQuery, type ListQuery, type Route } from './route';
import type { Apply } from './types';
import { hasDraft } from './drafts';
import { useListScroll } from './useListScroll';
import { useProviderSearch } from './useProviderSearch';
import { useViewFocus } from './useViewFocus';
import { visibleProviders } from './visible';

/**
 * Browse (FR-10..13) in an adaptive list-detail layout (D-29): filters, list and provider side
 * by side on a wide screen; below that the filters open from a button, and on a phone the list
 * and a provider take turns. Filters and search live in the address, so reload, bookmarks and
 * Back keep them, also across opening a provider.
 */
export function ProvidersPage({ doc, apply, route }: { doc: DirectoryDoc; apply: Apply; route: Route }) {
  const { t, plural } = useI18n();
  // Values that no longer exist are dropped, so an old address never empties the list.
  // Each value is worked out again only when what it reads changes: an entry added to the log
  // changes none of the providers, labels or groups, so the counts and the list stay as they are.
  const structure = useMemo(
    () => ({ providers: doc.providers, labels: doc.labels, facets: doc.facets }),
    [doc.providers, doc.labels, doc.facets],
  );
  const selection = useMemo(() => liveSelection(structure, route.query.selection), [structure, route.query.selection]);
  const query = useMemo(() => ({ ...route.query, selection }), [route.query, selection]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const all = useMemo(() => live(doc.providers), [doc]);
  const find = useProviderSearch(doc);
  const counts = useMemo(() => facetCounts(structure, selection), [structure, selection]);
  // The search box and filters answer at once; the list follows when it can, in the background,
  // so typing never waits for thousands of rows (NFR-10).
  const listQuery = useDeferredValue(query);
  // Searching reads the index, which follows the log too; without a search the list needs only
  // the structure, so an entry added to the log leaves it as it is.
  const listFind = listQuery.q.trim() ? find : null;
  const shown = useMemo(() => visibleProviders(structure, listQuery, listFind), [structure, listQuery, listFind]);
  const parts = useMemo(() => ({ labels: doc.labels, facets: doc.facets }), [doc.labels, doc.facets]);

  const selected = route.page === 'provider' || route.page === 'edit' ? route.id : undefined;
  const showing = route.page === 'list' ? 'list' : 'detail';
  useListScroll(route.page === 'list' ? 'list' : `${route.page}:${selected ?? ''}`);
  useViewFocus(route.page, selected);
  // A new provider typed and left unsaved: say so, with the way back to it.
  const newDraft = route.page !== 'new' && hasDraft(doc.owner.googleSub, undefined);

  const setQuery = useCallback((next: ListQuery) => replaceQuery(route, next), [route]);
  const setSelection = useCallback((next: Selection) => setQuery({ ...query, selection: next }), [query, setQuery]);
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
            <span className="pane-actions">
              <a className="button" href={href({ page: 'new' }, query)}>
                {t('list.add')}
              </a>
              <a className="link-quiet" href={href({ page: 'data' }, query)}>
                {t('data.link')}
              </a>
            </span>
          </div>
          {newDraft && (
            <div className="notice" role="status">
              <p>{t('list.draft')}</p>
              <a href={href({ page: 'new' }, query)}>{t('detail.draftContinue')}</a>
            </div>
          )}
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
            <ProviderList providers={shown} parts={parts} query={listQuery} selected={selected} />
          )}
        </section>

        <section className="pane detail-pane">
          {/* Keyed by provider: nothing typed, armed or offered for one provider carries over to the next. */}
          {route.page === 'new' && <ProviderForm key="new" doc={doc} apply={apply} />}
          {route.page === 'edit' && <ProviderForm key={`edit-${route.id}`} doc={doc} apply={apply} id={route.id} />}
          {route.page === 'provider' && <ProviderDetail key={`provider-${route.id}`} doc={doc} apply={apply} id={route.id} />}
          {route.page === 'list' && <p className="muted placeholder">{t('detail.none')}</p>}
        </section>

        {sheetOpen && <FilterSheet doc={doc} selection={query.selection} setSelection={setSelection} close={() => setSheetOpen(false)} />}
      </div>
    </ListQueryProvider>
  );
}
