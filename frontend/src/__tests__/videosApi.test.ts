/**
 * Unit tests for the videos API layer.
 * The axios client is mocked — no real HTTP requests are made.
 */

import { vi } from 'vitest';

// vi.hoisted ensures these run before vi.mock (which is hoisted to the top by Vitest)
const { mockGet, mockPost, mockPut, mockDelete } = vi.hoisted(() => ({
  mockGet:    vi.fn(),
  mockPost:   vi.fn(),
  mockPut:    vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('../api/client', () => ({
  default: {
    get:    mockGet,
    post:   mockPost,
    put:    mockPut,
    delete: mockDelete,
  },
}));

import { videosApi } from '../api/videos';

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveWith(data: unknown) {
  return Promise.resolve({ data });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('videosApi.list', () => {
  test('calls GET /videos and returns data', async () => {
    const videos = [{ id: 1, title: 'Test' }];
    mockGet.mockReturnValue(resolveWith(videos));

    const result = await videosApi.list();

    expect(mockGet).toHaveBeenCalledWith('/videos');
    expect(result).toEqual(videos);
  });
});

describe('videosApi.get', () => {
  test('calls GET /videos/:id and returns data', async () => {
    const video = { id: 5, title: 'Test' };
    mockGet.mockReturnValue(resolveWith(video));

    const result = await videosApi.get(5);

    expect(mockGet).toHaveBeenCalledWith('/videos/5');
    expect(result).toEqual(video);
  });
});

describe('videosApi.create', () => {
  test('calls POST /videos with payload and returns data', async () => {
    const payload = { title: 'New', file_path: '/file.mp4' };
    const created = { id: 10, ...payload };
    mockPost.mockReturnValue(resolveWith(created));

    const result = await videosApi.create(payload);

    expect(mockPost).toHaveBeenCalledWith('/videos', payload);
    expect(result).toEqual(created);
  });
});

describe('videosApi.update', () => {
  test('calls PUT /videos/:id with partial payload', async () => {
    const updated = { id: 3, title: 'Updated', description: null };
    mockPut.mockReturnValue(resolveWith(updated));

    const result = await videosApi.update(3, { title: 'Updated' });

    expect(mockPut).toHaveBeenCalledWith('/videos/3', { title: 'Updated' });
    expect(result).toEqual(updated);
  });
});

describe('videosApi.remove', () => {
  test('calls DELETE /videos/:id', async () => {
    mockDelete.mockReturnValue(resolveWith(null));

    await videosApi.remove(7);

    expect(mockDelete).toHaveBeenCalledWith('/videos/7');
  });
});

describe('videosApi.exportNotes', () => {
  test('calls GET /videos/:id/export with format=md and responseType blob', async () => {
    const blob = new Blob(['# Notes'], { type: 'text/markdown' });
    mockGet.mockReturnValue(resolveWith(blob));

    const result = await videosApi.exportNotes(2, 'md');

    expect(mockGet).toHaveBeenCalledWith('/videos/2/export', {
      params: { format: 'md' },
      responseType: 'blob',
    });
    expect(result).toBe(blob);
  });

  test('passes format=txt to the API', async () => {
    mockGet.mockReturnValue(resolveWith(new Blob()));
    await videosApi.exportNotes(2, 'txt');
    expect(mockGet).toHaveBeenCalledWith('/videos/2/export', {
      params: { format: 'txt' },
      responseType: 'blob',
    });
  });

  test('passes format=pdf to the API', async () => {
    mockGet.mockReturnValue(resolveWith(new Blob()));
    await videosApi.exportNotes(2, 'pdf');
    expect(mockGet).toHaveBeenCalledWith('/videos/2/export', {
      params: { format: 'pdf' },
      responseType: 'blob',
    });
  });
});
