# ProposalPilot — Project State Handoff

> Last updated: 2026-08-14. Repo: `D:\N\proposalpilot\`. Server: `http://localhost:3111` (port 3111), Postgres on port 51218 (Prisma dev server).

## What was built

**Stack:** Next.js 14 (App Router) + TypeScript + PostgreSQL (Prisma 7, driver adapter `@prisma/adapter-pg`) + Tailwind. Single-user MVP.

### Database (`prisma/schema.prisma`)
Models: User, Client, Proposal (`pricingBreakdown Json`, status timestamps), ProposalScopeItem (`order`, `hours`, `rate`), Template (`scopeItems Json`), Export (`expiresAt`), ActivityLog (`action`, `metadata`), UserSettings. Enums: `ProposalStatus` (DRAFT/SENT/VIEWED/ACCEPTED/REJECTED), `ExportFormat` (PDF/WORD/LINK). Seeded: demo user `demo@proposalpilot.dev`, 6 templates, 4 proposals.

### API routes (`src/app/api/**`)
- `proposals/route.ts` — GET list (status/search filters), POST create (client upsert + scope + "created" log)
- `proposals/[id]/route.ts` — GET (with activityLogs), PATCH (transactional scope sync, status → timestamps + distinct logs), DELETE
- `proposals/[id]/duplicate` — POST `(Copy)` draft
- `proposals/[id]/export` — PDF (pdf-lib), Word (docx), link (30-day expiry) + Export record + log
- `proposals/[id]/send` — Resend REST email, marks SENT + share link, **graceful fallback** (no key → returns link)
- `templates/route.ts` — GET (public + owned, category/search)
- `settings/route.ts` — GET + PATCH (upsert)
- `ai/extract/route.ts` — provider-agnostic NVIDIA-first AI extraction (prompt + validation hardened; invalid emails dropped, not fatal)

### Pages (`src/app/**`)
- `page.tsx` — Dashboard (DB-backed list/search/filter; Duplicate/Delete; View/Edit → `/proposals/[id]`)
- `templates/page.tsx` — DB-backed, category filters, "Use Template" → `/create?template=`
- `create/page.tsx` — AI analysis → editor → debounced auto-save; prefill via `?template=` or `?proposal=`; export download/share; send
- `settings/page.tsx` — DB-backed load/save
- `view/[id]/page.tsx` — public share page for LINK exports
- `proposals/[id]/page.tsx` — **proposal detail page** (client, scope, investment breakdown, terms, activity timeline, status transitions, Edit/Duplicate/Delete/Export)

### Quality gates
`npx tsc --noEmit` clean · `npx next lint` clean · `npm run build` passes (11 routes). All flows browser-tested. Test data cleaned up (4 seed proposals restored).

## Decision: Auth
Deferred to post-MVP (handoff T7 — "MVP is single-user; adding auth adds 3-5 days"). Auth not built intentionally.

## Remaining / planned
1. **Launch** — posts drafted (`memory/launch-content.md`), waitlist infra built. NOT deployed yet (user decision). Deploy (Railway recommended) + post when ready.
2. **Kill gate (week 2 of launch)** — continue only if ≥10 waitlist signups, ≥30% create ≥2 proposals, ≥40% of sent links VIEWED. (Note: with single-tenant demo, per-user behavior metrics need auth later — waitlist count + repeat demo traffic is the launch signal now.)
3. **Auth** — real login/session (when single-user MVP outgrown). Handoff T7.
4. **Live email** — add Resend key (`emailApiKey` in Settings → Integrations, or `RESEND_API_KEY` + `RESEND_FROM`) to actually send; otherwise graceful fallback returns share link.

## Built 2026-08-15 (post-audit)
- Auto-context: AI extract few-shots last 3 SENT/ACCEPTED proposals + matched client into the prompt (verified live).
- /view/[id]: enforces 30-day LINK expiry + auto VIEWED tracking (status, viewedAt, ActivityLog).
- PDF multi-page overflow fixed; AI placeholder strip; client-requires-email on autosave; email HTML escaped.
- Dead code removed: Sidebar/ExportModal/ProposalEditor/Spinner/Skeleton + barrels (layout.tsx imports ToastProvider directly), dashboard mockProposals, dead template buttons, dead checkbox.
- New `api/analytics` route (funnel: drafts/sent/viewed/won + 7-day activity) + dashboard stat cards. NOTE: keep query concurrency ≤2-3 — Prisma dev proxy drops parallel connections.

## Built 2026-08-15 (Phase E launch prep)
- **Landing page at `/`** — waitlist email form (POST `/api/waitlist`, dedupes case-insensitively, tracks `source` = reddit/linkedin/demo/direct for the kill gate) + "Open the demo →" gate. Dashboard moved to **`/dashboard`** (nav + back links in `proposals/[id]` updated).
- **`WaitlistEntry`** model added + synced (`npx prisma db push`). Verified live: new→201, duplicate→200 existing, invalid→400.
- **View waitlist emails:** no admin UI yet — query DB directly:
  `SELECT email, source, "createdAt" FROM waitlist_entries ORDER BY "createdAt" DESC;` (psql/`pg`). Defer an admin view until deploy.
- Launch posts drafted in `memory/launch-content.md`; `[demo-url]` = landing (`/`, has `#waitlist`), `[waitlist-url]` = same landing (form is on the page).

## Env / config notes
- `.env` holds `DATABASE_URL` for local Prisma dev server (port 51218) — gitignored.
- `.env.local` holds `NVIDIA_API_KEY` — gitignored.
- DB restart if down: `npx prisma dev --detach -n proposalpilot` (listens 51218).
- Server restart if down: `npx next start -p 3111`.
- Browser test driver: `C:\Users\Satya\.claude\skills\gstack\browse\dist\browse.exe` (bug: each bash call starts a fresh daemon at about:blank — chain goto→snapshot→click in ONE bash command).
## Built 2026-08-15 (pre-deploy QA)
- Full QA campaign GREEN: 65/65 API assertions + real-browser flows (landing, waitlist submit, demo gate, dashboard render + client-side search, editor prefill + debounced autosave, Export modal LINK flow, /view share rendering, SENT->VIEWED tracking). Full report: memory/qa-report.md. No source changes; baseline state restored (4 proposals, funnel {1,3,1,2}, activity 2, waitlist 0).
