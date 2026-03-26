import NoteItem from './NoteItem';
import NoteComposer from './NoteComposer';
import type { Note } from '@/types';
import type Player from 'video.js/dist/types/player';

interface Props {
  notes: Note[];
  loading: boolean;
  currentTime: number;
  player: Player | null;
  onAddNote: (content: string, timestamp: number) => Promise<void>;
  onUpdateNote: (id: number, content: string) => Promise<void>;
  onDeleteNote: (id: number) => Promise<void>;
  onRemoveTag: (noteId: number, tagId: number) => Promise<void>;
}

export default function NotePanel({
  notes,
  loading,
  currentTime,
  player,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onRemoveTag,
}: Props) {
  const handleSeek = (timestamp: number) => {
    player?.currentTime(timestamp);
    player?.play();
  };

  return (
    <aside className="note-panel">
      <div className="note-panel__header">
        <span className="note-panel__title">Notes</span>
        <span className="note-panel__count">{notes.length}</span>
      </div>

      <div className="note-panel__list">
        {loading ? (
          <div className="empty-state">
            <div className="spinner" />
          </div>
        ) : notes.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">✎</span>
            <p className="empty-state__text">
              No notes yet. Start watching and jot down your thoughts.
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              onSeek={handleSeek}
              onUpdate={onUpdateNote}
              onDelete={onDeleteNote}
              onRemoveTag={onRemoveTag}
            />
          ))
        )}
      </div>

      <div className="note-panel__composer">
        <NoteComposer currentTime={currentTime} onSave={onAddNote} />
      </div>
    </aside>
  );
}
