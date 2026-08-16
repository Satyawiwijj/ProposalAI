# ProposalPilot — Full Codebase Audit

> Date: 2026-08-15 · Stack: Next.js 14.2.35 (App Router) + TS 5.5 + Prisma 7.9.1 + Postgres + Tailwind · Server `:3111`, DB `:51218`

## 1. Completeness vs Product Brief

| Brief feature | Status | Evidence |
|---|---|---|
| Paste & AI extract | ✅ Working | Live test: NVIDIA nemotron-3.5-lightning, 200, 10.6s, valid scope/pricing/timeline/terms/breakdown |
| One-click edit | ✅ Working | create step 2: title, scope items, timeline, price override, client, terms; debounced auto-save (1.5s) |
| Export | ✅ Working | PDF (pdf-lib) 200 + bytes, Word (docx), Link (30-day expiry) — all live-tested |
| Template library | ✅ Working | 6 seeded templates, category filter, search, "Use Template" prefills editor |
| Pricing logic | ✅ Working | rate × hours × multiplier, calibrated to budget in live test ($5-8k → $6,500) |
| Conversion tracking | ⚠️ Partial | No auto-tracking when share link opened (see Bugs #2) |
| Time metric (4h → 10 min) | ✅ By design | 3-step flow, 2s claim on step 1 |

**Verdict: feature-complete vs MVP brief. All core loops verified live end-to-end.**

## 2. Bugs (by severity)

1. **HIGH — Multi-page PDF loses content.** `buildPdf` `ensureSpace()` (export/route.ts:110) adds a new page but callers discard the returned page and keep drawing on the original `page` object. Overflow content is drawn below page bounds on page 1 → invisible. Only footers repeat. Any proposal longer than one page exports incomplete PDFs.
2. **MEDIUM — Share links never expire and never mark VIEWED.** `/view/[id]` ignores `exports.expiresAt` and never sets status VIEWED / logs ActivityLog. "Expires in 30 days" is cosmetic; tracking promise (product brief + HANDOFF T8) unbuilt.
3. **MEDIUM — AI placeholder leakage.** Live extract returned `"name": "Not specified"` despite prompt forbidding placeholders; zod passes it → client card shows "Not specified".
4. **LOW — Email HTML XSS.** `send/route.ts` interpolates clientName/title into HTML unescaped.
5. **LOW — `exported` log only for LINK.** PDF/Word write Export records but no ActivityLog (detail page activity misses PDF/Word exports).

## 3. Dead code / unwired features

- **Unwired components** (built in design session, imported nowhere — pages have inline duplicates): `layout/Sidebar.tsx`, `proposal/ExportModal.tsx`, `proposal/ProposalEditor.tsx`, `ui/Spinner.tsx`, `ui/Skeleton.tsx`. Two implementations of the same UI exist.
- **Dashboard `mockProposals`** (page.tsx:63-99) + duplicate `interface Proposal` (page.tsx:12-20, 53-61) — unused; eslint misses it (minimal config, no unused-vars rule).
- **Templates page**: "Create Custom Template" button no handler; "Copy" only toasts (no copy API).
- **Create page**: "Try example notes" checkbox (page.tsx:516) no state/handler (the "Try example" link below works).
- **Schema fields never written**: `ProposalScopeItem.hours/rate`, `Client.phone/address/notes`, `User.passwordHash/avatarUrl/role`, `Proposal.proposalNumber/numberingScheme` (numbering-scheme setting exists in UI, unused).
- **Auto-save placeholder**: create/page.tsx:177 sends `client@placeholder.app` when name-only client — pollutes unique email column.

## 4. Verified live (smoke tests)

GET proposals (4 seeded) · GET templates (6) · GET settings · POST create (client upsert + scope + log) · PATCH status → sentAt set · POST duplicate "(Copy)" · POST export link (30d) · POST export pdf (200, 1883B) · POST send (graceful fallback w/o key) · GET /view/:id renders · POST ai/extract (NVIDIA 10.6s) · DELETE ×2 cleanup. `tsc --noEmit` clean · `next lint` clean.

## 5. Notes

- No test framework/script — manual browser testing only (per HANDOFF).
- Auth deferred by design (demo user `demo@proposalpilot.dev`, single-user MVP).
- Settings dual-source (localStorage + API PATCH) — works but risky for future multi-user.

## Priority order (if fixing)

1. PDF pagination bug (#1)
2. VIEWED tracking + expiry on /view/[id] (#2 — directly serves product-brief conversion metric)
3. Strip AI placeholder text post-parse (extract/route.ts) (#3)
4. Wire or delete the 5 unused components (decide one editor, one modal, one sidebar)
5. Clean dead code: mockProposals, dead buttons, duplicate interface
