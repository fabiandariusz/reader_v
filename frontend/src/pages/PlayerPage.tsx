import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer   from '@/components/VideoPlayer';
import NoteItem      from '@/components/NoteItem';
import NoteComposer  from '@/components/NoteComposer';
import AIPanel       from '@/components/AIPanel';
import { useVideo }  from '@/hooks/useVideos';
import { useNotes }  from '@/hooks/useNotes';
import { useTags }   from '@/hooks/useTags';
import { formatTime, formatDate } from '@/utils/time';
import { transcriptionApi, type TranscriptStatus } from '@/api/transcription';
import { videosApi } from '@/api/videos';
import type Player from 'video.js/dist/types/player';

type ExportFormat = 'md' | 'txt' | 'pdf';

const EXPORT_EXTENSIONS: Record<ExportFormat, string> = { md: 'md', txt: 'txt', pdf: 'pdf' };

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type SideTab = 'notes' | 'ai';

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const videoId = Number(id);
  const navigate = useNavigate();

  const { video, loading: videoLoading, error: videoError } = useVideo(videoId);
  const {
    notes, loading: notesLoading,
    addNote, updateNote, removeNote, addTagToNote, removeTagFromNote,
  } = useNotes(videoId);
  const { tags: allTags, createTag } = useTags();

  const [currentTime,      setCurrentTime]      = useState(0);
  const [sideTab,          setSideTab]          = useState<SideTab>('notes');
  const [transcriptStatus, setTranscriptStatus] = useState<TranscriptStatus>({ status: 'none' });
  const [exportOpen,       setExportOpen]       = useState(false);
  const playerRef = useRef<Player | null>(null);

  // Load transcript status on mount and poll while processing
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const s = await transcriptionApi.get(videoId).catch(() => ({ status: 'none' as const }));
      if (!cancelled) setTranscriptStatus(s);
      if (!cancelled && s.status === 'processing') {
        setTimeout(check, 4000);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [videoId]);

  const handleTranscribe = useCallback(async () => {
    setTranscriptStatus({ status: 'processing' });
    await transcriptionApi.start(videoId);
    const poll = async () => {
      const s = await transcriptionApi.get(videoId).catch(() => ({ status: 'none' as const }));
      setTranscriptStatus(s);
      if (s.status === 'processing') setTimeout(poll, 4000);
    };
    setTimeout(poll, 4000);
  }, [videoId]);

  const handlePlayerReady = useCallback((player: Player) => { playerRef.current = player; }, []);
  const handleTimeUpdate  = useCallback((time: number) => { setCurrentTime(time); }, []);

  const handleAddTag = useCallback(async (noteId: number, tagName: string) => {
    const existing = allTags.find((t) => t.name === tagName.toLowerCase().trim());
    const tag = existing ?? await createTag(tagName);
    await addTagToNote(noteId, tag.id);
  }, [allTags, createTag, addTagToNote]);

  const handleSeek = useCallback((timestamp: number) => {
    playerRef.current?.currentTime(timestamp);
    playerRef.current?.play();
  }, []);

  const handleExport = useCallback(async (format: ExportFormat) => {
    setExportOpen(false);
    const blob = await videosApi.exportNotes(videoId, format);
    const safe = (video?.title ?? 'notes').replace(/[^a-z0-9_\-]/gi, '_').slice(0, 60);
    triggerDownload(blob, `${safe}.${EXPORT_EXTENSIONS[format]}`);
  }, [videoId, video?.title]);

  if (videoLoading) {
    return (
      <div className="player-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (videoError || !video) {
    return (
      <div className="player-layout" style={{ padding: '2rem', flexDirection: 'column', gap: '1rem' }}>
        <div className="error-banner">{videoError?.message ?? 'Video not found.'}</div>
        <button className="btn btn--secondary" onClick={() => navigate('/')}>← Back to library</button>
      </div>
    );
  }

  return (
    <div className="player-layout">
      {/* Left — video + meta */}
      <div className="player-main">
        <VideoPlayer
          src={`/api/videos/${videoId}/stream`}
          onTimeUpdate={handleTimeUpdate}
          onPlayerReady={handlePlayerReady}
        />
        <div className="player-meta">
          <button
            className="btn btn--ghost btn--sm"
            style={{ marginBottom: '0.5rem', paddingLeft: 0 }}
            onClick={() => navigate('/')}
          >
            ← Library
          </button>
          <h1 className="player-meta__title">{video.title}</h1>
          <div className="player-meta__sub">
            {video.duration != null && <span>{formatTime(video.duration)}</span>}
            <span>{formatDate(video.created_at)}</span>
            {video.description && <span>{video.description}</span>}
          </div>

          <div className="transcript-bar">
            {transcriptStatus.status === 'none' && (
              <button className="btn btn--ghost btn--sm" onClick={handleTranscribe}>
                ✦ Transcribe
              </button>
            )}
            {transcriptStatus.status === 'processing' && (
              <span className="transcript-bar__status">
                <span className="spinner spinner--sm" /> Transcribing…
              </span>
            )}
            {transcriptStatus.status === 'done' && (
              <span className="transcript-bar__status transcript-bar__status--done">
                ✓ Transcript ready — AI context enhanced
                <button className="btn btn--ghost btn--sm" onClick={handleTranscribe} style={{ marginLeft: '0.5rem' }}>
                  Re-transcribe
                </button>
              </span>
            )}
            {transcriptStatus.status === 'error' && (
              <span className="transcript-bar__status transcript-bar__status--error">
                Transcription failed: {transcriptStatus.error}
                <button className="btn btn--ghost btn--sm" onClick={handleTranscribe} style={{ marginLeft: '0.5rem' }}>
                  Retry
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right — tabbed sidebar */}
      <aside className="note-panel">
        {/* Tab bar */}
        <div className="note-panel__header">
          <div className="side-tabs">
            <button
              className={`side-tab${sideTab === 'notes' ? ' side-tab--active' : ''}`}
              onClick={() => setSideTab('notes')}
            >
              Notes
              {notes.length > 0 && (
                <span className="side-tab__count">{notes.length}</span>
              )}
            </button>
            <button
              className={`side-tab${sideTab === 'ai' ? ' side-tab--active' : ''}`}
              onClick={() => setSideTab('ai')}
            >
              ✦ AI
            </button>
          </div>
          {sideTab === 'notes' && notes.length > 0 && (
            <div className="export-menu">
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => setExportOpen((o) => !o)}
                title="Export notes"
              >
                ↓ Export
              </button>
              {exportOpen && (
                <div className="export-menu__dropdown">
                  <button onClick={() => handleExport('md')}>Markdown (.md)</button>
                  <button onClick={() => handleExport('txt')}>Plain text (.txt)</button>
                  <button onClick={() => handleExport('pdf')}>PDF (.pdf)</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes pane */}
        {sideTab === 'notes' && (
          <>
            <div className="note-panel__list">
              {notesLoading ? (
                <div className="empty-state"><div className="spinner" /></div>
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
                    onUpdate={updateNote}
                    onDelete={removeNote}
                    onAddTag={handleAddTag}
                    onRemoveTag={removeTagFromNote}
                  />
                ))
              )}
            </div>
            <div className="note-panel__composer">
              <NoteComposer currentTime={currentTime} onSave={addNote} />
            </div>
          </>
        )}

        {/* AI pane */}
        {sideTab === 'ai' && <AIPanel videoId={videoId} />}
      </aside>
    </div>
  );
}
