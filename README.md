# Restackd Live Overlay

Standalone TikTok-Live overlay for Restackd. **One HTML file, no build, edit → push → live in ~30 seconds.**

Lives separately from the main Restackd Next.js app so it can iterate independently. Polls restackd.com's public overlay APIs for live data.

## Files

| File | Purpose |
|---|---|
| `index.html` | The overlay itself — open in OBS browser source |
| `snap-preview.mjs` | Playwright script to render a static preview PNG |
| `vercel.json` | Vercel config — static, no build |

## Use in OBS

1. Add a **Browser Source** in OBS
2. URL: `https://overlay.restackd.com/` (or this Vercel preview URL while DNS warms up)
3. Width: `1080` (or `1200` for desktop streams)
4. Height: `360`
5. Custom CSS: leave blank (transparent background is already set)

## Data sources

Polls these public, CORS-open Restackd APIs:

- `GET https://restackd.com/api/overlay/spots` — `{ remaining, total, soldToday }`
- `GET https://restackd.com/api/founding/ticker` — `{ entries[], latestEntry }`
- `GET https://restackd.com/api/overlay/stream` (SSE) — push on every new $249 sale

## Local preview

```sh
node snap-preview.mjs        # renders preview-1200x600.png with mock data
```

## Edit + push iteration

```sh
# edit index.html
git commit -am "tweak: x"
git push                     # Vercel auto-deploys in ~30 sec
```

## Design

- Lime `#D1FE17` + ink `#08090A`
- Plus Jakarta Sans + JetBrains Mono
- Header: logo + LIVE + spots-left pill
- Spotlight: newest buyer card with lime glow + shimmer
- Tail: 3 greyed previous buyers, progressively faded

## v15 changelog

- Stripped everything except: logo, newest buyer (BIG), spots-left, 3 greyed past buyers
- Removed: rotating scenes, hooks, CTA ribbon, split-pay chips, competitor savings
- Hosted separately from restackd.com so iterations are instant
