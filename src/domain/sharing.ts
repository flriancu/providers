import { byFolded, fold } from './fold';
import { effectiveLabels, labelById } from './labels';
import { live, own, type DirectoryDoc, type LabelColor, type Provider, type Share } from './schema';

/** A label as a shared file shows it. */
export interface ListedLabel {
  id: string;
  name: string;
  color: LabelColor;
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
  /** Only the shared label: the owner's other labels stay private. */
  labelIds: string[];
}

/**
 * The read-only file written for a shared label (D-22, FR-16, FR-18). It holds the label and
 * the listing part of every provider carrying it. Notes, the log, other labels and who else it
 * is shared with are never in it.
 */
export interface LabelSnapshot {
  kind: 'providers-label-snapshot';
  schemaVersion: 1;
  label: ListedLabel;
  providers: ListedProvider[];
  writtenAt: string;
}

export function labelSnapshot(doc: DirectoryDoc, labelId: string, now: Date): LabelSnapshot {
  const label = labelById(doc, labelId);
  if (!label) throw new Error(`No label ${labelId}`);
  const providers = live(doc.providers)
    .filter((p) => effectiveLabels(doc, p).includes(labelId))
    .sort((a, b) => byFolded(a.name, b.name))
    .map((p): ListedProvider => ({
      id: p.id,
      name: p.name,
      contactPerson: p.contactPerson,
      phones: [...p.phones],
      emails: [...p.emails],
      links: [...p.links],
      address: p.address,
      labelIds: [labelId],
    }));
  return {
    kind: 'providers-label-snapshot',
    schemaVersion: 1,
    label: { id: label.id, name: label.name, color: label.color },
    providers,
    writtenAt: now.toISOString(),
  };
}

/** FR-19: every share through which this provider is visible: the whole directory, or one of its labels. */
export function whoCanSee(doc: DirectoryDoc, providerId: string): Share[] {
  const provider = own(doc.providers, providerId);
  if (!provider || provider.deleted) return [];
  const labels = new Set(effectiveLabels(doc, provider));
  return live(doc.shares).filter((s) => s.labelId === undefined || labels.has(s.labelId));
}

/** FR-19: the providers a person sees, by their Google account's email address. */
export function whatCanSee(doc: DirectoryDoc, email: string): Provider[] {
  const mine = live(doc.shares).filter((s) => s.kind === 'person' && fold(s.email ?? '') === fold(email));
  if (mine.some((s) => s.labelId === undefined)) return live(doc.providers);
  const ids = new Set(mine.map((s) => s.labelId!));
  return live(doc.providers).filter((p) => effectiveLabels(doc, p).some((id) => ids.has(id)));
}

/** A share's audience, to count people: a person by address, or "anyone with the link" of one label. */
const audience = (s: Share) => (s.kind === 'person' ? `person:${fold(s.email ?? '')}` : `link:${s.labelId ?? ''}`);

/**
 * FR-17: how many audiences (people, links) would newly see the provider if it got this label:
 * those who see the label and do not see the provider yet.
 */
export function newAudiences(doc: DirectoryDoc, providerId: string, labelId: string): number {
  const before = new Set(whoCanSee(doc, providerId).map(audience));
  const after = new Set(
    live(doc.shares)
      .filter((s) => s.labelId === labelId)
      .map(audience),
  );
  return [...after].filter((a) => !before.has(a)).length;
}

/** FR-17: how many providers sharing this label would show. */
export function coverage(doc: DirectoryDoc, labelId: string): number {
  return live(doc.providers).filter((p) => effectiveLabels(doc, p).includes(labelId)).length;
}
