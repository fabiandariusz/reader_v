export interface SSEEvent {
  type:     'token' | 'done' | 'error';
  content?: string;
  message?: string;
}

export interface CachedSummary {
  content:      string;
  generated_at: string;
}

export interface QuizQuestion {
  question: string;
  options:  string[];
  answer:   string;
}

export interface CachedQuiz {
  questions:    QuizQuestion[];
  generated_at: string;
}

export interface ChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

/**
 * Opens a streaming SSE request to an AI endpoint.
 * Calls onToken for each streamed token, onDone when the stream finishes.
 * Returns an AbortController so the caller can cancel.
 */
export function streamAI(
  endpoint: 'summarize' | 'concepts' | 'quiz' | 'chat',
  body: Record<string, unknown>,
  onToken: (token: string) => void,
  onDone:  (full: string)  => void,
  onError: (msg: string)   => void,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`/api/ai/${endpoint}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  controller.signal,
      });

      if (!res.ok || !res.body) {
        onError(`Request failed: ${res.status}`);
        return;
      }

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
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      if ((err as { name?: string }).name !== 'AbortError') {
        onError(err instanceof Error ? err.message : 'Stream error');
      }
    }
  })();

  return controller;
}

export const aiApi = {
  getCachedSummary: (videoId: number) =>
    fetch(`/api/ai/summary/${videoId}`).then((r) => r.json() as Promise<CachedSummary | null>),

  getCachedQuiz: (videoId: number) =>
    fetch(`/api/ai/quiz/${videoId}`).then((r) => r.json() as Promise<CachedQuiz | null>),
};
