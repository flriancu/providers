import { toCsv } from '../../src/domain/csv';
import { labelById } from '../../src/domain/labels';
import { addRecord, type EditContext, type Fields } from '../../src/domain/records';
import { FACET_IDS, live, newDirectory, type DirectoryDoc, type Provider } from '../../src/domain/schema';
import { applyImport, defaultChoice, exportRows, planImport, type ImportChoice } from '../../src/domain/transfer';
import { translate } from '../../src/i18n';
import { FACET_WORDS, facetName } from '../../src/ui/labelText';

export const OWNER = 'sub-owner';

/** A deterministic clock and id source: each call is one millisecond later, ids count up. */
export function testContext(by = OWNER, start = Date.UTC(2026, 10, 16, 10)): EditContext {
  let t = start;
  let n = 0;
  return { by, now: () => new Date(t++), newId: () => `id-${++n}` };
}

/** Adds a label and returns its id. */
export function label(doc: DirectoryDoc, ctx: EditContext, facetId: string, name: string, extra: Partial<Fields<'labels'>> = {}) {
  return addRecord(doc, 'labels', { facetId, name, color: 'blue', aliases: [], ...extra }, ctx);
}

export function provider(doc: DirectoryDoc, ctx: EditContext, name: string, extra: Partial<Fields<'providers'>> = {}) {
  return addRecord(
    doc,
    'providers',
    { name, contactPerson: '', phones: [], emails: [], links: [], address: '', notes: '', labelIds: [], ...extra },
    ctx,
  );
}

/**
 * A small wedding directory:
 *   Category: Photo, Video, Plumber
 *   Area: București, Cluj    Source: AllWeddings Fest 2026    Lists: Shortlist
 * Providers: Grădina cu Sălcii (Photo, București, fair), Bruno Photography (Photo, Cluj),
 * Flashbox (Video, București, fair, Shortlist), Ana Instalații (Plumber), Lagoo (no category).
 */
export function weddingDirectory() {
  const ctx = testContext();
  let doc = newDirectory(OWNER);
  const add = (r: { doc: DirectoryDoc; id: string }) => ((doc = r.doc), r.id);
  const photo = add(label(doc, ctx, FACET_IDS.category, 'Photo', { aliases: ['Foto'] }));
  const video = add(label(doc, ctx, FACET_IDS.category, 'Video'));
  const plumber = add(label(doc, ctx, FACET_IDS.category, 'Plumber', { aliases: ['Instalator'] }));
  const bucharest = add(label(doc, ctx, FACET_IDS.area, 'București'));
  const cluj = add(label(doc, ctx, FACET_IDS.area, 'Cluj'));
  const fair = add(label(doc, ctx, FACET_IDS.source, 'AllWeddings Fest 2026'));
  const shortlist = add(label(doc, ctx, FACET_IDS.lists, 'Shortlist'));
  const gradina = add(
    provider(doc, ctx, 'GRĂDINA CU SĂLCII', {
      labelIds: [photo, bucharest, fair],
      primaryCategoryId: photo,
      phones: ['0721 234 567'],
      notes: 'Quote 3000 EUR, too expensive',
    }),
  );
  const bruno = add(provider(doc, ctx, 'BRUNO PHOTOGRAPHY', { labelIds: [photo, cluj], links: ['https://www.brunophoto.ro/'] }));
  const flashbox = add(provider(doc, ctx, 'FLASHBOX', { labelIds: [video, bucharest, fair, shortlist], emails: ['Hello@Flashbox.ro'] }));
  const plumberAna = add(provider(doc, ctx, 'Ana Instalații', { labelIds: [plumber, bucharest] }));
  const lagoo = add(provider(doc, ctx, 'LAGOO', { labelIds: [fair] }));
  return {
    doc,
    ctx,
    labels: { photo, video, plumber, bucharest, cluj, fair, shortlist },
    providers: { gradina, bruno, flashbox, plumberAna, lagoo },
  };
}

/** Every provider of a directory as a CSV file, as the Import and export page writes it in English. */
export function exportCsv(doc: DirectoryDoc): string {
  return toCsv(exportRows(doc, live(doc.providers), (f) => facetName(f, (key) => translate('en', key))));
}

/**
 * Imports a CSV table with the choices the preview makes without asking; a row that waits for a
 * choice is added. `lines`: the line each row starts on, as readCsv gives them.
 */
export function importAll(doc: DirectoryDoc, rows: readonly (readonly string[])[], lines?: readonly number[], at = Date.UTC(2026, 10, 20)) {
  const plan = planImport(doc, rows, FACET_WORDS, lines);
  const choices = plan.rows.map((r): ImportChoice => defaultChoice(r) ?? { kind: 'add' });
  return { plan, ...applyImport(doc, plan, choices, testContext(OWNER, at)) };
}

/** A provider as the owner sees it: every field, its labels by group and name, ids left out. */
function asShown(doc: DirectoryDoc, p: Provider) {
  const name = (id: string) => {
    const l = labelById(doc, id)!;
    return `${l.facetId}: ${l.name}`;
  };
  return {
    name: p.name,
    contactPerson: p.contactPerson,
    phones: p.phones,
    emails: p.emails,
    links: p.links,
    address: p.address,
    notes: p.notes,
    mainCategory: p.primaryCategoryId ? name(p.primaryCategoryId) : '',
    labels: p.labelIds.map(name).sort(),
  };
}

/** Every provider as the owner sees it, by name: two directories that show the same are equal. */
export function providersAsShown(doc: DirectoryDoc) {
  return live(doc.providers)
    .map((p) => asShown(doc, p))
    .sort((a, b) => a.name.localeCompare(b.name));
}
