import { useMemo, useState } from 'react';
import type { DirectoryDoc } from '../domain/schema';
import { ProviderSearch, type Finder } from '../domain/search';

/**
 * The page's search, over an index made once and brought in step with each new version of the
 * directory, so an edit re-indexes only what it changed (ProviderSearch.sync). The Finder
 * returned is a new one only when the index changed. Syncing only moves the index towards the
 * directory it is given, so running it twice (React's development checks) or for a render React
 * then discards leaves nothing wrong behind.
 */
export function useProviderSearch(doc: DirectoryDoc): Finder {
  const [index] = useState(() => new ProviderSearch(doc));
  return useMemo(() => index.sync(doc), [index, doc]);
}
