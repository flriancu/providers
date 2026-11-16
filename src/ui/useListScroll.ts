import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Keeps the place in the list across the list-detail switch (D-29). On a phone the list and a
 * provider share one page scroll: without this, a provider would open scrolled as far down as
 * the list was, and the list would come back wherever the provider page was scrolled to.
 *   - while the list shows, its scroll position is remembered;
 *   - a provider (or the form) opens at the top, also when switching between providers;
 *   - back on the list, by link or by the browser's Back, the remembered position returns.
 * `view` names what is on screen: 'list', or a key for the detail being shown.
 */
export function useListScroll(view: string) {
  const saved = useRef(0);
  const current = useRef(view);

  // The app restores scroll itself; the browser's own restoration would fight it on Back.
  useEffect(() => {
    const before = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    return () => {
      history.scrollRestoration = before;
    };
  }, []);

  // Remember the list's position as the user scrolls it (read before the list is hidden, which
  // would clamp the page's scroll to the shorter detail).
  useEffect(() => {
    const onScroll = () => {
      if (current.current === 'list') saved.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Before paint: the list at its remembered place, anything else at the top.
  useLayoutEffect(() => {
    current.current = view;
    window.scrollTo(0, view === 'list' ? saved.current : 0);
  }, [view]);
}
