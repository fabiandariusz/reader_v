import { useState } from 'react';

interface Props {
  onSave: (payload: { title: string; file_path: string; description?: string }) => Promise<void>;
  onClose: () => void;
}

export default function AddVideoModal({ onSave, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [filePath, setFilePath] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !filePath.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onSave({ title: title.trim(), file_path: filePath.trim(), description: description.trim() || undefined });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? 'Failed to add video.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal__header">
          <h2 className="modal__title" id="modal-title">Add Video</h2>
          <button className="btn btn--ghost btn--icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            {error && <div className="error-banner">{error}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="video-title">Title</label>
              <input
                id="video-title"
                className="form-input"
                type="text"
                placeholder="e.g. React Hooks Deep Dive"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="video-path">File path or URL</label>
              <input
                id="video-path"
                className="form-input"
                type="text"
                placeholder="/path/to/video.mp4"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="video-desc">Description (optional)</label>
              <input
                id="video-desc"
                className="form-input"
                type="text"
                placeholder="Short description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="modal__footer" style={{ marginTop: '1.25rem' }}>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={saving || !title.trim() || !filePath.trim()}
            >
              {saving ? 'Adding…' : 'Add Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
