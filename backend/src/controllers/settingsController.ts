import type { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { loadSettings } from '../ai/factory';
import { loadTranscriptionSettings } from '../transcription/factory';
import { ClaudeProvider } from '../ai/claude';
import { OllamaProvider } from '../ai/ollama';
import { OpenAIProvider } from '../ai/openai';
import { GeminiProvider } from '../ai/gemini';

/** GET /api/settings — returns all settings, masking the API key */
export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const [ai, transcription] = await Promise.all([loadSettings(), loadTranscriptionSettings()]);
    const mask = (key: string) => key ? `••••••••${key.slice(-4)}` : '';
    res.json({
      ...ai,
      claudeApiKey:          mask(ai.claudeApiKey),
      openaiApiKey:          mask(ai.openaiApiKey),
      geminiApiKey:          mask(ai.geminiApiKey),
      transcriptionProvider: transcription.provider,
      whisperModel:          transcription.whisperModel,
      assemblyaiApiKey:      mask(transcription.assemblyaiApiKey),
    });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/settings — update one or more settings */
export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const allowed = [
      'ai_provider', 'claude_api_key', 'claude_model', 'ollama_base_url', 'ollama_model',
      'openai_api_key', 'openai_model', 'gemini_api_key', 'gemini_model',
      'transcription_provider', 'whisper_model', 'assemblyai_api_key',
    ];
    const body = req.body as Record<string, string>;

    for (const [key, value] of Object.entries(body)) {
      if (!allowed.includes(key)) continue;
      await pool.query(
        `INSERT INTO settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, value ?? '']
      );
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/** POST /api/settings/test — test connectivity for the current or submitted provider */
export async function testConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const { provider, claudeApiKey, claudeModel, ollamaBaseUrl, ollamaModel,
            openaiApiKey, openaiModel, geminiApiKey, geminiModel } =
      req.body as {
        provider: string;
        claudeApiKey?: string;  claudeModel?: string;
        ollamaBaseUrl?: string; ollamaModel?: string;
        openaiApiKey?: string;  openaiModel?: string;
        geminiApiKey?: string;  geminiModel?: string;
      };

    if (provider === 'ollama') {
      await new OllamaProvider(ollamaBaseUrl, ollamaModel).test();
    } else if (provider === 'openai') {
      if (!openaiApiKey) return res.status(400).json({ message: 'API key required for OpenAI.' });
      await new OpenAIProvider(openaiApiKey, openaiModel).test();
    } else if (provider === 'gemini') {
      if (!geminiApiKey) return res.status(400).json({ message: 'API key required for Gemini.' });
      await new GeminiProvider(geminiApiKey, geminiModel).test();
    } else {
      if (!claudeApiKey) return res.status(400).json({ message: 'API key required for Claude.' });
      await new ClaudeProvider(claudeApiKey, claudeModel).test();
    }

    res.json({ ok: true, message: 'Connection successful.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed.';
    res.status(400).json({ message: msg });
  }
}
