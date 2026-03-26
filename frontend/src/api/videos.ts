import client from './client';
import type { Video } from '@/types';

export const videosApi = {
  list: () =>
    client.get<Video[]>('/videos').then((r) => r.data),

  get: (id: number) =>
    client.get<Video>(`/videos/${id}`).then((r) => r.data),

  create: (payload: { title: string; file_path: string; description?: string }) =>
    client.post<Video>('/videos', payload).then((r) => r.data),

  update: (id: number, payload: Partial<Pick<Video, 'title' | 'description'>>) =>
    client.put<Video>(`/videos/${id}`, payload).then((r) => r.data),

  remove: (id: number) =>
    client.delete(`/videos/${id}`).then((r) => r.data),
};
