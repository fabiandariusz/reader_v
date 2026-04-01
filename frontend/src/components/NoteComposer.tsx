import { useState, useRef } from 'react';
import { formatTime } from '@/utils/time';

interface Props {
  currentTime: number;
  onSave: (content: string, timestamp: number) => Promise<unknown>;
}

export default function NoteComposer({ currentTime, onSave }: Props) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  // Capture timestamp at the moment the user starts typing
  const [capturedTime, setCapturedTime] = useState(currentTime);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When textarea gets focus, snapshot the current playback time
  const handleFocus = () => setCapturedTime(currentTime);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onSave(trimmed, capturedTime);
      setText('');
      setCapturedTime(currentTime);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
  };

  return (
    <div className="note-composer">
      <div className="note-composer__timestamp-row">
        <span className="note-composer__timestamp-badge">
          @ {formatTime(capturedTime)}
        </span>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => setCapturedTime(currentTime)}
          title="Update to current position"
        >
          ↺ now
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className="note-composer__textarea"
        placeholder="Write a note… (Ctrl+Enter to save)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
      />
      <div className="note-composer__actions">
        <span className="note-composer__hint">Ctrl+Enter</span>
        <button
          className="btn btn--primary btn--sm"
          onClick={handleSave}
          disabled={saving || !text.trim()}
        >
          {saving ? 'Saving…' : 'Add note'}
        </button>
      </div>
    </div>
  );
}
