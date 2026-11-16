import type { EditErrorCode } from '../domain/edits';
import type { EditContext } from '../domain/records';
import type { DirectoryDoc } from '../domain/schema';

/** Applies a change to the open directory; returns the rule it broke, or null when it was applied. */
export type Apply = (change: (doc: DirectoryDoc, ctx: EditContext) => DirectoryDoc) => EditErrorCode | null;
