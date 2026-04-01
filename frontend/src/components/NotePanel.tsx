import NoteItem from './NoteItem';
import NoteComposer from './NoteComposer';
import type { Note, Tag } from '@/types';
import type Player from 'video.js/dist/types/player';

interface Props {
  notes: Note[];
  allTags: Tag[];
  loading: boolean;
  currentTime: number;
  player: Player | null;
  onAddNote: (content: string, timestamp: number) => Promise<unknown>;
  onUpdateNote: (id: number, content: string) => Promise<unknown>;
  onDeleteNote: (id: number) => Promise<void>;
  onAddTag: (noteId: number, tagName: string) => Promise<void>;
  onRemoveTag: (noteId: number, tagId: number) => Promise<void>;
}

export default function NotePanel({
  notes,
  allTags,
  loading,
  currentTime,
  player,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddTag,
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
              allTags={allTags}
              onSeek={handleSeek}
              onUpdate={onUpdateNote}
              onDelete={onDeleteNote}
              onAddTag={onAddTag}
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
