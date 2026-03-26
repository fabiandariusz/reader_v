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

### Open questions / future decisions

| Topic | Question | Priority |
|---|---|---|
| File serving | How are local video files served to Video.js? Express static middleware? | High — needed before first playback test |
| Thumbnail generation | Auto-generate from video frame, or user-supplied path? | Medium |
| Export | Should notes be exportable (markdown, PDF)? | Low |
| Search | Full-text search across notes? | Low |
| Tags UI | Currently tags can be removed from notes; adding tags to notes from the UI is not yet wired (API exists) | Medium |
