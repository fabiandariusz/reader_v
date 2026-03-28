import fs from 'fs';
import type { TranscriptionProvider, TranscriptionResult, TranscriptionSegment } from './types';

const BASE = 'https://api.assemblyai.com/v2';
const POLL_INTERVAL_MS = 3000;

export class AssemblyAIProvider implements TranscriptionProvider {
  constructor(private apiKey: string) {}

  async transcribe(filePath: string): Promise<TranscriptionResult> {
    const uploadUrl  = await this.upload(filePath);
    const transcriptId = await this.createTranscript(uploadUrl);
    return this.poll(transcriptId);
  }

  private async upload(filePath: string): Promise<string> {
    const fileData = fs.readFileSync(filePath);
    const res = await fetch(`${BASE}/upload`, {
      method:  'POST',
      headers: { authorization: this.apiKey, 'content-type': 'application/octet-stream' },
      body:    fileData,
    });
    if (!res.ok) throw new Error(`AssemblyAI upload failed: ${res.status} ${res.statusText}`);
    const data = await res.json() as { upload_url: string };
    return data.upload_url;
  }

  private async createTranscript(audioUrl: string): Promise<string> {
    const res = await fetch(`${BASE}/transcript`, {
      method:  'POST',
      headers: { authorization: this.apiKey, 'content-type': 'application/json' },
      body:    JSON.stringify({ audio_url: audioUrl }),
    });
    if (!res.ok) throw new Error(`AssemblyAI transcript request failed: ${res.status} ${res.statusText}`);
    const data = await res.json() as { id: string };
    return data.id;
  }

  private async poll(transcriptId: string): Promise<TranscriptionResult> {
    while (true) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const res = await fetch(`${BASE}/transcript/${transcriptId}`, {
        headers: { authorization: this.apiKey },
      });
      const data = await res.json() as {
        status: string;
        text:   string;
        error?: string;
        words?: { start: number; end: number; text: string }[];
      };

      if (data.status === 'completed') {
        return {
          text:     data.text,
          segments: this.buildSegments(data.words ?? []),
        };
      }

      if (data.status === 'error') {
        throw new Error(`AssemblyAI transcription error: ${data.error ?? 'unknown'}`);
      }
    }
  }

  // Group words (timestamps in ms) into ~10-second segments
  private buildSegments(words: { start: number; end: number; text: string }[]): TranscriptionSegment[] {
    if (!words.length) return [];

    const segments: TranscriptionSegment[] = [];
    let segStart = words[0].start;
    let segWords: string[] = [];
    let lastEnd  = words[0].end;

    for (const w of words) {
      segWords.push(w.text);
      lastEnd = w.end;

      if (w.end - segStart > 10_000) {
        segments.push({ start: segStart / 1000, end: lastEnd / 1000, text: segWords.join(' ') });
        segStart  = w.end;
        segWords  = [];
      }
    }

    if (segWords.length) {
      segments.push({ start: segStart / 1000, end: lastEnd / 1000, text: segWords.join(' ') });
    }

    return segments;
  }
}
