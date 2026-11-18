import { own, put, type Collections, type DirectoryDoc, type Meta, type Stamp } from './schema';
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
 * Sets the fields in `changes` that differ from the record; `undefined` clears a field. Only those
 * fields are stamped (stamps.ts). Nothing different: the document is returned as it was, with no
 * new stamp, so saving what is already there changes nothing on any device (FR-03).
 */
function change<K extends CollectionKey>(
  doc: DirectoryDoc,
  key: K,
  before: RecordOf<K>,
  changes: Record<string, unknown>,
  ctx: EditContext,
): DirectoryDoc {
  const old = before as unknown as Record<string, unknown>;
  const changed = Object.keys(changes).filter((k) => !sameValue(own(old, k), changes[k]));
  if (!changed.length) return doc;
  const stamp = nextStamp(before, ctx.now());
  const record: Record<string, unknown> = { ...old };
  for (const k of changed) {
    if (changes[k] === undefined) delete record[k];
    else put(record, k, changes[k]);
  }
  Object.assign(record, { updatedAt: stamp, updatedBy: ctx.by, stamps: stampsAfter(before, changed, stamp) });
  const next = { ...(doc[key] as Record<string, RecordOf<K>>) };
  put(next, before.id, record as unknown as RecordOf<K>);
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
