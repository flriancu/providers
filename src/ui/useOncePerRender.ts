import { useCallback, useEffect, useRef } from 'react';

/**
 * Runs a change at most once until the screen shows its result. A double-click, or two clicks
 * that reach the page in one task, arrive before React draws again, so the second would act on
 * the values the first already used: the same new provider saved twice, the same log entry
 * added twice. `change` returns true when it changed the directory; that draws the screen again,
 * which lets the next change through. A change that was refused (a required field left empty)
 * locks nothing, so it can be tried again at once.
 */
export function useOncePerRender(): (change: () => boolean) => void {
  const changed = useRef(false);
  useEffect(() => {
    changed.current = false;
  });
  return useCallback((change: () => boolean) => {
    if (changed.current) return;
    changed.current = change();
  }, []);
}
