import { dayOf } from '../domain/days';
import { addLogEntry, createLabel, createProvider, emptyProvider } from '../domain/edits';
import type { EditContext } from '../domain/records';
import { FACET_IDS, newDirectory, type DirectoryDoc } from '../domain/schema';

/** The signed-out demo's owner: never a real Google account id. */
export const DEMO_OWNER = 'demo';

/**
 * The demo as it starts. Fixed ids (`demo-1`, `demo-2`, ...), so a reload keeps a filter in the
 * address pointing at the same label, and signing in can tell the sample from what the visitor
 * added (domain/carry.ts).
 */
export function sampleDirectory(now: () => Date = () => new Date()): DirectoryDoc {
  let n = 0;
  return demoDirectory(DEMO_OWNER, { by: DEMO_OWNER, now, newId: () => `demo-${++n}` });
}

/**
 * The signed-out demo's starting directory: one made-up provider with a few labels and a log
 * entry, so the screens show what they are for. Every contact detail is fictional: example.com
 * is reserved for examples (RFC 2606), and no Romanian number starts with 0 after +40.
 */
export function demoDirectory(owner: string, ctx: EditContext): DirectoryDoc {
  let doc = newDirectory(owner);
  const label = (facetId: string, name: string, color: Parameters<typeof createLabel>[1]['color']) => {
    const added = createLabel(doc, { facetId, name, color }, ctx);
    doc = added.doc;
    return added.id;
  };
  const photo = label(FACET_IDS.category, 'Photo', 'blue');
  const area = label(FACET_IDS.area, 'Bucharest', 'green');
  const source = label(FACET_IDS.source, 'Sample fair', 'orange');
  const added = createProvider(
    doc,
    {
      ...emptyProvider(),
      name: 'Sample Photo Studio',
      contactPerson: 'Ana Example',
      phones: ['+40 000 000 000'],
      emails: ['hello@example.com'],
      links: ['https://www.example.com'],
      address: 'Sample Street 1, Bucharest',
      notes: 'A made-up provider to show what a record looks like. Delete it whenever you like.',
      labelIds: [photo, area, source],
    },
    ctx,
  );
  doc = added.doc;
  const today = dayOf(ctx.now());
  return addLogEntry(doc, added.id, today, 'Called to ask about dates and prices.', ctx).doc;
}
