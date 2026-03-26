import { useNavigate } from 'react-router-dom';
import { formatTime, formatDate } from '@/utils/time';
import type { Video } from '@/types';

interface Props {
  video: Video;
  onDelete: (id: number) => void;
}

export default function VideoCard({ video, onDelete }: Props) {
  const navigate = useNavigate();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${video.title}"? This will also delete all its notes.`)) {
      onDelete(video.id);
    }
  };

  return (
    <div className="video-card" onClick={() => navigate(`/player/${video.id}`)}>
      <div className="video-card__thumb">
        {video.thumbnail_path ? (
          <img src={video.thumbnail_path} alt={video.title} />
        ) : (
          <span>▶</span>
        )}
        {video.duration != null && (
          <span className="video-card__duration">{formatTime(video.duration)}</span>
        )}
      </div>
      <div className="video-card__body">
        <div className="video-card__title">{video.title}</div>
        <div className="video-card__meta">
          <span className="video-card__note-count">
            ✎ {video.note_count} {video.note_count === 1 ? 'note' : 'notes'}
          </span>
          <span>{formatDate(video.created_at)}</span>
          <button
            className="btn btn--ghost btn--sm"
            style={{ marginLeft: 'auto' }}
            onClick={handleDelete}
            title="Delete video"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
