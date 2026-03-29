import client from './client';
import type { SearchResult } from '@/types';

export const searchApi = {
  search: (q: string) =>
    client.get<SearchResult[]>('/search', { params: { q } }).then((r) => r.data),
};
