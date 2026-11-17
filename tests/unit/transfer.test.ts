import { describe, expect, it } from 'vitest';

const BOM = String.fromCharCode(0xfeff);
import { parseCsv, toCsv } from '../../src/domain/csv';
import { createProvider, emptyProvider } from '../../src/domain/edits';
import { labelById } from '../../src/domain/labels';
import { FACET_IDS, live, newDirectory, type DirectoryDoc, type Facet } from '../../src/domain/schema';
import {
  applyImport,
  conflicts,
  defaultChoice,
  exportRows,
  mergeChanges,
  mergeInput,
  planImport,
  type ImportChoice,
} from '../../src/domain/transfer';
import { OWNER, testContext, weddingDirectory } from './fixture';

const WORDS = {
  category: ['Category', 'Categorie'],
  area: ['Area', 'Zonă'],
  source: ['Source', 'Sursă'],
  lists: ['Lists', 'Liste'],
} as const;
const title = (f: Facet) => f.name || WORDS[f.key!][0];
const names = (doc: DirectoryDoc) =>
  live(doc.providers)
    .map((p) => p.name)
    .sort();
const importAll = (doc: DirectoryDoc, csv: string, ctx = testContext(OWNER, Date.UTC(2026, 10, 20))) => {
  const plan = planImport(doc, parseCsv(csv), WORDS);
  return { plan, result: applyImport(doc, plan, plan.rows.map(defaultChoice), ctx) };
};

describe('CSV files', () => {
  it('reads quoted fields, doubled quotes, line breaks in a field, CRLF and a byte-order mark', () => {
    const text = BOM + 'Name,Notes\r\n"Artist, The Barn","Said ""yes""\nthen called"\r\n\r\nLagoo,\r\n';
    expect(parseCsv(text)).toEqual([
      ['Name', 'Notes'],
      ['Artist, The Barn', 'Said "yes"\nthen called'],
      ['Lagoo', ''],
    ]);
  });

  it('reads files saved with semicolons, as spreadsheets in Romanian settings write them', () => {
    expect(parseCsv('Nume;Telefon\nGrădina;0721 234 567\n')).toEqual([
      ['Nume', 'Telefon'],
      ['Grădina', '0721 234 567'],
    ]);
  });

  it('writes what it reads back, with a byte-order mark for spreadsheets', () => {
    const rows = [
      ['Name', 'Notes'],
      ['A, B', 'line one\nline "two"'],
      ['Ș', ' padded '],
    ];
    const text = toCsv(rows);
    expect(text.startsWith(BOM)).toBe(true);
    expect(parseCsv(text)).toEqual(rows);
  });
});

describe('export and import (FR-21, FR-22)', () => {
  it('exports every field and label group, and an export imports into an empty directory unchanged', () => {
    const { doc } = weddingDirectory();
    const rows = exportRows(doc, live(doc.providers), title);
    expect(rows[0]).toEqual([
      'Name',
      'Contact person',
      'Phones',
      'Emails',
      'Links',
      'Address',
      'Notes',
      'Main category',
      'Category',
      'Area',
      'Source',
      'Lists',
    ]);
    const flashbox = rows.find((r) => r[0] === 'FLASHBOX')!;
    expect(flashbox.slice(8)).toEqual(['Video', 'București', 'AllWeddings Fest 2026', 'Shortlist']);

    const { plan, result } = importAll(newDirectory(OWNER), toCsv(rows));
    expect(plan.ignoredColumns).toEqual([]);
    expect(names(result.doc)).toEqual(names(doc));
    expect(result).toMatchObject({ added: 5, merged: 0, skipped: 0, labelsCreated: 7 });
    const gradina = live(result.doc.providers).find((p) => p.name === 'GRĂDINA CU SĂLCII')!;
    expect(gradina.phones).toEqual(['0721 234 567']);
    expect(labelById(result.doc, gradina.primaryCategoryId!)!.name).toBe('Photo');
  });

  it('shows the labels to create once, finds existing ones by name or other words in any case, and reads Romanian headers', () => {
    const { doc } = weddingDirectory();
    const csv = 'Nume;Categorie;Zonă;Necunoscut\nNou unu;FOTO;Iasi;x\nNou doi;Drone;iasi;y\n';
    const plan = planImport(doc, parseCsv(csv), WORDS);
    expect(plan.ignoredColumns).toEqual(['Necunoscut']);
    expect(plan.newLabels.map((l) => l.name)).toEqual(['Iasi', 'Drone']); // "foto" is Photo's other word
    expect(plan.rows[0]!.input.labelIds.map((id) => labelById(doc, id)!.name)).toEqual(['Photo']);
    const { doc: after } = applyImport(doc, plan, plan.rows.map(defaultChoice), testContext());
    expect(live(after.labels).filter((l) => l.name === 'Iasi')).toHaveLength(1);
  });

  it('sets a row without a name aside, and refuses a file without a Name column', () => {
    const plan = planImport(newDirectory(OWNER), parseCsv('Name,Phones\n,0721\nLagoo,\n'), WORDS);
    expect(plan.rows[0]!.problem).toBe('nameRequired');
    expect(defaultChoice(plan.rows[0]!)).toEqual({ kind: 'skip' });
    expect(planImport(newDirectory(OWNER), parseCsv('Phones\n0721\n'), WORDS).noNameColumn).toBe(true);
  });
});

describe('duplicates on import (FR-23, FR-24, D-12)', () => {
  it('waits for the owner on a row like a provider already there, or like an earlier row', () => {
    const { doc, providers } = weddingDirectory();
    const plan = planImport(
      doc,
      parseCsv('Name,Phones\nGradina noua,+40 721 234 567\nOther,0700 000 001\nOther again,0700 000 001\n'),
      WORDS,
    );
    expect(plan.rows[0]!.duplicates.map((d) => [d.provider.id, d.reasons])).toEqual([[providers.gradina, ['phone']]]);
    expect(defaultChoice(plan.rows[0]!)).toBeNull();
    expect(plan.rows[2]!.sameAsRow).toEqual({ line: 3, reasons: ['phone'] });
    expect(() => applyImport(doc, plan, plan.rows.map(defaultChoice), testContext())).toThrow('Every row needs a choice');
  });

  it('merges a row into a provider: lists and labels combined, single fields as the owner chose', () => {
    let { doc } = weddingDirectory();
    const ctx = testContext();
    const made = createProvider(doc, { ...emptyProvider(), name: 'Studio', notes: 'old note', phones: ['0721 000 000'] }, ctx);
    doc = made.doc;
    const plan = planImport(
      doc,
      parseCsv('Name,Phones,Emails,Notes,Area\nStudio,+40 721 000 000; 0722 111 111,a@b.ro,new note,Cluj\n'),
      WORDS,
    );
    const existing = doc.providers[made.id]!;
    expect(conflicts(existing, plan.rows[0]!.input)).toEqual(['notes']);
    const choice: ImportChoice = { kind: 'merge', into: made.id, keep: { notes: 'incoming' } };
    const { doc: after, merged } = applyImport(doc, plan, [choice], ctx);
    const p = after.providers[made.id]!;
    expect(merged).toBe(1);
    expect(p.phones).toEqual(['0721 000 000', '0722 111 111']); // the same number in another form once
    expect(p.emails).toEqual(['a@b.ro']);
    expect(p.notes).toBe('new note');
    expect(p.labelIds.map((id) => labelById(after, id)!.name)).toEqual(['Cluj']);
    expect(names(after)).toHaveLength(6); // nothing added
  });

  it('says what a merge adds: new labels, contacts not there yet, empty fields filled, fields that differ', () => {
    let { doc } = weddingDirectory();
    const ctx = testContext();
    const made = createProvider(doc, { ...emptyProvider(), name: 'Studio', notes: 'old note', phones: ['0721 000 000'] }, ctx);
    doc = made.doc;
    const plan = planImport(
      doc,
      parseCsv(
        'Name,Contact person,Phones,Emails,Notes,Area,Source\nStudio,Ana,+40 721 000 000; 0722 111 111,a@b.ro,new note,Cluj,Fair 2030\n',
      ),
      WORDS,
    );
    expect(mergeChanges(doc.providers[made.id]!, plan.rows[0]!)).toEqual({
      labels: 2, // Cluj exists, Fair 2030 is created
      phones: 1, // the same number in another form is not new
      emails: 1,
      links: 0,
      filled: ['contactPerson'],
      differ: ['notes'],
    });
  });

  it('keeps the existing single values unless told otherwise, and fills empty ones', () => {
    const { doc, providers } = weddingDirectory();
    const bruno = doc.providers[providers.bruno]!;
    const merged = mergeInput(bruno, { ...emptyProvider(), name: 'Bruno P.', contactPerson: 'Bruno', labelIds: [] }, {});
    expect(merged.name).toBe('BRUNO PHOTOGRAPHY');
    expect(merged.contactPerson).toBe('Bruno');
  });

  it('creates a label used by several rows once, also under another spelling', () => {
    const { result } = importAll(newDirectory(OWNER), 'Name,Source\nA,AllWeddings Fest 2026\nB,allweddings fest 2026\n');
    expect(live(result.doc.labels).filter((l) => l.facetId === FACET_IDS.source)).toHaveLength(1);
    expect(result.labelsCreated).toBe(1);
  });
});
