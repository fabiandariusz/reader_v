import fs   from 'fs';
import path from 'path';
import os   from 'os';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const CONFIG_DIR   = path.join(os.homedir(), '.config', 'fabric');
const ENV_PATH     = path.join(CONFIG_DIR, '.env');
const PATTERNS_DIR = path.join(CONFIG_DIR, 'patterns');

// ── Config read / write ───────────────────────────────────────────────────

export function readFabricEnv(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) return {};
  const out: Record<string, string> = {};
  for (const raw of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    out[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return out;
}

export function writeFabricEnv(updates: Record<string, string>): void {
  const existing = readFabricEnv();
  const merged   = { ...existing, ...updates };
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(
    ENV_PATH,
    Object.entries(merged).map(([k, v]) => `${k}=${v}`).join('\n') + '\n',
    'utf8',
  );
}

// ── Pattern helpers ───────────────────────────────────────────────────────

export function listPatterns(): string[] {
  if (!fs.existsSync(PATTERNS_DIR)) return [];
  return fs.readdirSync(PATTERNS_DIR)
    .filter((n) => fs.statSync(path.join(PATTERNS_DIR, n)).isDirectory())
    .sort();
}

export function getSystemPrompt(pattern: string): string {
  const p = path.join(PATTERNS_DIR, pattern, 'system.md');
  if (!fs.existsSync(p)) throw new Error(`Pattern "${pattern}" not found`);
  return fs.readFileSync(p, 'utf8');
}

// ── Streaming runner ──────────────────────────────────────────────────────

export async function* runPattern(
  pattern: string,
  input:   string,
): AsyncGenerator<string> {
  const cfg    = readFabricEnv();
  const vendor = (cfg.DEFAULT_VENDOR ?? 'OpenAI').toLowerCase();
  const model  = cfg.DEFAULT_MODEL   ?? 'gpt-4o-mini';
  const system = getSystemPrompt(pattern);

  if (vendor === 'openai') {
    const apiKey = cfg.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set in Fabric config.');
    const client = new OpenAI({ apiKey });
    const stream = await client.chat.completions.create({
      model, stream: true,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: input  },
      ],
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield text;
    }

  } else if (vendor === 'anthropic') {
    const apiKey = cfg.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set in Fabric config.');
    const client = new Anthropic({ apiKey });
    const stream = client.messages.stream({
      model, max_tokens: 8096, system,
      messages: [{ role: 'user', content: input }],
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }

  } else if (vendor === 'google' || vendor === 'gemini') {
    const apiKey = cfg.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set in Fabric config.');
    const genAI  = new GoogleGenerativeAI(apiKey);
    const gModel = genAI.getGenerativeModel({ model, systemInstruction: system });
    const result = await gModel.generateContentStream(input);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }

  } else if (vendor === 'ollama') {
    const baseUrl = cfg.OLLAMA_API_URL ?? 'http://localhost:11434';
    const res = await fetch(`${baseUrl}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, stream: true,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: input  },
        ],
      }),
    });
    if (!res.ok || !res.body) throw new Error(`Ollama request failed: ${res.status}`);
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let   buf     = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as { message?: { content?: string } };
          const text = parsed.message?.content;
          if (text) yield text;
        } catch { /* skip */ }
      }
    }

  } else {
    throw new Error(`Unsupported Fabric vendor: "${cfg.DEFAULT_VENDOR}"`);
  }
}
