/**
 * Text as search and label matching compare it (D-23, FR-07): lower case, without diacritics,
 * with runs of white space as one space: the name "Gradina cu Salcii" written with a-breve
 * (U+0103) folds to the same text as without it. Romanian s and t with comma below (U+0219,
 * U+021B) and with cedilla (U+015F, U+0163) both fold to plain s and t.
 */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
}

/** Whether text shows nothing: only white space and invisible marks (zero-width space, joiners). */
export const isBlank = (text: string) => !/[^\s\p{Cf}]/u.test(text);

/** The order of names in every list: as folded, so case and diacritics never split them up. */
export const byFolded = (a: string, b: string) => fold(a).localeCompare(fold(b));

/** `items` in byFolded order of their names, each name folded once (thousands sort at once). */
export function sortedByFolded<T>(items: readonly T[], nameOf: (item: T) => string): T[] {
  return items
    .map((item) => ({ item, key: fold(nameOf(item)) }))
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(({ item }) => item);
}
