import client from './client';
import type { Note } from '@/types';

export const notesApi = {
  listByVideo: (videoId: number) =>
    client.get<Note[]>('/notes', { params: { videoId } }).then((r) => r.data),

  get: (id: number) =>
    client.get<Note>(`/notes/${id}`).then((r) => r.data),

  create: (payload: { video_id: number; content: string; timestamp: number }) =>
    client.post<Note>('/notes', payload).then((r) => r.data),

  update: (id: number, payload: { content: string }) =>
    client.put<Note>(`/notes/${id}`, payload).then((r) => r.data),

  remove: (id: number) =>
    client.delete(`/notes/${id}`).then((r) => r.data),

  addTag: (noteId: number, tagId: number) =>
    client.post(`/notes/${noteId}/tags`, { tagId }).then((r) => r.data),

  removeTag: (noteId: number, tagId: number) =>
    client.delete(`/notes/${noteId}/tags/${tagId}`).then((r) => r.data),
};
