import { dayOf } from '../domain/days';
import { addLogEntry, createProvider, emptyProvider } from '../domain/edits';
import { addRecord, type EditContext } from '../domain/records';
import { FACET_IDS, newDirectory, type DirectoryDoc, type LabelColor } from '../domain/schema';
import { translate, type Lang } from '../i18n';

/** The signed-out demo's owner: never a real Google account id. */
export const DEMO_OWNER = 'demo';

/**
 * The demo as it starts, in `lang`. Fixed ids (`demo-1`, `demo-2`, ... and the labels'
 * `demo-label-...`), the same in every language, so a reload keeps a filter in the address
 * pointing at the same label, and signing in can tell the sample from what the visitor added
 * (domain/carry.ts), whatever language the demo was in.
 */
export function sampleDirectory(lang: Lang = 'en', now: () => Date = () => new Date()): DirectoryDoc {
  let n = 0;
  return demoDirectory(DEMO_OWNER, { by: DEMO_OWNER, now, newId: () => `demo-${++n}` }, lang);
}

/**
 * The signed-out demo's starting directory: one made-up provider with a few labels and a log
 * entry, so the screens show what they are for, in the interface's language. Every contact
 * detail is fictional: example.com is reserved for examples (RFC 2606), and no Romanian number
 * starts with 0 after +40.
 */
export function demoDirectory(owner: string, ctx: EditContext, lang: Lang = 'en'): DirectoryDoc {
  const t = (key: Parameters<typeof translate>[1]) => translate(lang, key);
  let doc = newDirectory(owner);
  // Each label under a fixed id, not the id its name would give (labelIdOf), which depends on the language.
  const label = (id: string, facetId: string, name: string, color: LabelColor) => {
    doc = addRecord(doc, 'labels', { facetId, name, color, aliases: [] }, { ...ctx, newId: () => id }).doc;
    return id;
  };
  const photo = label('demo-label-category', FACET_IDS.category, t('sample.category'), 'blue');
  const area = label('demo-label-area', FACET_IDS.area, t('sample.area'), 'green');
  const source = label('demo-label-source', FACET_IDS.source, t('sample.source'), 'orange');
  const added = createProvider(
    doc,
    {
      ...emptyProvider(),
      name: t('sample.name'),
      contactPerson: t('sample.contact'),
      phones: ['+40 000 000 000'],
      emails: ['hello@example.com'],
      links: ['https://www.example.com'],
      address: t('sample.address'),
      notes: t('sample.notes'),
      labelIds: [photo, area, source],
    },
    ctx,
  );
  doc = added.doc;
  const today = dayOf(ctx.now());
  return addLogEntry(doc, added.id, today, t('sample.log'), ctx).doc;
}
