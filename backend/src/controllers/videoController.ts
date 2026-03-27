import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import pool from '../db/pool';
import redis from '../db/redis';

const CACHE_TTL = 30; // seconds

export async function listVideos(req: Request, res: Response, next: NextFunction) {
  try {
    const cached = await redis.get('videos:all').catch(() => null);
    if (cached) return res.json(JSON.parse(cached));

    const { rows } = await pool.query<Record<string, unknown>>(`
      SELECT v.*,
             COUNT(n.id)::int AS note_count
        FROM videos v
        LEFT JOIN notes n ON n.video_id = v.id
       GROUP BY v.id
       ORDER BY v.created_at DESC
    `);

    await redis.setex('videos:all', CACHE_TTL, JSON.stringify(rows)).catch(() => null);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function getVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query<Record<string, unknown>>(`
      SELECT v.*,
             COUNT(n.id)::int AS note_count
        FROM videos v
        LEFT JOIN notes n ON n.video_id = v.id
       WHERE v.id = $1
       GROUP BY v.id
    `, [id]);

    if (!rows[0]) return res.status(404).json({ message: 'Video not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function createVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, file_path, description } = req.body as {
      title: string;
      file_path: string;
      description?: string;
    };

    if (!title?.trim() || !file_path?.trim()) {
      return res.status(400).json({ message: 'title and file_path are required' });
    }

    const { rows } = await pool.query<Record<string, unknown>>(`
      INSERT INTO videos (title, file_path, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [title.trim(), file_path.trim(), description?.trim() ?? null]);

    await redis.del('videos:all').catch(() => null);
    res.status(201).json({ ...rows[0], note_count: 0 });
  } catch (err) {
    next(err);
  }
}

export async function updateVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { title, description } = req.body as { title?: string; description?: string };

    const { rows } = await pool.query<Record<string, unknown>>(`
      UPDATE videos
         SET title       = COALESCE($1, title),
             description = COALESCE($2, description)
       WHERE id = $3
       RETURNING *
    `, [title?.trim() ?? null, description?.trim() ?? null, id]);

    if (!rows[0]) return res.status(404).json({ message: 'Video not found' });
    await redis.del('videos:all').catch(() => null);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function streamVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query<{ file_path: string }>(
      'SELECT file_path FROM videos WHERE id = $1',
      [id],
    );

    if (!rows[0]) return res.status(404).json({ message: 'Video not found' });

    const filePath = rows[0].file_path;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Video file not found on disk' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp4':  'video/mp4',
      '.webm': 'video/webm',
      '.ogg':  'video/ogg',
      '.mov':  'video/quicktime',
      '.mkv':  'video/x-matroska',
    };
    const contentType = mimeTypes[ext] ?? 'video/mp4';

    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end   = endStr ? parseInt(endStr, 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': chunkSize,
        'Content-Type':   contentType,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type':   contentType,
        'Accept-Ranges':  'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    next(err);
  }
}

export async function deleteVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { rowCount } = await pool.query('DELETE FROM videos WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ message: 'Video not found' });
    await redis.del('videos:all').catch(() => null);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
