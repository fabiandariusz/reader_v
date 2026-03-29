import type { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

interface SearchResult {
  note_id: number;
  note_content: string;
  note_timestamp: number;
  video_id: number;
  video_title: string;
  thumbnail_path: string | null;
  tags: { id: number; name: string }[];
}

export async function searchNotes(req: Request, res: Response, next: NextFunction) {
  try {
    const q = (req.query.q as string ?? '').trim();

    if (!q) return res.json([]);

    const pattern = `%${q}%`;

    const { rows } = await pool.query<SearchResult>(`
      SELECT
        n.id            AS note_id,
        n.content       AS note_content,
        n.timestamp     AS note_timestamp,
        v.id            AS video_id,
        v.title         AS video_title,
        v.thumbnail_path,
        COALESCE(
          json_agg(json_build_object('id', t.id, 'name', t.name))
            FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tags
      FROM notes n
      JOIN videos v ON v.id = n.video_id
      LEFT JOIN note_tags nt ON nt.note_id = n.id
      LEFT JOIN tags t       ON t.id = nt.tag_id
      WHERE n.content ILIKE $1
         OR v.title   ILIKE $1
      GROUP BY n.id, v.id
      ORDER BY v.created_at DESC, n.timestamp ASC
      LIMIT 50
    `, [pattern]);

    res.json(rows);
  } catch (err) {
    next(err);
  }
}
