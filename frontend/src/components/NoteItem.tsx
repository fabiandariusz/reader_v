import { useState, useRef, useEffect } from 'react';
import { formatTime } from '@/utils/time';
import type { Note, Tag } from '@/types';

interface Props {
  note: Note;
  allTags: Tag[];
  onSeek: (timestamp: number) => void;
  onUpdate: (id: number, content: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onAddTag: (noteId: number, tagName: string) => Promise<void>;
  onRemoveTag: (noteId: number, tagId: number) => Promise<void>;
}

export default function NoteItem({ note, allTags, onSeek, onUpdate, onDelete, onAddTag, onRemoveTag }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (addingTag) tagInputRef.current?.focus();
  }, [addingTag]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === note.content) { setEditing(false); return; }
    setSaving(true);
    try {
      await onUpdate(note.id, trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setDraft(note.content); setEditing(false); }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
  };

  const handleDelete = async () => {
    if (confirm('Delete this note?')) await onDelete(note.id);
  };

  const handleAddTag = async () => {
    const name = tagInput.trim();
    if (!name) { setAddingTag(false); return; }
    await onAddTag(note.id, name);
    setTagInput('');
    setAddingTag(false);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
    if (e.key === 'Escape') { setTagInput(''); setAddingTag(false); }
  };

  return (
    <div className={`note-item${editing ? ' is-editing' : ''}`}>
      <button
        className="note-item__timestamp"
        onClick={() => onSeek(note.timestamp)}
        title="Jump to this moment"
      >
        ▶ {formatTime(note.timestamp)}
      </button>

      {editing ? (
        <div className="note-inline-editor">
          <textarea
            ref={textareaRef}
            className="note-inline-editor__textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
          />
          <div className="note-inline-editor__actions">
            <button
              className="btn btn--primary btn--sm"
              onClick={handleSave}
              disabled={saving || !draft.trim()}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => { setDraft(note.content); setEditing(false); }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="note-item__text">{note.content}</p>
      )}

      <div className="note-item__tags">
        {note.tags.map((tag) => (
          <span key={tag.id} className="tag tag--removable">
            {tag.name}
            <button
              className="tag__remove"
              onClick={() => onRemoveTag(note.id, tag.id)}
              title="Remove tag"
            >
              ×
            </button>
          </span>
        ))}

        {addingTag ? (
          <>
            <datalist id={`tags-list-${note.id}`}>
              {allTags.map((t) => <option key={t.id} value={t.name} />)}
            </datalist>
            <input
              ref={tagInputRef}
              className="tag-input"
              list={`tags-list-${note.id}`}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={handleAddTag}
              placeholder="tag name"
            />
          </>
        ) : (
          <button
            className="tag tag--add"
            onClick={() => setAddingTag(true)}
            title="Add tag"
          >
            + tag
          </button>
        )}
      </div>

      <div className="note-item__actions">
        <button
          className="btn btn--ghost btn--icon btn--sm"
          onClick={() => setEditing(true)}
          title="Edit note"
        >
          ✎
        </button>
        <button
          className="btn btn--ghost btn--icon btn--sm"
          onClick={handleDelete}
          title="Delete note"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
