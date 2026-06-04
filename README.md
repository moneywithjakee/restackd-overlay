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

- **Vertical 9:16 side-rail** — pins top-left of the TikTok portrait frame, clear of
  the comment stream (bottom-left) and the like/share/gift rail (right).
- Lime `#D1FE17` + ink `#08090A`, Plus Jakarta Sans + JetBrains Mono, real R-stack logo
- Brand width `384px`; OBS browser source ~`420 × 980` (the rail + its padding).
- Anatomy top→bottom: logo · LIVE → big **SEATS LEFT** number → **rotating price card**
  → newest-buyer card (glows lime on a sale) → recent tail (3, progressively faded).
- **Rotating price card** crossfades every 4.5s between:
  1. `$249 · Lifetime · once · TAP @startwithjake BIO`
  2. `$0 down today · 4 interest-free payments · Klarna / Afterpay`
  (BNPL frame reflects the Stan Store checkout, which offers Klarna + Afterpay pay-in-4.)
- Urgent state (≤5 seats): seats number turns red.
- Motion is GPU-only (transform + opacity), static shadows, no continuous loops on hot
  paths — encodes cleanly through TikTok Live's H.264 re-encode.

## OBS setup (vertical)

- Browser Source · URL `https://overlay.restackd.com/`
- Width `420`, Height `980` (or scale to taste — the rail is `384px` wide + padding)
- Position: top-left of the canvas. Transparent background is already set.

## changelog

- **v16 (vertical):** rebuilt the horizontal v15 banner back into a vertical side-rail
  (the original concept). Added the rotating price ↔ $0-down BNPL card. Variants B
  (Glass Ticket) + C (Receipt Feed) preserved in the repo as alternates.
- v15: horizontal banner — logo, newest buyer, spots-left, greyed tail.
