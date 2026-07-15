# overlay.restackd.com — Landscape (16:6) Rebuild

**Date:** 2026-07-15
**Status:** Approved by Jake in chat 2026-07-15, ready for implementation plan

## Goal

Completely rebuild the live OBS overlay from its current compact vertical corner
badge into a wide landscape banner (2000×750px, 16:6 / 2.667:1), animated, styled
after a reference TikTok LIVE promo graphic Jake supplied — while keeping the
overlay's real job intact: showing live sales proof (spots remaining, buyer
ticker, sale celebration) pulled from Restackd's public overlay APIs.

## Current state (ground truth, not the stale docs)

The repo's `README.md` and `VARIANTS.md` describe a vertical 9:16 side-rail
design from a June 4 exploration. That was superseded. What's actually live
today (verified via `_final-live.png` and the real `index.html` source):

- **`index.html`** / **`badge.html`** (byte-identical except `<title>`) — a
  compact 312px card pinned top-left of the TikTok portrait frame: logo + LIVE
  pill, mascot, "joining now" buyer flash, a 3-name tail, a `$249 Lifetime ·
  Once + 1:1 coaching` card. Polls `/api/overlay/spots`, `/api/founding/ticker`,
  SSE `/api/overlay/stream`.
- **`celebrate.html`** — a second, separate OBS source that pops the Neo mascot
  center-screen when a sale fires (confetti, buyer name, tilt-bounce).
- Hosting: GitHub Pages, custom domain via `CNAME`, deploy = push to `main`,
  live in ~30s. (README's mention of Vercel is stale.)
- Perf contract: GPU-only animation (`transform`/`opacity`), no animated
  shadows — required so it encodes cleanly through TikTok LIVE's H.264
  re-encode. Carries forward unchanged.
- Font in the live code is **Inter**, not Plus Jakarta Sans (README claims the
  latter). Keeping Inter since that's what's actually shipped — flag if you
  want brand-guide alignment instead.

## Confirmed decisions (from brainstorm)

1. **Copy is reproduced as-is.** The reference image's testimonial headline
   ("Dad of 3... to $30K/month"), the `$0 down / Afterpay / Klarna` BNPL
   framing, the `CODE JAKE — $25 OFF` box, and the 5-item feature-icon row are
   approved marketing copy Jake already runs elsewhere — not placeholder, not
   fabricated. Reproduced literally per Jake's explicit confirmation in chat
   (2026-07-15).
2. **Assumption to flag:** the $25-off code / BNPL deal is treated as applying
   to the same `$249 Lifetime` product already wired into the overlay. Correct
   this if it's actually a different product/tier.
3. **This is still an OBS browser-source overlay** (not a promo video export),
   continuing the product's existing job — sized to a literal 2000×750px
   canvas (exact 16:6), run as a horizontal band inside the TikTok LIVE
   portrait canvas.
4. **Single merged OBS source.** `celebrate.html`'s job (center-screen sale
   popup) gets absorbed into the new banner as a state, not kept separate.
   **Operational note for Jake:** once this ships, remove the `celebrate.html`
   browser source from your OBS scene — it's superseded, not deleted from the
   repo history, but no longer meant to be a live source.
5. **`DAILY_SPOT_CAP = 10`** is already live server-side
   (`stackd/src/lib/overlay/spots.ts:18`, Redis-backed, resets midnight PT).
   Not something this rebuild touches — the banner just displays whatever
   `remaining`/`total`/`soldToday` the API returns, same as today.

## Layout — 2000×750px, 3 zones

```
┌──────────────┬──────────────────────────────────────────┬──────────────┐
│  FIXED LEFT   │           ROTATING CENTER (~65%)          │  FIXED RIGHT │
│  Logo + LIVE  │   crossfades every ~5.5s, 4 states:       │  LINK IN BIO │
│  pill + Neo   │   1. Testimonial headline ($30K/mo)       │  stan.store/ │
│  mascot       │   2. Live spots-left + newest buyer       │  startwithjake│
│  (~17%)       │   3. $0 down · Afterpay/Klarna · CODE JAKE│  (~17%)      │
│               │   4. Feature-icon row (5 perks, Phosphor) │              │
└──────────────┴──────────────────────────────────────────┴──────────────┘
```

Identity (left) and the CTA (right) are permanent — never rotate away. The four
content-heavy blocks each get the full center zone at real size on their turn
rather than being crammed small simultaneously. Full loop ≈ 22s.

### Center rotation states, in detail

1. **Testimonial** — reference headline verbatim, large type, same weight as
   the reference image's treatment.
2. **Live data** — big lime spots-left number (real, from `/api/overlay/spots`)
   + newest-buyer flash (real, from ticker/SSE). This is the state that
   carries the product's actual differentiator (real social proof), so it
   gets equal billing with the promo content, not demoted.
3. **BNPL + code** — `$0 down today`, Afterpay/Klarna badges, `CODE JAKE —
   $25 OFF` box.
4. **Feature-icon row** — 5 perks (Pay $0 today / Flexible payments / No
   hidden fees / 24/7 support / 200+ trusted creators), Phosphor icons (not
   emoji, per standing brand rule) — `CurrencyDollar`, `CalendarCheck`,
   `ShieldCheck`, `Headset`, `UsersThree`.

### States

- **Idle rotation** — as above. GPU-only crossfade, same perf contract as
  today.
- **Sale-burst** — real SSE event interrupts rotation, jumps to a celebration
  beat (buyer name large, mascot tilt-bounce react, confetti — same choreography
  family as the current mascot-react keyframes, now full-width), holds ~4-5s,
  resumes rotation where it left off.
- **Urgent** (`remaining <= 5`) — live-data state's number and left-rail accent
  shift to the existing red urgent styling.
- **Empty** (`remaining === 0`) — "sold out today" fallback state, no dead air.
- **Offline** — tiny `● offline` indicator if all API calls fail, matching the
  existing offline-state pattern from the June variant exploration.

### Data wiring

No backend changes. Same 3 existing public endpoints:
- `GET /api/overlay/spots` → `{ remaining, total, soldToday }`
- `GET /api/founding/ticker` → `{ entries[], latestEntry, realCount }`
- `GET /api/overlay/stream` (SSE) → push on new sale

### Brand/asset rules carried forward

- Real Restackd logo as inline SVG (never styled HTML text as a logo
  treatment) — matches the existing pattern in the live `index.html`.
- Real Neo mascot PNG (`assets/neo-mascot-cropped.png`), reused as-is.
- Lime `#D6F224` / ink `#13150E` / cream `#FAFBF7` tokens carried forward from
  the live code (these are slightly different hex values than the README's
  stale `#D1FE17`/`#08090A` — using what's actually shipped).
- Phosphor icons for the feature row, no emoji.

## File plan

- New landscape banner becomes the canonical `index.html` (single file, no
  build step — same "edit → push → live in ~30s" philosophy).
- `badge.html` removed (was a byte-identical duplicate of the old `index.html`,
  no reason to keep two copies of a retired design).
- `celebrate.html` removed from active use (superseded by the merged sale-burst
  state). File can stay in git history; Jake updates his OBS scene separately.
- `README.md` / `VARIANTS.md` updated to reflect actual current state (they're
  stale today, describing the June vertical-rail exploration).

## Local iteration workflow

Extends the repo's existing Playwright snap-script pattern (no new tooling
philosophy introduced):

- A `?mock=1` query param on `index.html` stubs all 3 data sources locally
  (fake spots/ticker/SSE) so Jake can open the file directly in a browser and
  watch the full idle rotation + trigger a mock sale-burst + urgent state,
  with zero calls to production APIs.
- A new/updated `snap-preview.mjs`-family script renders PNG snapshots of
  every state (each of the 4 rotation frames, sale-burst, urgent, empty,
  offline) in one pass, so review doesn't require sitting through the full
  22s loop each time.
- This satisfies the "iterate locally over and over until I approve" loop —
  implementation plan will include a review checkpoint after the first working
  version, before final polish.

## Non-goals

- No changes to `DAILY_SPOT_CAP`, checkout, BNPL provider integration, or any
  backend/API behavior — this is a pure frontend rebuild of the display layer.
- No change to the actual availability of Afterpay/Klarna or the discount
  code's validity — those are treated as already-true facts per Jake's
  confirmation, not verified against a checkout system from this repo.
