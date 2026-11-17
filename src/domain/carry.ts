import { live, put, type DirectoryDoc, type Meta } from './schema';

/**
 * What a visitor added in the signed-out demo, to carry into their own directory at sign-in
 * (D-25), without the made-up sample the demo starts with (`sample`).
 *
 * Kept: providers the visitor added and their log; labels the visitor made; a sample label
 * only where a kept provider carries it; facets the visitor added. Left out: the sample's providers and every log entry about them, unused sample
 * labels, the starting facets (every directory has its own, with the same ids), shares, and
 * whatever was deleted. Pure.
 */
export function demoCarry(demo: DirectoryDoc, sample: DirectoryDoc): DirectoryDoc {
  const fromSample = (key: 'providers' | 'labels', id: string) => Object.hasOwn(sample[key], id);
  const providers = live(demo.providers).filter((p) => !fromSample('providers', p.id));
  const kept = new Set(providers.map((p) => p.id));
  const log = live(demo.log).filter((e) => kept.has(e.providerId));

  const used = new Set(providers.flatMap((p) => p.labelIds));
  const labelIds = new Set(live(demo.labels).flatMap((l) => (!fromSample('labels', l.id) || used.has(l.id) ? [l.id] : [])));
  const labels = live(demo.labels).filter((l) => labelIds.has(l.id));
  const facets = live(demo.facets).filter((f) => !f.key);

  return {
    ...demo,
    facets: byId(facets),
    labels: byId(labels),
    providers: byId(providers),
    log: byId(log),
    shares: {},
  };
}

function byId<T extends Meta>(records: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const r of records) put(out, r.id, r);
  return out;
}
