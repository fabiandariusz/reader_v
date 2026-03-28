/**
 * Unit tests for thumbnailService.generateThumbnail.
 * All I/O is mocked — no real files, ffmpeg, DB, or Redis needed.
 */

import fs from 'fs';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockQuery = jest.fn();
jest.mock('../db/pool', () => ({ query: mockQuery }));

const mockRedisDel = jest.fn().mockResolvedValue(1);
jest.mock('../db/redis', () => ({ del: mockRedisDel }));

// fluent-ffmpeg mock: expose controls so each test can configure behaviour
const mockRun    = jest.fn();
const mockOutput = jest.fn();
const mockSize   = jest.fn();
const mockFrames = jest.fn();
const mockSeek   = jest.fn();
const mockOn     = jest.fn();

// ffprobe is a static method on the ffmpeg function
const mockFfprobe = jest.fn();

const ffmpegInstance = {
  seekInput: jest.fn().mockReturnThis(),
  frames:    jest.fn().mockReturnThis(),
  size:      jest.fn().mockReturnThis(),
  output:    jest.fn().mockReturnThis(),
  on:        mockOn,
  run:       mockRun,
};

const mockFfmpegConstructor = jest.fn(() => ffmpegInstance);
(mockFfmpegConstructor as unknown as { ffprobe: typeof mockFfprobe }).ffprobe = mockFfprobe;

jest.mock('fluent-ffmpeg', () => mockFfmpegConstructor);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Make ffprobe resolve with a given duration */
function ffprobeResolves(duration: number) {
  mockFfprobe.mockImplementation((_path: string, cb: (err: null, meta: object) => void) => {
    cb(null, { format: { duration } });
  });
}

/** Make ffprobe reject with an error */
function ffprobeRejects(message: string) {
  mockFfprobe.mockImplementation((_path: string, cb: (err: Error) => void) => {
    cb(new Error(message));
  });
}

/** Make ffmpeg .on('end', ...) fire immediately */
function ffmpegEnds() {
  mockOn.mockImplementation(function (this: unknown, event: string, handler: () => void) {
    if (event === 'end') handler();
    return ffmpegInstance;
  });
}

/** Make ffmpeg .on('error', ...) fire immediately */
function ffmpegErrors(message: string) {
  mockOn.mockImplementation(function (this: unknown, event: string, handler: (e: Error) => void) {
    if (event === 'error') handler(new Error(message));
    return ffmpegInstance;
  });
}

// ── Import after mocks ────────────────────────────────────────────────────────

import { generateThumbnail } from '../services/thumbnailService';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('generateThumbnail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: file exists on disk
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does nothing when the file does not exist', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    await generateThumbnail(1, '/nonexistent.mp4');
    expect(mockFfprobe).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('seeks to 10% of duration and updates DB on success', async () => {
    ffprobeResolves(100); // 100s video → seek at 10s
    ffmpegEnds();

    await generateThumbnail(42, '/video.mp4');

    expect(ffmpegInstance.seekInput).toHaveBeenCalledWith(10);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE videos'),
      ['/thumbnails/42.jpg', 100, 42],
    );
  });

  test('seeks to 1 second when duration is 0', async () => {
    ffprobeResolves(0);
    ffmpegEnds();

    await generateThumbnail(1, '/video.mp4');

    expect(ffmpegInstance.seekInput).toHaveBeenCalledWith(1);
  });

  test('stores rounded duration in DB', async () => {
    ffprobeResolves(97.8);
    ffmpegEnds();

    await generateThumbnail(5, '/video.mp4');

    const callArgs = mockQuery.mock.calls[0][1];
    expect(callArgs[1]).toBe(98); // Math.round(97.8)
  });

  test('invalidates Redis cache after DB update', async () => {
    ffprobeResolves(60);
    ffmpegEnds();

    await generateThumbnail(3, '/video.mp4');

    expect(mockRedisDel).toHaveBeenCalledWith('videos:all');
  });

  test('swallows errors silently — no throw on ffprobe failure', async () => {
    ffprobeRejects('no such file');
    await expect(generateThumbnail(1, '/bad.mp4')).resolves.toBeUndefined();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('swallows errors silently — no throw on ffmpeg frame extraction failure', async () => {
    ffprobeResolves(60);
    ffmpegErrors('encoding failed');
    await expect(generateThumbnail(1, '/bad.mp4')).resolves.toBeUndefined();
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
