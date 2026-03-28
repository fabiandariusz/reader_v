import pool from '../db/pool';
import { WhisperProvider }    from './whisper';
import { AssemblyAIProvider } from './assemblyai';
import type { TranscriptionProvider, TranscriptionSettings } from './types';

export async function loadTranscriptionSettings(): Promise<TranscriptionSettings> {
  const { rows } = await pool.query<{ key: string; value: string }>(
    `SELECT key, value FROM settings WHERE key IN ('transcription_provider', 'whisper_model', 'assemblyai_api_key')`
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
  return {
    provider:         (map.transcription_provider as 'whisper' | 'assemblyai') ?? 'whisper',
    whisperModel:     map.whisper_model      ?? 'base',
    assemblyaiApiKey: map.assemblyai_api_key ?? '',
  };
}

export async function getTranscriptionProvider(): Promise<TranscriptionProvider> {
  const s = await loadTranscriptionSettings();

  if (s.provider === 'assemblyai') {
    if (!s.assemblyaiApiKey) {
      throw new Error('AssemblyAI API key is not configured. Go to Settings to add it.');
    }
    return new AssemblyAIProvider(s.assemblyaiApiKey);
  }

  return new WhisperProvider(s.whisperModel);
}
