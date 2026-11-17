import {
  AuthExpiredError,
  DocumentMissingError,
  DocumentRemovedError,
  DriveError,
  FileGoneError,
  OtherOwnerError,
  SaveConflictError,
  UnsupportedDocumentError,
} from 'drive-doc-sync';
import type { MessageKey } from '../i18n';
import type { SignInFailure } from './useAccount';

/** What went wrong with Google Drive, in the user's words; the technical text goes under "Technical details". */
export function driveMessage(e: unknown): MessageKey {
  if (e instanceof AuthExpiredError) return 'drive.auth';
  if (e instanceof DocumentRemovedError) return 'drive.removed';
  if (e instanceof DocumentMissingError) return 'drive.missingCopy';
  if (e instanceof FileGoneError) return e.reason === 'trashed' ? 'drive.removed' : 'drive.missing';
  if (e instanceof OtherOwnerError) return 'drive.owner';
  if (e instanceof UnsupportedDocumentError) return 'drive.unsupported';
  if (e instanceof SaveConflictError) return 'drive.conflict';
  if (e instanceof DriveError) {
    if (e.status === 0) return 'drive.network';
    if (e.rateLimited) return 'drive.google';
    if (e.status === 403) return 'drive.forbidden';
    if (e.status === 413) return 'drive.tooBig';
    if (e.status === 404) return 'drive.missing';
    return 'drive.google';
  }
  return 'drive.generic';
}

/** Why signing in did not work, in the user's words. */
export function signInMessage(reason: SignInFailure): MessageKey {
  const keys: Partial<Record<SignInFailure, MessageKey>> = {
    popup: 'auth.errPopup',
    drive_denied: 'auth.errDrive',
    not_ready: 'auth.errNotReady',
    blocked: 'auth.errBlocked',
    other_account: 'auth.errOtherAccount',
  };
  return keys[reason] ?? 'auth.errGeneric';
}

export const errorDetail = (e: unknown): string => (e instanceof Error ? e.message : String(e));
