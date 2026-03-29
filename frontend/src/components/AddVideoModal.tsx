import { useState, useRef, useCallback } from 'react';
import { videosApi } from '@/api/videos';
import type { Video } from '@/types';

type Tab = 'file' | 'url';

interface Props {
  onSave: (payload: { title: string; file_path: string; description?: string }) => Promise<unknown>;
  onClose: () => void;
  onCreated?: (video: Video) => void;
}

export default function AddVideoModal({ onSave, onClose, onCreated }: Props) {
  const [tab, setTab]               = useState<Tab>('file');
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  // File tab state
  const [file, setFile]             = useState<File | null>(null);
  const [dragOver, setDragOver]     = useState(false);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  // URL tab state
  const [url, setUrl]               = useState('');

  const applyFile = useCallback((f: File) => {
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
  }, [title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('video/')) applyFile(f);
  }, [applyFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) applyFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (tab === 'file' && !file) return;
    if (tab === 'url' && !url.trim()) return;

    setSaving(true);
    setError('');
    try {
      if (tab === 'file' && file) {
        const created = await videosApi.upload(file, title.trim(), description.trim() || undefined);
        onCreated?.(created);
        onClose();
      } else {
        await onSave({ title: title.trim(), file_path: url.trim(), description: description.trim() || undefined });
        onClose();
      }
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to add video.');
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const canSubmit = title.trim() && (tab === 'file' ? !!file : !!url.trim());

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

            {/* Tab switcher */}
            <div className="add-video-tabs">
              <button
                type="button"
                className={`add-video-tab${tab === 'file' ? ' add-video-tab--active' : ''}`}
                onClick={() => setTab('file')}
              >
                Upload File
              </button>
              <button
                type="button"
                className={`add-video-tab${tab === 'url' ? ' add-video-tab--active' : ''}`}
                onClick={() => setTab('url')}
              >
                Online URL
              </button>
            </div>

            {/* File upload tab */}
            {tab === 'file' && (
              <div
                className={`drop-zone${dragOver ? ' drop-zone--over' : ''}${file ? ' drop-zone--filled' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="drop-zone__input"
                  onChange={handleFileChange}
                />
                {file ? (
                  <>
                    <span className="drop-zone__icon">✔</span>
                    <span className="drop-zone__filename">{file.name}</span>
                    <span className="drop-zone__hint">Click to change</span>
                  </>
                ) : (
                  <>
                    <span className="drop-zone__icon">↑</span>
                    <span className="drop-zone__label">Drop a video here</span>
                    <span className="drop-zone__hint">or click to browse</span>
                  </>
                )}
              </div>
            )}

            {/* URL tab */}
            {tab === 'url' && (
              <div className="form-group">
                <label className="form-label" htmlFor="video-url">Video URL</label>
                <input
                  id="video-url"
                  className="form-input"
                  type="text"
                  placeholder="https://youtube.com/watch?v=... or https://example.com/video.mp4"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            )}

            {/* Common fields */}
            <div className="form-group">
              <label className="form-label" htmlFor="video-title">Title</label>
              <input
                id="video-title"
                className="form-input"
                type="text"
                placeholder="e.g. React Hooks Deep Dive"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus={tab === 'url' ? false : !file}
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
            <button type="submit" className="btn btn--primary" disabled={saving || !canSubmit}>
              {saving ? 'Adding…' : 'Add Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
