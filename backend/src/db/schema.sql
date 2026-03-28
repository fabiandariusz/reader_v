-- reader_v schema

CREATE TABLE IF NOT EXISTS videos (
  id             SERIAL PRIMARY KEY,
  title          TEXT        NOT NULL,
  description    TEXT,
  file_path      TEXT        NOT NULL,
  thumbnail_path TEXT,
  duration       NUMERIC,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id         SERIAL PRIMARY KEY,
  video_id   INTEGER     NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  timestamp  NUMERIC     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notes_video_id_idx ON notes(video_id);
CREATE INDEX IF NOT EXISTS notes_timestamp_idx ON notes(video_id, timestamp);

CREATE TABLE IF NOT EXISTS tags (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AI settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert defaults (idempotent)
INSERT INTO settings (key, value) VALUES
  ('ai_provider',    'claude'),
  ('claude_api_key', ''),
  ('claude_model',   'claude-opus-4-6'),
  ('ollama_base_url','http://localhost:11434'),
  ('ollama_model',   'llama3.2')
ON CONFLICT (key) DO NOTHING;

-- AI-generated summaries
CREATE TABLE IF NOT EXISTS summaries (
  id           SERIAL PRIMARY KEY,
  video_id     INTEGER     NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS summaries_video_id_uidx ON summaries(video_id);

-- AI-generated quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id           SERIAL PRIMARY KEY,
  video_id     INTEGER     NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  questions    JSONB       NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS quizzes_video_id_uidx ON quizzes(video_id);

-- Transcripts (Whisper or AssemblyAI)
CREATE TABLE IF NOT EXISTS transcripts (
  id           SERIAL PRIMARY KEY,
  video_id     INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  content      TEXT    NOT NULL,
  segments     JSONB   NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS transcripts_video_id_uidx ON transcripts(video_id);

-- Transcription settings defaults
INSERT INTO settings (key, value) VALUES
  ('transcription_provider', 'whisper'),
  ('whisper_model',          'base'),
  ('assemblyai_api_key',     '')
ON CONFLICT (key) DO NOTHING;
