// Builds seed/contacts_review.csv from the lookup results (seed/lookup/batch-*.csv) and the
// owner's decisions (seed/lookup/decisions.csv), for the owner to approve row by row (FR-26).
// The printed names come from seed/exhibitors.csv by board column and position, so no name is
// ever taken from a lookup. Run: node seed/merge-contacts.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** RFC 4180 CSV: quoted fields, doubled quotes, CRLF or LF. */
function parse(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows.filter((r) => r.some((f) => f !== ''));
}

const records = (file) => {
  const [header, ...rows] = parse(readFileSync(file, 'utf8'));
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
};

const cell = (v) => (/[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
const key = (r) => `${r.column},${r.position}`;
/** A value as compared: links without scheme, "www." and trailing slash; case ignored. */
const same = (v) =>
  v
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');

const names = new Map(records(join(here, 'exhibitors.csv')).map((r) => [key(r), r.name]));
const lookup = join(here, 'lookup');
const batches = readdirSync(lookup)
  .filter((f) => /^batch-\d+\.csv$/.test(f))
  .sort();
const decisions = records(join(lookup, 'decisions.csv'));

let rows = batches.flatMap((f) => records(join(lookup, f)).map((r) => ({ ...r, batch: f })));
const unknown = rows.filter((r) => !names.has(key(r)));
if (unknown.length) throw new Error(`rows for positions not on the board: ${unknown.map(key).join(' ')}`);

// The owner's decisions: "drop" removes one wrong value; "match" confirms the entry's own values.
for (const d of decisions.filter((d) => d.decision === 'drop')) {
  const before = rows.length;
  rows = rows.filter((r) => !(key(r) === key(d) && same(r.value) === same(d.value)));
  if (rows.length === before) console.warn(`decision drops nothing: ${key(d)} ${d.value}`);
}
// Every other decision ("match", "nomatch") is shown with the entry's rows; "match" also confirms them.
const decided = new Map(decisions.filter((d) => d.decision !== 'drop').map((d) => [key(d), d]));

// One row per value (a later pass may find the same link again); "none" only when nothing else.
const seen = new Set();
const out = [];
for (const r of rows) {
  const id = `${key(r)}|${r.kind}|${same(r.value)}`;
  if (seen.has(id)) continue;
  seen.add(id);
  if (r.kind === 'none' && rows.some((o) => key(o) === key(r) && o.kind !== 'none')) continue;
  const m = decided.get(key(r));
  const confirmed = m?.decision === 'match' && !['none', 'other'].includes(r.kind);
  out.push({
    ...r,
    name: names.get(key(r)),
    confidence: confirmed ? 'high' : r.confidence,
    owner_decision: m ? `${m.date}: ${m.note}` : '',
  });
}
out.sort((a, b) => Number(a.column) - Number(b.column) || Number(a.position) - Number(b.position) || a.business.localeCompare(b.business));

const header = [
  'column',
  'position',
  'name',
  'business',
  'kind',
  'value',
  'source_url',
  'confidence',
  'note',
  'owner_decision',
  'approved',
];
writeFileSync(
  join(here, 'contacts_review.csv'),
  [header.join(','), ...out.map((r) => header.map((h) => cell(r[h] ?? '')).join(','))].join('\n') + '\n',
);

const entries = new Set(out.map(key));
const withValue = new Set(out.filter((r) => r.kind !== 'none').map(key));
const count = (kind) => new Set(out.filter((r) => r.kind === kind).map(key)).size;
console.log(
  `${out.length} rows from ${batches.length} batches; ${entries.size} of ${names.size} board entries looked up, ` +
    `${withValue.size} with at least one value; website ${count('website')}, phone ${count('phone')}, email ${count('email')}, ` +
    `instagram ${count('instagram')}, tiktok ${count('tiktok')}, allweddings ${count('allweddings')}; ` +
    `uncertain rows ${out.filter((r) => r.confidence === 'uncertain' && r.kind !== 'none').length}`,
);
