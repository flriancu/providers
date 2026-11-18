import { STORAGE_PREFIX } from '../config';
import type { ProviderInput } from '../domain/edits';

/**
 * Unsaved provider forms, kept for this tab (sessionStorage) so that leaving the form, a click
 * elsewhere or a reload never loses what was typed. One per account and provider ("new" for a
 * provider not saved yet). Closing the tab ends them; signing out clears the account's.
 */
const prefix = (owner: string) => `${STORAGE_PREFIX}.draft.${owner}.`;
const keyOf = (owner: string, id: string | undefined) => `${prefix(owner)}${id ?? 'new'}`;

/** What was typed, and what the form started from: saving writes only the difference (saveProvider). */
export interface Draft {
  base: ProviderInput;
  input: ProviderInput;
}

const isText = (v: unknown) => typeof v === 'string';
const isTextList = (v: unknown) => Array.isArray(v) && v.every(isText);

/** Storage is shared with other tabs, extensions and older versions: a draft is checked, not trusted. */
function isInput(v: unknown): v is ProviderInput {
  if (typeof v !== 'object' || v === null) return false;
  const i = v as Record<string, unknown>;
  return (
    ['name', 'contactPerson', 'address', 'notes'].every((k) => isText(i[k])) &&
    ['phones', 'emails', 'links', 'labelIds'].every((k) => isTextList(i[k])) &&
    (i.primaryCategoryId === undefined || isText(i.primaryCategoryId))
  );
}

export function readDraft(owner: string, id: string | undefined): Draft | null {
  try {
    const raw = sessionStorage.getItem(keyOf(owner, id));
    const draft: unknown = raw ? JSON.parse(raw) : null;
    const { base, input } = (draft ?? {}) as Partial<Record<keyof Draft, unknown>>;
    return isInput(base) && isInput(input) ? { base, input } : null;
  } catch {
    return null; // unreadable or storage blocked: no draft
  }
}

export const hasDraft = (owner: string, id: string | undefined) => readDraft(owner, id) !== null;

export function writeDraft(owner: string, id: string | undefined, draft: Draft) {
  try {
    sessionStorage.setItem(keyOf(owner, id), JSON.stringify(draft));
  } catch {
    // storage full or blocked: the form still holds the edits while it is open
  }
}

export function clearDraft(owner: string, id: string | undefined) {
  try {
    sessionStorage.removeItem(keyOf(owner, id));
  } catch {
    // nothing to clear
  }
}

/** Every draft of an account (at sign-out). */
export function clearDrafts(owner: string) {
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith(prefix(owner))) sessionStorage.removeItem(key);
  } catch {
    // nothing to clear
  }
}

/** The form's content as it would be saved: empty list fields do not count as a change. */
const comparable = (i: ProviderInput) =>
  JSON.stringify({
    ...i,
    phones: i.phones.filter((v) => v.trim()),
    emails: i.emails.filter((v) => v.trim()),
    links: i.links.filter((v) => v.trim()),
    primaryCategoryId: i.primaryCategoryId ?? null,
  });

export const sameInput = (a: ProviderInput, b: ProviderInput) => comparable(a) === comparable(b);
