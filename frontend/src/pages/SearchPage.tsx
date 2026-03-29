import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchApi } from '@/api/search';
import { formatTime } from '@/utils/time';
import type { SearchResult } from '@/types';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') ?? '';

  const [results,  setResults]  = useState<SearchResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }

    let cancelled = false;
    setLoading(true);
    setError(null);

    searchApi.search(q)
      .then((data) => { if (!cancelled) setResults(data); })
      .catch(() => { if (!cancelled) setError('Search failed. Is the backend running?'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [q]);

  return (
    <div className="search-page">
      <div className="search-page__header">
        <h1 className="search-page__title">
          {q ? <>Results for <em>"{q}"</em></> : 'Search'}
        </h1>
        {!loading && q && (
          <span className="search-page__count">
            {results.length} {results.length === 1 ? 'note' : 'notes'}
          </span>
        )}
      </div>

      {loading && <div className="empty-state"><div className="spinner" /></div>}

      {error && <div className="error-banner">{error}</div>}

      {!loading && !error && q && results.length === 0 && (
        <div className="empty-state">
          <span className="empty-state__icon">✎</span>
          <p className="empty-state__text">No notes match "{q}".</p>
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="search-results">
          {results.map((r) => (
            <div
              key={r.note_id}
              className="search-result"
              onClick={() => navigate(`/player/${r.video_id}`)}
            >
              <div className="search-result__thumb">
                {r.thumbnail_path
                  ? <img src={r.thumbnail_path} alt={r.video_title} />
                  : <span>▶</span>
                }
              </div>
              <div className="search-result__body">
                <div className="search-result__video">{r.video_title}</div>
                <div className="search-result__content">{r.note_content}</div>
                {r.tags.length > 0 && (
                  <div className="search-result__tags">
                    {r.tags.map((t) => (
                      <span key={t.id} className="tag">{t.name}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="search-result__timestamp">
                {formatTime(r.note_timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
