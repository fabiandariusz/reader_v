import pool from '../db/pool';
import { ClaudeProvider } from './claude';
import { OllamaProvider } from './ollama';
import { OpenAIProvider } from './openai';
import { GeminiProvider } from './gemini';
import type { AIProvider, AISettings } from './types';

export async function loadSettings(): Promise<AISettings> {
  const { rows } = await pool.query<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
  return {
    provider:      (map.ai_provider as AISettings['provider']) ?? 'claude',
    claudeApiKey:  map.claude_api_key  ?? '',
    claudeModel:   map.claude_model    ?? 'claude-opus-4-6',
    ollamaBaseUrl: map.ollama_base_url ?? 'http://localhost:11434',
    ollamaModel:   map.ollama_model    ?? 'llama3.2',
    openaiApiKey:  map.openai_api_key  ?? '',
    openaiModel:   map.openai_model    ?? 'gpt-4o',
    geminiApiKey:  map.gemini_api_key  ?? '',
    geminiModel:   map.gemini_model    ?? 'gemini-2.0-flash',
  };
}

export async function getProvider(): Promise<AIProvider> {
  const s = await loadSettings();

  if (s.provider === 'ollama') {
    return new OllamaProvider(s.ollamaBaseUrl, s.ollamaModel);
  }
  if (s.provider === 'openai') {
    if (!s.openaiApiKey) throw new Error('OpenAI API key is not configured. Go to Settings to add it.');
    return new OpenAIProvider(s.openaiApiKey, s.openaiModel);
  }
  if (s.provider === 'gemini') {
    if (!s.geminiApiKey) throw new Error('Gemini API key is not configured. Go to Settings to add it.');
    return new GeminiProvider(s.geminiApiKey, s.geminiModel);
  }
  if (!s.claudeApiKey) throw new Error('Claude API key is not configured. Go to Settings to add it.');
  return new ClaudeProvider(s.claudeApiKey, s.claudeModel);
}
