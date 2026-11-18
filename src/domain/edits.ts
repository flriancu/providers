/**
 * The changes the app makes to a directory, with their rules. Pure: each returns a new document
 * or throws EditError with a code the interface turns into a sentence.
 */
import { columnClash, isOwnWord, type FacetWords } from './columns';
import { isDay } from './days';
import { fold, isBlank } from './fold';
import { labelById } from './labels';
import { rebaseList } from './lists';
import { addRecord, deleteRecord, restoreRecord, updateRecord, type EditContext } from './records';
import { sameValue } from './stamps';
import { FACET_IDS, LABEL_COLORS, live, own, put, type DirectoryDoc, type ISODate, type LabelColor, type Provider } from './schema';

export type EditErrorCode =
  | 'nameRequired'
  | 'labelNameTaken'
  | 'nameSemicolon'
  | 'nameIsField'
  | 'sameLabel'
  | 'otherFacet'
  | 'logTextRequired'
  | 'badDate'
  | 'notFound'
  | 'importStale';

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

/** Every field of ProviderInput, the optional one too. */
const PROVIDER_FIELDS = [
  'name',
  'contactPerson',
  'phones',
  'emails',
  'links',
  'address',
  'notes',
  'labelIds',
  'primaryCategoryId',
] as const satisfies readonly (keyof ProviderInput)[];

/** The fields a form edits, from a stored provider. */
export function providerInput(p: Provider): ProviderInput {
  return {
    name: p.name,
    contactPerson: p.contactPerson,
    phones: p.phones,
    emails: p.emails,
    links: p.links,
    address: p.address,
    notes: p.notes,
    labelIds: p.labelIds,
    ...(p.primaryCategoryId && { primaryCategoryId: p.primaryCategoryId }),
  };
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
  // A label a newer version wrote, set aside as unreadable here (migrate.ts), stays on the provider.
  const unread = doc.skipped?.labels ?? {};
  const labelIds = [...new Set(input.labelIds)].filter((id) => labelById(doc, id) || Object.hasOwn(unread, id));
  const categories = labelIds.filter((id) => labelById(doc, id)?.facetId === FACET_IDS.category);
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
  if (isBlank(clean.name)) throw new EditError('nameRequired');
  return addRecord(doc, 'providers', clean, ctx);
}

/** The fields of ProviderInput that are lists. */
const LIST_FIELDS = ['phones', 'emails', 'links', 'labelIds'] as const satisfies readonly (keyof ProviderInput)[];

/**
 * Saves what was changed in a provider's form. `base` is what the form started from: only the
 * fields that differ from it are written, so a form left open does not undo a change another
 * device made meanwhile to a field the form did not touch. In a list, only the values the form
 * added or removed change (lists.ts): another device's label added meanwhile stays.
 */
export function saveProvider(doc: DirectoryDoc, id: string, base: ProviderInput, input: ProviderInput, ctx: EditContext): DirectoryDoc {
  const before = own(doc.providers, id);
  if (!before || before.deleted) throw new EditError('notFound');
  const clean = cleanProvider(doc, input);
  if (isBlank(clean.name)) throw new EditError('nameRequired');
  const from = cleanProvider(doc, base);
  const changes: Partial<ProviderInput> = Object.fromEntries(
    PROVIDER_FIELDS.filter((k) => !sameValue(from[k], clean[k])).map((k) => [k, clean[k]]),
  );
  for (const k of LIST_FIELDS) if (changes[k]) changes[k] = rebaseList(before[k], from[k], clean[k]);
  return updateRecord(doc, 'providers', id, changes, ctx);
}

/** Deletes a provider and its log entries (owner only, D-17). */
export function deleteProvider(doc: DirectoryDoc, id: string, ctx: EditContext): DirectoryDoc {
  let out = deleteRecord(doc, 'providers', id, ctx);
  for (const entry of live(doc.log)) if (entry.providerId === id) out = deleteRecord(out, 'log', entry.id, ctx);
  return out;
}

export function addLogEntry(
  doc: DirectoryDoc,
  providerId: string,
  date: ISODate,
  text: string,
  ctx: EditContext,
): { doc: DirectoryDoc; id: string } {
  const provider = own(doc.providers, providerId);
  if (!provider || provider.deleted) throw new EditError('notFound');
  if (!isDay(date)) throw new EditError('badDate');
  if (!text.trim()) throw new EditError('logTextRequired');
  return addRecord(doc, 'log', { providerId, date, text: text.trim() }, ctx);
}

/** A provider's log, newest day first; entries of one day newest first. */
export function providerLog(doc: DirectoryDoc, providerId: string) {
  return live(doc.log)
    .filter((e) => e.providerId === providerId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

/** A name as stored: trimmed, and required, with something that shows (D-30: one name, as typed). */
function cleanName(name: string): string {
  const clean = name.trim();
  if (isBlank(clean)) throw new EditError('nameRequired');
  return clean;
}

/**
 * A label's name as stored. Never with a semicolon: in a CSV file it separates the labels of a
 * cell, so the label would come back as two (FR-21).
 */
function cleanLabelName(name: string): string {
  const clean = cleanName(name);
  if (/[;\r\n]/.test(clean)) throw new EditError('nameSemicolon');
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
  const facet = own(doc.facets, input.facetId);
  if (!facet || facet.deleted) throw new EditError('notFound');
  const name = cleanLabelName(input.name);
  assertNameFree(doc, input.facetId, name);
  const fields = { facetId: input.facetId, name, color: input.color ?? nextColor(doc), aliases: cleanAliases(input.aliases ?? []) };
  // Two devices making "Photo" in one group make the same record, which merges into one label.
  const id = labelIdOf(input.facetId, name);
  const before = own(doc.labels, id);
  if (!before) return claimLabel(addRecord(doc, 'labels', fields, { ...ctx, newId: () => id }));
  // Made before and deleted since: the same label comes back, no longer merged into another.
  if (before.deleted)
    return { doc: updateRecord(restoreRecord(doc, 'labels', id, ctx), 'labels', id, { ...fields, mergedInto: undefined }, ctx), id };
  // The id is a label renamed since: this one gets an id of its own.
  return addRecord(doc, 'labels', fields, ctx);
}

/**
 * A label made under its shared id (labelIdOf) claims only that it exists: its fields are
 * stamped at the start of time, so where another device already has the label, renamed,
 * recoloured or given other words, those win in the merge, and a device that never saw a rename
 * does not undo it. That it is not deleted is stamped now, so it comes back if deleted elsewhere.
 */
function claimLabel(added: { doc: DirectoryDoc; id: string }): { doc: DirectoryDoc; id: string } {
  const labels = { ...added.doc.labels };
  const label = labels[added.id]!;
  const earliest = '1970-01-01T00:00:00.000Z';
  const stamps = { facetId: earliest, name: earliest, color: earliest, aliases: earliest, deleted: label.createdAt };
  put(labels, added.id, { ...label, stamps });
  return { doc: { ...added.doc, labels }, id: added.id };
}

/**
 * The id a new label gets from its group and its name as folded ("l-" and a 53-bit hash,
 * cyrb53), the same on every device: like the starting groups' fixed ids (FACET_IDS), it lets
 * two devices that make the same label before they sync end up with one.
 */
export function labelIdOf(facetId: string, name: string): string {
  const text = `${facetId}\u0000${fold(name)}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `l-${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)}`;
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
  const clean = cleanLabelName(name);
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
  // Where it went, for a device that gives a provider the first label before it hears of this.
  out = updateRecord(out, 'labels', fromId, { mergedInto: intoId }, ctx);
  return deleteRecord(out, 'labels', fromId, ctx);
}

/**
 * FR-08: a label moved to another facet; its providers keep it. Out of Category, it is no longer
 * anyone's main category; the facet must not already have a label of that name.
 */
export function moveLabel(doc: DirectoryDoc, id: string, facetId: string, ctx: EditContext): DirectoryDoc {
  const label = labelById(doc, id);
  const facet = own(doc.facets, facetId);
  if (!label || !facet || facet.deleted) throw new EditError('notFound');
  if (facetId === label.facetId) return doc;
  assertNameFree(doc, facetId, label.name);
  let out = updateRecord(doc, 'labels', id, { facetId }, ctx);
  for (const p of live(doc.providers))
    if (p.primaryCategoryId === id) out = updateRecord(out, 'providers', p.id, { primaryCategoryId: undefined }, ctx);
  return out;
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
      providerInput(p),
      {
        ...providerInput(p),
        labelIds: p.labelIds.filter((x) => x !== id),
        ...(p.primaryCategoryId === id && { primaryCategoryId: undefined }),
      },
      ctx,
    );
  }
  for (const s of live(doc.shares)) if (s.labelId === id) out = deleteRecord(out, 'shares', s.id, ctx);
  return deleteRecord(out, 'labels', id, ctx);
}

/**
 * A facet's name as stored: never one its CSV column would be read by as something else, a fixed
 * field (Notes, Phones) or another facet, by its name or a starting facet's word in any language
 * (columns.ts). `words`: those words.
 */
function cleanFacetName(doc: DirectoryDoc, name: string, words: FacetWords, selfId?: string): string {
  const clean = cleanName(name);
  const clash = columnClash(doc, clean, words, selfId);
  if (clash) throw new EditError(clash === 'field' ? 'nameIsField' : 'labelNameTaken');
  return clean;
}

/** A new flat facet, after the others (D-15: the owner can add facets). */
export function createFacet(doc: DirectoryDoc, name: string, words: FacetWords, ctx: EditContext): { doc: DirectoryDoc; id: string } {
  const clean = cleanFacetName(doc, name, words);
  const order = Math.max(0, ...live(doc.facets).map((f) => f.order)) + 1;
  return addRecord(doc, 'facets', { name: clean, order }, ctx);
}

/**
 * Renames a facet; a starting facet renamed shows the owner's name from then on (D-30). Renamed
 * to its own interface word, in any language, it goes back to showing that word in each
 * language rather than keeping one.
 */
export function renameFacet(doc: DirectoryDoc, id: string, name: string, words: FacetWords, ctx: EditContext): DirectoryDoc {
  const facet = own(doc.facets, id);
  if (!facet || facet.deleted) throw new EditError('notFound');
  const clean = cleanFacetName(doc, name, words, id);
  return updateRecord(doc, 'facets', id, { name: isOwnWord(facet, clean, words) ? '' : clean }, ctx);
}
