export interface Video {
  id: number;
  title: string;
  description: string | null;
  file_path: string;
  thumbnail_path: string | null;
  duration: number | null; // seconds
  note_count: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: number;
  video_id: number;
  content: string;
  timestamp: number; // seconds into video
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface SearchResult {
  note_id: number;
  note_content: string;
  note_timestamp: number;
  video_id: number;
  video_title: string;
  thumbnail_path: string | null;
  tags: Tag[];
}

export interface ApiError {
  message: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
