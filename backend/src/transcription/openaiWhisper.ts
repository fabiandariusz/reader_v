import OpenAI from 'openai';
import fs from 'fs';
import type { TranscriptionProvider, TranscriptionResult, TranscriptionSegment } from './types';

export class OpenAIWhisperProvider implements TranscriptionProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(filePath: string): Promise<TranscriptionResult> {
    const response = await this.client.audio.transcriptions.create({
      file:                    fs.createReadStream(filePath),
      model:                   'whisper-1',
      response_format:         'verbose_json',
      timestamp_granularities: ['segment'],
    });

    const segments: TranscriptionSegment[] = (response.segments ?? []).map((s) => ({
      start: s.start,
      end:   s.end,
      text:  s.text.trim(),
    }));

    return { text: response.text.trim(), segments };
  }
}
