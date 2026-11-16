import { useEffect, useMemo, useRef } from 'react';
import { facetCounts, filterProviders, type Selection } from '../domain/filter';
import type { DirectoryDoc } from '../domain/schema';
import { useI18n } from '../i18n';
import { chosenCount, FilterPanel, toggled } from './FilterPanel';

/**
 * The filters over the page, below the width where they have their own column: full screen on
 * a phone, a side panel on a tablet (D-34). Each tick changes the list at once; "Show N
 * providers", the close button, Escape or a tap outside close the panel. Focus returns to the
 * Filters button.
 */
export function FilterSheet({
  doc,
  selection,
  setSelection,
  close,
}: {
  doc: DirectoryDoc;
  selection: Selection;
  setSelection: (s: Selection) => void;
  close: () => void;
}) {
  const { t, plural } = useI18n();
  const counts = useMemo(() => facetCounts(doc, selection), [doc, selection]);
  const matching = useMemo(() => filterProviders(doc, selection).length, [doc, selection]);
  const closeButton = useRef<HTMLButtonElement>(null);

  const finish = () => {
    close();
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.filter-button')?.focus());
  };

  useEffect(() => {
    closeButton.current?.focus();
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener('keydown', onKey);
    };
    // once, when it opens
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sheet-layer">
      {/* Tapping outside the panel closes it; keyboard users have Escape and the close button. */}
      <div className="sheet-backdrop" aria-hidden="true" onClick={finish} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-heading">
        <div className="sheet-header">
          <h2 id="sheet-heading">{t('filter.heading')}</h2>
          <button ref={closeButton} type="button" className="link-button" aria-label={t('filter.close')} onClick={finish}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="sheet-body">
          <FilterPanel doc={doc} selection={selection} counts={counts} toggle={(f, l, on) => setSelection(toggled(selection, f, l, on))} />
        </div>
        <div className="sheet-footer">
          <button type="button" className="secondary" disabled={!chosenCount(selection)} onClick={() => setSelection({})}>
            {t('filter.clearAll')}
          </button>
          <button type="button" onClick={finish}>
            {t('filter.show', { providers: plural('providers', matching) })}
          </button>
        </div>
      </div>
    </div>
  );
}
