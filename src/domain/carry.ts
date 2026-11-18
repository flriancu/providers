import { live, put, type DirectoryDoc, type Label, type Meta, type Provider } from './schema';

/**
 * What a visitor added in the signed-out demo, to carry into their own directory at sign-in
 * (D-25), without the made-up sample the demo starts with (`sample`).
 *
 * Kept: providers the visitor added and their log; labels the visitor made; a sample label only
 * where a kept provider carries it; facets the visitor added. Left out: the sample's providers
 * and every log entry about them, unused sample labels, the starting facets (every directory has
 * its own, with the same ids), shares, and whatever was deleted. Pure.
 *
 * Every demo starts its sample with the same ids, so a sample label carried in an earlier visit
 * is already in the directory under that id, perhaps renamed or deleted since. A sample label is
 * therefore carried under an id of this visit's own (`sessionId`): it joins a label of the same
 * name if the directory has one (absorb.ts) and never overwrites the old record.
 */
export function demoCarry(demo: DirectoryDoc, sample: DirectoryDoc): DirectoryDoc {
  const fromSample = (key: 'providers' | 'labels', id: string) => Object.hasOwn(sample[key], id);
  const providers = live(demo.providers).filter((p) => !fromSample('providers', p.id));
  const kept = new Set(providers.map((p) => p.id));
  const log = live(demo.log).filter((e) => kept.has(e.providerId));

  const used = new Set(providers.flatMap((p) => p.labelIds));
  const labels = live(demo.labels).filter((l) => !fromSample('labels', l.id) || used.has(l.id));
  const facets = live(demo.facets).filter((f) => !f.key);

  const renamed = new Map(labels.filter((l) => fromSample('labels', l.id)).map((l) => [l.id, sessionId(l)]));
  const to = (id: string) => renamed.get(id) ?? id;
  const relabelled = (p: Provider): Provider => ({
    ...p,
    labelIds: p.labelIds.map(to),
    ...(p.primaryCategoryId && { primaryCategoryId: to(p.primaryCategoryId) }),
  });

  return {
    ...demo,
    facets: byId(facets),
    labels: byId(labels.map((l): Label => ({ ...l, id: to(l.id) }))),
    providers: byId(providers.map(relabelled)),
    log: byId(log),
    shares: {},
  };
}

/** A sample record's id for this visit: the demo started at `createdAt`, its ids follow. */
const sessionId = (r: Meta) => `${r.id}@${r.createdAt}`;

function byId<T extends Meta>(records: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const r of records) put(out, r.id, r);
  return out;
}
