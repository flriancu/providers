import { COLLECTION_KEYS, put, type Collections, type DirectoryDoc, type Meta } from './schema';

/**
 * Two versions of the same directory, record by record: for every id in either, the record with
 * the later `updatedAt` wins; on a tie the remote one. Deleted records are markers with their own
 * stamp, so a delete wins over an older edit. Pure.
 */
export function merge(local: DirectoryDoc, remote: DirectoryDoc): DirectoryDoc {
  const out: DirectoryDoc = { ...remote };
  for (const key of COLLECTION_KEYS) {
    const merged: Record<string, Meta> = { ...(remote[key] as Record<string, Meta>) };
    for (const [id, mine] of Object.entries(local[key] as Record<string, Meta>)) if (wins(mine, id, remote, key)) put(merged, id, mine);
    (out as unknown as Record<string, unknown>)[key] = merged;
  }
  out.settings = local.settings.updatedAt > remote.settings.updatedAt ? local.settings : remote.settings;
  return out;
}

/** True when `merge(local, remote)` keeps something of `local` that `remote` lacks: it needs saving. */
export function hasLocalWins(local: DirectoryDoc, remote: DirectoryDoc): boolean {
  if (local.settings.updatedAt > remote.settings.updatedAt) return true;
  return COLLECTION_KEYS.some((key) =>
    Object.entries(local[key] as Record<string, Meta>).some(([id, mine]) => wins(mine, id, remote, key)),
  );
}

/**
 * Whether my version of record `id` beats the remote's: newer, or the remote lacks it. A record
 * the remote has but this version could not read (`skipped`) still counts as there, so an older
 * readable copy never replaces what a newer version wrote.
 */
function wins(mine: Meta, id: string, remote: DirectoryDoc, key: keyof Collections): boolean {
  const theirs = remote[key] as Record<string, Meta>;
  const other = Object.hasOwn(theirs, id) ? theirs[id] : undefined;
  if (other) return mine.updatedAt > other.updatedAt;
  const unread = remote.skipped?.[key] as Record<string, { updatedAt?: unknown }> | undefined;
  return !(unread && Object.hasOwn(unread, id) && String(unread[id]?.updatedAt ?? '') >= mine.updatedAt);
}
