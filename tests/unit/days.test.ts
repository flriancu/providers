import { describe, expect, it } from 'vitest';
import { dayOf, isDay } from '../../src/domain/days';

describe('calendar days', () => {
  it("is this device's day, not the UTC one", () => {
    // Half past midnight on this device: in a zone east of UTC, the UTC day is still yesterday.
    expect(dayOf(new Date(2026, 10, 18, 0, 30))).toBe('2026-11-18');
    expect(dayOf(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01');
  });

  it('accepts only days on the calendar, the same in every browser', () => {
    expect(isDay('2026-11-18')).toBe(true);
    expect(isDay('2024-02-29')).toBe(true);
    const notDays = ['2026-02-31', '2026-02-29', '2026-13-01', '2026-00-10', '2026-1-5', '18.11.2026', '2026-11-18T00:00'];
    expect(notDays.filter(isDay)).toEqual([]);
  });
});
