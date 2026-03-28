import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import pool from '../db/pool';
import redis from '../db/redis';
import { generateThumbnail } from '../services/thumbnailService';

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
    const video = rows[0];
    res.status(201).json({ ...video, note_count: 0 });

    // Fire-and-forget: extract thumbnail + duration in the background
    generateThumbnail(video.id as number, video.file_path as string);
  } catch (err) {
    next(err);
  }
}

export async function regenerateThumbnail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query<{ file_path: string }>(
      'SELECT file_path FROM videos WHERE id = $1',
      [id],
    );

    if (!rows[0]) return res.status(404).json({ message: 'Video not found' });

    // Kick off async — respond immediately
    generateThumbnail(id, rows[0].file_path);
    res.json({ status: 'processing' });
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

// ── Export ─────────────────────────────────────────────────────────────────

type ExportFormat = 'md' | 'txt' | 'pdf';

export interface NoteRow {
  id: number;
  content: string;
  timestamp: number;
  tags: { id: number; name: string }[];
}

export function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function safeFilename(title: string): string {
  return title.replace(/[^a-z0-9_\-]/gi, '_').slice(0, 60);
}

export function buildMarkdown(title: string, description: string | null, notes: NoteRow[]): string {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  if (description) lines.push(`\n> ${description}`);
  lines.push('');

  if (notes.length === 0) {
    lines.push('_No notes yet._');
  } else {
    for (const note of notes) {
      lines.push(`### [${fmtTime(note.timestamp)}]`);
      lines.push('');
      lines.push(note.content);
      if (note.tags.length > 0) {
        lines.push('');
        lines.push(`**Tags:** ${note.tags.map((t) => t.name).join(', ')}`);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function buildText(title: string, description: string | null, notes: NoteRow[]): string {
  const lines: string[] = [];
  lines.push(title);
  lines.push('='.repeat(title.length));
  if (description) lines.push(`\n${description}`);
  lines.push('');

  if (notes.length === 0) {
    lines.push('No notes yet.');
  } else {
    for (const note of notes) {
      lines.push(`[${fmtTime(note.timestamp)}]`);
      lines.push(note.content);
      if (note.tags.length > 0) lines.push(`Tags: ${note.tags.map((t) => t.name).join(', ')}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

export async function exportNotes(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const format = (req.query.format as string ?? 'md') as ExportFormat;

    if (!['md', 'txt', 'pdf'].includes(format)) {
      return res.status(400).json({ message: 'format must be md, txt, or pdf' });
    }

    const { rows: videoRows } = await pool.query<{ title: string; description: string | null }>(
      'SELECT title, description FROM videos WHERE id = $1',
      [id],
    );
    if (!videoRows[0]) return res.status(404).json({ message: 'Video not found' });
    const { title, description } = videoRows[0];

    const { rows: notes } = await pool.query<NoteRow>(`
      SELECT n.id, n.content, n.timestamp,
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
    `, [id]);

    const filename = safeFilename(title);

    if (format === 'md') {
      const content = buildMarkdown(title, description, notes);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.md"`);
      return res.send(content);
    }

    if (format === 'txt') {
      const content = buildText(title, description, notes);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.txt"`);
      return res.send(content);
    }

    // PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    doc.pipe(res);

    doc.fontSize(22).font('Helvetica-Bold').text(title, { paragraphGap: 6 });
    if (description) {
      doc.fontSize(11).font('Helvetica-Oblique').fillColor('#555555').text(description, { paragraphGap: 12 });
    }
    doc.fillColor('#000000').moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(1);

    if (notes.length === 0) {
      doc.fontSize(11).font('Helvetica').text('No notes yet.');
    } else {
      for (const note of notes) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#777777')
          .text(`[${fmtTime(note.timestamp)}]`, { continued: false });
        doc.fontSize(12).font('Helvetica').fillColor('#000000')
          .text(note.content, { paragraphGap: 4 });
        if (note.tags.length > 0) {
          doc.fontSize(9).font('Helvetica-Oblique').fillColor('#555555')
            .text(`Tags: ${note.tags.map((t) => t.name).join(', ')}`, { paragraphGap: 4 });
        }
        doc.fillColor('#000000').moveDown(0.8);
      }
    }

    doc.end();
  } catch (err) {
    next(err);
  }
}
