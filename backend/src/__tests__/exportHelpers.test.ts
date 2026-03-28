/**
 * Unit tests for export helper functions in videoController.
 * These are pure functions with no I/O — no mocks needed.
 */

// Mock heavy dependencies so the module can be imported without a running DB/Redis
jest.mock('../db/pool', () => ({ query: jest.fn() }));
jest.mock('../db/redis', () => ({ get: jest.fn(), setex: jest.fn(), del: jest.fn() }));
jest.mock('../services/thumbnailService', () => ({ generateThumbnail: jest.fn() }));

import {
  fmtTime,
  safeFilename,
  buildMarkdown,
  buildText,
  type NoteRow,
} from '../controllers/videoController';

// ── fmtTime ──────────────────────────────────────────────────────────────────

describe('fmtTime', () => {
  test('formats under a minute', () => {
    expect(fmtTime(0)).toBe('00:00');
    expect(fmtTime(5)).toBe('00:05');
    expect(fmtTime(59)).toBe('00:59');
  });

  test('formats minutes and seconds', () => {
    expect(fmtTime(60)).toBe('01:00');
    expect(fmtTime(90)).toBe('01:30');
    expect(fmtTime(3599)).toBe('59:59');
  });

  test('formats hours when >= 3600 seconds', () => {
    expect(fmtTime(3600)).toBe('1:00:00');
    expect(fmtTime(3661)).toBe('1:01:01');
    expect(fmtTime(7384)).toBe('2:03:04');
  });

  test('floors fractional seconds', () => {
    expect(fmtTime(90.9)).toBe('01:30');
    expect(fmtTime(3600.5)).toBe('1:00:00');
  });
});

// ── safeFilename ──────────────────────────────────────────────────────────────

describe('safeFilename', () => {
  test('leaves alphanumerics, underscores, hyphens intact', () => {
    expect(safeFilename('my-video_01')).toBe('my-video_01');
  });

  test('replaces spaces and special chars with underscores', () => {
    expect(safeFilename('My Video: Part 1!')).toBe('My_Video__Part_1_');
  });

  test('truncates to 60 characters', () => {
    const long = 'a'.repeat(80);
    expect(safeFilename(long)).toHaveLength(60);
  });

  test('handles empty string', () => {
    expect(safeFilename('')).toBe('');
  });
});

// ── buildMarkdown ─────────────────────────────────────────────────────────────

const NOTE_A: NoteRow = { id: 1, content: 'First note', timestamp: 65, tags: [] };
const NOTE_B: NoteRow = {
  id: 2,
  content: 'Second note',
  timestamp: 3661,
  tags: [{ id: 1, name: 'important' }, { id: 2, name: 'review' }],
};

describe('buildMarkdown', () => {
  test('opens with H1 title', () => {
    const md = buildMarkdown('My Video', null, []);
    expect(md).toMatch(/^# My Video/);
  });

  test('includes blockquote description when provided', () => {
    const md = buildMarkdown('Title', 'A description', []);
    expect(md).toContain('> A description');
  });

  test('omits description block when null', () => {
    const md = buildMarkdown('Title', null, []);
    expect(md).not.toContain('>');
  });

  test('shows empty state when no notes', () => {
    const md = buildMarkdown('Title', null, []);
    expect(md).toContain('_No notes yet._');
  });

  test('formats note with timestamp heading', () => {
    const md = buildMarkdown('Title', null, [NOTE_A]);
    expect(md).toContain('### [01:05]');
    expect(md).toContain('First note');
  });

  test('formats note with hours in timestamp', () => {
    const md = buildMarkdown('Title', null, [NOTE_B]);
    expect(md).toContain('### [1:01:01]');
  });

  test('includes tags line when tags present', () => {
    const md = buildMarkdown('Title', null, [NOTE_B]);
    expect(md).toContain('**Tags:** important, review');
  });

  test('omits tags line when no tags', () => {
    const md = buildMarkdown('Title', null, [NOTE_A]);
    expect(md).not.toContain('**Tags:**');
  });

  test('separates notes with horizontal rules', () => {
    const md = buildMarkdown('Title', null, [NOTE_A, NOTE_B]);
    const hrCount = (md.match(/^---$/gm) ?? []).length;
    expect(hrCount).toBe(2);
  });
});

// ── buildText ─────────────────────────────────────────────────────────────────

describe('buildText', () => {
  test('opens with title and underline of equal length', () => {
    const title = 'My Video';
    const txt = buildText(title, null, []);
    const lines = txt.split('\n');
    expect(lines[0]).toBe(title);
    expect(lines[1]).toBe('='.repeat(title.length));
  });

  test('includes description when provided', () => {
    const txt = buildText('Title', 'Desc', []);
    expect(txt).toContain('Desc');
  });

  test('shows empty state when no notes', () => {
    const txt = buildText('Title', null, []);
    expect(txt).toContain('No notes yet.');
  });

  test('formats note with bracketed timestamp', () => {
    const txt = buildText('Title', null, [NOTE_A]);
    expect(txt).toContain('[01:05]');
    expect(txt).toContain('First note');
  });

  test('includes tags line when tags present', () => {
    const txt = buildText('Title', null, [NOTE_B]);
    expect(txt).toContain('Tags: important, review');
  });

  test('omits tags line when no tags', () => {
    const txt = buildText('Title', null, [NOTE_A]);
    expect(txt).not.toContain('Tags:');
  });

  test('does not contain markdown syntax', () => {
    const txt = buildText('Title', 'Desc', [NOTE_A, NOTE_B]);
    expect(txt).not.toMatch(/#{1,6} /);   // no headings
    expect(txt).not.toContain('**');       // no bold
    expect(txt).not.toMatch(/^---$/m);    // no horizontal rules
  });
});
