import { useState, useEffect, useCallback } from 'react';
import { videosApi } from '@/api/videos';
import type { Video, ApiError } from '@/types';

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await videosApi.list();
      setVideos(data);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addVideo = useCallback(async (payload: { title: string; file_path: string; description?: string }) => {
    const created = await videosApi.create(payload);
    setVideos((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateVideo = useCallback(async (id: number, payload: Partial<Pick<Video, 'title' | 'description'>>) => {
    const updated = await videosApi.update(id, payload);
    setVideos((prev) => prev.map((v) => (v.id === id ? updated : v)));
    return updated;
  }, []);

  const removeVideo = useCallback(async (id: number) => {
    await videosApi.remove(id);
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }, []);

  return { videos, loading, error, reload: load, addVideo, updateVideo, removeVideo };
}

export function useVideo(id: number) {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    videosApi
      .get(id)
      .then(setVideo)
      .catch((err) => setError(err as ApiError))
      .finally(() => setLoading(false));
  }, [id]);

  return { video, loading, error };
}
