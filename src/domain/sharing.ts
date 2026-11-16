import { fold } from './fold';
import { ancestors, effectiveLabels, labelById, subtree } from './labels';
import { live, type DirectoryDoc, type LabelColor, type Provider, type Share } from './schema';

/** A label as a shared file shows it. */
export interface ListedLabel {
  id: string;
  name: string;
  color: LabelColor;
  parentId?: string;
}

/** What a person sees of a provider through a shared label (D-16): the listing part only. */
export interface ListedProvider {
  id: string;
  name: string;
  contactPerson: string;
  phones: string[];
  emails: string[];
  links: string[];
  address: string;
  /** Only labels of the shared subtree: the owner's other labels stay private. */
  labelIds: string[];
}

/**
 * The read-only file written for a shared label (D-22, FR-16, FR-18). It holds the label, the
 * labels under it, and the listing part of every provider carrying one of them. Notes, the
 * log, other labels and who else it is shared with are never in it.
 */
export interface LabelSnapshot {
  kind: 'providers-label-snapshot';
  schemaVersion: 1;
  /** The shared label, with the names of its parents, top first. */
  label: ListedLabel & { path: string[] };
  labels: ListedLabel[];
  providers: ListedProvider[];
  writtenAt: string;
}

export function labelSnapshot(doc: DirectoryDoc, labelId: string, now: Date): LabelSnapshot {
  const label = labelById(doc, labelId);
  if (!label) throw new Error(`No label ${labelId}`);
  const ids = subtree(doc, labelId);
  const providers = live(doc.providers)
    .filter((p) => effectiveLabels(doc, p).some((id) => ids.has(id)))
    .sort((a, b) => fold(a.name).localeCompare(fold(b.name)))
    .map((p): ListedProvider => ({
      id: p.id,
      name: p.name,
      contactPerson: p.contactPerson,
      phones: [...p.phones],
      emails: [...p.emails],
      links: [...p.links],
      address: p.address,
      labelIds: effectiveLabels(doc, p).filter((id) => ids.has(id)),
    }));
  return {
    kind: 'providers-label-snapshot',
    schemaVersion: 1,
    label: {
      id: label.id,
      name: label.name,
      color: label.color,
      path: ancestors(doc, labelId)
        .toReversed()
        .map((id) => labelById(doc, id)!.name),
    },
    labels: [...ids].map((id) => {
      const l = labelById(doc, id)!;
      return { id, name: l.name, color: l.color, ...(l.parentId && ids.has(l.parentId) && { parentId: l.parentId }) };
    }),
    providers,
    writtenAt: now.toISOString(),
  };
}

/** The labels whose snapshot a change to this provider affects: its labels and their ancestors. */
export function labelsAbove(doc: DirectoryDoc, provider: Provider): Set<string> {
  const out = new Set<string>();
  for (const id of effectiveLabels(doc, provider)) {
    out.add(id);
    for (const a of ancestors(doc, id)) out.add(a);
  }
  return out;
}

/** FR-19: every share through which this provider is visible: the whole directory, or one of its labels or their parents. */
export function whoCanSee(doc: DirectoryDoc, providerId: string): Share[] {
  const provider = Object.hasOwn(doc.providers, providerId) ? doc.providers[providerId] : undefined;
  if (!provider || provider.deleted) return [];
  const above = labelsAbove(doc, provider);
  return live(doc.shares).filter((s) => s.labelId === undefined || above.has(s.labelId));
}

/** FR-19: the providers a person sees, by their Google account's email address. */
export function whatCanSee(doc: DirectoryDoc, email: string): Provider[] {
  const mine = live(doc.shares).filter((s) => s.kind === 'person' && fold(s.email ?? '') === fold(email));
  if (mine.some((s) => s.labelId === undefined)) return live(doc.providers);
  const ids = new Set<string>();
  for (const s of mine) for (const id of subtree(doc, s.labelId!)) ids.add(id);
  return live(doc.providers).filter((p) => effectiveLabels(doc, p).some((id) => ids.has(id)));
}

/** A share's audience, to count people: a person by address, or "anyone with the link" of one label. */
const audience = (s: Share) => (s.kind === 'person' ? `person:${fold(s.email ?? '')}` : `link:${s.labelId ?? ''}`);

/**
 * FR-17: how many audiences (people, links) would newly see the provider if it got this label:
 * those who see the label or a parent of it and do not see the provider yet.
 */
export function newAudiences(doc: DirectoryDoc, providerId: string, labelId: string): number {
  const before = new Set(whoCanSee(doc, providerId).map(audience));
  const reach = new Set([labelId, ...ancestors(doc, labelId)]);
  const after = new Set(
    live(doc.shares)
      .filter((s) => s.labelId !== undefined && reach.has(s.labelId))
      .map(audience),
  );
  return [...after].filter((a) => !before.has(a)).length;
}

/** FR-17: how many providers sharing this label would show (the label and everything under it). */
export function coverage(doc: DirectoryDoc, labelId: string): number {
  const ids = subtree(doc, labelId);
  return live(doc.providers).filter((p) => effectiveLabels(doc, p).some((id) => ids.has(id))).length;
}
