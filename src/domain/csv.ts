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
 * Rows of fields; blank lines are left out. No separator found means one column: a list of
 * names whose commas belong to the names.
 */
export function parseCsv(input: string): string[][] {
  let text = input;
  while (text.startsWith(BOM)) text = text.slice(1);
  // Excel's "sep=;" first line names the separator.
  const named = /^sep=(.)\r?\n/i.exec(text);
  if (named) text = text.slice(named[0].length);
  const read = (delimiter: string) => Papa.parse<string[]>(text, { delimiter, delimitersToGuess: SEPARATORS, skipEmptyLines: 'greedy' });
  let result = read(named && SEPARATORS.includes(named[1]!) ? named[1]! : '');
  if (result.errors.some((e) => e.code === 'UndetectableDelimiter')) result = read(Papa.RECORD_SEP);
  return result.data;
}

/** How a file's bytes were read as text. */
export type CsvEncoding = 'utf-8' | 'windows-1250';

/**
 * A file's text. UTF-8 when the bytes are valid UTF-8; otherwise the file came from a
 * spreadsheet saving in the system's code page, which for Romanian Windows is Windows-1250
 * (Central European), and it is read as that, so its diacritics are not lost.
 */
export function decodeCsv(bytes: Uint8Array): { text: string; encoding: CsvEncoding } {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('windows-1250').decode(bytes), encoding: 'windows-1250' };
  }
}

/**
 * A value as it was before writing escaped it: Papa Parse's `escapeFormulae` puts an apostrophe
 * before a value a spreadsheet would run as a formula (OWASP, "CSV Injection"); reading takes it
 * off again when one of those characters follows.
 */
export const unescapeCell = (value: string) => (/^'[=+\-@\t\r]/.test(value) ? value.slice(1) : value);

/**
 * A CSV file's text: comma-separated, CRLF line ends, a byte-order mark first so a spreadsheet
 * opens the diacritics correctly, and every value that starts like a formula (=, +, -, @) written
 * as text, so opening the file runs nothing. Phone numbers starting with + are among them; a
 * spreadsheet would otherwise show an error in their place.
 */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return BOM + Papa.unparse(rows as string[][], { escapeFormulae: true, newline: '\r\n' }) + '\r\n';
}
