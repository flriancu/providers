import { useEffect, useRef } from 'react';

/**
 * Moves focus to what the user just opened, as the WAI-ARIA guidance for single-page apps asks:
 * a provider or the form gets its heading focused, so a screen reader starts there and the
 * keyboard goes on from there; back on the list, the row of the provider just seen is focused
 * again (on a phone that row was hidden while the provider showed). The first view of the page
 * leaves focus where the browser put it. Scrolling is left to useListScroll.
 */
export function useViewFocus(page: string, id: string | undefined) {
  const previous = useRef<{ page: string; id: string | undefined } | null>(null);
  useEffect(() => {
    const before = previous.current;
    previous.current = { page, id };
    // Nothing opened (first view, or the same view drawn again): focus stays where it is.
    if (!before || (before.page === page && before.id === id)) return;
    if (page === 'list') {
      if (before.id)
        document.querySelector<HTMLElement>(`.provider-list a[data-id="${CSS.escape(before.id)}"]`)?.focus({ preventScroll: true });
      return;
    }
    document.querySelector<HTMLElement>('.detail-pane h2')?.focus({ preventScroll: true });
  }, [page, id]);
}
