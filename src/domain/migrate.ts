import { UnsupportedDocumentError } from 'drive-doc-sync/errors';
import { isDay } from './days';
import {
  COLLECTION_KEYS,
  put,
  BUILT_IN_FACETS,
  LABEL_COLORS,
  SCHEMA_VERSION,
  type Collections,
  type DirectoryDoc,
  type Settings,
} from './schema';

/** Why a file can't be read as a directory; `json` and `tooBig` come from drive-doc-sync. */
export type UnsupportedReason = 'json' | 'notDirectory' | 'version' | 'tooBig';

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);
/**
 * No clock reads the year 9000: a stamp from then on is damage (a tampered file, a broken clock).
 * Below it, a record can take a millisecond more on every edit for longer than anyone edits.
 */
const LAST_STAMP = Date.parse('9000-01-01T00:00:00.000Z');

/**
 * A stamp in the one form stamps compare in as text (`toISOString`, milliseconds and `Z`), or
 * null when it is not a time this app could have written.
 */
function readStamp(v: unknown): string | null {
  if (!isString(v) || !/^\d{4}-\d{2}-\d{2}T/.test(v)) return null;
  const ms = Date.parse(v);
  return Number.isNaN(ms) || ms >= LAST_STAMP ? null : new Date(ms).toISOString();
}

const isStamp = (v: unknown): v is string => readStamp(v) !== null;
const isDate = (v: unknown): v is string => isString(v) && isDay(v);
const oneOf = (values: readonly string[]) => (v: unknown) => isString(v) && values.includes(v);
const optional = (v: unknown, check: (x: unknown) => boolean) => v === undefined || check(v);

function isMeta(r: Raw, id: string): boolean {
  return (
    r.id === id &&
    isStamp(r.createdAt) &&
    isStamp(r.updatedAt) &&
    isString(r.updatedBy) &&
    optional(r.deleted, (d) => d === true) &&
    optional(r.stamps, (s) => isObject(s) && Object.values(s).every(isStamp))
  );
}

/** The record with its stamps in canonical form (readStamp), so they compare as text. */
function withCanonicalStamps(r: Raw): Raw {
  const out: Raw = { ...r, createdAt: readStamp(r.createdAt), updatedAt: readStamp(r.updatedAt) };
  if (isObject(r.stamps)) {
    const stamps: Raw = {};
    for (const [k, v] of Object.entries(r.stamps)) put<unknown>(stamps, k, readStamp(v));
    out.stamps = stamps;
  }
  return out;
}

/** What each collection's records must look like; anything else is set aside, not dropped. */
const VALID: Record<keyof Collections, (r: Raw) => boolean> = {
  facets: (r) => optional(r.key, oneOf(BUILT_IN_FACETS)) && isString(r.name) && typeof r.order === 'number',
  labels: (r) => isString(r.facetId) && isString(r.name) && oneOf(LABEL_COLORS)(r.color) && isStringList(r.aliases),
  providers: (r) =>
    isString(r.name) &&
    isString(r.contactPerson) &&
    isStringList(r.phones) &&
    isStringList(r.emails) &&
    isStringList(r.links) &&
    isString(r.address) &&
    isString(r.notes) &&
    isStringList(r.labelIds) &&
    optional(r.primaryCategoryId, isString),
  log: (r) => isString(r.providerId) && isDate(r.date) && isString(r.text),
  shares: (r) =>
    optional(r.labelId, isString) &&
    (r.kind === 'person' || r.kind === 'link') &&
    optional(r.email, isString) &&
    (r.role === 'reader' || r.role === 'writer'),
};

/**
 * Fields earlier versions wrote that mean nothing now: a facet's `kind` (tree or flat) and a
 * label's `parentId`. Labels have one level (D-35): a label that had a parent keeps its name and
 * becomes a top-level label, and the next save writes it without the old field.
 */
const RETIRED: Partial<Record<keyof Collections, readonly string[]>> = { facets: ['kind'], labels: ['parentId'] };

function withoutRetired(key: keyof Collections, r: Raw): Raw {
  const retired = RETIRED[key];
  if (!retired?.some((field) => Object.hasOwn(r, field))) return r;
  const out = { ...r };
  for (const field of retired) delete out[field];
  return out;
}

/**
 * A directory from a file's parsed content. The file may come from another version of the app
 * or from someone else, so nothing in it is trusted: a record that doesn't fit is kept aside in
 * `skipped` and written back unchanged by `toFile`, never lost. A file that isn't a directory at
 * all, or is of a newer schema, is refused.
 */
export function readDirectory(raw: unknown): DirectoryDoc {
  if (!isObject(raw) || typeof raw.schemaVersion !== 'number')
    throw new UnsupportedDocumentError('Not a providers directory', 'notDirectory');
  if (raw.schemaVersion !== SCHEMA_VERSION)
    throw new UnsupportedDocumentError(`Directory schema ${raw.schemaVersion} is not supported`, 'version');
  if (!isObject(raw.owner) || !isString(raw.owner.googleSub) || raw.owner.googleSub === '')
    throw new UnsupportedDocumentError('A directory without an owner', 'notDirectory');

  const out = {
    schemaVersion: SCHEMA_VERSION,
    owner: { googleSub: raw.owner.googleSub },
    settings: readSettings(raw.settings),
  } as DirectoryDoc;
  const skipped: NonNullable<DirectoryDoc['skipped']> = {};
  for (const key of COLLECTION_KEYS) {
    const records: Raw = {};
    const set: Raw = { ...(isObject(raw.skipped) && isObject(raw.skipped[key]) ? raw.skipped[key] : {}) };
    const source = isObject(raw[key]) ? raw[key] : {};
    for (const [id, r] of Object.entries(source)) {
      if (isObject(r) && isMeta(r, id) && VALID[key](r)) put<unknown>(records, id, withCanonicalStamps(withoutRetired(key, r)));
      else put<unknown>(set, id, r);
    }
    (out as unknown as Raw)[key] = records;
    if (Object.keys(set).length) skipped[key] = set;
  }
  if (Object.keys(skipped).length) out.skipped = skipped;
  return out;
}

function readSettings(v: unknown): Settings {
  const s = isObject(v) ? v : {};
  return {
    updatedAt: readStamp(s.updatedAt) ?? '1970-01-01T00:00:00.000Z',
    ...(isStringList(s.replaces) && { replaces: s.replaces }),
  };
}

/** The directory as it is stored: records set aside go back where they came from. */
export function toFile(doc: DirectoryDoc): Omit<DirectoryDoc, 'skipped'> {
  const { skipped, ...rest } = doc;
  if (!skipped) return rest;
  const out = { ...rest } as Raw;
  for (const [key, records] of Object.entries(skipped)) {
    const merged: Raw = { ...(out[key] as Raw) };
    for (const [id, r] of Object.entries(records ?? {})) if (!Object.hasOwn(merged, id)) put(merged, id, r);
    out[key] = merged;
  }
  return out as Omit<DirectoryDoc, 'skipped'>;
}

/** How many records were set aside, to say so once the directory is open. */
export function skippedCount(doc: DirectoryDoc): number {
  return Object.values(doc.skipped ?? {}).reduce((n, records) => n + Object.keys(records ?? {}).length, 0);
}
