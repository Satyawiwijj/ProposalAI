# ProposalPilot — Revised Plan (post-audit)

> Status: **Phase A–E implemented, verified live 2026-08-15.** Full pre-deploy QA green (65/65 API + browser flows) — see `memory/qa-report.md`. Remaining: deployment (user-held) + launch + kill gate.

## Build log (what shipped)

- **A — Auto-context** ✅ `api/ai/extract`: fetches last 3 SENT/ACCEPTED proposals + matched client email from notes → few-shot in system prompt. Verified live: `_meta.historyContext: 2`, output terms matched seeded voice verbatim ("50% deposit on sign, 50% on delivery. Up to 3 rounds of revisions included.").
- **B — Tracking** ✅ `view/[id]`: enforces LINK `expiresAt` (renders expired page), idempotently flips SENT→VIEWED with `viewedAt` + ActivityLog. Verified live end-to-end.
- **C — Hygiene** ✅ PDF pagination fixed (12-deliverable proposal now exports 2 pages, verified via pdf-lib page count); placeholder strip extended (caught live "not mentioned"); `client@placeholder.app` removed (auto-save requires email); email HTML escaped; "2 seconds" claim removed.
- **D — Dead code** ✅ Deleted Sidebar/ExportModal/ProposalEditor/Spinner/Skeleton + all barrel index.ts (layout.tsx imports ToastProvider directly); removed `mockProposals` + duplicate interface, dead "Create Custom Template"/"Copy" buttons on templates, dead "Try example notes" checkbox. Components tree: ProposalCard, Button, Input, Modal, Toast only.
- **E — Funnel** ✅ `api/analytics` (2 queries only — 5 parallel counts hit the Prisma dev proxy connection limit, "Connection terminated unexpectedly") + 4 stat cards on dashboard. ActivityLog-based (also fixed seeded VIEWED proposal missing `viewedAt` via PATCH).
- Quality: tsc clean, lint clean, build passes, all smoke tests green.

## Reframe (what changed)

| Old assumption | Audit ground truth |
|---|---|
| MVP done, fork features = bolt-ons | App is generic; auto-context = 0% built |
| Tracking works | VIEWED auto-track + expiry unbuilt (bug #2) |
| Fix bugs → launch | Differentiators first, trust-blockers only, launch, kill gate |
| Build embeddings/RAG for "memory" | Few-shot from own history = 80% of benefit, 0 infra |

## Phase A — Build the differentiator: Auto-context (Day 1)

Extract route (`api/ai/extract/route.ts`) currently uses a static prompt. Change to:
- Query demo user's last 3 **SENT/ACCEPTED** proposals (title, scope titles, terms, pricing breakdown) + client history if the notes contain a matching client email (existing `Client` records).
- Inject as few-shot "Your past work" section in the system prompt: match tone/scope-detail style, calibrate pricing to that client's history, reuse terms structure.
- No embeddings, no vector DB, no new tables — ~30 lines + 1-2 queries.
- Explicitly NOT using drafts (noise) and NOT exposing other users' data (single-user demo anyway).

## Phase B — Finish the tracking story (Day 2)

`app/view/[id]/page.tsx` (server component):
- Check latest LINK `Export.expiresAt` → if expired, render the existing not-found page (makes "expires in 30 days" true).
- If proposal is SENT and not yet VIEWED → idempotently set status VIEWED + `viewedAt` + ActivityLog `viewed` (userId nullable → fine for public link).
- Dashboard + detail page already render status; no UI work needed.

## Phase C — Trust-blocking hygiene only (Day 3)

1. **Multi-page PDF bug** (HIGH): in `buildPdf`, `ensureSpace()` returns the new page but callers keep drawing on the original → overflow invisible. Capture returned page in a mutable `page` variable. Verify with a 10-item-scope proposal.
2. **AI placeholder leakage**: post-zod strip of /not specified|unknown|optional|not provided/i from client fields (live test proved the model violates the prompt).
3. **`client@placeholder.app` pollution** (create/page.tsx:177): only create/link a client when email exists; otherwise `clientId` null.
4. **Email HTML XSS** (send route): escape interpolated clientName/title.
5. Remove the "Average analysis: 2 seconds" claim (real: ~10s).

NOT in this phase: editor refactor, auth, billing, CRM, numbering scheme.

## Phase D — Dead code sweep (Day 4)

- **Delete** the 5 unwired components (`layout/Sidebar`, `proposal/ExportModal`, `proposal/ProposalEditor`, `ui/Spinner`, `ui/Skeleton`) — pages use working inline versions; two implementations = tax. Defer any editor refactor until post-validation.
- Delete dashboard `mockProposals` + duplicate `interface Proposal`; remove `eslint-disable` where no longer needed.
- Templates page: wire or remove "Create Custom Template" button + make "Copy" actually copy (POST /api/templates, ~20 lines) or drop the button.
- Remove the dead "Try example notes" checkbox.

## Phase E — Launch instrumentation + launch (Days 5-10)

- Funnel from existing ActivityLog (zero infra): dashboard counts created → sent → viewed → accepted + weekly digest stat. This is the adoption + conversion metric from the brief. ✅ Built (`api/analytics` + stat cards).
- Launch: Reddit (r/freelance, r/smallbusiness — honest before/after, not ads) + LinkedIn post. Pitch: "60-second proposal that learns your voice; knows when clients opened it." ✅ Posts drafted (`memory/launch-content.md`); waitlist infra built (landing `/` + `POST /api/waitlist` + `WaitlistEntry` w/ `source` tracking). ⏳ Not deployed yet — deployment is the only blocker to posting (user chose "don't deploy yet").
- Launch free. Price ($19/mo, per deep-challenge #2) comes at first renewal moment after validation — behavior first, price second; Stripe adds 3-5 days we don't have yet.
- Days 8-10: fix what users hit.

## Kill / continue gate (end of Week 2 — non-negotiable)

- Continue if: ≥10 signups AND ≥30% create ≥2 proposals AND ≥40% of sent links get VIEWED.
- **Stop if: <5 signups, or <15 proposals created, or repeat-usage ≈ 0.** The wedge's only real test is behavior (repeat creation + link opens). If the differentiator doesn't show there, kill or pivot — do not polish the generic product further.

## Anti-plan (what we deliberately don't do)

- Don't refactor create page onto ProposalEditor (works, browser-tested; launch window).
- Don't build RAG/embeddings (few-shot is honest v1; upgrade path exists when volume demands).
- Don't add auth (single-user demo; 3-5 days; post-validation).
- Don't add CRM/integrations/billing/invoicing (brief non-goals).
- Don't polish generic product beyond Phase C.
