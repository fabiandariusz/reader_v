import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '@/components/VideoPlayer';
import NotePanel from '@/components/NotePanel';
import { useVideo } from '@/hooks/useVideos';
import { useNotes } from '@/hooks/useNotes';
import { formatTime, formatDate } from '@/utils/time';
import type Player from 'video.js/dist/types/player';

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const videoId = Number(id);
  const navigate = useNavigate();

  const { video, loading: videoLoading, error: videoError } = useVideo(videoId);
  const { notes, loading: notesLoading, addNote, updateNote, removeNote, removeTagFromNote } = useNotes(videoId);

  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<Player | null>(null);

  const handlePlayerReady = useCallback((player: Player) => {
    playerRef.current = player;
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
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
        <div className="error-banner">
          {videoError?.message ?? 'Video not found.'}
        </div>
        <button className="btn btn--secondary" onClick={() => navigate('/')}>
          ← Back to library
        </button>
      </div>
    );
  }

  return (
    <div className="player-layout">
      <div className="player-main">
        <VideoPlayer
          src={video.file_path}
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

      <NotePanel
        notes={notes}
        loading={notesLoading}
        currentTime={currentTime}
        player={playerRef.current}
        onAddNote={addNote}
        onUpdateNote={updateNote}
        onDeleteNote={removeNote}
        onRemoveTag={removeTagFromNote}
      />
    </div>
  );
}
