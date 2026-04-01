import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import 'videojs-youtube';
import type Player from 'video.js/dist/types/player';

interface Props {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
  onPlayerReady?: (player: Player) => void;
  playerWidth?: string;
  playerMaxHeight?: string;
}

export default function VideoPlayer({ src, onTimeUpdate, onPlayerReady, playerWidth, playerMaxHeight }: Props) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const isYT   = isYouTube(src);
    const type   = inferType(src);

    const videoEl = document.createElement('video');
    videoEl.className = 'video-js vjs-theme-custom';
    videoRef.current.appendChild(videoEl);

    const player = videojs(videoEl, {
      controls: false,
      fluid:    false,
      fill:     true,
      preload:    'metadata',
      techOrder:  isYT ? ['youtube'] : ['html5'],
      sources:    [{ src, type }],
      // YouTube-specific options
      ...(isYT && {
        youtube: { ytControls: 0, rel: 0, modestbranding: 1 },
      }),
    });

    playerRef.current = player;

    player.ready(() => {
      onPlayerReady?.(player);
    });

    player.on('timeupdate', () => {
      onTimeUpdate?.(player.currentTime() ?? 0);
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update src without re-mounting the player
  useEffect(() => {
    if (playerRef.current && src) {
      playerRef.current.src({ src, type: inferType(src) });
    }
  }, [src]);

  const wrapStyle = {
    ...(playerWidth     ? { width: playerWidth } : {}),
    ...(playerMaxHeight ? { '--player-max-height': playerMaxHeight } : {}),
  } as React.CSSProperties;

  return <div className="video-player-wrap" ref={videoRef} style={wrapStyle} />;
}

function isYouTube(src: string) {
  return /youtube\.com|youtu\.be/.test(src);
}

function inferType(src: string): string {
  if (isYouTube(src)) return 'video/youtube';
  if (src.endsWith('.mp4') || src.includes('.mp4?')) return 'video/mp4';
  if (src.endsWith('.webm')) return 'video/webm';
  if (src.endsWith('.ogg'))  return 'video/ogg';
  if (src.endsWith('.m3u8')) return 'application/x-mpegURL';
  return 'video/mp4';
}
