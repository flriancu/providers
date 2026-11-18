import { fold } from './fold';
import { BUILT_IN_FACETS, live, type BuiltInFacet, type DirectoryDoc, type Facet } from './schema';

/**
 * What a CSV column's title means: one of the fixed fields, or a label group. Import reads
 * columns with it, and naming a label group checks against it, so a group never gets a name its
 * column would be read as something else by (FR-21, D-09). Pure.
 */

/** The fixed columns, as exported; reading also accepts the other words listed. */
export const FIELDS = {
  name: ['Name', 'nume'],
  contactPerson: ['Contact person', 'persoana de contact', 'contact'],
  phones: ['Phones', 'phone', 'telefon', 'telefoane', 'numere de telefon'],
  emails: ['Emails', 'email', 'e-mail', 'adrese de e-mail', 'adrese de email'],
  links: ['Links', 'link', 'linkuri', 'website', 'site', 'site si profiluri sociale'],
  address: ['Address', 'adresa'],
  notes: ['Notes', 'note', 'notite'],
  primary: ['Main category', 'categoria principala'],
} as const;
export type Field = keyof typeof FIELDS;

/** The interface's words for the starting label groups, in every language. */
export type FacetWords = Record<BuiltInFacet, readonly string[]>;

/** FacetWords from the dictionaries of every language. */
export const facetWordsFrom = (dicts: readonly Record<string, string>[]): FacetWords =>
  Object.fromEntries(BUILT_IN_FACETS.map((k) => [k, dicts.map((d) => d[`facet.${k}`] ?? '').filter(Boolean)])) as unknown as FacetWords;

/** The fixed field a column title names. */
export function fieldOf(title: string): Field | undefined {
  const t = fold(title);
  return (Object.keys(FIELDS) as Field[]).find((k) => FIELDS[k].some((w) => fold(w) === t));
}

/**
 * Whether a column titled `title` is group `facet`'s: its own name, or, for a starting group,
 * the interface's word in any language, renamed or not.
 */
export function namesFacet(facet: Facet, title: string, words: FacetWords): boolean {
  const t = fold(title);
  return (!!facet.name && fold(facet.name) === t) || (!!facet.key && words[facet.key].some((w) => fold(w) === t));
}

/** Whether a starting group's interface word (any language) is `name`: the group keeps showing that word. */
export const isOwnWord = (facet: Facet, name: string, words: FacetWords) =>
  !!facet.key && words[facet.key].some((w) => fold(w) === fold(name));

/**
 * Why group `selfId` (or a new group) may not be called `name`: its column would be read as a
 * fixed field ('field'), or as another group ('group').
 */
export function columnClash(doc: DirectoryDoc, name: string, words: FacetWords, selfId?: string): 'field' | 'group' | null {
  if (fieldOf(name)) return 'field';
  return live(doc.facets).some((f) => f.id !== selfId && namesFacet(f, name, words)) ? 'group' : null;
}
