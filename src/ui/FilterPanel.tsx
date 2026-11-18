import { useId, useState } from 'react';
import { NO_LABEL, type FacetCounts, type Selection } from '../domain/filter';
import { labelById } from '../domain/labels';
import { own, type DirectoryDoc, type Facet, type Label } from '../domain/schema';
import { useI18n } from '../i18n';
import { LabelChip } from './LabelChip';
import { facetName, facetLabels, labelName, orderedFacets } from './labelText';

/** Values shown per facet before "Show all": research says about 8 (docs/research, facet UI design). */
const SHOWN = 8;

export type Toggle = (facetId: string, labelId: string, on: boolean) => void;

/** True when a value is selected. */
const isOn = (selection: Selection, facetId: string, labelId: string) => (own(selection, facetId) ?? []).includes(labelId);

/**
 * FR-10, FR-11: one group per facet; each value with its count, and "No <facet>" (D-33) last. A value that would empty the list is greyed out and
 * cannot be ticked (it stays tickable while selected, so it can be removed).
 */
export function FilterPanel({
  doc,
  selection,
  counts,
  toggle,
}: {
  doc: DirectoryDoc;
  selection: Selection;
  counts: FacetCounts;
  toggle: Toggle;
}) {
  return (
    <div className="filter-panel">
      {orderedFacets(doc).map((facet) => (
        <FacetFilter key={facet.id} doc={doc} facet={facet} selection={selection} counts={own(counts, facet.id) ?? {}} toggle={toggle} />
      ))}
    </div>
  );
}

function FacetFilter({
  doc,
  facet,
  selection,
  counts,
  toggle,
}: {
  doc: DirectoryDoc;
  facet: Facet;
  selection: Selection;
  counts: Record<string, number>;
  toggle: Toggle;
}) {
  const { t, plural } = useI18n();
  const [all, setAll] = useState(false);
  const ids = useId();
  const rows: { label?: Label; id: string }[] = [...facetLabels(doc, facet.id).map((label) => ({ label, id: label.id })), { id: NO_LABEL }];
  // Selected values always show; the rest up to the limit, unless "Show all".
  const visible = all || rows.length <= SHOWN + 1 ? rows : rows.filter((r, i) => i < SHOWN || isOn(selection, facet.id, r.id));
  const name = facetName(facet, t);

  return (
    <fieldset className="facet-filter">
      <legend id={`${ids}-legend`}>{name}</legend>
      {visible.map((r) => {
        const count = own(counts, r.id) ?? 0;
        const on = isOn(selection, facet.id, r.id);
        const valueName = r.label ? labelName(r.label) : t('filter.none', { facet: name.toLocaleLowerCase() });
        return (
          <label key={r.id} className={`check filter-value${count === 0 && !on ? ' empty' : ''}`}>
            {/* Spoken as "Photo, 2 providers"; the screen shows the name and the bare number. */}
            <input
              type="checkbox"
              checked={on}
              disabled={count === 0 && !on}
              aria-label={`${valueName}, ${plural('providers', count)}`}
              onChange={(e) => toggle(facet.id, r.id, e.target.checked)}
            />
            {/* A label shows as its chip, as in the list; "No <group>" is plain text. */}
            <span className="value-name">{r.label ? <LabelChip color={r.label.color}>{valueName}</LabelChip> : valueName}</span>
            <span className="value-count">{count}</span>
          </label>
        );
      })}
      {rows.length > SHOWN + 1 && (
        <button type="button" className="link-button" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? t('filter.showFewer') : t('filter.showAll', { count: rows.length })}
        </button>
      )}
    </fieldset>
  );
}

/** FR-12: the chosen values as chips, each removable, and "Clear all". */
export function ActiveFilters({
  doc,
  selection,
  toggle,
  clear,
}: {
  doc: DirectoryDoc;
  selection: Selection;
  toggle: Toggle;
  clear: () => void;
}) {
  const { t } = useI18n();
  const chosen = Object.entries(selection).flatMap(([facetId, values]) => values.map((labelId) => ({ facetId, labelId })));
  if (!chosen.length) return null;
  return (
    <div className="active-filters">
      {chosen.map(({ facetId, labelId }) => {
        const label = labelById(doc, labelId);
        const facet = own(doc.facets, facetId);
        const text = label ? labelName(label) : facet ? t('filter.none', { facet: facetName(facet, t).toLocaleLowerCase() }) : labelId;
        return (
          <button
            key={`${facetId}-${labelId}`}
            type="button"
            className="chip-button"
            aria-label={t('filter.remove', { label: text })}
            onClick={() => toggle(facetId, labelId, false)}
          >
            <LabelChip color={label?.color ?? 'grey'}>
              {text} <span aria-hidden="true">×</span>
            </LabelChip>
          </button>
        );
      })}
      <button type="button" className="link-button" onClick={clear}>
        {t('filter.clearAll')}
      </button>
    </div>
  );
}

/** The selection with one value added or removed; facets left empty are dropped. */
export function toggled(selection: Selection, facetId: string, labelId: string, on: boolean): Selection {
  const current = own(selection, facetId) ?? [];
  const next = on ? [...new Set([...current, labelId])] : current.filter((id) => id !== labelId);
  const { [facetId]: _old, ...rest } = selection;
  return next.length ? { ...rest, [facetId]: next } : rest;
}

/** How many values are chosen. */
export const chosenCount = (selection: Selection) => Object.values(selection).reduce((n, v) => n + v.length, 0);
