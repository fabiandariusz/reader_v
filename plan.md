# Reader V — Planning Log

A record of key architectural and product decisions made during development.
Entries are added each time significant new code is written.

---

## 2026-03-27 — Initial Scaffold

### Context
Empty repo. User described a 3-week MVP: educational video learning app with
timestamped note-taking, React 18 + TypeScript frontend, Node.js/Express backend,
PostgreSQL + Redis, Video.js for playback. No auth required — local application.

---

### Decision 1 — Monorepo layout
**Choice:** Single repo with `/frontend` and `/backend` sibling folders, plus a root
`package.json` with convenience scripts.

**Rationale:** Simple to clone and run. No need for a more complex workspace tool
(Turborepo, nx) at MVP scale. Vite dev server proxies `/api` to the Express backend,
so there are no CORS complexities in development.

**Trade-offs:** If the project grows to multiple services or a separate mobile client,
the repo will need restructuring. Acceptable for a 3-week MVP.

---

### Decision 2 — No authentication
**Choice:** Auth removed entirely. App runs as a local, single-user application.

**Rationale:** User confirmed auth is not required. Removing it eliminates the
login/register/JWT flow, reducing scope by roughly 30% and letting the MVP focus
on the core value: video + notes.

**Trade-offs:** Cannot be deployed as a multi-user web service without adding auth
later. All data is accessible to anyone who can reach the running server.

---

### Decision 3 — CSS system: custom properties, no framework
**Choice:** Plain CSS with CSS custom properties (variables), no Tailwind, no
CSS-in-JS, no component library.

**Rationale:** The design is intentionally minimal — black/white, reader-focused.
A full utility framework adds complexity for no visual gain here. Custom properties
give us a coherent token system (spacing, type scale, colour) that is easy to scan
and modify.

**Theme decisions:**
- Background `#ffffff` / panels `#fafafa` / hover `#f0f0f0`
- Text `#0a0a0a` (near-black, softer than pure black)
- Border `#d8d8d8`, strong border `#b0b0b0`
- No colour accents — timestamps use a subtle gray chip `#f0f0f0`
- Monospace font for timestamps only (readability, scanability)

**Trade-offs:** No pre-built components. All UI primitives are written by hand.
Acceptable because the component set is small and stable.

---

### Decision 4 — State management: React hooks only, no external store
**Choice:** `useState` + `useEffect` + `useCallback` inside custom hooks
(`useVideos`, `useNotes`, `useTags`). No Redux, Zustand, or React Query.

**Rationale:** The data graph is shallow — videos are independent of notes only
by `videoId`. No cross-page shared state is needed. Hooks co-located with their
data are easier to trace and debug than a global store at this scale.

**Trade-offs:** If notes need to be shown across multiple pages simultaneously
(e.g. a global note search), a shared store would be needed. Not a current
requirement.

---

### Decision 5 — Video.js as player
**Choice:** Video.js with the default skin overridden by app CSS.

**Rationale:** Specified by user. Video.js handles broad codec/format support and
has a stable API for programmatic control (`currentTime`, `play`, `src`). The
`VideoPlayer` component wraps it in a `useEffect` with cleanup to avoid double-
mount issues in React Strict Mode.

**Key detail:** Timestamp is captured when the user *focuses* the note textarea,
not when they press "Add note". This means the note is anchored to the moment they
started writing, which is more useful than when they finished.

---

### Decision 6 — PostgreSQL schema design
**Choice:** Four tables: `videos`, `notes`, `note_tags` (join), `tags`.
Notes cascade-delete when their parent video is deleted.

**Rationale:**
- Cascade on `video` → `notes` prevents orphaned notes.
- `note_tags` join table allows many-to-many tagging without duplication.
- `ON CONFLICT DO NOTHING` on `note_tags` insert makes tag attachment idempotent.
- `updated_at` auto-updated by a Postgres trigger rather than application code —
  one less thing to forget in every `UPDATE` path.
- Tags are lower-cased at insert (`name.trim().toLowerCase()`) and use
  `ON CONFLICT (name) DO UPDATE` to deduplicate.

**Indexes:** `notes(video_id)` and `notes(video_id, timestamp)` for fast note
retrieval sorted by playback position.

---

### Decision 7 — Redis as optional cache, not required dependency
**Choice:** Redis caches the video list (`videos:all`) with a 30-second TTL.
All Redis calls are wrapped in `.catch(() => null)` — failures are silently
swallowed.

**Rationale:** The video list is read on every page load and is the most
frequently hit query. Caching it avoids a DB round-trip on repeat visits.
Making Redis non-fatal means the app works correctly if Redis is not installed
or crashes, which is important for a local single-user setup where the operator
may not run Redis at all.

**Cache invalidation:** The cache key is deleted on every video `create`,
`update`, or `delete`. Simple key-based invalidation is sufficient at this scale.

---

### Decision 8 — API layer (frontend)
**Choice:** Thin Axios wrappers in `src/api/` — one file per resource. No
auto-generated client. Response interceptor normalises errors to `{ message, status }`.

**Rationale:** Keeps API calls explicit and easy to find. Avoids the overhead of
a code-gen pipeline for 15 endpoints. The normalised error shape is consumed
directly by hooks and surfaces cleanly to the UI.

---

---

## 2026-03-29 — Notes Export

### Decision 19 — Server-side export via GET /api/videos/:id/export?format=md|txt|pdf
**Choice:** Single endpoint on the video route. Backend fetches the video title/description +
all notes (with tags, ordered by timestamp) and renders the chosen format. Client receives a
`Content-Disposition: attachment` response and triggers a download via a temporary object URL.

**Formats:**
- **Markdown** — `# Title`, blockquote description, each note as `### [mm:ss]` heading with content and bold tag list, `---` separator.
- **Plain text** — same structure, no markdown syntax (underline title, bracketed timestamp, `Tags:` label).
- **PDF** — `pdfkit` (A4, 50pt margins): bold title, italic description, grey timestamp chip, body text, italic tags. Pipe directly to `res`.

**UI:** `↓ Export` ghost button in the notes panel header, visible only when the Notes tab is
active and there is at least one note. Clicking opens a three-item dropdown (Markdown, Plain text, PDF).
Dropdown closes on selection; filename is derived from the video title (sanitised, max 60 chars).

**No new dependency on the frontend** — blob download uses a temporary `<a>` element and
`URL.createObjectURL`. `pdfkit` added to the backend only.

---

## 2026-03-29 — Thumbnail Generation

### Decision 18 — ffmpeg frame extraction, async fire-and-forget
**Choice:** `thumbnailService.ts` uses `fluent-ffmpeg` to probe video duration and extract a
JPEG frame at 10% of duration. Called fire-and-forget from `createVideo` (response returns
immediately; thumbnail arrives seconds later). Manual regeneration available via
`POST /api/videos/:id/thumbnail`.

**Storage:** Thumbnails written to `backend/uploads/thumbnails/{videoId}.jpg`. Express serves
`uploads/thumbnails/` at `/thumbnails` as static files. Vite proxies `/thumbnails` to the
backend in development. The `thumbnail_path` stored in the DB is the URL path
(`/thumbnails/{videoId}.jpg`), not the filesystem path.

**Duration:** Also extracted from ffprobe metadata and stored in the `duration` column on the
same async pass. The `VideoCard` duration badge is now populated automatically.

**Failure handling:** All ffmpeg errors are swallowed — a video without a thumbnail is fully
functional. No retry logic; user can trigger regeneration manually.

**Prerequisite:** `ffmpeg` must be installed on the host system (`brew install ffmpeg`).

---

## 2026-03-29 — Transcript Pipeline

### Decision 16 — Dual transcription provider with shared abstraction
**Choice:** `TranscriptionProvider` interface with two implementations — `WhisperProvider`
(spawns `python3 -m whisper` as a subprocess) and `AssemblyAIProvider` (REST API with
file upload + polling). A `factory.ts` reads settings from the DB and returns the right one.
User configures provider in the Settings page.

**Rationale:** Same dual-provider pattern as AI (Claude/Ollama). Both providers normalise
output to `{ text, segments: [{start, end, text}] }` so the rest of the app is provider-agnostic.

**Job lifecycle:** `POST /api/transcription/:videoId` kicks off a background async job and
returns `{ status: 'processing' }` immediately. The frontend polls
`GET /api/transcription/:videoId` every 4 seconds until status is `done` or `error`.
In-memory job map (acceptable for local single-user app).

**AI context upgrade:** All four AI features (summary, concepts, quiz, chat) now fetch the
transcript from the DB and append it to the prompt. Notes remain in the prompt too — both
are passed. If no transcript exists yet, prompts fall back to notes only (unchanged behaviour).

**DB:** New `transcripts` table — `video_id` (unique), `content` (full text), `segments` (JSONB).

**Settings:** Three new keys — `transcription_provider`, `whisper_model`, `assemblyai_api_key`.
AssemblyAI key is masked in GET response (same as Claude key).

---

## 2026-03-28 — Dev Logging

### Decision 17 — Morgan for HTTP request logging in development
**Choice:** `morgan('dev')` middleware, gated behind `NODE_ENV !== 'production'`.

**Rationale:** No request logging existed — debugging API calls required guesswork.
`morgan` with the `dev` format logs method, path, status code, and response time on
every request. Gating on `NODE_ENV` keeps production output clean.

---

## 2026-03-28 — Tags UI

### Decision 15 — Inline tag input on NoteItem with find-or-create logic
**Choice:** Each note shows a `+ tag` button that expands into a small text input
with a native `<datalist>` for autocomplete against existing tags. On submit
(Enter or blur), `PlayerPage` checks if the tag name already exists in the global
tag list — if so it reuses it, otherwise it creates it — then calls `addTagToNote`.

**Rationale:**
- The tag API (`/api/tags` + `/api/notes/:id/tags`) was already complete; only
  the frontend UI was missing.
- Find-or-create in the parent (`PlayerPage`) keeps `NoteItem` simple — it only
  receives a `(noteId, tagName) => Promise<void>` callback and doesn't need to
  know about the global tag list internals.
- Native `<datalist>` gives autocomplete with zero dependencies and matches the
  project's "no component library" constraint.

---

## 2026-03-28 — File Serving

### Decision 14 — Streaming endpoint with HTTP Range support
**Choice:** `GET /api/videos/:id/stream` — looks up `file_path` from DB, streams
the file using `fs.createReadStream` with Range request support.

**Rationale:**
- Video.js requires HTTP 206 Partial Content (range requests) to support seeking.
  A plain `express.static` on a directory would also work, but anchoring the serve
  to the DB record means only registered videos are served — no arbitrary file access.
- The endpoint returns 404 if the DB row is missing or the file doesn't exist on disk,
  giving the user a clear error rather than a silent playback failure.
- `PlayerPage` now passes `/api/videos/:id/stream` as the `src` prop instead of the
  raw `file_path`, so the browser never needs to know the local path.

**MIME types supported:** mp4, webm, ogg, mov, mkv.

---

## 2026-03-27 — AI Feature + Settings Page

### Decision 9 — Dual AI provider with shared abstraction
**Choice:** `AIProvider` interface with two implementations — `ClaudeProvider`
(Anthropic SDK) and `OllamaProvider` (native fetch to local Ollama server).
A `factory.ts` reads settings from the DB and returns the right instance.

**Rationale:** The user explicitly wanted to support both a cloud API key and a
self-hosted local LLM. The abstraction keeps all AI controllers provider-agnostic
— swap the provider in settings and all four AI features (summary, concepts, quiz,
chat) use the new one instantly with zero code changes.

**Trade-offs:** Prompt behaviour may differ between Claude and Ollama models.
The quiz format relies on the model outputting valid JSON; smaller local models
may hallucinate structure. The JSON extraction uses a regex fallback `\[[\s\S]*\]`
to handle this gracefully, showing raw text if parsing fails.

---

### Decision 10 — Streaming via SSE (Server-Sent Events over POST)
**Choice:** All AI responses stream token-by-token from backend → frontend using
SSE (`text/event-stream`). The frontend reads the stream with `fetch` +
`ReadableStream` rather than the `EventSource` API.

**Rationale:** `EventSource` only supports GET — SSE over POST with `fetch` is
required for passing a JSON body. The stream protocol uses three event types:
`{type:"token", content:"…"}`, `{type:"done", content:"<full>"}`,
`{type:"error", message:"…"}`.

**Why stream at all:** AI responses for summaries and quizzes can take 10–30s.
Token-by-token streaming with a blinking cursor gives immediate feedback and
prevents the UI from looking frozen.

**AbortController:** The `useAIStream` hook holds an `AbortController` ref,
allowing in-flight requests to be cancelled when the user clicks Cancel or
switches tabs.

---

### Decision 11 — Claude uses `claude-opus-4-6` with adaptive thinking
**Choice:** `thinking: { type: "adaptive" }` with `max_tokens: 64000`.
No `budget_tokens` (deprecated on Opus 4.6).

**Rationale:** Adaptive thinking lets Claude decide how much reasoning depth is
warranted per request. Summary and quiz generation benefit from extended reasoning;
short chat replies do not. `adaptive` handles both without extra config.
`max_tokens: 64000` gives room for long summaries and multi-question quizzes without
hitting limits. Streaming is required at this token budget to avoid SDK HTTP timeouts.

---

### Decision 12 — Settings stored in PostgreSQL, not a config file
**Choice:** A `settings` key-value table in Postgres. Defaults seeded at `db:init`.
The API key is stored as plain text (acceptable for a local single-user app).

**Rationale:** Consistent with the rest of the app's storage. No extra config file
format to manage. Easy to read and update from the settings UI without a server
restart. The frontend never receives the raw API key — only the last-4 masked form
(`••••••••xxxx`).

**Trade-offs:** For a shared/deployed app, the key should be encrypted at rest.
Marked as a known limitation — acceptable for local use.

---

### Decision 13 — AI context uses notes (not transcripts)
**Choice:** Until transcription is built, AI prompts are constructed from the
video's title, description, and all timestamped notes.

**Rationale:** Notes are the user's own understanding of the content — arguably
the best signal for generating personalised summaries and quizzes. The prompts
(`prompts.ts`) explicitly label this as "learner's notes" so the AI stays grounded
in what the user actually captured rather than hallucinating video content.

**Trade-off:** AI quality is proportional to note quality and quantity. An empty
note list will yield a thin summary. **Update (2026-03-29):** transcript pipeline
is now built — when a transcript exists it is appended to all AI prompts, significantly
improving context quality regardless of note volume.

---

### Open questions / future decisions

| Topic | Question | Priority |
|---|---|---|
| ~~Thumbnail generation~~ | ~~Auto-generate from video frame, or user-supplied path?~~ | ~~Medium~~ — **Done** |
| ~~Export~~ | ~~Should notes be exportable (markdown, PDF)?~~ | ~~Low~~ — **Done** |
| ~~Export~~ | ~~Should notes be exportable (markdown, PDF)?~~ | ~~Low~~ — **Done** |
| Search | Full-text search across notes? | Low |
| Auth | Full plan doc includes auth — still deferred for local app | Low |
| ~~File serving~~ | ~~How are local video files served to Video.js?~~ | ~~High~~ — **Done** |
| ~~Transcript pipeline~~ | ~~Whisper or AssemblyAI for auto-transcription~~ | ~~High~~ — **Done** |
| ~~Tags UI~~ | ~~Adding tags to notes from the UI not yet wired~~ | ~~Medium~~ — **Done** |
