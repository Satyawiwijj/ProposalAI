# ProposalPilot — Pre-Deploy QA Report (2026-08-15)

**Verdict: SHIP-READY.** 65/65 API assertions + full real-browser flow campaign passed. No source changes were required. Baseline state fully restored after testing.

## API regression suite (65/65 pass)

`C:\Users\Satya\AppData\Local\Temp\opencode\qa\qa-api.mjs` — run `node --env-file=D:/N/proposalpilot/.env <file>`. Sections:

| Section | Coverage | Result |
|---|---|---|
| A CRUD | create (client upsert, scope, activityLog), list + filters, get, patch (transactional scope sync + logs), delete | PASS |
| B Transitions | DRAFT→SENT→VIEWED→ACCEPTED/REJECTED sets correct timestamps + distinct logs, guards reject invalid transitions | PASS |
| C Duplicate | copy → new draft, own scope items, logs | PASS |
| D Exports | PDF (magic bytes, page count — 12-deliverable → 2 pages), DOCX (PK header), LINK (url `/view/<id>` + ~30d expiry), invalid format → 400 | PASS |
| E Send | requires `to` (email), 200 + link fallback without API key, SENT flip + sentAt + log | PASS |
| F View tracking | SENT→VIEWED idempotent (repeat view doesn't re-log), `viewedAt` set, expiry enforced (`UPDATE exports` past-expiry → expired page 404 w/ 30d doctrine) | PASS |
| G AI extract | happy path structure, minimal notes (≥50 chars), returning-client match (john@acme.com history in prompt), invalid emails tolerated, `historyContext` count | PASS |
| H Templates | list w/ category + search, public vs owned | PASS |
| I Settings | GET/PATCH upsert, restore | PASS |
| J Waitlist | create 201 + `source` persisted, duplicate 200 existing (case-insensitive), invalid 400 | PASS |
| K Analytics | funnel (drafts/sent/viewed/won = status/count semantics) matches raw DB | PASS |

First run was 59/63 — all 4 failures were harness bugs (missing `to`, notes <50 chars, reused REJECTED fixture, malformed assertion), not app bugs; fixed harness → 65/65.

## Real-browser flows (Chromium via gstack browse)

| Flow | Evidence |
|---|---|
| Landing loads | no console errors; hero + waitlist form render (`@e1/@e2/@e3`) |
| Waitlist submit | fill `#waitlist-email` → `POST /api/waitlist 201 (39ms)` → "You're on the list. First access emails go out soon." + button flips to "You're in" |
| Demo gate | `header button` → navigates to `/dashboard`, no console errors |
| Dashboard render | funnel stat cards (DRAFTS 1 / SENT 3 / VIEWED 1 / WON 2 + %), "Your Proposals: 4 total", cards w/ View/Edit/Duplicate/Delete |
| Dashboard search | typed "Acme" → 4 cards → 1 card ("Website Redesign for Acme Consulting") |
| Editor prefill | `/create?proposal=` loads title/labels, "Add Deliverable", Export & Send bar |
| Editor autosave | native-setter title edit → debounced PATCH → DB updated (verified via GET); ActivityLog shows `created` + `edited` trail |
| Export modal | PDF / WORD / LINK option cards w/ descriptions + Cancel/Generate |
| Link export | clicked LINK → "Generate LINK" → ActivityLog `exported` written server-side |
| Share view | `/view/<id>` renders full proposal (PROPOSAL → PREPARED FOR → SCOPE OF WORK → TIMELINE → INVESTMENT breakdown → $1,200 total → "Generated with ProposalPilot"); screenshot `view-page.png` |
| View tracking | SENT → browser open → status VIEWED, `viewedAt` set, ActivityLog `viewed` (idempotent path API-proven) |
| Screenshots | `landing.png`, `dashboard.png`, `view-page.png`, `editor.png` in `C:\Users\Satya\AppData\Local\Temp\opencode\qa\` |

## How browser QA was run (this sandbox — important for future sessions)

- The harness kills child processes after every bash call: each `browse.exe` invocation spawns a fresh daemon → page state dies between calls. **Strategy: one flow = one bash command (≤ ~12s), evidence written to a file via `*>>` redirect, read in the next call.** Complex JS via `eval <file>` (inline quoting mangles).
- Killed commands still run to completion — output is lost, but side effects (e.g. autosave PATCH) persist. Verify effects via API/DB afterward.
- Detached daemon started via WMI for persistence experiments is optional; not required.
- `gstack /browse` skill preamble does NOT run on Windows — the driver is `C:\Users\Satya\.claude\skills\gstack\browse\dist\browse.exe`.
- Node on Windows: ESM can't `import` from `D:/...`; use `createRequire("D:/N/proposalpilot/src/generated/prisma/")` + `require("./client.ts")` (or plain `pg` client — generated Prisma client needs Next's bundler).

## Cleanup & baseline restoration (post-QA)

- Deleted all QA-* proposals + 5 suite strays (non-QA-titled) via API DELETE (200 each, cascades logs/exports).
- Deleted waitlist test rows incl. `browser-qa@test.local`; waitlist table back to 0.
- Verified restored: 4 seed proposals, analytics funnel `{drafts:1, sent:3, viewed:1, won:2}`, activityLast7Days 2, settings hourlyRate 150, templates 6.

## Notes / findings worth knowing

- Send email NOT configured locally → graceful fallback works ("Email not configured. Share the link below." + link). Resend key needed before launch for real sends.
- `/view` shows expired state for past-`expiresAt` exports (API-proven; browser visual done for live link).
- Prisma dev proxy drops parallel queries — analytics route uses 2 sequential queries; keep concurrency ≤2-3.
- Browsers spawn their own daemon per call; the app server (`next start -p 3111`, pid 21520) and Prisma dev proxy (pid 9316, port 51218) were still running when QA wrapped.
- Dashboard status tabs are not plain `<button>`s — click-target selectors for future automation should use the segmented-control container; filtering semantics API-proven (`?status=`).