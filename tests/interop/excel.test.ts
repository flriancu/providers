import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { decodeCsv, parseCsv, readCsv } from '../../src/domain/csv';
import { createLabel, createProvider, emptyProvider, type ProviderInput } from '../../src/domain/edits';
import { FACET_IDS, newDirectory, type DirectoryDoc } from '../../src/domain/schema';
import { exportCsv, importAll, OWNER, providersAsShown, testContext } from '../unit/fixture';

/**
 * The export opened in Excel and saved again, in each CSV format Excel offers, then imported: what
 * the owner does to edit the directory in a spreadsheet. tests/interop/excel.ps1 drives Excel, as
 * set up in English and in Romanian Windows; what this machine's settings cannot give, it
 * emulates and says so.
 */

const SCRIPT = fileURLToPath(new URL('excel.ps1', import.meta.url));

interface Save {
  format: 'CSV UTF-8' | 'CSV' | 'Unicode Text';
  file: string;
  emulated: boolean;
}
interface Setup {
  setup: 'en' | 'ro';
  separator: string;
  codePage: number;
  opened: string;
  openedEmulated: boolean;
  saves: Save[];
}

/**
 * A directory made as the app makes one (edits.ts), with values a spreadsheet may change: every
 * Romanian letter, separators and quotes in values, a line break, values that look like formulas.
 */
function sampleDirectory(): DirectoryDoc {
  const ctx = testContext();
  let doc = newDirectory(OWNER);
  const add = (r: { doc: DirectoryDoc; id: string }) => ((doc = r.doc), r.id);
  const newLabel = (facetId: string, name: string) => add(createLabel(doc, { facetId, name }, ctx));
  const newProvider = (name: string, fields: Partial<ProviderInput>) =>
    add(createProvider(doc, { ...emptyProvider(), name, ...fields }, ctx));
  const photo = newLabel(FACET_IDS.category, 'Fotografie');
  const video = newLabel(FACET_IDS.category, 'Video');
  const dresses = newLabel(FACET_IDS.category, 'Rochii de mireasă');
  const bucharest = newLabel(FACET_IDS.area, 'București');
  const cluj = newLabel(FACET_IDS.area, 'Cluj-Napoca');
  const fair = newLabel(FACET_IDS.source, 'AllWeddings Fest 2026');
  const shortlist = newLabel(FACET_IDS.lists, 'Shortlist');
  newProvider('GRĂDINA CU SĂLCII', {
    labelIds: [photo, bucharest, fair],
    phones: ['0721 234 567'],
    notes: 'Quote 3000 EUR, too expensive',
  });
  // Two categories, the main one chosen; and two without a main one.
  newProvider('FLASHBOX', { labelIds: [video, photo, bucharest, shortlist], primaryCategoryId: video, emails: ['Hello@Flashbox.ro'] });
  newProvider('BRUNO PHOTOGRAPHY', { labelIds: [photo, video, cluj], links: ['https://www.brunophoto.ro/'] });
  newProvider('LAGOO', {});
  newProvider('Ștefănescu Țesături și Fiii', {
    contactPerson: 'Ioana Mărgărit',
    // Written "'+40 ...", so a spreadsheet does not take it for a formula.
    phones: ['+40 721 000 000', '0722 000 000'],
    emails: ['ioana@exemplu.ro'],
    // A link with a semicolon of its own.
    links: ['https://exemplu.ro/a', 'https://exemplu.ro/b;jsessionid=1'],
    // A comma only: quoted for its separator alone.
    address: 'Strada Mare 1, Sibiu',
    notes: 'Văzut la târg, standul 1.\nA spus: "sunați după ora 10". Înălțime: 2 m, ÂÎ âî.',
    labelIds: [dresses, cluj, fair],
  });
  newProvider('Formula Test', { contactPerson: '@Ana', notes: '=HYPERLINK("https://example.org","click")' });
  return doc;
}

const sample = sampleDirectory();
const exported = exportCsv(sample);
/** A JSON file PowerShell wrote: UTF-8 with a byte-order mark. */
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
let out = '';
let setups: Setup[] = [];

beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), 'providers-excel-'));
  const file = join(dir, 'export.csv');
  writeFileSync(file, exported);
  out = join(dir, 'excel');
  console.log(execFileSync('pwsh', ['-NoProfile', '-File', SCRIPT, '-In', file, '-OutDir', out], { encoding: 'utf8' }).trim());
  setups = readJson(join(out, 'manifest.json')) as Setup[];
});

const setupNamed = (name: Setup['setup']) => setups.find((s) => s.setup === name)!;
const how = (emulated: boolean) => (emulated ? 'emulated' : 'by Excel');

/**
 * Excel's cells after opening the export in these settings, and the export's. An emulated opening
 * reads the letters wrongly (the "sep=" line), so for it only the number of columns per row counts.
 */
function opened(name: Setup['setup']) {
  const setup = setupNamed(name);
  const cells = readJson(join(out, setup.opened)) as string[][];
  const rows = parseCsv(exported);
  console.log(
    `${name}: opened ${how(setup.openedEmulated)}: ${cells.length} rows of ${cells[0]?.length} columns; the export has ${rows.length} of ${rows[0]?.length}.`,
  );
  const compared = (table: readonly (readonly string[])[]) => (setup.openedEmulated ? table.map((r) => r.length) : table);
  return { excel: compared(cells), exported: compared(rows) };
}

describe('Excel opens the export', () => {
  it('in English Windows settings, with one column per field, every value as exported', () => {
    const { excel, exported: rows } = opened('en');
    expect(excel).toEqual(rows);
  });
  // Excel splits a CSV file at the Windows list separator, a semicolon in Romanian settings, so
  // the export (commas) opens there as one column of text, rows broken at line breaks in
  // values. Known (REQUIREMENTS.md, Q-08); fails until the export is readable there.
  it.fails('in Romanian Windows settings, with one column per field', () => {
    const { excel, exported: rows } = opened('ro');
    expect(excel).toEqual(rows);
  });
});

describe.each(['en', 'ro'] as const)('Excel in %s Windows settings', (name) => {
  it.each(['CSV UTF-8', 'Unicode Text'] as const)('saved as "%s", imports back every value as it was', (format) => {
    const save = setupNamed(name).saves.find((s) => s.format === format)!;
    const { text, encoding } = decodeCsv(readFileSync(join(out, save.file)));
    const table = readCsv(text);
    console.log(`${name}: "${format}" ${how(save.emulated)}, read as ${encoding}.`);
    expect(encoding).not.toBe('windows-1250');
    expect(table.quoteProblems).toEqual([]);
    expect(providersAsShown(importAll(newDirectory(OWNER), table.rows, table.lines).doc)).toEqual(providersAsShown(sample));
  });

  // "CSV" is saved in the Windows code page, which lacks some Romanian letters: Excel writes "?"
  // for them. The import cannot get them back; it reads the file as Windows-1250 and says so.
  it('saved as "CSV", reads as Windows-1250 with the notice, and changes only letters the code page lacks', () => {
    const save = setupNamed(name).saves.find((s) => s.format === 'CSV')!;
    const { text, encoding } = decodeCsv(readFileSync(join(out, save.file)));
    expect(encoding).toBe('windows-1250');
    const table = readCsv(text);
    const result = importAll(newDirectory(OWNER), table.rows, table.lines);
    const rows = parseCsv(exported);
    expect(result.added).toBe(rows.length - 1);
    // Cell by cell, in file order: a changed value has "?" where a letter was, and nothing else changed.
    expect(table.rows.map((r) => r.length)).toEqual(rows.map((r) => r.length));
    const changed: string[] = [];
    const otherwise: string[] = [];
    const lost = new Set<string>();
    rows.forEach((row, i) =>
      row.forEach((was, j) => {
        const now = table.rows[i]![j]!;
        if (was === now) return;
        changed.push(`  ${JSON.stringify(was)} -> ${JSON.stringify(now)}`);
        const differs = [...was].length !== [...now].length || [...was].some((c, k) => c !== [...now][k] && [...now][k] !== '?');
        if (differs) otherwise.push(`${was} -> ${now}`);
        else [...was].forEach((c, k) => c !== [...now][k] && lost.add(c));
      }),
    );
    console.log(
      `${name}: "CSV" (code page ${setupNamed(name).codePage}, ${how(save.emulated)}): ${changed.length} values changed; letters lost: ${[...lost].sort().join(' ')}\n${changed.join('\n')}`,
    );
    expect(otherwise).toEqual([]);
  });
});
