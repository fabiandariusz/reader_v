import { useState, useRef, useEffect } from 'react';
import { useAIStream } from '@/hooks/useAIStream';
import type { ChatMessage } from '@/api/ai';

interface Props {
  videoId: number;
}

export default function AIChat({ videoId }: Props) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input,   setInput]   = useState('');
  const { text, loading, error, run, reset } = useAIStream();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, text]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');

    const newHistory: ChatMessage[] = [...history, { role: 'user', content: msg }];
    setHistory(newHistory);

    run(
      'chat',
      { videoId, message: msg, history },
      (full) => {
        setHistory((prev) => [...prev, { role: 'assistant', content: full }]);
        reset();
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="ai-chat">
      <div className="ai-chat__history">
        {history.length === 0 && !loading && (
          <div className="empty-state">
            <span className="empty-state__icon">💬</span>
            <p className="empty-state__text">Ask a question about this video</p>
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} className={`ai-chat__msg ai-chat__msg--${m.role}`}>
            <span className="ai-chat__role">{m.role === 'user' ? 'You' : 'AI'}</span>
            <p className="ai-chat__content">{m.content}</p>
          </div>
        ))}
        {loading && text && (
          <div className="ai-chat__msg ai-chat__msg--assistant">
            <span className="ai-chat__role">AI</span>
            <p className="ai-chat__content ai-streaming">{text}</p>
          </div>
        )}
        {loading && !text && (
          <div className="ai-chat__msg ai-chat__msg--assistant">
            <span className="ai-chat__role">AI</span>
            <span className="ai-thinking">thinking…</span>
          </div>
        )}
        {error && <div className="error-banner" style={{ margin: '0.5rem 0' }}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      <div className="ai-chat__input-row">
        <textarea
          className="ai-chat__textarea"
          placeholder="Ask about the video… (Enter to send)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={2}
        />
        <button
          className="btn btn--primary btn--sm"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
