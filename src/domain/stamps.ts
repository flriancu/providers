import { own, put, type Meta, type Stamp } from './schema';

/**
 * When each field of a record last changed. Two devices that change different fields of one
 * record keep both changes: merge.ts takes every field from the side that changed it last (a
 * last-writer-wins register per field, as in Shapiro et al., "Conflict-free Replicated Data
 * Types", SSS 2011). `deleted` is a field like the others, so a delete is not undone by an edit
 * of another field.
 *
 * Stamps are canonical ISO-8601 UTC text (`Date.prototype.toISOString`, read in that form by
 * migrate.ts), so comparing them as text compares them in time.
 */

/** Meta fields that describe the record rather than hold its data. */
const META_KEYS: ReadonlySet<string> = new Set(['id', 'createdAt', 'updatedAt', 'updatedBy', 'stamps', 'members']);

/** The fields that hold data, set or cleared (a cleared field keeps its stamp). */
export function dataKeys(r: Meta): string[] {
  const keys = new Set(Object.keys(r).filter((k) => !META_KEYS.has(k)));
  for (const k of Object.keys(r.stamps ?? {})) keys.add(k);
  return [...keys];
}

/**
 * When `field` last changed. A record without `stamps` was written whole: every field dates from
 * its last change. A record with `stamps` lists the fields changed since it was created.
 */
export function fieldStamp(r: Meta, field: string): Stamp {
  if (!r.stamps) return r.updatedAt;
  return own(r.stamps, field) ?? r.createdAt;
}

/** `before`'s stamps with `changed` fields stamped `at`; complete for every field of `before`. */
export function stampsAfter(before: Meta, changed: readonly string[], at: Stamp): Record<string, Stamp> {
  const out: Record<string, Stamp> = {};
  for (const k of dataKeys(before)) {
    const s = fieldStamp(before, k);
    if (s !== before.createdAt) put(out, k, s);
  }
  for (const k of changed) put(out, k, at);
  return out;
}

/** Field values compare by content: lists of text, text, `true` or absent. */
export const sameValue = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);
