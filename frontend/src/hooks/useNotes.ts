import { useState, useEffect, useCallback } from 'react';
import { notesApi } from '@/api/notes';
import type { Note, ApiError } from '@/types';

export function useNotes(videoId: number) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notesApi.listByVideo(videoId);
      // sorted by timestamp ascending
      setNotes(data.sort((a, b) => a.timestamp - b.timestamp));
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => { load(); }, [load]);

  const addNote = useCallback(async (content: string, timestamp: number) => {
    const created = await notesApi.create({ video_id: videoId, content, timestamp });
    setNotes((prev) => [...prev, created].sort((a, b) => a.timestamp - b.timestamp));
    return created;
  }, [videoId]);

  const updateNote = useCallback(async (id: number, content: string) => {
    const updated = await notesApi.update(id, { content });
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    return updated;
  }, []);

  const removeNote = useCallback(async (id: number) => {
    await notesApi.remove(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addTagToNote = useCallback(async (noteId: number, tagId: number) => {
    await notesApi.addTag(noteId, tagId);
    await load();
  }, [load]);

  const removeTagFromNote = useCallback(async (noteId: number, tagId: number) => {
    await notesApi.removeTag(noteId, tagId);
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, tags: n.tags.filter((t) => t.id !== tagId) } : n
      )
    );
  }, []);

  return { notes, loading, error, addNote, updateNote, removeNote, addTagToNote, removeTagFromNote };
}
