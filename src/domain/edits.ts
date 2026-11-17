/**
 * The changes the app makes to a directory, with their rules. Pure: each returns a new document
 * or throws EditError with a code the interface turns into a sentence.
 */
import { fold } from './fold';
import { labelById } from './labels';
import { addRecord, deleteRecord, updateRecord, type EditContext } from './records';
import { FACET_IDS, LABEL_COLORS, live, type DirectoryDoc, type ISODate, type LabelColor, type Provider } from './schema';

export type EditErrorCode = 'nameRequired' | 'labelNameTaken' | 'sameLabel' | 'otherFacet' | 'logTextRequired' | 'badDate' | 'notFound';

export class EditError extends Error {
  constructor(readonly code: EditErrorCode) {
    super(code);
  }
}

/** What the provider form edits. */
export interface ProviderInput {
  name: string;
  contactPerson: string;
  phones: string[];
  emails: string[];
  links: string[];
  address: string;
  notes: string;
  labelIds: string[];
  primaryCategoryId?: string;
}

export const emptyProvider = (): ProviderInput => ({
  name: '',
  contactPerson: '',
  phones: [],
  emails: [],
  links: [],
  address: '',
  notes: '',
  labelIds: [],
});

const cleanList = (values: string[]) => [...new Set(values.map((v) => v.trim()).filter((v) => v !== ''))];

/**
 * The input as stored: text trimmed, empty and repeated list entries dropped, only live labels
 * kept, and the primary category one of the chosen Category
 * labels: the only one if there is just one (FR-05).
 */
export function cleanProvider(doc: DirectoryDoc, input: ProviderInput): ProviderInput {
  const labelIds = [...new Set(input.labelIds)].filter((id) => labelById(doc, id));
  const categories = labelIds.filter((id) => labelById(doc, id)!.facetId === FACET_IDS.category);
  const primary =
    input.primaryCategoryId && categories.includes(input.primaryCategoryId)
      ? input.primaryCategoryId
      : categories.length === 1
        ? categories[0]
        : undefined;
  const { primaryCategoryId: _ignored, ...rest } = input;
  const out: ProviderInput = {
    ...rest,
    name: input.name.trim(),
    contactPerson: input.contactPerson.trim(),
    phones: cleanList(input.phones),
    emails: cleanList(input.emails),
    links: cleanList(input.links),
    address: input.address.trim(),
    notes: input.notes.trim(),
    labelIds,
  };
  return primary ? { ...out, primaryCategoryId: primary } : out;
}

export function createProvider(doc: DirectoryDoc, input: ProviderInput, ctx: EditContext): { doc: DirectoryDoc; id: string } {
  const clean = cleanProvider(doc, input);
  if (!clean.name) throw new EditError('nameRequired');
  return addRecord(doc, 'providers', clean, ctx);
}

export function saveProvider(doc: DirectoryDoc, id: string, input: ProviderInput, ctx: EditContext): DirectoryDoc {
  const before = doc.providers[id];
  if (!before || before.deleted) throw new EditError('notFound');
  const clean = cleanProvider(doc, input);
  if (!clean.name) throw new EditError('nameRequired');
  // A primary category removed in the form must go from the record too, not survive the spread.
  const next = updateRecord(doc, 'providers', id, clean, ctx);
  if (clean.primaryCategoryId === undefined && next.providers[id]!.primaryCategoryId !== undefined) {
    const { primaryCategoryId: _gone, ...rest } = next.providers[id]!;
    return { ...next, providers: { ...next.providers, [id]: rest as Provider } };
  }
  return next;
}

/** Deletes a provider and its log entries (owner only, D-17). */
export function deleteProvider(doc: DirectoryDoc, id: string, ctx: EditContext): DirectoryDoc {
  let out = deleteRecord(doc, 'providers', id, ctx);
  for (const entry of live(doc.log)) if (entry.providerId === id) out = deleteRecord(out, 'log', entry.id, ctx);
  return out;
}

const isISODate = (d: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d;

export function addLogEntry(
  doc: DirectoryDoc,
  providerId: string,
  date: ISODate,
  text: string,
  ctx: EditContext,
): { doc: DirectoryDoc; id: string } {
  const provider = doc.providers[providerId];
  if (!provider || provider.deleted) throw new EditError('notFound');
  if (!isISODate(date)) throw new EditError('badDate');
  if (!text.trim()) throw new EditError('logTextRequired');
  return addRecord(doc, 'log', { providerId, date, text: text.trim() }, ctx);
}

/** A provider's log, newest day first; entries of one day newest first. */
export function providerLog(doc: DirectoryDoc, providerId: string) {
  return live(doc.log)
    .filter((e) => e.providerId === providerId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

/** A name as stored: trimmed, and required (D-30: one name, as typed). */
function cleanName(name: string): string {
  const clean = name.trim();
  if (!clean) throw new EditError('nameRequired');
  return clean;
}

/** Two labels in one facet may not share a name (ignoring case and diacritics). */
function assertNameFree(doc: DirectoryDoc, facetId: string, name: string, except?: string) {
  const wanted = fold(name);
  const clash = live(doc.labels).some((l) => l.id !== except && l.facetId === facetId && fold(l.name) === wanted);
  if (clash) throw new EditError('labelNameTaken');
}

/** Colours a new label can get without a choice: grey only when chosen, as it marks labels still to create. */
const AUTO_COLORS = LABEL_COLORS.filter((c) => c !== 'grey');

/**
 * D-31: a new label's colour when none is chosen: the one least used over all labels, in palette
 * order, so labels of different groups on one provider seldom match.
 */
export function nextColor(doc: DirectoryDoc): LabelColor {
  const used = new Map<LabelColor, number>(AUTO_COLORS.map((c) => [c, 0]));
  for (const l of live(doc.labels)) if (used.has(l.color)) used.set(l.color, used.get(l.color)! + 1);
  const fewest = Math.min(...used.values());
  return AUTO_COLORS.find((c) => used.get(c) === fewest)!;
}

const cleanAliases = (aliases: string[]) => cleanList(aliases);

export function createLabel(
  doc: DirectoryDoc,
  input: { facetId: string; name: string; color?: LabelColor; aliases?: string[] },
  ctx: EditContext,
): { doc: DirectoryDoc; id: string } {
  const facet = doc.facets[input.facetId];
  if (!facet || facet.deleted) throw new EditError('notFound');
  const name = cleanName(input.name);
  assertNameFree(doc, input.facetId, name);
  return addRecord(
    doc,
    'labels',
    {
      facetId: input.facetId,
      name,
      color: input.color ?? nextColor(doc),
      aliases: cleanAliases(input.aliases ?? []),
    },
    ctx,
  );
}

/**
 * Renames a label and sets its colour and aliases; shares and links keep working, they use
 * the id (FR-06).
 */
export function renameLabel(
  doc: DirectoryDoc,
  id: string,
  name: string,
  color: LabelColor,
  aliases: string[],
  ctx: EditContext,
): DirectoryDoc {
  const label = labelById(doc, id);
  if (!label) throw new EditError('notFound');
  const clean = cleanName(name);
  assertNameFree(doc, label.facetId, clean, id);
  return updateRecord(doc, 'labels', id, { name: clean, color, aliases: cleanAliases(aliases) }, ctx);
}

/**
 * Merges `fromId` into `intoId` (FR-08): every provider with the first gets the second, the
 * first's names become the second's aliases, its shares point at the second, and the first is
 * deleted.
 */
export function mergeLabels(doc: DirectoryDoc, fromId: string, intoId: string, ctx: EditContext): DirectoryDoc {
  const from = labelById(doc, fromId);
  const into = labelById(doc, intoId);
  if (!from || !into) throw new EditError('notFound');
  if (fromId === intoId) throw new EditError('sameLabel');
  if (from.facetId !== into.facetId) throw new EditError('otherFacet');

  let out = doc;
  for (const p of live(doc.providers)) {
    if (!p.labelIds.includes(fromId)) continue;
    const labelIds = [...new Set(p.labelIds.map((id) => (id === fromId ? intoId : id)))];
    const primary = p.primaryCategoryId === fromId ? intoId : p.primaryCategoryId;
    out = updateRecord(out, 'providers', p.id, { labelIds, ...(primary && { primaryCategoryId: primary }) }, ctx);
  }
  for (const s of live(doc.shares)) if (s.labelId === fromId) out = updateRecord(out, 'shares', s.id, { labelId: intoId }, ctx);
  const target = labelById(out, intoId)!;
  const aliases = cleanAliases([...target.aliases, from.name, ...from.aliases]).filter((a) => fold(a) !== fold(target.name));
  out = updateRecord(out, 'labels', intoId, { aliases }, ctx);
  return deleteRecord(out, 'labels', fromId, ctx);
}

/** Deletes a label: it leaves every provider, and its shares end (owner decides, D-22). */
export function deleteLabel(doc: DirectoryDoc, id: string, ctx: EditContext): DirectoryDoc {
  const label = labelById(doc, id);
  if (!label) throw new EditError('notFound');
  let out = doc;
  for (const p of live(doc.providers)) {
    if (!p.labelIds.includes(id)) continue;
    out = saveProvider(
      out,
      p.id,
      { ...p, labelIds: p.labelIds.filter((x) => x !== id), ...(p.primaryCategoryId === id && { primaryCategoryId: undefined }) },
      ctx,
    );
  }
  for (const s of live(doc.shares)) if (s.labelId === id) out = deleteRecord(out, 'shares', s.id, ctx);
  return deleteRecord(out, 'labels', id, ctx);
}

/**
 * A new flat facet, after the others (D-15: the owner can add facets). Its name may not repeat
 * another facet's, nor a starting facet's built-in English word (category, area, source, lists).
 */
export function createFacet(doc: DirectoryDoc, name: string, ctx: EditContext): { doc: DirectoryDoc; id: string } {
  const clean = cleanName(name);
  const taken = live(doc.facets).some((f) => [f.name, f.key ?? ''].some((n) => n !== '' && fold(n) === fold(clean)));
  if (taken) throw new EditError('labelNameTaken');
  const order = Math.max(0, ...live(doc.facets).map((f) => f.order)) + 1;
  return addRecord(doc, 'facets', { name: clean, order }, ctx);
}

/** Renames a facet; a starting facet renamed shows the owner's name from then on (D-30). */
export function renameFacet(doc: DirectoryDoc, id: string, name: string, ctx: EditContext): DirectoryDoc {
  const facet = doc.facets[id];
  if (!facet || facet.deleted) throw new EditError('notFound');
  return updateRecord(doc, 'facets', id, { name: cleanName(name) }, ctx);
}
