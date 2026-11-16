import { COLLECTION_KEYS, put, type Collections, type DirectoryDoc, type Meta, type Stamp } from './schema';

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
 * The time stamped on an edit: now, but never at or below the newest stamp already in the
 * document. A device whose clock is behind could otherwise make its edit lose the merge to the
 * very record it changed.
 */
export function nextStamp(doc: DirectoryDoc, now: Date): Stamp {
  let newest = doc.settings.updatedAt;
  for (const key of COLLECTION_KEYS) {
    for (const r of Object.values(doc[key] as Record<string, Meta>)) if (r.updatedAt > newest) newest = r.updatedAt;
  }
  const candidate = now.toISOString();
  return candidate > newest ? candidate : new Date(Date.parse(newest) + 1).toISOString();
}

export function addRecord<K extends CollectionKey>(
  doc: DirectoryDoc,
  key: K,
  fields: Fields<K>,
  ctx: EditContext,
): { doc: DirectoryDoc; id: string } {
  const id = ctx.newId();
  const stamp = nextStamp(doc, ctx.now());
  const record = { ...fields, id, createdAt: stamp, updatedAt: stamp, updatedBy: ctx.by } as RecordOf<K>;
  const collection = { ...(doc[key] as Record<string, RecordOf<K>>) };
  put(collection, id, record);
  return { doc: { ...doc, [key]: collection }, id };
}

export function updateRecord<K extends CollectionKey>(
  doc: DirectoryDoc,
  key: K,
  id: string,
  changes: Partial<Fields<K>>,
  ctx: EditContext,
): DirectoryDoc {
  const collection = doc[key] as Record<string, RecordOf<K>>;
  const before = Object.hasOwn(collection, id) ? collection[id] : undefined;
  if (!before || before.deleted) throw new Error(`No ${key} record ${id}`);
  const next = { ...collection };
  put(next, id, { ...before, ...changes, updatedAt: nextStamp(doc, ctx.now()), updatedBy: ctx.by });
  return { ...doc, [key]: next };
}

/** Marks a record deleted; the marker merges like any edit, so the delete reaches every device. */
export function deleteRecord<K extends CollectionKey>(doc: DirectoryDoc, key: K, id: string, ctx: EditContext): DirectoryDoc {
  const collection = doc[key] as Record<string, RecordOf<K>>;
  const before = Object.hasOwn(collection, id) ? collection[id] : undefined;
  if (!before || before.deleted) return doc;
  const next = { ...collection };
  put(next, id, { ...before, deleted: true, updatedAt: nextStamp(doc, ctx.now()), updatedBy: ctx.by });
  return { ...doc, [key]: next };
}
