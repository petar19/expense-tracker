import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { todayIso } from '../src/lib/utils/date';

// .toISOString().slice(0, 10) converts to UTC first, which on a positive
// UTC-offset timezone (e.g. CEST) shifts local midnight back across the UTC
// day boundary and reports the previous calendar day — pinning TZ here
// reproduces that regardless of the machine actually running the tests.
describe('todayIso (Europe/Zagreb, UTC+2 in September)', () => {
  const originalTz = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = 'Europe/Zagreb';
  });

  afterEach(() => {
    process.env.TZ = originalTz;
    vi.useRealTimers();
  });

  it('reports the local calendar day even just after local midnight', () => {
    vi.useFakeTimers();
    // 2026-09-01T00:30 local (CEST, UTC+2).
    vi.setSystemTime(new Date('2026-08-31T22:30:00Z'));
    expect(todayIso()).toBe('2026-09-01');
  });

  it('reports the local calendar day during the rest of the day too', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-19T13:00:00Z')); // 15:00 local
    expect(todayIso()).toBe('2026-09-19');
  });
});
