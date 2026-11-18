import { describe, expect, it } from 'vitest';
import { UnsupportedDocumentError } from 'drive-doc-sync/errors';
import { driveMessage } from '../../src/ui/driveErrors';

describe('why the directory file cannot be read', () => {
  it('calls a damaged file damaged, and only a newer one newer', () => {
    expect(driveMessage(new UnsupportedDocumentError('bad JSON', 'json'))).toBe('drive.damaged');
    expect(driveMessage(new UnsupportedDocumentError('not a directory', 'notDirectory'))).toBe('drive.damaged');
    expect(driveMessage(new UnsupportedDocumentError('schema 2', 'version'))).toBe('drive.unsupported');
  });
});
