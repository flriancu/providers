import { isList, listNews, mergeList } from './lists';
import { COLLECTION_KEYS, own, put, type Collections, type DirectoryDoc, type Members, type Meta, type Stamp } from './schema';
import { dataKeys, fieldStamp } from './stamps';
import { withUniqueLabelNames } from './unique';

/**
 * Two versions of the same directory, field by field: for every record in either, each field
 * comes from the side that changed it last (stamps.ts); on a tie the remote one. A list merges
 * value by value (lists.ts). A record only one side has is kept as it is. Deleted records are
 * markers with a stamped `deleted` field, so a delete wins over an older edit, and an edit of
 * another field does not bring the record back. Two labels the merge leaves with one name in one
 * group become one (unique.ts). Pure.
 */
export function merge(local: DirectoryDoc, remote: DirectoryDoc): DirectoryDoc {
  return withUniqueLabelNames(mergeFields(local, remote));
}

function mergeFields(local: DirectoryDoc, remote: DirectoryDoc): DirectoryDoc {
  const out: DirectoryDoc = { ...remote };
  for (const key of COLLECTION_KEYS) {
    const theirs = remote[key] as Record<string, Meta>;
    const merged: Record<string, Meta> = { ...theirs };
    for (const [id, mine] of Object.entries(local[key] as Record<string, Meta>)) {
      const other = own(theirs, id);
      if (other) {
        if (newerFields(mine, other)) put(merged, id, mergeRecord(mine, other));
      } else if (!unreadNewer(mine, id, remote, key)) put(merged, id, mine);
    }
    (out as unknown as Record<string, unknown>)[key] = merged;
  }
  out.settings = local.settings.updatedAt > remote.settings.updatedAt ? local.settings : remote.settings;
  return out;
}

/**
 * True when `merge(local, remote)` keeps something of `local` that `remote` lacks, or makes two
 * labels of one name one: it needs saving.
 */
export function hasLocalWins(local: DirectoryDoc, remote: DirectoryDoc): boolean {
  if (local.settings.updatedAt > remote.settings.updatedAt) return true;
  const fieldWins = COLLECTION_KEYS.some((key) => {
    const theirs = remote[key] as Record<string, Meta>;
    return Object.entries(local[key] as Record<string, Meta>).some(([id, mine]) => {
      const other = own(theirs, id);
      return other ? newerFields(mine, other) : !unreadNewer(mine, id, remote, key);
    });
  });
  if (fieldWins) return true;
  const merged = mergeFields(local, remote);
  return withUniqueLabelNames(merged) !== merged;
}

/**
 * Whether `mine` changed any field later than `theirs`. The same stamp and author do not make
 * the same edit: two devices of one account can stamp edits of different fields alike (each one
 * millisecond after a record stamped ahead), so the fields are compared.
 */
function newerFields(mine: Meta, theirs: Meta): boolean {
  if (mine === theirs) return false;
  if (mine.updatedAt <= theirs.updatedAt && !mine.stamps && !theirs.stamps) return false;
  return keysOf(mine, theirs).some((k) =>
    isList(mine, k) || isList(theirs, k) ? listNews(mine, theirs, k) : fieldStamp(mine, k) > fieldStamp(theirs, k),
  );
}

const keysOf = (a: Meta, b: Meta) => [...new Set([...dataKeys(b), ...dataKeys(a)])];

/**
 * One record from two versions: every field from the side that changed it last. Two records
 * written whole (no field stamps) stay whole: the newer one, as before field stamps existed.
 */
function mergeRecord(mine: Meta, theirs: Meta): Meta {
  if (!mine.stamps && !theirs.stamps) return mine.updatedAt > theirs.updatedAt ? mine : theirs;
  const createdAt = mine.createdAt < theirs.createdAt ? mine.createdAt : theirs.createdAt;
  const newer = mine.updatedAt > theirs.updatedAt ? mine : theirs;
  const out: Record<string, unknown> = { id: theirs.id, createdAt, updatedAt: newer.updatedAt, updatedBy: newer.updatedBy };
  const stamps: Record<string, Stamp> = {};
  const members: Record<string, Members> = {};
  for (const k of keysOf(mine, theirs)) {
    if (isList(mine, k) || isList(theirs, k)) {
      const list = mergeList(mine, theirs, k);
      put(out, k, list.value);
      if (list.members) put(members, k, list.members);
      if (list.at !== createdAt) put(stamps, k, list.at);
      continue;
    }
    const a = fieldStamp(mine, k);
    const b = fieldStamp(theirs, k);
    const from = (a > b ? mine : theirs) as unknown as Record<string, unknown>;
    const value = own(from, k);
    if (value !== undefined) put(out, k, value);
    const at = a > b ? a : b;
    if (at !== createdAt) put(stamps, k, at);
  }
  out.stamps = stamps;
  if (Object.keys(members).length) out.members = members;
  return out as unknown as Meta;
}

/**
 * Whether the remote has record `id` set aside as unreadable, at or after `mine`'s stamp: a
 * record a newer version wrote, which an older readable copy must not replace.
 */
function unreadNewer(mine: Meta, id: string, remote: DirectoryDoc, key: keyof Collections): boolean {
  const unread = remote.skipped?.[key] as Record<string, { updatedAt?: unknown }> | undefined;
  return !!unread && Object.hasOwn(unread, id) && String(unread[id]?.updatedAt ?? '') >= mine.updatedAt;
}
