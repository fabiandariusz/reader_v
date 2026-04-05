import type { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import {
  listPatterns,
  readFabricEnv,
  writeFabricEnv,
  runPattern,
  updatePatternsFromGitHub,
} from '../services/fabricService';

const VENDOR_KEY: Record<string, string> = {
  OpenAI:    'OPENAI_API_KEY',
  Anthropic: 'ANTHROPIC_API_KEY',
  Google:    'GEMINI_API_KEY',
  Ollama:    'OLLAMA_API_URL',
};

const mask = (v: string) => v ? `••••••••${v.slice(-4)}` : '';

/** GET /api/fabric/patterns */
export function getPatterns(_req: Request, res: Response) {
  try {
    res.json(listPatterns());
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
}

/** GET /api/fabric/config */
export function getConfig(_req: Request, res: Response) {
  const cfg = readFabricEnv();
  const vendor = cfg.DEFAULT_VENDOR ?? 'OpenAI';
  const keyName = VENDOR_KEY[vendor];
  res.json({
    vendor,
    model:         cfg.DEFAULT_MODEL ?? '',
    apiKeyMasked:  keyName ? mask(cfg[keyName] ?? '') : '',
    ollamaUrl:     cfg.OLLAMA_API_URL ?? 'http://localhost:11434',
    patternsFound: listPatterns().length,
  });
}

/** PUT /api/fabric/config */
export function saveConfig(req: Request, res: Response) {
  const { vendor, model, apiKey, ollamaUrl } =
    req.body as { vendor?: string; model?: string; apiKey?: string; ollamaUrl?: string };

  const updates: Record<string, string> = {};
  if (vendor)   updates.DEFAULT_VENDOR = vendor;
  if (model)    updates.DEFAULT_MODEL  = model;
  if (ollamaUrl) updates.OLLAMA_API_URL = ollamaUrl;
  if (apiKey && !apiKey.startsWith('•')) {
    const keyName = VENDOR_KEY[vendor ?? ''];
    if (keyName) updates[keyName] = apiKey;
  }

  writeFabricEnv(updates);
  res.json({ ok: true });
}

/** GET /api/fabric/patterns/enabled */
export async function getEnabledPatterns(_req: Request, res: Response) {
  try {
    const { rows } = await pool.query<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'fabric_enabled_patterns'",
    );
    if (!rows[0]?.value) return res.json([]);
    res.json(JSON.parse(rows[0].value));
  } catch {
    res.json([]);
  }
}

/** PUT /api/fabric/patterns/enabled */
export async function saveEnabledPatterns(req: Request, res: Response) {
  try {
    const patterns = req.body as string[];
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('fabric_enabled_patterns', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(patterns)],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
}

/** POST /api/fabric/patterns/update */
export async function updatePatterns(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await updatePatternsFromGitHub();
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

/** POST /api/fabric/run — SSE stream */
export async function runFabricPattern(req: Request, res: Response, next: NextFunction) {
  const { videoId, pattern, inputType } =
    req.body as { videoId: number; pattern: string; inputType: 'transcript' | 'notes' };

  try {
    let input = '';

    if (inputType === 'transcript') {
      const { rows } = await pool.query<{ content: string }>(
        'SELECT content FROM transcripts WHERE video_id = $1 ORDER BY id DESC LIMIT 1',
        [videoId],
      );
      if (!rows[0]) return res.status(400).json({ message: 'No transcript found for this video. Transcribe it first.' });
      input = rows[0].content;

    } else {
      const { rows } = await pool.query<{ content: string; timestamp: number }>(
        'SELECT content, timestamp FROM notes WHERE video_id = $1 ORDER BY timestamp ASC',
        [videoId],
      );
      if (!rows.length) return res.status(400).json({ message: 'No notes found for this video.' });
      input = rows.map((n) => `[${formatTime(n.timestamp)}] ${n.content}`).join('\n\n');
    }

    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.flushHeaders();

    let full = '';
    for await (const token of runPattern(pattern, input)) {
      full += token;
      res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ type: 'done', content: full })}\n\n`);
    res.end();

  } catch (err) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: (err as Error).message })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
