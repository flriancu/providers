import { DocumentSync } from 'drive-doc-sync';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { directoryModel, type DirectoryNotice } from '../domain/document';
import { EditError } from '../domain/edits';
import type { EditContext } from '../domain/records';
import type { DirectoryDoc } from '../domain/schema';
import type { Connection } from './useAccount';

export type DirectorySync = DocumentSync<DirectoryDoc, DirectoryNotice>;

/**
 * The open directory, kept by drive-doc-sync: in memory for the demo, in Google Drive with a
 * copy on this device once signed in. This hook connects it to React and to the page: save
 * when the page is hidden or left, pick up other devices' changes when it comes back, save
 * when the network returns, and ask before closing the tab while a change is not saved yet.
 */
export function useDirectory(connection: Connection) {
  const { storage, by } = connection;
  const sync = useMemo(
    () =>
      new DocumentSync<DirectoryDoc, DirectoryNotice>({
        storage,
        model: directoryModel,
        init: connection.init,
        ...(connection.owner && { owner: connection.owner }),
        ...(connection.replica && { replica: connection.replica }),
        ...(connection.carry && { carry: connection.carry }),
        // The demo keeps nothing, so it saves at once; Drive saves after a pause in typing.
        saveDelayMs: storage.kind === 'memory' ? 0 : 1500,
      }),
    // One sync per storage (a new account means a new storage); the rest is read once.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [storage],
  );
  const snapshot = useSyncExternalStore(sync.subscribe, sync.getSnapshot);
  const persistent = storage.kind === 'drive';

  useEffect(() => {
    void sync.open();
    return () => void sync.close();
  }, [sync]);

  useEffect(() => {
    if (!persistent) return;
    const onVisibility = () => void (document.visibilityState === 'hidden' ? sync.flush() : sync.refresh());
    const onLeave = () => void sync.flush();
    const onOnline = () => void sync.flush().then(sync.refresh);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!sync.dirty) return;
      void sync.flush();
      e.preventDefault(); // the browser asks "leave the page?": the change is not in Drive yet, and perhaps in no device copy either
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('online', onOnline);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [sync, persistent]);

  const context = useCallback((): EditContext => ({ by, now: () => new Date(), newId: () => crypto.randomUUID() }), [by]);

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

  return { ...snapshot, apply, sync };
}
