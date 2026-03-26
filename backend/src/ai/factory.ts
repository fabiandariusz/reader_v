import pool from '../db/pool';
import { ClaudeProvider } from './claude';
import { OllamaProvider } from './ollama';
import type { AIProvider, AISettings } from './types';

export async function loadSettings(): Promise<AISettings> {
  const { rows } = await pool.query<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
  return {
    provider:      (map.ai_provider as 'claude' | 'ollama') ?? 'claude',
    claudeApiKey:  map.claude_api_key  ?? '',
    claudeModel:   map.claude_model    ?? 'claude-opus-4-6',
    ollamaBaseUrl: map.ollama_base_url ?? 'http://localhost:11434',
    ollamaModel:   map.ollama_model    ?? 'llama3.2',
  };
}

export async function getProvider(): Promise<AIProvider> {
  const settings = await loadSettings();

  if (settings.provider === 'ollama') {
    return new OllamaProvider(settings.ollamaBaseUrl, settings.ollamaModel);
  }

  if (!settings.claudeApiKey) {
    throw new Error('Claude API key is not configured. Go to Settings to add it.');
  }
  return new ClaudeProvider(settings.claudeApiKey, settings.claudeModel);
}
