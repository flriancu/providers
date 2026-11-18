import { describe, expect, it } from 'vitest';
import { newId } from '../../src/ui/ids';

describe('record ids', () => {
  it('are version 4 UUIDs, made without crypto.randomUUID (missing on plain http)', () => {
    const randomUUID = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      const ids = Array.from({ length: 1000 }, newId);
      for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(new Set(ids).size).toBe(ids.length);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: randomUUID, configurable: true });
    }
  });
});
