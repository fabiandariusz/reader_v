import type { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { getProvider } from '../ai/factory';
import { SYSTEM_BASE, summaryPrompt, conceptsPrompt, quizPrompt, chatPrompt } from '../ai/prompts';
import type { Note } from '../types';

// ── SSE helpers ────────────────────────────────────────────────────────────

function sseHeaders(res: Response) {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

function sseToken(res: Response, token: string) {
  res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
}

function sseDone(res: Response, full: string) {
  res.write(`data: ${JSON.stringify({ type: 'done', content: full })}\n\n`);
  res.end();
}

function sseError(res: Response, message: string) {
  res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
  res.end();
}

// ── Fetch video + notes ────────────────────────────────────────────────────

async function fetchVideoContext(videoId: number) {
  const [videoRes, notesRes, transcriptRes] = await Promise.all([
    pool.query<{ id: number; title: string; description: string | null }>(
      'SELECT id, title, description FROM videos WHERE id = $1', [videoId]
    ),
    pool.query<Note>(
      'SELECT id, video_id, content, timestamp FROM notes WHERE video_id = $1 ORDER BY timestamp ASC',
      [videoId]
    ),
    pool.query<{ content: string }>(
      'SELECT content FROM transcripts WHERE video_id = $1',
      [videoId]
    ),
  ]);

  const video = videoRes.rows[0];
  if (!video) throw new Error('Video not found');
  return {
    video,
    notes:      notesRes.rows,
    transcript: transcriptRes.rows[0]?.content ?? null,
  };
}

// ── POST /api/ai/summarize ────────────────────────────────────────────────

export async function streamSummary(req: Request, res: Response, _next: NextFunction) {
  sseHeaders(res);
  try {
    const videoId = Number(req.body.videoId);
    const { video, notes, transcript } = await fetchVideoContext(videoId);
    const provider = await getProvider();

    const system = SYSTEM_BASE;
    const prompt = summaryPrompt(video.title, video.description, notes, transcript);

    let full = '';
    for await (const token of provider.stream(system, prompt)) {
      full += token;
      sseToken(res, token);
    }

    // Upsert into summaries table
    await pool.query(
      `INSERT INTO summaries (video_id, content, generated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (video_id) DO UPDATE SET content = $2, generated_at = NOW()`,
      [videoId, full]
    );

    sseDone(res, full);
  } catch (err) {
    sseError(res, err instanceof Error ? err.message : 'AI error');
  }
}

// ── POST /api/ai/concepts ─────────────────────────────────────────────────

export async function streamConcepts(req: Request, res: Response, _next: NextFunction) {
  sseHeaders(res);
  try {
    const videoId = Number(req.body.videoId);
    const { video, notes, transcript } = await fetchVideoContext(videoId);
    const provider = await getProvider();

    const system = SYSTEM_BASE;
    const prompt = conceptsPrompt(video.title, notes, transcript);

    let full = '';
    for await (const token of provider.stream(system, prompt)) {
      full += token;
      sseToken(res, token);
    }

    sseDone(res, full);
  } catch (err) {
    sseError(res, err instanceof Error ? err.message : 'AI error');
  }
}

// ── POST /api/ai/quiz ─────────────────────────────────────────────────────

export async function streamQuiz(req: Request, res: Response, _next: NextFunction) {
  sseHeaders(res);
  try {
    const videoId = Number(req.body.videoId);
    const { video, notes, transcript } = await fetchVideoContext(videoId);
    const provider = await getProvider();

    const system = SYSTEM_BASE;
    const prompt = quizPrompt(video.title, notes, transcript);

    let full = '';
    for await (const token of provider.stream(system, prompt)) {
      full += token;
      sseToken(res, token);
    }

    // Try to parse + cache the quiz
    try {
      const jsonMatch = full.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        await pool.query(
          `INSERT INTO quizzes (video_id, questions, generated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (video_id) DO UPDATE SET questions = $2, generated_at = NOW()`,
          [videoId, JSON.stringify(questions)]
        );
      }
    } catch {
      // parsing failed — still send the raw text to the client
    }

    sseDone(res, full);
  } catch (err) {
    sseError(res, err instanceof Error ? err.message : 'AI error');
  }
}

// ── POST /api/ai/chat ─────────────────────────────────────────────────────

export async function streamChat(req: Request, res: Response, _next: NextFunction) {
  sseHeaders(res);
  try {
    const {
      videoId,
      message,
      history = [],
    } = req.body as {
      videoId: number;
      message: string;
      history: { role: 'user' | 'assistant'; content: string }[];
    };

    const { video, notes, transcript } = await fetchVideoContext(videoId);
    const provider = await getProvider();

    const { system, prompt } = chatPrompt(video.title, notes, history, message, transcript);

    let full = '';
    for await (const token of provider.stream(system, prompt)) {
      full += token;
      sseToken(res, token);
    }

    sseDone(res, full);
  } catch (err) {
    sseError(res, err instanceof Error ? err.message : 'AI error');
  }
}

// ── GET /api/ai/summary/:videoId ──────────────────────────────────────────

export async function getCachedSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows } = await pool.query(
      'SELECT content, generated_at FROM summaries WHERE video_id = $1',
      [Number(req.params.videoId)]
    );
    res.json(rows[0] ?? null);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/ai/quiz/:videoId ─────────────────────────────────────────────

export async function getCachedQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows } = await pool.query(
      'SELECT questions, generated_at FROM quizzes WHERE video_id = $1',
      [Number(req.params.videoId)]
    );
    res.json(rows[0] ?? null);
  } catch (err) {
    next(err);
  }
}
