# Changelog — Reader V

All notable changes to this project, ordered newest first.

---

## 2026-04-01

### fix: smooth sidebar resize via direct DOM updates (`d1889b2`)
- During drag, sidebar width is now applied directly to the DOM element instead of calling React state on every mouse move
- Eliminates per-pixel re-renders (which were causing jank by re-rendering the video player on each pixel)
- React state synced once on mouseup only

### feat: responsive video player layout (`a8e2418`)
- Video player wrapper uses `flex: 1 1 0` — grows to fill all available vertical space
- Video.js uses `fill: true` so the frame stretches to its container
- Meta/transcript area capped at `28vh` with `overflow-y: auto` — scrolls if content overflows
- Player column given `height: 100%` to correctly distribute vertical space between player and meta strip

### feat: YouTube-style video controls (`0c707d6`)
- Replaced old button-group controls with a full custom controls bar
- Seekable progress bar with drag-to-scrub and buffered indicator
- Play/Pause, Skip ±10s, Volume + Mute toggle, time display (current / total)
- Playback speed dropdown (0.5× – 2×), Fullscreen button
- Keyboard shortcuts: Space (play/pause), ← / → (seek ±5s), M (mute), F (fullscreen)
- Disabled Video.js built-in controls — all interaction through custom UI

### fix: resolve all TypeScript errors (`4d359d7`)
- Removed unused `useEffect` import in `NoteComposer`
- Widened `onUpdate` / `onSave` return types to `Promise<unknown>` — hooks returning `Promise<Note>` are now compatible
- Added `allTags` and `onAddTag` props to `NotePanel` to satisfy `NoteItem` requirements
- Added `playerWidth` / `playerMaxHeight` props to `VideoPlayer`
- Added W/H +/− controls to the player controls bar (width 30–100%, height 200–800px)

### feat: CSS variables for video player dimensions (`4eb737f`)
- Added `--player-width` and `--player-max-height` to `variables.css`
- Single place for a developer to resize the player without touching component or layout files

### docs: Fabric AI added to README (`31f61c8`)
- Status table, tech stack, API endpoints table, and development log updated with Fabric AI details

---

## 2026-03-29

### feat: Fabric AI pattern integration (`441167c`)
- New `⬡ Fabric` tab in the AI panel alongside Summary, Concepts, Quiz, and Chat
- Reads patterns directly from `~/.config/fabric/patterns/` — no `fabric` binary required
- 217 patterns available; searchable dropdown (80 shown, filters as you type)
- Input toggle: run pattern against video transcript or all timestamped notes
- Provider dispatch reads `DEFAULT_VENDOR` from `~/.config/fabric/.env` and routes to the matching SDK
- All responses stream token-by-token via SSE
- Dedicated `⬡ Fabric AI` settings card — vendor, model, API key, Ollama URL; writes to `~/.config/fabric/.env`
- Endpoints added: `GET /api/fabric/patterns`, `GET /api/fabric/config`, `PUT /api/fabric/config`, `POST /api/fabric/run`

### feat: OpenAI Whisper cloud transcription (`10c8cd2`)
- Added OpenAI Whisper API as a third transcription provider (alongside local Whisper and AssemblyAI)
- Reuses the OpenAI API key configured in AI settings
- No local Python required

### fix: OpenAI and Gemini model fields as free text (`9ceca9f`)
- Replaced model dropdowns with free-text inputs for OpenAI and Gemini
- Avoids stale model lists — enter any model name directly

### feat: online video support and file upload (`30ac0b6`)
- Add Video modal redesigned with two tabs: Upload File and Online URL
- Upload tab: drag-and-drop zone + file picker; files saved to `uploads/videos/`
- Online URL tab: supports YouTube and direct video links
- YouTube playback fixed: `techOrder: ['youtube']` passed to Video.js for YouTube sources

### feat: AI providers expanded — OpenAI and Gemini (`237a857`)
- Added OpenAI (`openai` SDK) and Gemini (`@google/generative-ai`) as AI providers
- All four providers (Claude, OpenAI, Gemini, Ollama) configurable in Settings

### feat: custom video controls — skip, speed, resizable panel (`f667024`)
- Skip ±10s buttons and 0.5×–2× speed selector operating directly on Video.js player
- Drag handle between video and notes sidebar for resizing (240–600px range)

### feat: full-text search (`2f16a0a`)
- `GET /api/search?q=...` — ILIKE search across `notes.content` and `videos.title`
- Search input in the header; results page shows video thumbnail, title, note content, tags, and timestamp
- Clicking a result navigates to `/player/:videoId`

### feat: thumbnail generation, notes export, unit tests (`75ed9b4`)
- `thumbnailService.ts` uses `fluent-ffmpeg` to extract a JPEG frame at 10% of video duration (fire-and-forget)
- Video duration also extracted and stored via ffprobe
- Manual thumbnail regeneration via `POST /api/videos/:id/thumbnail`
- Notes export via `GET /api/videos/:id/export?format=md|txt|pdf` — Markdown, plain text, PDF (pdfkit)
- Export button in the notes panel header (visible only when notes exist)
- Unit tests added (Jest + Vitest)

### feat: transcript pipeline (`eb7bd6a`)
- Dual transcription providers: Whisper (local Python subprocess) and AssemblyAI (cloud REST + polling)
- Background async job — `POST` to start, `GET` to poll status every 4s
- Transcript stored in new `transcripts` table (`content` + `segments` JSONB)
- All AI features (summary, concepts, quiz, chat) now inject transcript into prompts when available
- Settings page extended: transcription provider toggle, Whisper model selector, AssemblyAI key input

### chore: upgrade Vite to v8 (`06c0467`)

---

## 2026-03-28

### chore: morgan HTTP request logging (`1b818fb`)
- `morgan('dev')` middleware added, gated behind `NODE_ENV !== 'production'`

### feat: tags UI (`4e475cf`)
- Inline `+ tag` input on each note with native `<datalist>` autocomplete
- Find-or-create logic in `PlayerPage` — reuses existing tag or creates new one

### feat: video streaming with HTTP Range support (`5b1c7cb`)
- `GET /api/videos/:id/stream` — serves local video files with HTTP 206 Partial Content
- Required for Video.js seeking; only DB-registered files are served

---

## 2026-03-27

### feat: AI features + Settings page (`45671f4`)
- AI provider abstraction: Claude (Anthropic SDK) and Ollama (local LLM)
- Settings page at `/settings` — configure provider, API key, model
- Four AI features in the player sidebar: Summary, Concepts, Quiz, Chat
- All AI responses stream token-by-token via SSE with AbortController cancel support
- Claude uses `claude-opus-4-6` with adaptive thinking; summaries and quizzes cached in PostgreSQL

### feat: initial scaffold (`d66b4da`)
- Monorepo with `/frontend` (React 18, TypeScript, Vite, Video.js) and `/backend` (Node.js, Express, TypeScript)
- Full CSS design system — black/white theme, custom properties, no framework
- PostgreSQL schema: `videos`, `notes`, `note_tags`, `tags`, `settings`, `summaries`, `quizzes`
- Redis cache for video list (30s TTL, non-fatal if unavailable)
- All 15 REST endpoints implemented
- React hooks: `useVideos`, `useNotes`, `useTags`, `useSettings`, `useAIStream`
- Pages: Library, Player, Settings
