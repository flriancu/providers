/**
 * Text as search and label matching compare it (D-23, FR-07): lower case, without diacritics,
 * with runs of white space as one space: the name "Gradina cu Salcii" written with a-breve
 * (U+0103) folds to the same text as without it. Romanian s and t with comma below (U+0219,
 * U+021B) and with cedilla (U+015F, U+0163) both fold to plain s and t.
 */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
}
