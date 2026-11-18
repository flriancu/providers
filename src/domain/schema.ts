/**
 * The directory document (D-21): one JSON file per owner in the owner's Google Drive. Every
 * collection maps an id to a record; every record carries Meta, so two versions merge record
 * by record (merge.ts). Deleted records stay as markers, so a delete wins over an older edit.
 */

export const SCHEMA_VERSION = 1;

/** ISO-8601 UTC timestamp. */
export type Stamp = string;
/** A calendar day, YYYY-MM-DD. */
export type ISODate = string;

export interface Meta {
  id: string;
  createdAt: Stamp;
  updatedAt: Stamp;
  /** Google account id (`sub`) of who made the last change (FR-03). */
  updatedBy: string;
  deleted?: true;
  /**
   * When each field changed, for the fields changed since `createdAt` (stamps.ts). Absent on a
   * record written whole, whose fields all date from `updatedAt`.
   */
  stamps?: Record<string, Stamp>;
}

/**
 * The starting facets (D-15); their name is the interface's word until the owner renames them
 * (D-30). Every facet is a flat list of labels (FR-04, D-35).
 */
export const BUILT_IN_FACETS = ['category', 'area', 'source', 'lists'] as const;
export type BuiltInFacet = (typeof BUILT_IN_FACETS)[number];

export interface Facet extends Meta {
  /** Set on the starting facets only. */
  key?: BuiltInFacet;
  /** The owner's name for it; empty on a starting facet not renamed yet (D-30). */
  name: string;
  /** Order in the filter panel, lowest first. */
  order: number;
}

/**
 * D-31: label colours, by name. The interface maps each to a background and text colour pair
 * per light and dark mode, checked for contrast; the name is always shown with the colour.
 */
export const LABEL_COLORS = ['grey', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'brown'] as const;
export type LabelColor = (typeof LABEL_COLORS)[number];

export interface Label extends Meta {
  facetId: string;
  /** The owner's name for it, as typed (D-30). One level: no parent label (D-35). */
  name: string;
  color: LabelColor;
  /** Other words that find this label, e.g. "Foto" for Photographer (FR-06). */
  aliases: string[];
}

export interface Provider extends Meta {
  name: string;
  contactPerson: string;
  phones: string[];
  emails: string[];
  /** Website and social profiles, as full URLs. */
  links: string[];
  address: string;
  /** Owner and editors only (D-16, D-20). */
  notes: string;
  labelIds: string[];
  /** One of `labelIds`, in the Category facet (FR-05); absent when it has no category (FR-09). */
  primaryCategoryId?: string;
}

/** FR-02: one dated entry of the interaction log. */
export interface LogEntry extends Meta {
  providerId: string;
  date: ISODate;
  text: string;
}

/**
 * Who a label or the directory is shared with (D-22). `labelId` absent: the whole directory,
 * for editing. `kind` 'link': anyone with the label's link.
 */
export interface Share extends Meta {
  labelId?: string;
  kind: 'person' | 'link';
  email?: string;
  role: 'reader' | 'writer';
}

export interface Collections {
  facets: Record<string, Facet>;
  labels: Record<string, Label>;
  providers: Record<string, Provider>;
  log: Record<string, LogEntry>;
  shares: Record<string, Share>;
}

export const COLLECTION_KEYS = ['facets', 'labels', 'providers', 'log', 'shares'] as const satisfies readonly (keyof Collections)[];

export interface Settings {
  updatedAt: Stamp;
  /** Files this directory replaced ("start a new one"): copies of those stay out (drive-doc-sync). */
  replaces?: string[];
}

export interface DirectoryDoc extends Collections {
  schemaVersion: typeof SCHEMA_VERSION;
  owner: { googleSub: string };
  settings: Settings;
  /** Records this version could not read: kept aside, written back unchanged (migrate.ts). */
  skipped?: Partial<Record<keyof Collections, Record<string, unknown>>>;
}

/**
 * The starting facets (D-15). Fixed ids, so two directories
 * created on two devices before their first sync merge into one set, not two.
 */
export const FACET_IDS = { category: 'facet-category', area: 'facet-area', source: 'facet-source', lists: 'facet-lists' } as const;

const EPOCH: Stamp = '1970-01-01T00:00:00.000Z';

export function newDirectory(googleSub: string): DirectoryDoc {
  const meta = (id: string): Meta => ({ id, createdAt: EPOCH, updatedAt: EPOCH, updatedBy: googleSub });
  const facets: Facet[] = BUILT_IN_FACETS.map((key, i) => ({
    ...meta(FACET_IDS[key]),
    key,
    name: '',
    order: i + 1,
  }));
  return {
    schemaVersion: SCHEMA_VERSION,
    owner: { googleSub },
    facets: Object.fromEntries(facets.map((f) => [f.id, f])),
    labels: {},
    providers: {},
    log: {},
    shares: {},
    settings: { updatedAt: EPOCH },
  };
}

/** The records that are not deleted. */
export function live<T extends Meta>(collection: Record<string, T>): T[] {
  return Object.values(collection).filter((r) => !r.deleted);
}

/** `record[id]` when it is the record's own property, so ids like `constructor` find nothing inherited. */
export function own<T>(record: Record<string, T>, id: string): T | undefined {
  return Object.hasOwn(record, id) ? record[id] : undefined;
}

/** Sets `record[id]` as an own property, even for ids like `__proto__`. */
export function put<T>(record: Record<string, T>, id: string, value: T) {
  Object.defineProperty(record, id, { value, enumerable: true, writable: true, configurable: true });
}
