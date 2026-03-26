import { useState, useRef, useCallback } from 'react';
import { streamAI } from '@/api/ai';

type Endpoint = 'summarize' | 'concepts' | 'quiz' | 'chat';

export function useAIStream() {
  const [text,     setText]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback((
    endpoint: Endpoint,
    body: Record<string, unknown>,
    onDone?: (full: string) => void,
  ) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    setText('');
    setError('');
    setLoading(true);

    abortRef.current = streamAI(
      endpoint,
      body,
      (token) => setText((prev) => prev + token),
      (full)  => { setLoading(false); onDone?.(full); },
      (msg)   => { setLoading(false); setError(msg); },
    );
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    setText('');
    setError('');
    setLoading(false);
  }, []);

  return { text, loading, error, run, cancel, reset };
}
