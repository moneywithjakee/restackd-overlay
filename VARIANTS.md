# Vertical Overlay — 3 Variations (2026-06-04)

Rebuild of `overlay.restackd.com` from the **horizontal banner** (v15) back to a
**vertical 9:16 side-rail** like the original concept (`references/screenshots/vertical-overlay/ORIGINAL-concept-phone.png`).

All three are complete, working OBS browser sources — same standalone single-file
pattern as the live `index.html`, same live data wiring (no build step):

- `GET restackd.com/api/overlay/spots` → `{ remaining, total, soldToday }`
- `GET restackd.com/api/founding/ticker` → `{ entries[], latestEntry, realCount }`
- `GET restackd.com/api/overlay/stream` (SSE) → push on every new $249 sale

Brand: lime `#D1FE17` + ink `#08090A`, Plus Jakarta Sans + JetBrains Mono, real
R-stack logo SVG, $249 Lifetime. GPU-only animations, static shadows, no continuous
loops on hot paths (encodes cleanly through TikTok's H.264 re-encode — carried over
from the v15.4 perf lessons).

| | File | Direction | Feel |
|---|---|---|---|
| **A** | `variant-a.html` | Hype-Energy (Robinhood / Cash App) | Closest to your original. Big lime SEATS number hero → lime price card → glowing buyer card → faded tail. Maximal FOMO. |
| **B** | `variant-b.html` | Modernist-Minimal (Linear / Stripe) | Frosted glass, white seats number, lime only on `$` + the depleting seats-meter spine + the fresh member. Premium, restrained, lowest lime coverage. |
| **C** | `variant-c.html` | Conversion-Bro (Stan / Beacons) | Urgent banner + a live receipt feed — every sale prints a `$249 ✓ PAID` receipt that slides in on top and pushes the stack down. "Watch people buy in real time." |

## States (all three handle)
- **Healthy** — lime seats number, members listed
- **Urgent** (≤5 seats) — seats/banner turn red
- **New sale** — buyer card/receipt slides in lime + confetti burst (+ money rain on A)
- **Empty** — "Waiting for the next sale…"
- **Offline** — tiny `● offline` indicator (hidden while healthy)

## Previews
- In TikTok frame: `references/mockups/variant-{a,b,c}-{healthy,urgent}.png`
- Close-up crops: `references/critique/vertical-overlay/variant-{a,b,c}-closeup.png`

## To ship the chosen one
`cp variant-X.html index.html` → commit → push → Vercel live in ~30s.
