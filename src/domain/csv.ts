/** The byte-order mark spreadsheets use to recognise UTF-8 (U+FEFF). */
const BOM = String.fromCharCode(0xfeff);

/**
 * CSV as spreadsheets write it (RFC 4180): fields in double quotes when they hold the separator,
 * a quote or a line break; quotes doubled inside. Reading accepts a comma or a semicolon as the
 * separator (spreadsheets in Romanian settings save with semicolons), CRLF or LF, and a leading
 * byte-order mark. Pure.
 */

/** The separator a file uses: the one that appears more often in its first line, outside quotes. */
function separatorOf(text: string): ',' | ';' {
  let commas = 0;
  let semicolons = 0;
  let quoted = false;
  for (const c of text) {
    if (c === '"') quoted = !quoted;
    else if (!quoted && (c === '\n' || c === '\r')) break;
    else if (!quoted && c === ',') commas++;
    else if (!quoted && c === ';') semicolons++;
  }
  return semicolons > commas ? ';' : ',';
}

/** Rows of fields; blank lines are left out. */
export function parseCsv(input: string): string[][] {
  const text = input.startsWith(BOM) ? input.slice(1) : input;
  const sep = separatorOf(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const endRow = () => {
    row.push(field);
    if (row.some((f) => f.trim() !== '')) rows.push(row);
    row = [];
    field = '';
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(field);
      field = '';
    } else if (c === '\r' && text[i + 1] === '\n') {
      endRow();
      i++;
    } else if (c === '\n' || c === '\r') endRow();
    else field += c;
  }
  if (field !== '' || row.length) endRow();
  return rows;
}

const quote = (field: string) => (/[",;\r\n]/.test(field) || /^\s|\s$/.test(field) ? `"${field.replaceAll('"', '""')}"` : field);

/**
 * A CSV file's text: comma-separated, CRLF line ends, and a byte-order mark first, so a
 * spreadsheet opens the diacritics correctly.
 */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return BOM + rows.map((r) => r.map(quote).join(',')).join('\r\n') + '\r\n';
}
