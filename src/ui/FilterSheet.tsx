import { useEffect, useMemo, useRef } from 'react';
import { facetCounts, filterProviders, type Selection } from '../domain/filter';
import type { DirectoryDoc } from '../domain/schema';
import { useI18n } from '../i18n';
import { chosenCount, FilterPanel, toggled } from './FilterPanel';

/**
 * The filters over the page, below the width where they have their own column: full screen on
 * a phone, a side panel on a tablet (D-34). A native modal dialog (`showModal`): the page behind
 * it is inert, so Tab stays inside, and Escape closes it. Each tick changes the list at once;
 * "Show N providers", the close button, Escape or a tap outside close the panel, all through the
 * dialog's `close` event, and focus returns to the Filters button.
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
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  // No cleanup closes it: `close` would reach onClose and close the panel again, and React's
  // development mode runs this twice. Taken off the page, an open dialog leaves the top layer.
  useEffect(() => {
    const d = dialog.current!;
    if (!d.open) d.showModal();
    closeButton.current?.focus();
  }, []);

  const dismiss = () => dialog.current?.close();
  const onClose = () => {
    document.querySelector<HTMLButtonElement>('.filter-button')?.focus();
    close();
  };

  return (
    // A tap on the backdrop closes it; from the keyboard, Escape (native to the dialog) and the
    // close button do the same, so the click needs no key listener of its own.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialog}
      className="sheet"
      aria-labelledby="sheet-heading"
      onClose={onClose}
      // A tap on the backdrop reaches the dialog itself; inside, the panel's parts fill it.
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div className="sheet-header">
        <h2 id="sheet-heading">{t('filter.heading')}</h2>
        <button ref={closeButton} type="button" className="link-button" aria-label={t('filter.close')} onClick={dismiss}>
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
        <button type="button" onClick={dismiss}>
          {t('filter.show', { providers: plural('providers', matching) })}
        </button>
      </div>
    </dialog>
  );
}
