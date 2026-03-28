import type { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { getTranscriptionProvider } from '../transcription/factory';

type JobStatus = { status: 'processing' } | { status: 'error'; error: string };

// In-memory job map — fine for a local single-user app
const jobs = new Map<number, JobStatus>();

export async function getTranscript(req: Request, res: Response, next: NextFunction) {
  try {
    const videoId = Number(req.params.videoId);

    const job = jobs.get(videoId);
    if (job) return res.json(job);

    const { rows } = await pool.query(
      'SELECT content, segments, generated_at FROM transcripts WHERE video_id = $1',
      [videoId]
    );

    if (!rows[0]) return res.json({ status: 'none' });
    return res.json({ status: 'done', transcript: rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function startTranscription(req: Request, res: Response, next: NextFunction) {
  try {
    const videoId = Number(req.params.videoId);

    if (jobs.get(videoId)?.status === 'processing') {
      return res.json({ status: 'processing' });
    }

    const { rows } = await pool.query<{ file_path: string }>(
      'SELECT file_path FROM videos WHERE id = $1',
      [videoId]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Video not found' });

    jobs.set(videoId, { status: 'processing' });
    res.json({ status: 'processing' });

    // Run in background
    (async () => {
      try {
        const provider = await getTranscriptionProvider();
        const result   = await provider.transcribe(rows[0].file_path);

        await pool.query(
          `INSERT INTO transcripts (video_id, content, segments, generated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (video_id) DO UPDATE SET content = $2, segments = $3, generated_at = NOW()`,
          [videoId, result.text, JSON.stringify(result.segments)]
        );

        jobs.delete(videoId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Transcription failed';
        jobs.set(videoId, { status: 'error', error: msg });
      }
    })();
  } catch (err) {
    next(err);
  }
}
