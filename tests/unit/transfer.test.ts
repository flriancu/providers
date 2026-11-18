import { describe, expect, it } from 'vitest';

const BOM = String.fromCharCode(0xfeff);
import { decodeCsv, parseCsv, readCsv, toCsv } from '../../src/domain/csv';
import { createFacet, createLabel, createProvider, deleteProvider, EditError, emptyProvider } from '../../src/domain/edits';
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

describe('CSV files from anywhere', () => {
  it('reads a one-column list whose names hold commas as one column', () => {
    expect(parseCsv('Name\nArtist, The Barn\nFoto & Video, SRL\n')).toEqual([['Name'], ['Artist, The Barn'], ['Foto & Video, SRL']]);
  });

  it('takes an inch mark inside a value as a character, not the start of a quoted value', () => {
    expect(parseCsv('Name,Phones\n5" Studio,0721 111 111\nLagoo,0721 222 222\n')).toEqual([
      ['Name', 'Phones'],
      ['5" Studio', '0721 111 111'],
      ['Lagoo', '0721 222 222'],
    ]);
  });

  it('follows a "sep=" line, tabs, CR line ends, and more than one byte-order mark', () => {
    expect(parseCsv('sep=;\nName;Phones\nX;1\n')).toEqual([
      ['Name', 'Phones'],
      ['X', '1'],
    ]);
    expect(parseCsv('Name\tPhones\nA\t1\n')).toEqual([
      ['Name', 'Phones'],
      ['A', '1'],
    ]);
    expect(parseCsv('Name,Notes\rA,b\r')).toEqual([
      ['Name', 'Notes'],
      ['A', 'b'],
    ]);
    expect(parseCsv(BOM + BOM + 'Name,Notes\nA,b\n')).toEqual([
      ['Name', 'Notes'],
      ['A', 'b'],
    ]);
    expect(parseCsv('Nume;Note, observații\nGrădina;bun\n')).toEqual([
      ['Nume', 'Note, observații'],
      ['Grădina', 'bun'],
    ]);
  });

  it('reads a file saved as Windows-1250 with its diacritics, and says how it read it', () => {
    // "Grădina;Sălcii" with ă as byte 0xE3 (Windows-1250), not valid UTF-8.
    const bytes = Uint8Array.from([0x47, 0x72, 0xe3, 0x64, 0x69, 0x6e, 0x61, 0x3b, 0x53, 0xe3, 0x6c, 0x63, 0x69, 0x69]);
    expect(decodeCsv(bytes)).toEqual({ text: 'Grădina;Sălcii', encoding: 'windows-1250' });
    expect(decodeCsv(new TextEncoder().encode('Grădina'))).toEqual({ text: 'Grădina', encoding: 'utf-8' });
  });

  it('points out lines with more values than columns (a comma not in quotes)', () => {
    const plan = planImport(newDirectory(OWNER), parseCsv('Name,Notes,Phones\nGrădina,3000 EUR, too much,0721\nLagoo,ok,0722\n'), WORDS);
    expect(plan.misaligned).toEqual([2]);
  });

  it('writes values a spreadsheet would run as formulas as text, and reads them back as they were', () => {
    const values = ['=HYPERLINK("http://x")', '+40 721 000 000', '-5', '@SUM(A1)', 'plain'];
    const text = toCsv([['Name', 'Notes'], ...values.map((v, i) => [`P${i}`, v])]);
    // What a spreadsheet sees in each cell: text that starts with an apostrophe, never a formula.
    expect(
      parseCsv(text)
        .slice(1, 5)
        .map((r) => r[1]![0]),
    ).toEqual(["'", "'", "'", "'"]);
    const { result } = importAll(newDirectory(OWNER), text);
    expect(live(result.doc.providers).map((p) => p.notes)).toEqual(values);
  });
});

describe('values that hold separators', () => {
  it('keeps a link with a semicolon of its own as one link, and splits links the export joined', () => {
    const { result } = importAll(newDirectory(OWNER), 'Name,Links\nP,"https://shop.example.ro/page;jsessionid=AB12; b.ro"\n');
    expect(live(result.doc.providers)[0]!.links).toEqual(['https://shop.example.ro/page;jsessionid=AB12', 'b.ro']);
  });

  it('takes the first of several main categories as the main one, the others as categories', () => {
    const plan = planImport(newDirectory(OWNER), parseCsv('Name,Main category\nP,Photo; Video\n'), WORDS);
    expect(plan.rows[0]!.newPrimary?.name).toBe('Photo');
    expect(plan.rows[0]!.newLabels.map((l) => l.name)).toEqual(['Photo', 'Video']);
  });

  it("matches a label by its own name before another label's other word", () => {
    const ctx = testContext();
    let doc = newDirectory(OWNER);
    doc = createLabel(doc, { facetId: FACET_IDS.category, name: 'Photo', aliases: ['Foto'] }, ctx).doc;
    const foto = createLabel(doc, { facetId: FACET_IDS.category, name: 'Foto' }, ctx);
    const plan = planImport(foto.doc, parseCsv('Name,Category\nStudio,Foto\n'), WORDS);
    expect(plan.rows[0]!.input.labelIds).toEqual([foto.id]);
  });
});

describe('a preview that went stale', () => {
  it('says so with an error the page can explain, when a provider to merge into was deleted meanwhile', () => {
    const { doc, providers, ctx } = weddingDirectory();
    const plan = planImport(doc, parseCsv('Name,Notes\nLAGOO,again\n'), WORDS);
    const gone = deleteProvider(doc, providers.lagoo, ctx);
    let error: unknown;
    try {
      applyImport(gone, plan, [{ kind: 'merge', into: providers.lagoo, keep: {} }], ctx);
    } catch (e) {
      error = e;
    }
    expect(error instanceof EditError && error.code).toBe('importStale');
  });
});

describe('CSV edge cases from re-verification', () => {
  it('gives back a value typed with an apostrophe and a formula character', () => {
    const value = "'=1+1 is how the price was written";
    const { result } = importAll(
      newDirectory(OWNER),
      toCsv([
        ['Name', 'Notes'],
        ['P', value],
      ]),
    );
    expect(live(result.doc.providers)[0]!.notes).toBe(value);
  });

  it('reads a file whose rows are not all as long as the header by its header', () => {
    expect(parseCsv('Name,Phone\nAna,0722\nBob\n')).toEqual([['Name', 'Phone'], ['Ana', '0722'], ['Bob']]);
  });

  it('reads UTF-8 with one stray byte as UTF-8, and UTF-16 by its byte-order mark', () => {
    const utf8 = new TextEncoder().encode('Grădina, Sălcii, Ștefan');
    const damaged = Uint8Array.from([...utf8, 0x96]); // a Windows dash pasted in
    expect(decodeCsv(damaged)).toMatchObject({ encoding: 'utf-8-damaged' });
    expect(decodeCsv(damaged).text.startsWith('Grădina, Sălcii, Ștefan')).toBe(true);
    const utf16 = Uint8Array.from([0xff, 0xfe, ...[...'Ană'].flatMap((c) => [c.charCodeAt(0) & 0xff, c.charCodeAt(0) >> 8])]);
    expect(decodeCsv(utf16)).toEqual({ text: 'Ană', encoding: 'utf-16' });
  });
});

describe('rows and cells that show nothing, and other files from re-verification', () => {
  it('leaves out a row whose name shows nothing, and asks for no label from a cell that shows nothing, without stopping the import', () => {
    const { plan, result } = importAll(newDirectory(OWNER), 'Name,Lists\n\u200b,Ghost\nReal,\u2060\n');
    expect(plan.rows[0]!.problem).toBe('nameRequired');
    expect(plan.newLabels).toEqual([]); // neither the left-out row's label nor the invisible one
    expect(names(result.doc)).toEqual(['Real']);
  });

  it("keeps a group's column whose name starts like a formula through export and import", () => {
    const ctx = testContext();
    let doc = createFacet(newDirectory(OWNER), '+Partners', WORDS, ctx).doc;
    const group = live(doc.facets).find((f) => f.name === '+Partners')!;
    const label = createLabel(doc, { facetId: group.id, name: 'Gold' }, ctx);
    doc = createProvider(label.doc, { ...emptyProvider(), name: 'P', labelIds: [label.id] }, ctx).doc;
    const text = toCsv(exportRows(doc, live(doc.providers), title));
    const plan = planImport(doc, parseCsv(text), WORDS);
    expect(plan.ignoredColumns).toEqual([]);
    expect(plan.rows[0]!.input.labelIds).toEqual([label.id]);
  });

  it('reads a list whose names hold several commas as one column, as its header says', () => {
    expect(parseCsv('Name\nPop, Ion, Jr\nFoto, Video, SRL\n')).toEqual([['Name'], ['Pop, Ion, Jr'], ['Foto, Video, SRL']]);
  });

  it('names the lines with a quote that is not closed or not at the start of a value', () => {
    const { quoteProblems } = readCsv('Name,Notes\n"La Mama" Restaurant,good\nLagoo,ok\nFlashbox,fine\n');
    expect(quoteProblems.length).toBeGreaterThan(0);
  });

  it('refuses a preview made for another version of the directory (a label added elsewhere meanwhile)', () => {
    const { doc, ctx } = weddingDirectory();
    const plan = planImport(doc, parseCsv('Name,Lists\nNew one,Call back\n'), WORDS);
    const changed = createLabel(doc, { facetId: FACET_IDS.lists, name: 'Call back' }, ctx).doc;
    let error: unknown;
    try {
      applyImport(changed, plan, plan.rows.map(defaultChoice), ctx);
    } catch (e) {
      error = e;
    }
    expect(error instanceof EditError && error.code).toBe('importStale');
  });
});
