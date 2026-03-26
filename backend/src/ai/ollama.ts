import type { AIProvider } from './types';

interface OllamaChunk {
  message?: { content?: string };
  done?: boolean;
  error?: string;
}

export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private model:   string;

  constructor(baseUrl = 'http://localhost:11434', model = 'llama3.2') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model   = model;
  }

  async *stream(system: string, prompt: string): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:  this.model,
        stream: true,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const reader  = response.body!.getReader();
    const decoder = new TextDecoder();
    let   buffer  = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const chunk: OllamaChunk = JSON.parse(trimmed);
          if (chunk.error) throw new Error(chunk.error);
          const token = chunk.message?.content ?? '';
          if (token) yield token;
        } catch {
          // skip malformed lines
        }
      }
    }
  }

  async test(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama not reachable at ${this.baseUrl}`);
    }
    const data = await response.json() as { models?: unknown[] };
    if (!data.models?.some((m: unknown) => (m as { name: string }).name.startsWith(this.model.split(':')[0]))) {
      throw new Error(`Model "${this.model}" not found. Pull it with: ollama pull ${this.model}`);
    }
  }
}
