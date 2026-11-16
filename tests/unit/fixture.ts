import { addRecord, type EditContext, type Fields } from '../../src/domain/records';
import { FACET_IDS, newDirectory, type DirectoryDoc } from '../../src/domain/schema';

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
 *   Category: Wedding > Photo, Video; Home > Plumber
 *   Area: București, Cluj    Source: AllWeddings Fest 2026    Lists: Shortlist
 * Providers: Grădina cu Sălcii (Photo, București, fair), Bruno Photography (Photo, Cluj),
 * Flashbox (Video, București, fair, Shortlist), Ana Instalații (Plumber), Lagoo (no category).
 */
export function weddingDirectory() {
  const ctx = testContext();
  let doc = newDirectory(OWNER);
  const add = (r: { doc: DirectoryDoc; id: string }) => ((doc = r.doc), r.id);
  const wedding = add(label(doc, ctx, FACET_IDS.category, 'Wedding', { aliases: ['Nunta'], color: 'pink' }));
  const photo = add(label(doc, ctx, FACET_IDS.category, 'Photo', { parentId: wedding, aliases: ['Foto'] }));
  const video = add(label(doc, ctx, FACET_IDS.category, 'Video', { parentId: wedding }));
  const home = add(label(doc, ctx, FACET_IDS.category, 'Home'));
  const plumber = add(label(doc, ctx, FACET_IDS.category, 'Plumber', { parentId: home, aliases: ['Instalator'] }));
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
    labels: { wedding, photo, video, home, plumber, bucharest, cluj, fair, shortlist },
    providers: { gradina, bruno, flashbox, plumberAna, lagoo },
  };
}
