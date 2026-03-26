import type { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

async function noteWithTags(noteId: number) {
  const { rows } = await pool.query<Record<string, unknown>>(`
    SELECT n.*,
           COALESCE(
             json_agg(json_build_object('id', t.id, 'name', t.name))
               FILTER (WHERE t.id IS NOT NULL),
             '[]'
           ) AS tags
      FROM notes n
      LEFT JOIN note_tags nt ON nt.note_id = n.id
      LEFT JOIN tags t       ON t.id = nt.tag_id
     WHERE n.id = $1
     GROUP BY n.id
  `, [noteId]);
  return rows[0] ?? null;
}

export async function listNotes(req: Request, res: Response, next: NextFunction) {
  try {
    const videoId = Number(req.query.videoId);
    if (isNaN(videoId)) return res.status(400).json({ message: 'videoId query param required' });

    const { rows } = await pool.query<Record<string, unknown>>(`
      SELECT n.*,
             COALESCE(
               json_agg(json_build_object('id', t.id, 'name', t.name))
                 FILTER (WHERE t.id IS NOT NULL),
               '[]'
             ) AS tags
        FROM notes n
        LEFT JOIN note_tags nt ON nt.note_id = n.id
        LEFT JOIN tags t       ON t.id = nt.tag_id
       WHERE n.video_id = $1
       GROUP BY n.id
       ORDER BY n.timestamp ASC
    `, [videoId]);

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function getNote(req: Request, res: Response, next: NextFunction) {
  try {
    const note = await noteWithTags(Number(req.params.id));
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (err) {
    next(err);
  }
}

export async function createNote(req: Request, res: Response, next: NextFunction) {
  try {
    const { video_id, content, timestamp } = req.body as {
      video_id: number;
      content: string;
      timestamp: number;
    };

    if (!video_id || !content?.trim()) {
      return res.status(400).json({ message: 'video_id and content are required' });
    }

    const { rows } = await pool.query<Record<string, unknown>>(`
      INSERT INTO notes (video_id, content, timestamp)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [video_id, content.trim(), timestamp ?? 0]);

    const note = await noteWithTags((rows[0].id as number));
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
}

export async function updateNote(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { content } = req.body as { content: string };

    if (!content?.trim()) return res.status(400).json({ message: 'content is required' });

    const { rowCount } = await pool.query(
      'UPDATE notes SET content = $1 WHERE id = $2',
      [content.trim(), id]
    );

    if (!rowCount) return res.status(404).json({ message: 'Note not found' });

    const note = await noteWithTags(id);
    res.json(note);
  } catch (err) {
    next(err);
  }
}

export async function deleteNote(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { rowCount } = await pool.query('DELETE FROM notes WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ message: 'Note not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function addTagToNote(req: Request, res: Response, next: NextFunction) {
  try {
    const noteId = Number(req.params.id);
    const { tagId } = req.body as { tagId: number };

    await pool.query(
      'INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [noteId, tagId]
    );

    const note = await noteWithTags(noteId);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (err) {
    next(err);
  }
}

export async function removeTagFromNote(req: Request, res: Response, next: NextFunction) {
  try {
    const noteId = Number(req.params.id);
    const tagId  = Number(req.params.tagId);
    await pool.query(
      'DELETE FROM note_tags WHERE note_id = $1 AND tag_id = $2',
      [noteId, tagId]
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
