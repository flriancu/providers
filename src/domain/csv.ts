import Papa from 'papaparse';

/**
 * CSV files, read and written with Papa Parse (RFC 4180 as spreadsheets write it: quoted fields,
 * doubled quotes, any line ending, the separator guessed). Added here: a `sep=` first line names
 * the separator; a file whose header has no separator is one column; byte-order marks go; a
 * file not in UTF-8 is read as Windows-1250. Pure.
 */

/** The byte-order mark spreadsheets use to recognise UTF-8 (U+FEFF). */
const BOM = String.fromCharCode(0xfeff);

/** Comma; semicolon, as spreadsheets in Romanian settings save; tab, as copied from one. */
const SEPARATORS = [',', ';', '\t'];

/**
 * The separator the header line uses most, outside quotes; null when it has none. For a file
 * whose rows do not all have the same number of fields, which Papa Parse cannot guess from.
 */
function headerSeparator(text: string): string | null {
  const header = text.split(/\r?\n|\r/, 1)[0]!.replace(/"[^"]*"/g, '');
  const counts = SEPARATORS.map((sep) => header.split(sep).length - 1);
  const most = Math.max(...counts);
  return most > 0 ? SEPARATORS[counts.indexOf(most)]! : null;
}

/**
 * Rows of fields, and the rows (0 is the header) with a quote that is not closed or not where
 * a value starts ("La Mama" Restaurant), which can make the rest of the line, or of the file,
 * one value. Blank lines are left out. A header with no separator means one column: a list of
 * names whose commas belong to the names.
 */
export function readCsv(input: string): { rows: string[][]; quoteProblems: number[] } {
  let text = input;
  while (text.startsWith(BOM)) text = text.slice(1);
  // Excel's "sep=;" first line names the separator.
  const named = /^sep=(.)\r?\n/i.exec(text);
  if (named) text = text.slice(named[0].length);
  const read = (delimiter: string) => Papa.parse<string[]>(text, { delimiter, delimitersToGuess: SEPARATORS, skipEmptyLines: 'greedy' });
  const fromHeader = headerSeparator(text);
  let result = read(named && SEPARATORS.includes(named[1]!) ? named[1]! : fromHeader === null ? Papa.RECORD_SEP : '');
  // Not guessed (a short row): the header says.
  if (result.errors.some((e) => e.code === 'UndetectableDelimiter')) result = read(fromHeader ?? Papa.RECORD_SEP);
  const quoteProblems = [...new Set(result.errors.filter((e) => e.type === 'Quotes' && e.row !== undefined).map((e) => e.row!))];
  return { rows: result.data, quoteProblems };
}

/** Rows of fields (readCsv, without its notes). */
export const parseCsv = (input: string): string[][] => readCsv(input).rows;

/** How a file's bytes were read as text; 'utf-8-damaged': UTF-8 with a few bytes that are not. */
export type CsvEncoding = 'utf-8' | 'utf-8-damaged' | 'utf-16' | 'windows-1250';

/**
 * A file's text. UTF-16 when it starts with UTF-16's byte-order mark (spreadsheets' "Unicode
 * text"); UTF-8 when the bytes are UTF-8, and also when only a few are not (a stray byte from a
 * copy and paste), which show as the replacement character; otherwise the file came from a
 * spreadsheet saving in the system's code page, which for Romanian Windows is Windows-1250
 * (Central European), and it is read as that, so its diacritics are not lost.
 */
export function decodeCsv(bytes: Uint8Array): { text: string; encoding: CsvEncoding } {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { text: new TextDecoder('utf-16le').decode(bytes), encoding: 'utf-16' };
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { text: new TextDecoder('utf-16be').decode(bytes), encoding: 'utf-16' };
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' };
  } catch {
    // Mostly UTF-8 (more characters read well than not): UTF-8 with damage, not another code page.
    const lossy = new TextDecoder('utf-8').decode(bytes);
    let bad = 0;
    let good = 0;
    for (const ch of lossy) {
      const code = ch.codePointAt(0)!;
      if (code === 0xfffd) bad++;
      else if (code > 0x7f) good++;
    }
    if (good > bad) return { text: lossy, encoding: 'utf-8-damaged' };
    return { text: new TextDecoder('windows-1250').decode(bytes), encoding: 'windows-1250' };
  }
}

/**
 * A value as it was before writing escaped it: Papa Parse's `escapeFormulae` puts an apostrophe
 * before a value a spreadsheet would run as a formula (OWASP, "CSV Injection"), and before one
 * that already started with an apostrophe and such a character (toCsv); reading takes one off.
 */
export const unescapeCell = (value: string) => (/^''?[=+\-@\t\r]/.test(value) ? value.slice(1) : value);

/**
 * A CSV file's text: comma-separated, CRLF line ends, a byte-order mark first so a spreadsheet
 * opens the diacritics correctly, and every value that starts like a formula (=, +, -, @) written
 * as text, so opening the file runs nothing. Phone numbers starting with + are among them; a
 * spreadsheet would otherwise show an error in their place. A value that already starts with an
 * apostrophe and one of those characters gets one more, so reading gives it back as it was.
 */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return BOM + Papa.unparse(rows as string[][], { escapeFormulae: /^'?[=+\-@\t\r]/, newline: '\r\n' }) + '\r\n';
}
