import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer   from '@/components/VideoPlayer';
import NoteItem      from '@/components/NoteItem';
import NoteComposer  from '@/components/NoteComposer';
import AIPanel       from '@/components/AIPanel';
import { useVideo }  from '@/hooks/useVideos';
import { useNotes }  from '@/hooks/useNotes';
import { formatTime, formatDate } from '@/utils/time';
import type Player from 'video.js/dist/types/player';

type SideTab = 'notes' | 'ai';

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const videoId = Number(id);
  const navigate = useNavigate();

  const { video, loading: videoLoading, error: videoError } = useVideo(videoId);
  const {
    notes, loading: notesLoading,
    addNote, updateNote, removeNote, removeTagFromNote,
  } = useNotes(videoId);

  const [currentTime, setCurrentTime] = useState(0);
  const [sideTab,     setSideTab]     = useState<SideTab>('notes');
  const playerRef = useRef<Player | null>(null);

  const handlePlayerReady = useCallback((player: Player) => { playerRef.current = player; }, []);
  const handleTimeUpdate  = useCallback((time: number) => { setCurrentTime(time); }, []);

  const handleSeek = useCallback((timestamp: number) => {
    playerRef.current?.currentTime(timestamp);
    playerRef.current?.play();
  }, []);

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
                    onSeek={handleSeek}
                    onUpdate={updateNote}
                    onDelete={removeNote}
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
