import client from './client';
import type { Tag } from '@/types';

export const tagsApi = {
  list: () =>
    client.get<Tag[]>('/tags').then((r) => r.data),

  create: (name: string) =>
    client.post<Tag>('/tags', { name }).then((r) => r.data),

  remove: (id: number) =>
    client.delete(`/tags/${id}`).then((r) => r.data),
};
