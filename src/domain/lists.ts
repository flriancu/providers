import { own, put, type Members, type Meta, type Stamp } from './schema';
import { fieldStamp, sameValue } from './stamps';

/**
 * Lists of text (a provider's labels, phones, emails and links; a label's other words) merge
 * value by value: a value is in the list or not as the side that last added or removed it says.
 * Two devices that each add a label keep both, and a value removed on one device does not come
 * back from another that never touched it. This is a last-writer-wins element set (Shapiro et
 * al., "A comprehensive study of Convergent and Commutative Replicated Data Types", INRIA
 * RR-7506, 2011, section 3.3.3); when both sides stamp a value alike, it stays (add wins). The
 * order is that of the side that changed the list last, with values only the other side has
 * after them.
 *
 * `Meta.members[field]` holds when each value was last added or removed, removed ones included,
 * and the field stamp it was written with (`at`). A list without it, or changed since by a
 * version of the app that does not keep it (the field stamp moved on), is read as a whole: every
 * value, in it or not, dates from the field's stamp, which is how lists merged before.
 */

/** A list field as merging sees it. */
interface ListView {
  values: string[];
  present: ReadonlySet<string>;
  /** Every value with a stamp: in the list, or removed from it. */
  keys: string[];
  /** When `value` was last added or removed; null when this side never had it. */
  stamp(value: string): Stamp | null;
  /** Whether the list has value stamps, or is read as a whole. */
  tracked: boolean;
}

/** Whether a field holds a list (a list field is a list on every record that has it). */
export const isList = (r: Meta, field: string) => Array.isArray(own(r as unknown as Record<string, unknown>, field));

function view(r: Meta, field: string): ListView {
  const raw = own(r as unknown as Record<string, unknown>, field);
  const values = Array.isArray(raw) ? (raw as string[]) : [];
  const present = new Set(values);
  const at = fieldStamp(r, field);
  const members = r.members && own(r.members, field);
  if (!members || members.at !== at) return { values, present, keys: [...present], stamp: () => at, tracked: false };
  const stamps = members.stamps;
  return {
    values,
    present,
    keys: [...new Set([...present, ...Object.keys(stamps)])],
    stamp: (value) => own(stamps, value) ?? (present.has(value) ? at : null),
    tracked: true,
  };
}

const later = (a: Stamp | null, b: Stamp | null) => (a === null ? b : b === null || a > b ? a : b);

/**
 * The list `field` of `mine` and `theirs` merged, with its value stamps; none when neither side
 * has any, since the list read as a whole then says the same.
 */
export function mergeList(mine: Meta, theirs: Meta, field: string): { value: string[]; at: Stamp; members: Members | null } {
  const a = view(mine, field);
  const b = view(theirs, field);
  const stamps: Record<string, Stamp> = {};
  const kept = new Set<string>();
  for (const value of new Set([...a.keys, ...b.keys])) {
    const sa = a.stamp(value);
    const sb = b.stamp(value);
    put(stamps, value, later(sa, sb)!);
    const winner = sb === null || (sa !== null && sa > sb) ? a : sa === null || sb > sa ? b : null;
    if (winner ? winner.present.has(value) : a.present.has(value) || b.present.has(value)) kept.add(value);
  }
  const [first, second] = leadsOrder(a, fieldStamp(mine, field), b, fieldStamp(theirs, field)) ? [a, b] : [b, a];
  const value = [...new Set([...first.values, ...second.values])].filter((v) => kept.has(v));
  const at = later(fieldStamp(mine, field), fieldStamp(theirs, field))!;
  return { value, at, members: a.tracked || b.tracked ? { at, stamps } : null };
}

/**
 * Whether list `a` (changed at `atA`) gives the merged order rather than `b`: the one changed
 * last; at one moment, the one that knows more values (a list merged from the other knows all of
 * its values, so merging again keeps its order), then the one whose values compare greater. The
 * same answer whichever side merges, so two devices end with one order.
 */
function leadsOrder(a: ListView, atA: Stamp, b: ListView, atB: Stamp): boolean {
  if (atA !== atB) return atA > atB;
  if (a.keys.length !== b.keys.length) return a.keys.length > b.keys.length;
  return JSON.stringify(a.values) > JSON.stringify(b.values);
}

/** Whether merging `mine` into `theirs` changes the list `field` of `theirs`. */
export function listNews(mine: Meta, theirs: Meta, field: string): boolean {
  const a = view(mine, field);
  const b = view(theirs, field);
  if (!sameValue(mergeList(mine, theirs, field).value, b.values)) return true;
  return a.keys.some((value) => {
    const sa = a.stamp(value)!;
    const sb = b.stamp(value);
    return sb === null || sa > sb;
  });
}

/** The value stamps of list `field` once `before` holds `next` instead, changed at `at`. */
export function membersAfter(before: Meta, field: string, next: readonly string[], at: Stamp): Members {
  const v = view(before, field);
  const after = new Set(next);
  const stamps: Record<string, Stamp> = {};
  for (const value of new Set([...v.keys, ...after])) {
    const moved = v.present.has(value) !== after.has(value);
    put(stamps, value, moved ? at : (v.stamp(value) ?? at));
  }
  return { at, stamps };
}

/**
 * A list as edited in a form, applied to the list as it is now: what the form added and removed
 * since `base` (what it started from), and nothing else. A value another device added meanwhile
 * stays; one it removed stays removed, unless the form added it.
 */
export function rebaseList(current: readonly string[], base: readonly string[], edited: readonly string[]): string[] {
  const was = new Set(base);
  const now = new Set(current);
  const wanted = new Set(edited);
  return [...new Set([...edited.filter((v) => !was.has(v) || now.has(v)), ...current.filter((v) => !was.has(v) && !wanted.has(v))])];
}
