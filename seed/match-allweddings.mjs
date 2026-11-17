// Matches the board's exhibitor names (seed/exhibitors.csv) against the AllWeddings supplier
// index (seed/lookup/allweddings-index.csv) and writes seed/lookup/allweddings-matches.csv: for
// each board entry, its best candidates, each marked exact, likely or weak, for the owner to
// confirm. Nothing is decided here. Run: node seed/match-allweddings.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

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
const cell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v));

/** Lower case, no diacritics, letters and digits only, words separated by single spaces. */
const fold = (s) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Trade and filler words: they say what a business does, not which business it is. */
const COMMON = new Set(
  (
    'foto video fotograf fotografie videograf videography photography photo films film studio events event ' +
    'evenimente eveniment wedding weddings nunta nunti nuntii bucuresti srl ro com and si de cu la the by x ' +
    'atelier band formatie cabina flori flower flowers floral design decor catering bar planner agency ' +
    'bridal hall restaurant salon store shop'
  ).split(' '),
);
const words = (s) =>
  fold(s)
    .split(' ')
    .filter((w) => w.length > 1 && !COMMON.has(w));
const compact = (s) => fold(s).replace(/ /g, '');

function score(board, supplier) {
  const b = compact(board);
  const s = compact(supplier);
  if (b === s) return { kind: 'exact', value: 1 };
  // One name inside the other: a two-business board line, or a name with its trade added.
  if (s.length >= 5 && b.includes(s)) return { kind: 'likely', value: 0.9 };
  if (b.length >= 5 && s.includes(b)) return { kind: 'likely', value: 0.85 };
  const bw = new Set(words(board));
  const sw = new Set(words(supplier));
  if (!bw.size || !sw.size) return { kind: 'none', value: 0 };
  const shared = [...bw].filter((w) => sw.has(w)).length;
  const jaccard = shared / new Set([...bw, ...sw]).size;
  if (shared && jaccard >= 0.5) return { kind: 'likely', value: 0.5 + jaccard / 4 };
  if (shared) return { kind: 'weak', value: jaccard / 2 };
  return { kind: 'none', value: 0 };
}

const board = records(join(here, 'exhibitors.csv'));
const index = records(join(here, 'lookup', 'allweddings-index.csv'));
// One candidate per profile, with all its categories.
const profiles = new Map();
for (const r of index) {
  const p = profiles.get(r.profile_url) ?? { name: r.name, url: r.profile_url, city: r.city, categories: new Set() };
  p.categories.add(r.category);
  profiles.set(r.profile_url, p);
}

const header = ['column', 'position', 'board_name', 'match', 'supplier', 'profile_url', 'categories', 'city', 'score'];
const out = [];
const tally = { exact: 0, likely: 0, weak: 0, none: 0 };
for (const e of board) {
  const candidates = [...profiles.values()]
    .map((p) => ({ p, s: score(e.name, p.name) }))
    .filter((c) => c.s.kind !== 'none')
    .sort((a, b) => b.s.value - a.s.value)
    .slice(0, 3);
  tally[candidates[0]?.s.kind ?? 'none']++;
  if (!candidates.length) out.push([e.column, e.position, e.name, 'none', '', '', '', '', 0]);
  for (const c of candidates)
    out.push([e.column, e.position, e.name, c.s.kind, c.p.name, c.p.url, [...c.p.categories].join(' '), c.p.city, c.s.value.toFixed(2)]);
}
writeFileSync(
  join(here, 'lookup', 'allweddings-matches.csv'),
  [header.join(','), ...out.map((r) => r.map(cell).join(','))].join('\n') + '\n',
);
console.log(`${profiles.size} AllWeddings profiles; best match per board entry: ${JSON.stringify(tally)}`);
