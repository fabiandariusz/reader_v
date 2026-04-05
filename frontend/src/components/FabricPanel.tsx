import { useState, useEffect, useRef, useCallback } from 'react';
import { fabricApi } from '@/api/fabric';

interface Props {
  videoId: number;
}

export default function FabricPanel({ videoId }: Props) {
  const [visiblePatterns, setVisiblePatterns] = useState<string[]>([]);
  const [search,          setSearch]          = useState('');
  const [selected,        setSelected]        = useState('');
  const [open,            setOpen]            = useState(false);
  const [inputType,       setInputType]       = useState<'transcript' | 'notes'>('transcript');
  const [output,          setOutput]          = useState('');
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const abortRef    = useRef<AbortController | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fabricApi.getPatterns(),
      fabricApi.getEnabledPatterns(),
    ]).then(([all, enabled]) => {
      setVisiblePatterns(enabled.length > 0 ? all.filter((p) => enabled.includes(p)) : all);
    }).catch(() => {
      fabricApi.getPatterns().then(setVisiblePatterns).catch(() => {});
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = visiblePatterns.filter((p) =>
    p.toLowerCase().includes(search.toLowerCase()),
  );

  const selectPattern = (p: string) => {
    setSelected(p);
    setSearch(p);
    setOpen(false);
  };

  const handleRun = useCallback(() => {
    if (!selected || loading) return;
    setOutput('');
    setError('');
    setLoading(true);

    abortRef.current = fabricApi.stream(
      videoId, selected, inputType,
      (token) => setOutput((prev) => prev + token),
      (_full) => setLoading(false),
      (msg)   => { setError(msg); setLoading(false); },
    );
  }, [videoId, selected, inputType, loading]);

  const handleCancel = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  return (
    <div className="ai-section">

      {/* Pattern selector */}
      <div className="fabric-field">
        <label className="form-label">Pattern</label>
        <div className="fabric-dropdown" ref={dropdownRef}>
          <input
            className="form-input"
            placeholder={visiblePatterns.length ? `Search ${visiblePatterns.length} patterns…` : 'Loading patterns…'}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); setSelected(''); }}
            onFocus={() => setOpen(true)}
          />
          {open && filtered.length > 0 && (
            <ul className="fabric-dropdown__list">
              {filtered.slice(0, 80).map((p) => (
                <li
                  key={p}
                  className={`fabric-dropdown__item${p === selected ? ' fabric-dropdown__item--active' : ''}`}
                  onMouseDown={() => selectPattern(p)}
                >
                  {p}
                </li>
              ))}
              {filtered.length > 80 && (
                <li className="fabric-dropdown__more">
                  {filtered.length - 80} more — keep typing to filter
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Input type */}
      <div className="fabric-field">
        <label className="form-label">Input</label>
        <div className="fabric-toggle">
          <button
            className={`fabric-toggle__btn${inputType === 'transcript' ? ' fabric-toggle__btn--active' : ''}`}
            onClick={() => setInputType('transcript')}
          >
            Transcript
          </button>
          <button
            className={`fabric-toggle__btn${inputType === 'notes' ? ' fabric-toggle__btn--active' : ''}`}
            onClick={() => setInputType('notes')}
          >
            Notes
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="ai-section__actions">
        <button
          className="btn btn--secondary btn--sm"
          onClick={handleRun}
          disabled={loading || !selected}
        >
          {loading ? 'Running…' : '⬡ Run Pattern'}
        </button>
        {loading && (
          <button className="btn btn--ghost btn--sm" onClick={handleCancel}>
            Cancel
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {output ? (
        <div className={`ai-output${loading ? ' ai-streaming' : ''}`}>{output}</div>
      ) : !loading && (
        <div className="empty-state">
          <span className="empty-state__icon">⬡</span>
          <p className="empty-state__text">
            Select a Fabric pattern and choose transcript or notes as input
          </p>
        </div>
      )}
    </div>
  );
}
