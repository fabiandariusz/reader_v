import type { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { loadSettings } from '../ai/factory';
import { ClaudeProvider } from '../ai/claude';
import { OllamaProvider } from '../ai/ollama';

/** GET /api/settings — returns all settings, masking the API key */
export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const s = await loadSettings();
    // Mask key: show last 4 chars only if set
    const maskedKey = s.claudeApiKey
      ? `••••••••${s.claudeApiKey.slice(-4)}`
      : '';
    res.json({ ...s, claudeApiKey: maskedKey });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/settings — update one or more settings */
export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const allowed = ['ai_provider', 'claude_api_key', 'claude_model', 'ollama_base_url', 'ollama_model'];
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
    const { provider, claudeApiKey, claudeModel, ollamaBaseUrl, ollamaModel } =
      req.body as {
        provider: string;
        claudeApiKey?: string;
        claudeModel?: string;
        ollamaBaseUrl?: string;
        ollamaModel?: string;
      };

    if (provider === 'ollama') {
      const p = new OllamaProvider(ollamaBaseUrl, ollamaModel);
      await p.test();
    } else {
      if (!claudeApiKey) {
        return res.status(400).json({ message: 'API key required for Claude.' });
      }
      const p = new ClaudeProvider(claudeApiKey, claudeModel);
      await p.test();
    }

    res.json({ ok: true, message: 'Connection successful.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed.';
    res.status(400).json({ message: msg });
  }
}
