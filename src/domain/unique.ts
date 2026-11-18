import { fold } from './fold';
import { changedRecord } from './records';
import { live, own, put, type DirectoryDoc, type Label, type Meta, type Stamp } from './schema';

/**
 * A group never has two labels of one name (FR-04), but two devices can each make it so before
 * they sync: one renames a label "Photo" while the other moves its own "Photo" into that group.
 * No scheme without a server to ask can prevent that (Bailis et al., "Coordination Avoidance in
 * Database Systems", PVLDB 8(3), 2015: uniqueness is not invariant-confluent), so it is repaired
 * after the merge (Balegas et al., "Putting Consistency Back into Eventual Consistency",
 * EuroSys 2015, section 5.1): the two become one, as merging them by hand does (FR-08).
 *
 * The label made first stays; the other is deleted and names it in `mergedInto`. A provider or
 * share pointing at a label merged into another, here or by hand on a device that had not heard
 * of it yet, points at that one instead. The changes depend only on the document, stamps
 * included, so every device that repairs the same document writes the same thing. The document
 * itself is returned when there is nothing to repair. Pure.
 */
export function withUniqueLabelNames(doc: DirectoryDoc): DirectoryDoc {
  const labels = mergeSameNames(doc);
  const out = labels === doc.labels ? doc : { ...doc, labels };
  return followMerges(out);
}

/** A label that another of its name was joined into. */
export interface JoinedLabel {
  id: string;
  name: string;
  facetId: string;
}

/**
 * The labels of `after` that another label of their name was joined into since `before`, to
 * tell the user. A label merged by hand has another name (names are unique in a group), so only
 * the joins of withUniqueLabelNames count.
 */
export function labelsJoined(before: DirectoryDoc, after: DirectoryDoc): JoinedLabel[] {
  const out = new Map<string, JoinedLabel>();
  for (const gone of Object.values(after.labels)) {
    if (!gone.deleted || gone.mergedInto === undefined || own(before.labels, gone.id)?.deleted) continue;
    const kept = own(after.labels, gone.mergedInto);
    if (!kept || kept.deleted || kept.facetId !== gone.facetId || fold(kept.name) !== fold(gone.name)) continue;
    out.set(kept.id, { id: kept.id, name: kept.name, facetId: kept.facetId });
  }
  return [...out.values()];
}

/** One millisecond after `at`: a repair's change wins over what it repairs. */
const after = (at: Stamp) => new Date(Date.parse(at) + 1).toISOString();

const oldestFirst = (a: Label, b: Label) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1);

function mergeSameNames(doc: DirectoryDoc): DirectoryDoc['labels'] {
  const byName = new Map<string, Label[]>();
  for (const l of live(doc.labels)) {
    const key = `${l.facetId}\u0000${fold(l.name)}`;
    byName.set(key, [...(byName.get(key) ?? []), l]);
  }
  let labels = doc.labels;
  const set = (l: Label) => {
    if (labels === doc.labels) labels = { ...doc.labels };
    put(labels, l.id, l);
  };
  for (const same of byName.values()) {
    if (same.length < 2) continue;
    let [kept, ...others] = [...same].sort(oldestFirst);
    for (const other of others) {
      const at = after(kept!.updatedAt > other.updatedAt ? kept!.updatedAt : other.updatedAt);
      const words = new Set(kept!.aliases.map(fold));
      const aliases = [...kept!.aliases, ...other.aliases.filter((a) => !words.has(fold(a)) && fold(a) !== fold(kept!.name))];
      kept = changedRecord(kept!, { aliases }, at, other.updatedBy) ?? kept!;
      set(kept);
      set(changedRecord(other, { deleted: true, mergedInto: kept.id }, at, other.updatedBy)!);
    }
  }
  return labels;
}

/** The live label `id` was merged into, following each step; `id` itself when there is none. */
function mergedTarget(labels: DirectoryDoc['labels'], id: string): { id: string; by?: Label } {
  const seen = new Set<string>();
  let label = own(labels, id);
  let first: Label | undefined;
  while (label?.deleted && label.mergedInto !== undefined && !seen.has(label.id)) {
    seen.add(label.id);
    first ??= label;
    label = own(labels, label.mergedInto);
  }
  return label && !label.deleted && first ? { id: label.id, by: first } : { id };
}

function followMerges(doc: DirectoryDoc): DirectoryDoc {
  let out = doc;
  const update = <K extends 'providers' | 'shares'>(key: K, record: Meta) => {
    if (out[key] === doc[key]) out = { ...out, [key]: { ...doc[key] } };
    put(out[key] as Record<string, Meta>, record.id, record);
  };
  for (const p of live(doc.providers)) {
    const targets = p.labelIds.map((id) => mergedTarget(doc.labels, id));
    const by = targets.find((t) => t.by)?.by;
    const primary = p.primaryCategoryId === undefined ? undefined : mergedTarget(doc.labels, p.primaryCategoryId);
    if (!by && !primary?.by) continue;
    const changes: Record<string, unknown> = { labelIds: [...new Set(targets.map((t) => t.id))] };
    if (primary?.by) changes.primaryCategoryId = primary.id;
    update('providers', changedRecord(p, changes, after(p.updatedAt), (by ?? primary!.by!).updatedBy)!);
  }
  for (const s of live(doc.shares)) {
    if (s.labelId === undefined) continue;
    const target = mergedTarget(doc.labels, s.labelId);
    if (target.by) update('shares', changedRecord(s, { labelId: target.id }, after(s.updatedAt), target.by.updatedBy)!);
  }
  return out;
}
