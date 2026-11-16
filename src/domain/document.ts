import type { DocumentModel } from 'drive-doc-sync';
import { hasLocalWins, merge } from './merge';
import { readDirectory, skippedCount, toFile } from './migrate';
import { live, type DirectoryDoc } from './schema';

/** What drive-doc-sync tells the user once a directory is open, besides "the demo's providers were added". */
export type DirectoryNotice = 'skipped';

/**
 * The directory as drive-doc-sync sees it. Pure. The starting facets have fixed ids, so two
 * directories created separately need no id mapping: absorbing one into the other is a merge.
 */
export const directoryModel: DocumentModel<DirectoryDoc, DirectoryNotice> = {
  read: readDirectory,
  write: toFile,
  merge,
  hasLocalWins,
  // Settings come along only from a directory of the same account, never from the demo.
  absorb: (into, from) => merge({ ...from, settings: from.owner.googleSub === into.owner.googleSub ? from.settings : into.settings }, into),
  owner: (doc) => doc.owner.googleSub,
  replaces: (doc) => doc.settings.replaces ?? [],
  withReplaces: (doc, fileIds) => ({ ...doc, settings: { ...doc.settings, replaces: [...fileIds] } }),
  // What a device copy or the demo holds that is worth keeping: providers and log entries.
  contentCount: (doc) => live(doc.providers).length + live(doc.log).length,
  size: (doc) => live(doc.providers).length + live(doc.labels).length + live(doc.facets).length,
  openNotices: (_opened, current) => {
    const skipped = skippedCount(current);
    return skipped ? [{ kind: 'skipped', count: skipped }] : [];
  },
};
