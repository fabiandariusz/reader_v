import { useState, useEffect, useRef } from 'react';
import type Player from 'video.js/dist/types/player';
import { formatTime } from '@/utils/time';

interface Props {
  player: Player | null;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function VideoControls({ player }: Props) {
  const [playing,     setPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [volume,      setVolume]      = useState(1);
  const [muted,       setMuted]       = useState(false);
  const [speed,       setSpeed]       = useState(1);
  const [buffered,    setBuffered]    = useState(0);
  const [scrubPct,    setScrubPct]    = useState<number | null>(null);

  const progressRef = useRef<HTMLDivElement>(null);
  const isDragging  = useRef(false);

  useEffect(() => {
    if (!player) return;

    const syncPlay   = () => setPlaying(!player.paused());
    const syncTime   = () => { if (!isDragging.current) setCurrentTime(player.currentTime() ?? 0); };
    const syncDur    = () => setDuration(player.duration() ?? 0);
    const syncVol    = () => { setVolume(player.volume() ?? 1); setMuted(player.muted() ?? false); };
    const syncRate   = () => setSpeed(player.playbackRate() ?? 1);
    const syncBuf    = () => {
      const end = player.bufferedEnd();
      const dur = player.duration();
      if (dur) setBuffered((end / dur) * 100);
    };
    const syncEnded  = () => setPlaying(false);

    player.on('play',           syncPlay);
    player.on('pause',          syncPlay);
    player.on('timeupdate',     syncTime);
    player.on('durationchange', syncDur);
    player.on('volumechange',   syncVol);
    player.on('ratechange',     syncRate);
    player.on('progress',       syncBuf);
    player.on('ended',          syncEnded);

    // Sync initial state
    syncPlay(); syncTime(); syncDur(); syncVol(); syncRate();

    return () => {
      player.off('play',           syncPlay);
      player.off('pause',          syncPlay);
      player.off('timeupdate',     syncTime);
      player.off('durationchange', syncDur);
      player.off('volumechange',   syncVol);
      player.off('ratechange',     syncRate);
      player.off('progress',       syncBuf);
      player.off('ended',          syncEnded);
    };
  }, [player]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!player) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === ' ')           { e.preventDefault(); player.paused() ? player.play() : player.pause(); }
      if (e.key === 'ArrowLeft')   { e.preventDefault(); player.currentTime(Math.max(0, (player.currentTime() ?? 0) - 5)); }
      if (e.key === 'ArrowRight')  { e.preventDefault(); player.currentTime((player.currentTime() ?? 0) + 5); }
      if (e.key === 'm' || e.key === 'M') player.muted(!player.muted());
      if (e.key === 'f' || e.key === 'F') player.isFullscreen() ? player.exitFullscreen() : player.requestFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player]);

  // Progress bar drag-to-seek
  const getPct = (clientX: number) => {
    if (!progressRef.current) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const onProgressMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    setScrubPct(getPct(e.clientX));

    const onMove = (ev: MouseEvent) => setScrubPct(getPct(ev.clientX));
    const onUp   = (ev: MouseEvent) => {
      isDragging.current = false;
      const pct = getPct(ev.clientX);
      setScrubPct(null);
      if (player) player.currentTime(pct * (player.duration() ?? 0));
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  };

  const togglePlay = () => { if (!player) return; player.paused() ? player.play() : player.pause(); };
  const skip       = (d: number) => { if (!player) return; player.currentTime(Math.max(0, (player.currentTime() ?? 0) + d)); };
  const toggleMute = () => { if (!player) return; player.muted(!player.muted()); };

  const handleVolumeSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!player) return;
    const v = parseFloat(e.target.value);
    player.volume(v);
    player.muted(v === 0);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!player) return;
    player.playbackRate(parseFloat(e.target.value));
  };

  const toggleFullscreen = () => {
    if (!player) return;
    player.isFullscreen() ? player.exitFullscreen() : player.requestFullscreen();
  };

  const displayPct    = scrubPct !== null ? scrubPct * 100 : duration ? (currentTime / duration) * 100 : 0;
  const displayTime   = scrubPct !== null ? scrubPct * duration : currentTime;
  const volumeDisplay = muted ? 0 : volume;

  const volLabel = muted || volume === 0 ? '×♪' : volume < 0.5 ? '♪' : '♪♪';

  return (
    <div className="vc">
      {/* Seekable progress bar */}
      <div className="vc-progress" ref={progressRef} onMouseDown={onProgressMouseDown}>
        <div className="vc-progress__buffered" style={{ width: `${buffered}%` }} />
        <div className="vc-progress__played"   style={{ width: `${displayPct}%` }} />
        <div className="vc-progress__thumb"    style={{ left: `${displayPct}%` }} />
      </div>

      {/* Controls row */}
      <div className="vc-bar">
        <div className="vc-left">
          <button className="vc-btn vc-btn--play" onClick={togglePlay} title={playing ? 'Pause (Space)' : 'Play (Space)'}>
            {playing ? '⏸' : '▶'}
          </button>
          <button className="vc-btn" onClick={() => skip(-10)} title="Rewind 10s (←)">↺ 10</button>
          <button className="vc-btn" onClick={() => skip(10)}  title="Forward 10s (→)">↻ 10</button>

          <div className="vc-volume">
            <button className="vc-btn vc-btn--vol" onClick={toggleMute} title={muted ? 'Unmute (M)' : 'Mute (M)'}>
              {volLabel}
            </button>
            <input
              className="vc-volume__slider"
              type="range" min={0} max={1} step={0.02}
              value={volumeDisplay}
              onChange={handleVolumeSlider}
              title={`Volume ${Math.round(volumeDisplay * 100)}%`}
            />
          </div>

          <span className="vc-time">{formatTime(displayTime)} / {formatTime(duration)}</span>
        </div>

        <div className="vc-right">
          <select className="vc-speed" value={speed} onChange={handleSpeedChange} title="Playback speed">
            {SPEEDS.map((s) => (
              <option key={s} value={s}>{s === 1 ? '1× Speed' : `${s}×`}</option>
            ))}
          </select>
          <button className="vc-btn vc-btn--fs" onClick={toggleFullscreen} title="Fullscreen (F)">⛶</button>
        </div>
      </div>
    </div>
  );
}
