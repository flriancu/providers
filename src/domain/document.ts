import type { DocumentModel } from 'drive-doc-sync';
import { absorb } from './absorb';
import { hasLocalWins, merge } from './merge';
import { readDirectory, skippedCount, toFile } from './migrate';
import { live, type DirectoryDoc } from './schema';

/** What drive-doc-sync tells the user once a directory is open, besides "the demo's providers were added". */
export type DirectoryNotice = 'skipped';

/**
 * The directory as drive-doc-sync sees it. Pure. The starting facets have fixed ids, and
 * absorbing another version matches labels by name (absorb.ts), so two directories created
 * separately come together without a second "Photo".
 */
export const directoryModel: DocumentModel<DirectoryDoc, DirectoryNotice> = {
  read: readDirectory,
  write: toFile,
  merge,
  hasLocalWins,
  absorb,
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
