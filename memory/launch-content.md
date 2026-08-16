# ProposalPilot — Launch Content (drafts, not ads)

> Pitch: "60-second proposal that learns your voice; knows when clients opened it."
> Placeholders: [demo-url]. The landing page at `/` IS the waitlist (email form inline, `#waitlist` anchor), so `[waitlist-url]` = `[demo-url]` — one link. Waitlist entries land in the `waitlist_entries` table with a `source` tag (reddit / linkedin / direct).

## Reddit — r/freelance (crosspost r/EntrepreneurRideAlong)

**Title:** I spent 2-4 hours per proposal, so I built a tool that turns call notes into a priced, polished proposal in ~10 seconds

**Body:**

Freelancers here know the grind: 2-4 hours writing each proposal, 5-15 a month, and most don't even get a reply. The proposal was my single biggest bottleneck — I'd rather be doing the work than writing about the work.

So I built the thing I wished existed. Paste your call notes or meeting transcript → it extracts scope, deliverables, timeline, and pricing → you review and edit → export as PDF/Word or share a link that tells you when the client opened it.

A few things I made it do that I couldn't find anywhere else:

- **It learns my voice.** It studies my past accepted proposals (tone, detail level, terms structure) and calibrates new drafts to match — so output reads like me, not like a generic chatbot. It also remembers pricing/tone per returning client.
- **Pricing is calibrated, not guessed.** It estimates hours from scope complexity and checks against the budget in your notes. You always override before sending.
- **I see when it's opened.** Shared links expire in 30 days and flip to "viewed" the moment the client opens them. No more sending and wondering.

Demo runs on a local model (NVIDIA API, ~10s per draft), it's free while I test, and it's currently single-user.

What I'm hoping for: brutal honesty from people who write proposals for a living. What do you hate most about the process? Would you trust AI-generated pricing, or is that the first thing you'd rewrite? Anything here you'd never use?

Try it: [demo-url] · Waitlist (I'll email you when real accounts open): [waitlist-url]

## LinkedIn

**Headline:** Proposal writing takes freelancers 2-4 hours per proposal. I got mine down to ~10 minutes, and I can see when clients open them.

**Body:**

Before: 2-4 hours on every proposal. After a sales call I'd spend the evening turning messy notes into a professional document, guessing at scope, second-guessing pricing, and sending it into a void with no idea if it was ever read.

After: the call ends, I paste the transcript, and 10 seconds later I have a structured draft — scope, deliverables, timeline, and a price calibrated to the budget they mentioned. I spend the review time actually thinking, not formatting.

Three things I designed on purpose:

1. **It learns my voice.** New drafts are calibrated against my past accepted proposals — tone, detail level, terms. Output reads like me, not like a template.
2. **Pricing you can trust.** Hour estimates from scope complexity, checked against the budget in the notes. Final number is always mine.
3. **Every link is a tracking link.** I know when it's opened, and it expires in 30 days.

Building it in public and testing it free: [demo-url]. Happy to share the build process — ask me anything.

## Notes for posting

- Post Reddit version to r/freelance (weekday, ~9am ET). If removed for self-promo, use r/EntrepreneurRideAlong instead — build-in-public is expected there.
- LinkedIn: post mid-week morning; reply to every comment to feed the algorithm.
- Waitlist is the primary kill-gate signal (≥10 signups). Each entry is tagged with `source` (reddit / linkedin / demo / direct) for attribution.
- **One link for both demo and waitlist** — the landing page at `/` has the email form inline (`#waitlist` anchor). No separate waitlist URL.
- Have the deployment decision made before posting (URL must be live — see plan Phase E). Waitlist infra is built and verified; only deployment remains.
