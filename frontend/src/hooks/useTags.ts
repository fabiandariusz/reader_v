import { useState, useEffect, useCallback } from 'react';
import { tagsApi } from '@/api/tags';
import type { Tag, ApiError } from '@/types';

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tagsApi.list();
      setTags(data);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createTag = useCallback(async (name: string) => {
    const tag = await tagsApi.create(name);
    setTags((prev) => [...prev, tag]);
    return tag;
  }, []);

  const removeTag = useCallback(async (id: number) => {
    await tagsApi.remove(id);
    setTags((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { tags, loading, error, createTag, removeTag };
}
