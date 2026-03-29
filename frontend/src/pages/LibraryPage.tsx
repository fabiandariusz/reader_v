import { useState } from 'react';
import VideoCard from '@/components/VideoCard';
import AddVideoModal from '@/components/AddVideoModal';
import { useVideos } from '@/hooks/useVideos';
import type { Video } from '@/types';

export default function LibraryPage() {
  const { videos, loading, error, addVideo, removeVideo, reload } = useVideos();
  const [showModal, setShowModal] = useState(false);

  const handleCreated = (_video: Video) => reload();

  if (loading) {
    return (
      <div className="library">
        <div className="spinner spinner--center" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="library">
        <div className="error-banner">
          Failed to load videos: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="library">
      <div className="library__header">
        <h1 className="library__title">Library</h1>
        <button className="btn btn--primary" onClick={() => setShowModal(true)}>
          + Add Video
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="library__empty">
          <span className="library__empty-icon">▶</span>
          <p>No videos yet. Add a video to get started.</p>
          <button className="btn btn--secondary" onClick={() => setShowModal(true)}>
            Add your first video
          </button>
        </div>
      ) : (
        <div className="library__grid">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} onDelete={removeVideo} />
          ))}
        </div>
      )}

      {showModal && (
        <AddVideoModal
          onSave={addVideo}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
