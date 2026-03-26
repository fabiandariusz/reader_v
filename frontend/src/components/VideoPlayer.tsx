import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import type Player from 'video.js/dist/types/player';

interface Props {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
  onPlayerReady?: (player: Player) => void;
}

export default function VideoPlayer({ src, onTimeUpdate, onPlayerReady }: Props) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const videoEl = document.createElement('video');
    videoEl.className = 'video-js vjs-theme-custom';
    videoRef.current.appendChild(videoEl);

    const player = videojs(videoEl, {
      controls: true,
      responsive: true,
      fluid: false,
      preload: 'metadata',
      sources: [{ src, type: inferType(src) }],
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

  return <div className="video-player-wrap" ref={videoRef} />;
}

function inferType(src: string): string {
  if (src.endsWith('.mp4')) return 'video/mp4';
  if (src.endsWith('.webm')) return 'video/webm';
  if (src.endsWith('.ogg')) return 'video/ogg';
  if (src.endsWith('.m3u8')) return 'application/x-mpegURL';
  return 'video/mp4';
}
