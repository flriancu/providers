import { useMemo } from 'react';
import { fold } from '../domain/fold';
import { effectiveLabels, labelById } from '../domain/labels';
import { live, type DirectoryDoc, type Provider } from '../domain/schema';
import { useI18n } from '../i18n';
import { LabelChip } from './LabelChip';
import { labelPath, mainCategory, orderedFacets } from './labelText';
import { ProviderDetail } from './ProviderDetail';
import { ProviderForm } from './ProviderForm';
import { href, type Route } from './route';
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
 * Adaptive list-detail (D-29): on a wide screen the list and the chosen provider sit side by
 * side; on a narrow one only one pane shows at a time, chosen by the route. Each row carries
 * enough to recognise and reach a provider without opening it: who, labels, first contacts.
 */
export function ProvidersPage({ doc, apply, route }: { doc: DirectoryDoc; apply: Apply; route: Route }) {
  const { t, plural } = useI18n();
  const providers = useMemo(() => live(doc.providers).sort((a, b) => fold(a.name).localeCompare(fold(b.name))), [doc]);
  const selected = route.page === 'provider' || route.page === 'edit' ? route.id : undefined;
  const showing = route.page === 'list' ? 'list' : 'detail';
  useListScroll(route.page === 'list' ? 'list' : `${route.page}:${selected ?? ''}`);

  return (
    <div className="list-detail" data-showing={showing}>
      <section className="pane list-pane" aria-labelledby="list-heading">
        <div className="pane-header">
          <h2 id="list-heading">
            {t('list.heading')} <span className="count">{plural('providers', providers.length)}</span>
          </h2>
          <a className="button" href={href({ page: 'new' })}>
            {t('list.add')}
          </a>
        </div>
        {providers.length === 0 ? (
          <p className="muted">{t('list.empty')}</p>
        ) : (
          <ul className="provider-list">
            {providers.map((p) => {
              const contacts = [p.phones[0], p.emails[0], p.links[0] && shortLink(p.links[0])].filter(Boolean);
              return (
                <li key={p.id}>
                  <a href={href({ page: 'provider', id: p.id })} aria-current={p.id === selected ? 'true' : undefined}>
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
    </div>
  );
}
