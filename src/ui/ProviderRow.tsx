import { memo } from 'react';
import { effectiveLabels, labelById } from '../domain/labels';
import type { DirectoryDoc, Provider } from '../domain/schema';
import { LabelChip } from './LabelChip';
import { labelNameById, mainCategory, orderedFacets } from './labelText';
import { QuickActions } from './QuickActions';
import { href, queryString, type ListQuery } from './route';

/**
 * The list of providers. Memoised as a whole, as React's useDeferredValue asks of the part it
 * defers: a keystroke draws the search box at once and skips this, and the list follows with
 * the deferred query. The query's part of each row's address is built once, not per row.
 */
export const ProviderList = memo(function ProviderList({
  providers,
  parts,
  query,
  selected,
}: {
  providers: readonly Provider[];
  parts: RowParts;
  query: ListQuery;
  selected: string | undefined;
}) {
  const search = queryString(query);
  return (
    <ul className="provider-list">
      {providers.map((p) => (
        <ProviderRow key={p.id} provider={p} parts={parts} to={href({ page: 'provider', id: p.id }) + search} current={p.id === selected} />
      ))}
    </ul>
  );
});

/** What a row reads of the directory besides its provider: labels and their groups. */
export type RowParts = Pick<DirectoryDoc, 'labels' | 'facets'>;

/** A provider's labels for its row: the main category first (if any), then the others in facet order. */
function rowLabels(parts: RowParts, p: Provider): string[] {
  const order = new Map(orderedFacets(parts).map((f, i) => [f.id, i]));
  const main = mainCategory(parts, p);
  const rest = effectiveLabels(parts, p)
    .filter((id) => id !== main)
    .sort((a, b) => (order.get(labelById(parts, a)!.facetId) ?? 99) - (order.get(labelById(parts, b)!.facetId) ?? 99));
  return main ? [main, ...rest] : rest;
}

/**
 * One provider in the list: name, contact person, labels and its quick actions. Memoised: a row
 * draws again only when its provider, the labels, its address or whether it is open change, so
 * an edit to one provider of thousands draws one row (NFR-10). Records never change in place
 * (records.ts), so an unchanged provider is the same object.
 */
export const ProviderRow = memo(function ProviderRow({
  provider: p,
  parts,
  to,
  current,
}: {
  provider: Provider;
  parts: RowParts;
  /** The row's address: the provider, keeping the list's filters and search. */
  to: string;
  current: boolean;
}) {
  return (
    <li>
      <a className="row-link" href={to} data-id={p.id} aria-current={current ? 'true' : undefined}>
        <span className="row-line">
          <span className="provider-name">{p.name}</span>
          {p.contactPerson && <span className="muted"> · {p.contactPerson}</span>}
        </span>
        <span className="chips">
          {rowLabels(parts, p).map((id) => (
            <LabelChip key={id} color={labelById(parts, id)?.color ?? 'grey'}>
              {labelNameById(parts, id)}
            </LabelChip>
          ))}
        </span>
      </a>
      <QuickActions provider={p} />
    </li>
  );
});
