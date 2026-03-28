import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { TranscriptionProvider, TranscriptionResult, TranscriptionSegment } from './types';

const OUTPUT_DIR = path.join(os.tmpdir(), 'reader_v_whisper');

export class WhisperProvider implements TranscriptionProvider {
  constructor(private model: string = 'base') {}

  async transcribe(filePath: string): Promise<TranscriptionResult> {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    await this.runWhisper(filePath);

    const baseName = path.basename(filePath, path.extname(filePath));
    const jsonPath = path.join(OUTPUT_DIR, `${baseName}.json`);

    if (!fs.existsSync(jsonPath)) {
      throw new Error('Whisper did not produce output. Is openai-whisper installed? (pip install openai-whisper)');
    }

    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as {
      text: string;
      segments: { start: number; end: number; text: string }[];
    };

    const segments: TranscriptionSegment[] = raw.segments.map((s) => ({
      start: s.start,
      end:   s.end,
      text:  s.text.trim(),
    }));

    return { text: raw.text.trim(), segments };
  }

  private runWhisper(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('python3', [
        '-m', 'whisper',
        filePath,
        '--model',         this.model,
        '--output_format', 'json',
        '--output_dir',    OUTPUT_DIR,
      ]);

      let stderr = '';
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Whisper failed (exit ${code}): ${stderr.slice(-300)}`));
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to launch Whisper: ${err.message}. Is Python 3 and openai-whisper installed?`));
      });
    });
  }
}
