import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import pool from '../db/pool';
import redis from '../db/redis';

const THUMBNAILS_DIR = path.join(__dirname, '../../uploads/thumbnails');

function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration ?? 0);
    });
  });
}

function extractFrame(filePath: string, outputPath: string, seekSeconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .seekInput(seekSeconds)
      .frames(1)
      .size('640x?')
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

export async function generateThumbnail(videoId: number, filePath: string): Promise<void> {
  if (!fs.existsSync(filePath)) return;

  try {
    const duration = await probeDuration(filePath);
    const seekAt = duration > 0 ? duration * 0.1 : 1;
    const outputPath = path.join(THUMBNAILS_DIR, `${videoId}.jpg`);

    await extractFrame(filePath, outputPath, seekAt);

    await pool.query(
      'UPDATE videos SET thumbnail_path = $1, duration = $2 WHERE id = $3',
      [`/thumbnails/${videoId}.jpg`, Math.round(duration), videoId],
    );

    await redis.del('videos:all').catch(() => null);
  } catch {
    // Non-fatal — video is still accessible without a thumbnail
  }
}
