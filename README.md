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
| AI provider abstraction (Claude + Ollama) | Done |
| AI features — summary, concepts, quiz, chat | Done |
| Settings page (AI config UI) | Done |

---

## Tech Stack

- **Frontend** — React 18, TypeScript, Vite, React Router v6, Video.js, Axios
- **Backend** — Node.js, Express, TypeScript, ts-node-dev
- **Database** — PostgreSQL (primary), Redis (cache)
- **Styling** — Custom CSS system, black/white theme
- **AI** — Claude API (`@anthropic-ai/sdk`) or Ollama (local LLM), user-configurable

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
        ├── ai/             # types, claude.ts, ollama.ts, factory.ts, prompts.ts
        ├── controllers/    # video, note, tag, settings, ai controllers
        ├── db/             # pool.ts (pg), redis.ts, schema.sql, init.ts
        ├── middleware/     # errorHandler, notFound
        └── routes/         # /api/videos, /api/notes, /api/tags, /api/settings, /api/ai
```

---

## API Endpoints (15)

| Method | Path | Description |
|---|---|---|
| GET | `/api/videos` | List all videos (with note counts) |
| GET | `/api/videos/:id` | Get single video |
| POST | `/api/videos` | Add a video |
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

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL running locally
- Redis running locally (optional — app degrades gracefully without it)

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
