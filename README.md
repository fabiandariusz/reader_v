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

---

## Tech Stack

- **Frontend** — React 18, TypeScript, Vite, React Router v6, Video.js, Axios
- **Backend** — Node.js, Express, TypeScript, ts-node-dev
- **Database** — PostgreSQL (primary), Redis (cache)
- **Styling** — Custom CSS system, black/white theme

---

## Project Structure

```
reader_v/
├── frontend/
│   └── src/
│       ├── api/            # Axios API wrappers (videos, notes, tags)
│       ├── components/     # VideoCard, VideoPlayer, NotePanel, NoteItem,
│       │                   # NoteComposer, AddVideoModal, Header
│       ├── hooks/          # useVideos, useNotes, useTags
│       ├── pages/          # LibraryPage, PlayerPage
│       ├── styles/         # variables, reset, base, layout, components CSS
│       ├── types/          # Shared TypeScript interfaces
│       └── utils/          # Time formatting helpers
└── backend/
    └── src/
        ├── controllers/    # videoController, noteController, tagController
        ├── db/             # pool.ts (pg), redis.ts, schema.sql, init.ts
        ├── middleware/     # errorHandler, notFound
        └── routes/         # /api/videos, /api/notes, /api/tags
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

### 2026-03-27 — Initial scaffold
- Bootstrapped monorepo from empty repo
- Built full CSS design system (black/white, note-taking optimised)
- Implemented all 15 backend REST endpoints
- Implemented all React components and pages
- Set up PostgreSQL schema with cascade deletes and auto `updated_at` triggers
- Redis used for short-lived video list cache (30s TTL), non-fatal if unavailable
