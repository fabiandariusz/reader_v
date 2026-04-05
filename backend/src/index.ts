// ── Load .env before any other import uses process.env ───────────────────
import fs   from 'fs';
import path from 'path';
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
}
// ─────────────────────────────────────────────────────────────────────────

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import videoRoutes    from './routes/videos';
import noteRoutes     from './routes/notes';
import tagRoutes      from './routes/tags';
import settingsRoutes from './routes/settings';
import aiRoutes            from './routes/ai';
import transcriptionRoutes from './routes/transcription';
import searchRoutes        from './routes/search';
import fabricRoutes        from './routes/fabric';
import { errorHandler, notFound } from './middleware/errorHandler';
import pool from './db/pool';
import { encrypt, SENSITIVE_KEYS } from './utils/crypto';

// ── Startup: re-encrypt any plain-text sensitive keys left in the DB ──────
async function migrateEncryption() {
  if (!process.env.ENCRYPTION_KEY) return;
  try {
    const keys  = [...SENSITIVE_KEYS];
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await pool.query<{ key: string; value: string }>(
      `SELECT key, value FROM settings WHERE key IN (${placeholders})`, keys,
    );
    for (const row of rows) {
      if (!row.value || row.value.startsWith('enc:')) continue;
      await pool.query('UPDATE settings SET value = $1 WHERE key = $2',
        [encrypt(row.value), row.key]);
    }
  } catch { /* non-fatal — app still works if migration fails */ }
}

const app  = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/thumbnails', express.static(path.join(__dirname, '../uploads/thumbnails')));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use('/api/videos',   videoRoutes);
app.use('/api/notes',    noteRoutes);
app.use('/api/tags',     tagRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/transcription', transcriptionRoutes);
app.use('/api/search',        searchRoutes);
app.use('/api/fabric',        fabricRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  migrateEncryption();
});
