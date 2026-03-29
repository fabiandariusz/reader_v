# Reader V

An educational video learning app with timestamped note-taking. Watch videos and capture notes at specific moments — notes link back to the exact point in the video.

---

## Status

| Area | Status |
|---|---|
| Monorepo structure | Done |
| CSS design system | Done |
| Frontend — types & API layer | Done |
| Frontend — React hooks (CRUD) | Done |
| Frontend — components & pages | Done |
| Backend — Express + 15 endpoints | Done |
| Database schema (PostgreSQL) | Done |
| Redis caching layer | Done |
| Auth | Not required (local app) |
| AI provider abstraction (Claude, OpenAI, Gemini, Ollama) | Done |
| AI features — summary, concepts, quiz, chat | Done |
| Settings page (AI config UI) | Done |
| Video file serving (HTTP Range streaming) | Done |
| Online video support (YouTube + direct URLs) | Done |
| Drag-and-drop / file picker video upload | Done |
| Tags UI — add/remove tags on notes | Done |
| Transcript pipeline (Whisper, OpenAI Whisper, AssemblyAI) | Done |
| Development request logging (morgan) | Done |
| Thumbnail generation (ffmpeg frame extraction) | Done |
| Notes export (Markdown, Plain text, PDF) | Done |
| Full-text search across notes | Done |
| Video controls (skip ±10s, playback speed, resizable panel) | Done |
| Unit tests (Jest + Vitest) | Done |

---

## Tech Stack

- **Frontend** — React 18, TypeScript, Vite 8, React Router v6, Video.js, videojs-youtube, Axios
- **Backend** — Node.js, Express, TypeScript, ts-node-dev, multer
- **Database** — PostgreSQL (primary), Redis (cache)
- **Styling** — Custom CSS system, black/white theme
- **AI** — Claude (`@anthropic-ai/sdk`), OpenAI (`openai`), Gemini (`@google/generative-ai`), or Ollama (local LLM) — user-configurable
- **Transcription** — Whisper (local Python), OpenAI Whisper API (cloud), or AssemblyAI (cloud) — user-configurable

---

## Project Structure

```
reader_v/
├── frontend/
│   └── src/
│       ├── api/            # Axios wrappers (videos, notes, tags, settings, ai)
│       ├── components/     # VideoCard, VideoPlayer, NoteItem, NoteComposer,
│       │                   # AIPanel, AIChat, AddVideoModal, Header
│       ├── hooks/          # useVideos, useNotes, useTags, useSettings, useAIStream
│       ├── pages/          # LibraryPage, PlayerPage, SettingsPage
│       ├── styles/         # variables, reset, base, layout, components CSS
│       ├── types/          # Shared TypeScript interfaces
│       └── utils/          # Time formatting helpers
└── backend/
    └── src/
        ├── ai/             # types, claude.ts, openai.ts, gemini.ts, ollama.ts, factory.ts, prompts.ts
        ├── transcription/  # types, whisper.ts, openaiWhisper.ts, assemblyai.ts, factory.ts
        ├── services/       # thumbnailService.ts (ffmpeg frame extraction)
        ├── controllers/    # video, note, tag, settings, ai, transcription controllers
        ├── db/             # pool.ts (pg), redis.ts, schema.sql, init.ts
        ├── middleware/     # errorHandler, notFound
        └── routes/         # /api/videos, /api/notes, /api/tags, /api/settings, /api/ai, /api/transcription, /api/search
    uploads/
    ├── thumbnails/         # Generated JPEG thumbnails served at /thumbnails/:id.jpg
    └── videos/             # Uploaded video files (drag-and-drop / file picker)
```

---

## API Endpoints (15)

| Method | Path | Description |
|---|---|---|
| GET | `/api/videos` | List all videos (with note counts) |
| GET | `/api/videos/:id` | Get single video |
| POST | `/api/videos` | Add a video by file path or URL |
| POST | `/api/videos/upload` | Upload a video file (multipart/form-data) |
| PUT | `/api/videos/:id` | Update video title/description |
| DELETE | `/api/videos/:id` | Delete video + cascade notes |
| GET | `/api/notes?videoId=x` | List notes for a video |
| GET | `/api/notes/:id` | Get single note with tags |
| POST | `/api/notes` | Create note at timestamp |
| PUT | `/api/notes/:id` | Update note content |
| DELETE | `/api/notes/:id` | Delete note |
| POST | `/api/notes/:id/tags` | Attach tag to note |
| DELETE | `/api/notes/:id/tags/:tagId` | Remove tag from note |
| GET | `/api/tags` | List all tags |
| POST | `/api/tags` | Create tag |
| DELETE | `/api/tags/:id` | Delete tag |
| GET | `/api/settings` | Get AI settings (key masked) |
| PUT | `/api/settings` | Update AI settings |
| POST | `/api/settings/test` | Test AI provider connection |
| POST | `/api/ai/summarize` | Stream AI summary (SSE) |
| POST | `/api/ai/concepts` | Stream key concepts (SSE) |
| POST | `/api/ai/quiz` | Stream quiz questions (SSE) |
| POST | `/api/ai/chat` | Stream chat response (SSE) |
| GET | `/api/ai/summary/:videoId` | Get cached summary |
| GET | `/api/ai/quiz/:videoId` | Get cached quiz |
| GET | `/api/videos/:id/stream` | Stream local video file (HTTP Range) |
| POST | `/api/videos/:id/thumbnail` | Regenerate thumbnail for a video |
| GET | `/api/videos/:id/export` | Export notes as `?format=md\|txt\|pdf` |
| GET | `/api/search` | Search notes by content or video title (`?q=...`) |
| GET | `/api/transcription/:videoId` | Get transcript status / content |
| POST | `/api/transcription/:videoId` | Start transcription job |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL running locally
- Redis running locally (optional — app degrades gracefully without it)
- `ffmpeg` installed on the host system (for thumbnail generation) — `brew install ffmpeg`
- For local Whisper transcription: Python 3.8–3.11 + `pip install openai-whisper`
- For OpenAI Whisper / OpenAI AI provider: an OpenAI API key (configured in Settings)
- For AssemblyAI transcription: an AssemblyAI API key (configured in Settings)
- For Gemini AI provider: a Google AI Studio API key (configured in Settings)

### Setup

```bash
# 1. Install dependencies
cd frontend && npm install
cd ../backend && npm install

# 2. Configure environment
cp .env.example backend/.env
# Edit backend/.env with your Postgres credentials

# 3. Initialise database
cd backend && npm run db:init

# 4. Start both servers (two terminals)
cd backend  && npm run dev   # http://localhost:3001
cd frontend && npm run dev   # http://localhost:5173

# Run all tests (from repo root)
npm test
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PGHOST` | `localhost` | Postgres host |
| `PGPORT` | `5432` | Postgres port |
| `PGDATABASE` | `reader_v` | Database name |
| `PGUSER` | `postgres` | Postgres user |
| `PGPASSWORD` | _(empty)_ | Postgres password |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `PORT` | `3001` | Backend server port |

---

## Development Log

### 2026-03-29 — AI providers, transcription, video controls, and upload

- AI providers expanded to four: Claude (Anthropic), OpenAI, Gemini (Google), Ollama (local)
- OpenAI and Gemini model fields are free-text inputs — enter any model name
- Transcription expanded to three providers: Whisper (local Python), OpenAI Whisper API (cloud, reuses OpenAI key), AssemblyAI (cloud)
- Add Video modal redesigned: drag-and-drop zone, click-to-browse file picker (uploads to `uploads/videos/`), and Online URL tab for YouTube and direct video links
- YouTube playback fixed: `techOrder: ['youtube']` passed to Video.js when source is a YouTube URL
- Custom video controls bar: skip ±10s, playback speed (0.5×–2×)
- Resizable notes panel: drag the divider between video and sidebar (240–600px)
- Full-text search added: `GET /api/search?q=...` with a search input in the header

### 2026-03-29 — Transcript pipeline
- Dual transcription providers: Whisper (local Python) and AssemblyAI (cloud REST API)
- Same abstraction pattern as AI providers — swap in Settings, zero code changes
- Background async job with polling: `POST` to start, `GET` to check status every 4s
- Transcript stored in new `transcripts` table (`content` + `segments` JSONB)
- All four AI features (summary, concepts, quiz, chat) now inject transcript into the prompt when available, falling back to notes-only if no transcript exists yet
- Settings page extended with transcription provider toggle, Whisper model selector, and AssemblyAI key input

### 2026-03-28 — Tags UI + file serving + dev logging
- Tags UI: each note now has a `+ tag` inline input with native datalist autocomplete; find-or-create logic in PlayerPage keeps NoteItem simple
- Video file serving: `GET /api/videos/:id/stream` with HTTP 206 Range support — required for Video.js seeking; only DB-registered files are served
- Development request logging via `morgan` (`dev` format, disabled in production)

### 2026-03-27 — AI feature + Settings page
- Added AI provider abstraction supporting Claude API and Ollama (local LLM)
- Settings page at `/settings` to configure provider, API key, and model
- Four AI features in the player sidebar: Summary, Concepts, Quiz, Chat
- All AI responses stream token-by-token via SSE (no waiting for full response)
- Summaries and quizzes cached in PostgreSQL (`summaries`, `quizzes` tables)
- Claude uses `claude-opus-4-6` with adaptive thinking for best reasoning quality
- Ollama requires model to be pulled locally before use (`ollama pull <model>`)

### 2026-03-27 — Initial scaffold
- Bootstrapped monorepo from empty repo
- Built full CSS design system (black/white, note-taking optimised)
- Implemented all 15 backend REST endpoints
- Implemented all React components and pages
- Set up PostgreSQL schema with cascade deletes and auto `updated_at` triggers
- Redis used for short-lived video list cache (30s TTL), non-fatal if unavailable
