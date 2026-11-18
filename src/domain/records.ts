import { membersAfter } from './lists';
import { own, put, type Collections, type DirectoryDoc, type Members, type Meta, type Stamp } from './schema';
import { sameValue, stampsAfter } from './stamps';

/** Who is editing, and the clock and id source to use (passed in: the domain has no browser). */
export interface EditContext {
  by: string;
  now: () => Date;
  newId: () => string;
}

/** Collections whose records the app adds and edits through these functions. */
export type CollectionKey = keyof Collections;
type RecordOf<K extends CollectionKey> = Collections[K][string];
/** A record's own fields, without Meta. */
export type Fields<K extends CollectionKey> = Omit<RecordOf<K>, keyof Meta>;

/**
 * The time stamped on a change to `before`: now, but never at or below the record's own stamp. A
 * device whose clock is behind could otherwise make its edit lose the merge to the very record it
 * changed. Only the record itself counts: one record stamped far ahead (a wrong clock elsewhere)
 * moves no other record's stamps.
 */
export function nextStamp(before: Meta, now: Date): Stamp {
  const candidate = now.toISOString();
  return candidate > before.updatedAt ? candidate : new Date(Date.parse(before.updatedAt) + 1).toISOString();
}

export function addRecord<K extends CollectionKey>(
  doc: DirectoryDoc,
  key: K,
  fields: Fields<K>,
  ctx: EditContext,
): { doc: DirectoryDoc; id: string } {
  const id = ctx.newId();
  const stamp = ctx.now().toISOString();
  const record = { ...fields, id, createdAt: stamp, updatedAt: stamp, updatedBy: ctx.by } as RecordOf<K>;
  const collection = { ...(doc[key] as Record<string, RecordOf<K>>) };
  put(collection, id, record);
  return { doc: { ...doc, [key]: collection }, id };
}

/**
 * The fields in `changes` that differ from `before` changed, stamped `at` by `by`; `undefined`
 * clears a field. Only those fields are stamped (stamps.ts), and in a list, the values that went
 * in or out (lists.ts). Null when nothing differs.
 */
export function changedRecord<T extends Meta>(before: T, changes: Record<string, unknown>, at: Stamp, by: string): T | null {
  const old = before as unknown as Record<string, unknown>;
  const changed = Object.keys(changes).filter((k) => !sameValue(own(old, k), changes[k]));
  if (!changed.length) return null;
  const record: Record<string, unknown> = { ...old };
  for (const k of changed) {
    if (changes[k] === undefined) delete record[k];
    else put(record, k, changes[k]);
  }
  Object.assign(record, { updatedAt: at, updatedBy: by, stamps: stampsAfter(before, changed, at) });
  const lists = changed.filter((k) => Array.isArray(changes[k]));
  if (lists.length) {
    const members: Record<string, Members> = { ...before.members };
    for (const k of lists) put(members, k, membersAfter(before, k, changes[k] as string[], at));
    record.members = members;
  }
  return record as unknown as T;
}

/**
 * Sets the fields in `changes` that differ from the record (changedRecord). Nothing different:
 * the document is returned as it was, with no new stamp, so saving what is already there changes
 * nothing on any device (FR-03).
 */
function change<K extends CollectionKey>(
  doc: DirectoryDoc,
  key: K,
  before: RecordOf<K>,
  changes: Record<string, unknown>,
  ctx: EditContext,
): DirectoryDoc {
  const record = changedRecord(before, changes, nextStamp(before, ctx.now()), ctx.by);
  if (!record) return doc;
  const next = { ...(doc[key] as Record<string, RecordOf<K>>) };
  put(next, before.id, record);
  return { ...doc, [key]: next };
}

const recordOf = <K extends CollectionKey>(doc: DirectoryDoc, key: K, id: string) => own(doc[key] as Record<string, RecordOf<K>>, id);

export function updateRecord<K extends CollectionKey>(
  doc: DirectoryDoc,
  key: K,
  id: string,
  changes: Partial<Fields<K>>,
  ctx: EditContext,
): DirectoryDoc {
  const before = recordOf(doc, key, id);
  if (!before || before.deleted) throw new Error(`No ${key} record ${id}`);
  return change(doc, key, before, changes as Record<string, unknown>, ctx);
}

/**
 * Brings back a record deleted by mistake (undo): the marker goes, with a new stamp, so the
 * record returns on every device too. A record that is not deleted is left as it is.
 */
export function restoreRecord<K extends CollectionKey>(doc: DirectoryDoc, key: K, id: string, ctx: EditContext): DirectoryDoc {
  const before = recordOf(doc, key, id);
  if (!before?.deleted) return doc;
  return change(doc, key, before, { deleted: undefined }, ctx);
}

/** Marks a record deleted; the marker merges like any edit, so the delete reaches every device. */
export function deleteRecord<K extends CollectionKey>(doc: DirectoryDoc, key: K, id: string, ctx: EditContext): DirectoryDoc {
  const before = recordOf(doc, key, id);
  if (!before || before.deleted) return doc;
  return change(doc, key, before, { deleted: true }, ctx);
}
