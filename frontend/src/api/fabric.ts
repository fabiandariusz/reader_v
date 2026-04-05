import client from './client';
import type { SSEEvent } from './ai';

export interface FabricConfig {
  vendor:        string;
  model:         string;
  apiKeyMasked:  string;
  ollamaUrl:     string;
  patternsFound: number;
}

export interface UpdateResult {
  ok:      boolean;
  added:   number;
  updated: number;
  total:   number;
}

export const fabricApi = {
  getPatterns: () =>
    client.get<string[]>('/fabric/patterns').then((r) => r.data),

  getEnabledPatterns: () =>
    client.get<string[]>('/fabric/patterns/enabled').then((r) => r.data),

  saveEnabledPatterns: (patterns: string[]) =>
    client.put<{ ok: boolean }>('/fabric/patterns/enabled', patterns).then((r) => r.data),

  updatePatterns: () =>
    client.post<UpdateResult>('/fabric/patterns/update').then((r) => r.data),

  getConfig: () =>
    client.get<FabricConfig>('/fabric/config').then((r) => r.data),

  saveConfig: (payload: { vendor?: string; model?: string; apiKey?: string; ollamaUrl?: string }) =>
    client.put('/fabric/config', payload).then((r) => r.data),

  stream(
    videoId:   number,
    pattern:   string,
    inputType: 'transcript' | 'notes',
    onToken:   (token: string) => void,
    onDone:    (full: string)  => void,
    onError:   (msg: string)   => void,
  ): AbortController {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch('/api/fabric/run', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ videoId, pattern, inputType }),
          signal:  controller.signal,
        });

        if (!res.ok || !res.body) { onError(`Request failed: ${res.status}`); return; }

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let   buffer  = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event: SSEEvent = JSON.parse(line.slice(6));
              if (event.type === 'token' && event.content) onToken(event.content);
              if (event.type === 'done'  && event.content != null) onDone(event.content);
              if (event.type === 'error' && event.message) onError(event.message);
            } catch { /* skip */ }
          }
        }
      } catch (err) {
        if ((err as { name?: string }).name !== 'AbortError') {
          onError(err instanceof Error ? err.message : 'Stream error');
        }
      }
    })();

    return controller;
  },
};
