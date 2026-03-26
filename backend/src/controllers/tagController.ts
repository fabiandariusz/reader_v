import type { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

export async function listTags(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows } = await pool.query('SELECT * FROM tags ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function createTag(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = req.body as { name: string };
    if (!name?.trim()) return res.status(400).json({ message: 'name is required' });

    const { rows } = await pool.query<Record<string, unknown>>(`
      INSERT INTO tags (name)
      VALUES ($1)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING *
    `, [name.trim().toLowerCase()]);

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteTag(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await pool.query('DELETE FROM tags WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
