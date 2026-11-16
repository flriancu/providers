import { DocumentSync, MemoryStorage } from 'drive-doc-sync';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { directoryModel, type DirectoryNotice } from '../domain/document';
import { EditError } from '../domain/edits';
import type { EditContext } from '../domain/records';
import type { DirectoryDoc } from '../domain/schema';
import { demoDirectory } from './demoDirectory';

/** The signed-out demo's owner: never a real Google account id. */
export const DEMO_OWNER = 'demo';

/**
 * The open directory. Phase 3: the signed-out demo, kept in memory by drive-doc-sync's
 * MemoryStorage and starting with one made-up provider; Phase 5 swaps in Drive storage behind
 * the same hook, and must not carry that sample into an account's directory.
 */
export function useDirectory() {
  const sync = useMemo(
    () =>
      new DocumentSync<DirectoryDoc, DirectoryNotice>({
        storage: new MemoryStorage<DirectoryDoc>(),
        model: directoryModel,
        // Fixed ids for the sample, so a reload keeps a filter in the address pointing at it.
        init: () => {
          let n = 0;
          return demoDirectory(DEMO_OWNER, { by: DEMO_OWNER, now: () => new Date(), newId: () => `demo-${++n}` });
        },
        saveDelayMs: 0,
      }),
    [],
  );
  const snapshot = useSyncExternalStore(sync.subscribe, sync.getSnapshot);

  useEffect(() => {
    void sync.open();
    return () => void sync.close();
  }, [sync]);

  const context = useCallback((): EditContext => ({ by: DEMO_OWNER, now: () => new Date(), newId: () => crypto.randomUUID() }), []);

  /**
   * Applies a change; an EditError comes back as its code for the form to show, anything else
   * is a bug and is thrown.
   */
  const apply = useCallback(
    (change: (doc: DirectoryDoc, ctx: EditContext) => DirectoryDoc): EditError['code'] | null => {
      const doc = sync.getSnapshot().doc;
      if (!doc) return 'notFound';
      let next: DirectoryDoc;
      try {
        next = change(doc, context());
      } catch (e) {
        if (e instanceof EditError) return e.code;
        throw e;
      }
      sync.update(() => next);
      return null;
    },
    [sync, context],
  );

  return { doc: snapshot.doc, apply };
}
