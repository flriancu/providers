/**
 * CSV import and export of providers (FR-21..24, D-09). One layout both ways, so an exported
 * file imports again: Name, Contact person, Phones, Emails, Links, Address, Notes, Main category,
 * then one column per label group, named as the group. A cell with several values separates them
 * with semicolons or line breaks. Importing is two steps: `planImport` shows everything that would
 * change (rows, labels to create, problems, possible duplicates); `applyImport` makes exactly those
 * changes once the owner has chosen for every possible duplicate (D-12, NFR-09). Pure.
 */
import { findDuplicates, linkKey, phoneKey, sameAs, type PossibleDuplicate, type Reason } from './duplicates';
import { createLabel, createProvider, emptyProvider, providerInput, saveProvider, type ProviderInput } from './edits';
import { fold } from './fold';
import { labelById } from './labels';
import type { EditContext } from './records';
import { BUILT_IN_FACETS, FACET_IDS, live, own, type BuiltInFacet, type DirectoryDoc, type Facet, type Provider } from './schema';

/** The fixed columns, as exported; reading also accepts the other words listed. */
const FIELDS = {
  name: ['Name', 'nume'],
  contactPerson: ['Contact person', 'persoana de contact', 'contact'],
  phones: ['Phones', 'phone', 'telefon', 'telefoane', 'numere de telefon'],
  emails: ['Emails', 'email', 'e-mail', 'adrese de e-mail', 'adrese de email'],
  links: ['Links', 'link', 'linkuri', 'website', 'site', 'site si profiluri sociale'],
  address: ['Address', 'adresa'],
  notes: ['Notes', 'note', 'notite'],
  primary: ['Main category', 'categoria principala'],
} as const;
type Field = keyof typeof FIELDS;

/** Single-value fields a merge may have to choose between (FR-24). */
export const SINGLE_FIELDS = ['name', 'contactPerson', 'address', 'notes'] as const;
export type SingleField = (typeof SINGLE_FIELDS)[number];

const split = (cell: string) =>
  cell
    .split(/[;\r\n]+/)
    .map((v) => v.trim())
    .filter((v) => v !== '');

// --- export -----------------------------------------------------------------------------------

/** The rows of a CSV export: a header, then one row per provider. `facetTitle`: a group's column name. */
export function exportRows(doc: DirectoryDoc, providers: readonly Provider[], facetTitle: (facet: Facet) => string): string[][] {
  const facets = live(doc.facets).sort((a, b) => a.order - b.order);
  const header = [...(Object.keys(FIELDS) as Field[]).map((f) => FIELDS[f][0]), ...facets.map(facetTitle)];
  const names = (ids: readonly string[], facetId: string) =>
    ids
      .map((id) => labelById(doc, id))
      .filter((l) => l?.facetId === facetId)
      .map((l) => l!.name)
      .join('; ');
  const rows = providers.map((p) => [
    p.name,
    p.contactPerson,
    p.phones.join('; '),
    p.emails.join('; '),
    p.links.join('; '),
    p.address,
    p.notes,
    (p.primaryCategoryId && labelById(doc, p.primaryCategoryId)?.name) || '',
    ...facets.map((f) => names(p.labelIds, f.id)),
  ]);
  return [header, ...rows];
}

// --- import plan -----------------------------------------------------------------------------

/** A label the import would create, in a label group. */
export interface NewLabel {
  facetId: string;
  name: string;
}

export interface ImportRow {
  /** The row's line in the file (the header is line 1). */
  line: number;
  /** The provider as it would be saved; `labelIds` holds the labels that exist already. */
  input: ProviderInput;
  /** Labels this row needs that do not exist yet. */
  newLabels: NewLabel[];
  /** The main category, when it is a label still to create. */
  newPrimary?: NewLabel;
  /** A row that cannot be imported: it has no name. */
  problem?: 'nameRequired';
  /** Providers already in the directory that look like this row (FR-23). */
  duplicates: PossibleDuplicate[];
  /** An earlier row of the same file that looks like this one. */
  sameAsRow?: { line: number; reasons: Reason[] };
}

export interface ImportPlan {
  rows: ImportRow[];
  /** Every label the import would create (over all rows), once each. */
  newLabels: NewLabel[];
  /** Columns that match no field and no label group: their contents are not imported. */
  ignoredColumns: string[];
  /** The file has no Name column, so nothing can be imported. */
  noNameColumn: boolean;
}

/** A label of this group whose name or other words equal the text, ignoring case and diacritics. */
function existingLabel(doc: DirectoryDoc, facetId: string, text: string) {
  const wanted = fold(text);
  return live(doc.labels).find((l) => l.facetId === facetId && [l.name, ...l.aliases].some((w) => fold(w) === wanted));
}

/**
 * What importing these CSV rows would do (FR-21, NFR-09). `facetWords`: the interface's words
 * for the starting label groups in every language, so "Category" and "Categorie" both find it;
 * a renamed group is also found by its own name.
 */
export function planImport(
  doc: DirectoryDoc,
  csv: readonly (readonly string[])[],
  facetWords: Record<BuiltInFacet, readonly string[]>,
): ImportPlan {
  const [header = [], ...body] = csv;
  const facets = live(doc.facets);
  const field = new Map<number, Field>();
  const facetAt = new Map<number, string>();
  const ignoredColumns: string[] = [];
  header.forEach((title, i) => {
    const t = fold(title);
    if (!t) return;
    const f = (Object.keys(FIELDS) as Field[]).find((k) => FIELDS[k].some((w) => fold(w) === t));
    if (f && ![...field.values()].includes(f)) return void field.set(i, f);
    const facet = facets.find((g) => (g.name && fold(g.name) === t) || (g.key && facetWords[g.key].some((w) => fold(w) === t)));
    if (facet && ![...facetAt.values()].includes(facet.id)) return void facetAt.set(i, facet.id);
    ignoredColumns.push(title.trim());
  });
  const noNameColumn = ![...field.values()].includes('name');

  const allNew = new Map<string, NewLabel>();
  const remember = (l: NewLabel) => {
    const k = `${l.facetId}|${fold(l.name)}`;
    if (!allNew.has(k)) allNew.set(k, l);
    return allNew.get(k)!;
  };

  const rows: ImportRow[] = [];
  body.forEach((cells, n) => {
    const input = emptyProvider();
    const newLabels: NewLabel[] = [];
    let primaryText = '';
    cells.forEach((cell, i) => {
      const f = field.get(i);
      if (f === 'phones' || f === 'emails' || f === 'links') input[f] = split(cell);
      else if (f === 'primary') primaryText = cell.trim();
      else if (f) input[f] = cell.trim();
      const facetId = facetAt.get(i);
      if (!facetId) return;
      for (const name of split(cell)) {
        const found = existingLabel(doc, facetId, name);
        if (found) {
          if (!input.labelIds.includes(found.id)) input.labelIds.push(found.id);
        } else {
          const label = remember({ facetId, name });
          if (!newLabels.includes(label)) newLabels.push(label);
        }
      }
    });
    // The main category is a Category label; one not listed among the row's categories joins them.
    let newPrimary: NewLabel | undefined;
    if (primaryText) {
      const found = existingLabel(doc, FACET_IDS.category, primaryText);
      if (found) {
        if (!input.labelIds.includes(found.id)) input.labelIds.push(found.id);
        input.primaryCategoryId = found.id;
      } else {
        newPrimary = remember({ facetId: FACET_IDS.category, name: primaryText });
        if (!newLabels.includes(newPrimary)) newLabels.push(newPrimary);
      }
    }
    const row: ImportRow = {
      line: n + 2,
      input,
      newLabels,
      ...(newPrimary && { newPrimary }),
      ...(!input.name && { problem: 'nameRequired' as const }),
      duplicates: input.name ? findDuplicates(doc, input) : [],
    };
    const earlier = rows.find((r) => !r.problem && sameAs(input, r.input).length);
    if (earlier && input.name) row.sameAsRow = { line: earlier.line, reasons: sameAs(input, earlier.input) };
    rows.push(row);
  });
  return { rows, newLabels: [...allNew.values()], ignoredColumns, noNameColumn };
}

// --- choices and applying ---------------------------------------------------------------------

/** What to do with one row: add it, leave it out, or merge it into a provider already there. */
export type ImportChoice =
  { kind: 'add' } | { kind: 'skip' } | { kind: 'merge'; into: string; keep: Partial<Record<SingleField, 'existing' | 'incoming'>> };

/**
 * The choice made without asking: a row with no name is left out; a row with nothing like it is
 * added; a row that looks like a provider already there, or like an earlier row, waits for the
 * owner (null): nothing is merged or doubled without a decision (D-12).
 */
export function defaultChoice(row: ImportRow): ImportChoice | null {
  if (row.problem) return { kind: 'skip' };
  if (row.duplicates.length || row.sameAsRow) return null;
  return { kind: 'add' };
}

/** The single fields where an existing provider and an imported row both have a value and differ. */
export function conflicts(existing: Provider, incoming: ProviderInput): SingleField[] {
  return SINGLE_FIELDS.filter((f) => existing[f].trim() && incoming[f].trim() && existing[f].trim() !== incoming[f].trim());
}

/** Values of both lists, the existing first, each once (compared the way duplicates are found). */
function union(a: readonly string[], b: readonly string[], key: (v: string) => string) {
  const seen = new Set(a.map(key));
  return [...a, ...b.filter((v) => !seen.has(key(v)) && seen.add(key(v)))];
}

/**
 * FR-24: a provider merged with an imported row. Phones, emails, links and labels are combined;
 * for a single field, the existing value stays unless the owner kept the incoming one, and an empty
 * existing value takes the incoming one.
 */
export function mergeInput(
  existing: Provider,
  incoming: ProviderInput,
  keep: Partial<Record<SingleField, 'existing' | 'incoming'>>,
): ProviderInput {
  const pick = (f: SingleField) => (keep[f] === 'incoming' && incoming[f].trim()) || existing[f] || incoming[f];
  const primary = existing.primaryCategoryId ?? incoming.primaryCategoryId;
  return {
    name: pick('name'),
    contactPerson: pick('contactPerson'),
    address: pick('address'),
    notes: pick('notes'),
    phones: union(existing.phones, incoming.phones, phoneKey),
    emails: union(existing.emails, incoming.emails, fold),
    links: union(existing.links, incoming.links, linkKey),
    labelIds: [...new Set([...existing.labelIds, ...incoming.labelIds])],
    ...(primary && { primaryCategoryId: primary }),
  };
}

/** What merging a row into a provider would add, for the preview's one-line summary. */
export interface MergeChanges {
  /** Labels the provider gains, including those the import creates. */
  labels: number;
  phones: number;
  emails: number;
  links: number;
  /** Single fields empty on the provider that the row fills. */
  filled: SingleField[];
  /** Single fields where both have a different value: the owner chooses (FR-24). */
  differ: SingleField[];
}

/** What `mergeInput` would change on the provider, with the existing single values kept. */
export function mergeChanges(existing: Provider, row: ImportRow): MergeChanges {
  const merged = mergeInput(existing, row.input, {});
  return {
    labels: merged.labelIds.length - existing.labelIds.length + row.newLabels.length,
    phones: merged.phones.length - existing.phones.length,
    emails: merged.emails.length - existing.emails.length,
    links: merged.links.length - existing.links.length,
    filled: SINGLE_FIELDS.filter((f) => merged[f] !== existing[f]),
    differ: conflicts(existing, row.input),
  };
}

export interface ImportResult {
  doc: DirectoryDoc;
  added: number;
  merged: number;
  skipped: number;
  labelsCreated: number;
}

/**
 * Makes the planned changes with the owner's choices: first the labels the kept rows need, then
 * each row added or merged. Throws when a choice is still missing.
 */
export function applyImport(
  doc: DirectoryDoc,
  plan: ImportPlan,
  choices: readonly (ImportChoice | null)[],
  ctx: EditContext,
): ImportResult {
  if (choices.length !== plan.rows.length || choices.some((c) => c === null)) throw new Error('Every row needs a choice before importing');
  let out = doc;
  let labelsCreated = 0;
  const created = new Map<NewLabel, string>();
  const labelFor = (l: NewLabel) => {
    let id = created.get(l);
    if (!id) {
      // Created meanwhile by an earlier row under another spelling: use it.
      const found = existingLabel(out, l.facetId, l.name);
      if (found) id = found.id;
      else {
        const added = createLabel(out, { facetId: l.facetId, name: l.name }, ctx);
        out = added.doc;
        id = added.id;
        labelsCreated++;
      }
      created.set(l, id);
    }
    return id;
  };
  let added = 0;
  let merged = 0;
  let skipped = 0;
  plan.rows.forEach((row, i) => {
    const choice = choices[i]!;
    if (row.problem || choice.kind === 'skip') {
      skipped++;
      return;
    }
    const input: ProviderInput = {
      ...row.input,
      labelIds: [...row.input.labelIds, ...row.newLabels.map(labelFor)],
      ...(row.newPrimary && { primaryCategoryId: labelFor(row.newPrimary) }),
    };
    if (choice.kind === 'add') {
      out = createProvider(out, input, ctx).doc;
      added++;
    } else {
      const existing = own(out.providers, choice.into);
      if (!existing || existing.deleted) throw new Error(`No provider ${choice.into} to merge into`);
      out = saveProvider(out, choice.into, providerInput(existing), mergeInput(existing, input, choice.keep), ctx);
      merged++;
    }
  });
  return { doc: out, added, merged, skipped, labelsCreated };
}

/** The interface words of the starting label groups, from both dictionaries, for `planImport`. */
export const facetWordsFrom = (dicts: readonly Record<string, string>[]): Record<BuiltInFacet, string[]> =>
  Object.fromEntries(BUILT_IN_FACETS.map((k) => [k, dicts.map((d) => d[`facet.${k}`] ?? '').filter(Boolean)])) as Record<
    BuiltInFacet,
    string[]
  >;
