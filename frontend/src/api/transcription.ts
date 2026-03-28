import client from './client';

export interface TranscriptSegment {
  start: number;
  end:   number;
  text:  string;
}

export interface TranscriptData {
  content:      string;
  segments:     TranscriptSegment[];
  generated_at: string;
}

export type TranscriptStatus =
  | { status: 'none' }
  | { status: 'processing' }
  | { status: 'error'; error: string }
  | { status: 'done'; transcript: TranscriptData };

export const transcriptionApi = {
  get:   (videoId: number) =>
    client.get<TranscriptStatus>(`/transcription/${videoId}`).then((r) => r.data),

  start: (videoId: number) =>
    client.post<{ status: string }>(`/transcription/${videoId}`).then((r) => r.data),
};
