/**
 * Unit tests for frontend time utilities.
 */

import { formatTime, formatDate } from '../utils/time';

// ── formatTime ────────────────────────────────────────────────────────────────

describe('formatTime', () => {
  test('formats zero seconds', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  test('formats seconds only (under a minute)', () => {
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(59)).toBe('0:59');
  });

  test('formats minutes and seconds', () => {
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(3599)).toBe('59:59');
  });

  test('formats hours when >= 3600 seconds', () => {
    expect(formatTime(3600)).toBe('1:00:00');
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(7384)).toBe('2:03:04');
  });

  test('floors fractional seconds', () => {
    expect(formatTime(90.9)).toBe('1:30');
    expect(formatTime(3600.5)).toBe('1:00:00');
  });
});

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  test('formats a known ISO date string', () => {
    // 2026-03-27T00:00:00Z should render as "Mar 27, 2026"
    const result = formatDate('2026-03-27T00:00:00Z');
    expect(result).toContain('2026');
    expect(result).toMatch(/Mar|March/);
    expect(result).toContain('27');
  });

  test('produces a non-empty string for any valid date', () => {
    expect(formatDate('2024-01-01T12:00:00Z').length).toBeGreaterThan(0);
    expect(formatDate('2000-12-31T23:59:59Z').length).toBeGreaterThan(0);
  });

  test('includes the year', () => {
    expect(formatDate('2026-06-15T00:00:00Z')).toContain('2026');
  });
});
