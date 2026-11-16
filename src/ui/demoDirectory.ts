import { addLogEntry, createLabel, createProvider, emptyProvider } from '../domain/edits';
import type { EditContext } from '../domain/records';
import { FACET_IDS, newDirectory, type DirectoryDoc } from '../domain/schema';

/**
 * The signed-out demo's starting directory: one made-up provider with a few labels and a log
 * entry, so the screens show what they are for. Every contact detail is fictional: example.com
 * is reserved for examples (RFC 2606), and no Romanian number starts with 0 after +40.
 */
export function demoDirectory(owner: string, ctx: EditContext): DirectoryDoc {
  let doc = newDirectory(owner);
  const label = (facetId: string, name: string, extra: { parentId?: string; color?: Parameters<typeof createLabel>[1]['color'] } = {}) => {
    const added = createLabel(doc, { facetId, name, ...extra }, ctx);
    doc = added.doc;
    return added.id;
  };
  const wedding = label(FACET_IDS.category, 'Wedding', { color: 'pink' });
  const photo = label(FACET_IDS.category, 'Photo', { parentId: wedding, color: 'blue' });
  const area = label(FACET_IDS.area, 'Bucharest', { color: 'green' });
  const source = label(FACET_IDS.source, 'Sample fair', { color: 'orange' });
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
  const today = ctx.now().toISOString().slice(0, 10);
  return addLogEntry(doc, added.id, today, 'Called to ask about dates and prices.', ctx).doc;
}
