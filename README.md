# ProposalPilot

Turn call notes into professional proposals in minutes, not hours. AI extracts scope, timeline, and pricing from messy notes — you review, adjust, and export.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS with a full design-token system (`src/styles/design-tokens.css`)
- AI proposal extraction (`src/app/api/ai/extract/route.ts`) — OpenAI-compatible, defaults to the **free NVIDIA Build API** (Nemotron), OpenAI supported via `AI_PROVIDER=openai`
- Zero-dependency UI kit: `src/components/ui/` (Button, Input, Modal, Toast)

## Getting started

```bash
npm install
cp .env.example .env.local
# get a free NVIDIA key: https://build.nvidia.com/settings/api-keys → NVIDIA_API_KEY
npm run dev                  # http://localhost:3000
```

The extraction endpoint defaults to NVIDIA's free tier (`https://integrate.api.nvidia.com/v1`, model `nvidia/nemotron-3.5-lightning-30b-a3b`, thinking disabled). No credit card needed. Override with `AI_MODEL`, `AI_BASE_URL`, `AI_THINKING`, or switch providers with `AI_PROVIDER=openai` + `OPENAI_API_KEY`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript `--noEmit` |

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Dashboard — proposal library, search, filters |
| `/create` | 3-step create flow: paste notes → AI draft → export |
| `/templates` | Template library |
| `/settings` | Workspace, pricing defaults, integrations, notifications |
| `/api/ai/extract` | POST — notes → structured proposal (zod-validated, AI JSON) |

## API contract

`POST /api/ai/extract` with `{ "notes": string }` (50–50,000 chars) returns:

```json
{
  "title": "string",
  "client": { "name": "string", "company": "string", "email": "string" },
  "scope": [{ "title": "string", "description": "string", "estimatedHours": 40, "confidence": "high|medium|low" }],
  "timeline": "string",
  "pricing": {
    "hourlyRate": 150,
    "complexityMultiplier": 1.35,
    "total": 8100,
    "breakdown": "4 deliverables × $150/hr × 1.35 complexity = $8,100"
  },
  "terms": ["string"]
}
```

## Status

Prototype. Auth, real storage, PDF/Word export, and billing are next after the core flow is validated. Full design documentation lives in `D:\N\ProposalPilot-Design\`.
