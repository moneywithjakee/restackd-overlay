# Landscape (16:6) Overlay Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `index.html` (currently a compact vertical corner badge) with a single animated 2000×750px landscape banner that reproduces the reference promo graphic's content, driven by real live-sale data, and absorbs `celebrate.html`'s sale-popup job into one merged OBS source.

**Architecture:** One self-contained HTML file (no build step, matching this repo's established pattern), CSS-driven crossfade between 4 rotating "hero" content states plus 3 special states (sale-burst, empty, offline), vanilla JS state machine + fetch/SSE data layer extending the existing proven patterns from the current `index.html` (odometer digit-roll, buyer auto-fit, confetti/mascot-react choreography, SSE reconnect-with-backoff).

**Tech Stack:** Vanilla HTML/CSS/JS (no framework, no bundler), Playwright (`playwright` npm package) for local verification screenshots, Phosphor icon SVGs inlined at author-time (no runtime icon-font dependency).

## Global Constraints

- Canvas is exactly **2000×750px** (16:6 / 2.667:1) — every screenshot/test asserts this viewport.
- **GPU-only animation contract**: only `transform` and `opacity` may ever be animated (in `@keyframes` or CSS transitions). No animated `box-shadow`/`filter`/`background`. This is required for clean H.264 re-encoding through TikTok LIVE — carried over verbatim from the current `index.html`'s existing contract.
- **Copy is reproduced verbatim** from the reference image (testimonial headline, BNPL/code box, feature-icon labels) — approved by Jake in chat 2026-07-15, not fabricated. See spec `docs/superpowers/specs/2026-07-15-landscape-rebuild-design.md` for the full confirmed-decisions list.
- **Live metric for the "live" hero state is the daily spots-left countdown** (`/api/overlay/spots`, `DAILY_SPOT_CAP=10`), not the cumulative founding-member count — confirmed by Jake 2026-07-15. This mechanic is currently unused by any UI but fully implemented server-side (`stackd/src/lib/overlay/spots.ts`).
- **Zero backend changes.** All 3 endpoints already exist and already return everything needed:
  - `GET https://restackd.com/api/overlay/spots` → `{ remaining, total, soldToday }` (cold-load only)
  - `GET https://restackd.com/api/founding/ticker` → `{ entries[], latestEntry, realCount }` (cold-load + 3000ms poll, resiliency fallback)
  - `GET https://restackd.com/api/overlay/stream` (SSE) → on `message`: `{ name, position, timeLabel, ts, spotsRemaining, soldToday }` — **this single SSE payload already carries spots-remaining and sold-today**, so no separate re-poll of `/api/overlay/spots` is needed after cold-load; verified against `stackd/src/lib/overlay/events.ts` and the webhook publish call site.
- **Real brand assets only**: the Restackd logo is always inline SVG (never styled HTML text standing in for a logo) — the wordmark comes from the canonical brand asset `restackd-brand/01-logos/wordmark/restackd-wordmark-white.svg`, inlined verbatim. (The current live `index.html` actually renders the brand name as styled text, which violates this rule — this rebuild corrects that, it does not copy it.) The mascot is the existing `assets/neo-mascot-cropped.png` (no new asset).
- **Phosphor icons, not emoji**, for the feature-icon row.
- **Colors/fonts match what's actually live**, not the stale README: lime `#D6F224`, ink `#13150E` / `#1B1D14`, cream `#FAFBF7`, font `Inter` (weights 500/600/700/800/900, already preloaded via Google Fonts in the current file).
- **Respect `prefers-reduced-motion`**: every animation path in the current file checks `reduceMotion` before firing — carry this forward for every new animated element.
- **All work happens on a feature branch, never committed straight to `main`.** This repo's normal workflow IS direct-to-main (push = live in ~30s via GitHub Pages), but this task is a full rebuild of a live customer-facing surface that Jake explicitly wants to review locally before it's live — so pushing `main` (the actual deploy trigger) is **explicitly out of scope for this plan** and happens only as a separate, later, Jake-confirmed action.

---

## File Structure

| File | Change |
|---|---|
| `index.html` | Full rewrite — new landscape banner (all tasks below build this incrementally) |
| `badge.html` | Delete (Task 12) — was a byte-identical duplicate of the old `index.html` |
| `celebrate.html` | Delete (Task 12) — job absorbed into `index.html`'s sale-burst state |
| `verify.mjs` | New — reusable Playwright harness, one state per invocation via `--state=` |
| `contact-sheet.mjs` | New — runs every state through `verify.mjs`'s logic in one pass, saves all PNGs to `out/` |
| `README.md` | Rewrite (Task 12) — replace stale vertical-rail docs with accurate description |
| `VARIANTS.md` | Delete (Task 12) — describes a June 4 exploration that's no longer relevant; the design history now lives in the spec doc |
| `package.json` | Add `playwright` devDependency (Task 1) |

---

### Task 1: Branch setup, Playwright harness, and layout skeleton

**Files:**
- Create: `verify.mjs`
- Modify: `index.html` (full rewrite, skeleton only), `package.json`
- Test: manual run of `verify.mjs`, visual read of output PNG

**Interfaces:**
- Produces: `showState(name: string): void` (global inside the page's IIFE, exposed as `window.__testHooks.showState`), CSS class `.hero-state.is-active`, `data-state` attribute values `testimonial|live|bnpl|features|burst|empty|offline`, root element `#banner` sized exactly `2000×750`.
- Consumes: nothing (first task).

- [ ] **Step 1: Create the feature branch**

```bash
cd "C:/Users/Jake/Projects/restackd-overlay"
git checkout -b feat/landscape-overlay-2026-07-15
```

Expected: `Switched to a new branch 'feat/landscape-overlay-2026-07-15'`

- [ ] **Step 2: Add Playwright as a local devDependency**

The existing snap-*.mjs scripts rely on `playwright` resolving from an unrelated sibling repo's `node_modules`, which is fragile (verified: `node snap-preview.mjs` currently fails with `Cannot find package 'playwright'` when run from this repo). Fix it properly instead of relying on that.

```bash
npm install --save-dev playwright@1.59.1
npx playwright install chromium
```

Expected: `package.json` gains a `devDependencies` block with `"playwright": "^1.59.1"`. The `install chromium` step should be near-instant since the binary is already cached at `%LOCALAPPDATA%\ms-playwright\chromium-1228` (confirmed present) — Playwright reuses the shared cache.

- [ ] **Step 3: Write the skeleton `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Restackd Neo — Live Overlay</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="image" href="assets/neo-mascot-cropped.png">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&family=Plus+Jakarta+Sans:wght@800&display=swap" rel="stylesheet">
<style>
  :root {
    --lime: #D6F224;
    --lime-dim: rgba(214,242,36,0.55);
    --ink: #13150E;
    --ink-2: #1B1D14;
    --cream: #FAFBF7;
    --w-75: rgba(250,251,247,0.75);
    --w-50: rgba(250,251,247,0.50);
    --w-12: rgba(250,251,247,0.12);
    --red: #FF4D4D;
  }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-font-smoothing:antialiased; }
  html,body { background:transparent; overflow:hidden; width:2000px; height:750px; }
  body { font-family:'Inter',system-ui,-apple-system,sans-serif; }

  .banner {
    position: relative;
    width: 2000px; height: 750px;
    display: flex;
    background: linear-gradient(160deg, var(--ink) 0%, var(--ink-2) 100%);
    overflow: hidden;
  }

  .rail { position:relative; flex-shrink:0; display:flex; flex-direction:column; justify-content:center; padding:0 40px; }
  .rail-left { width: 340px; align-items:flex-start; gap:18px; }
  .rail-right { width: 340px; align-items:flex-end; text-align:right; }

  .hero { position:relative; flex:1 1 auto; overflow:hidden; }
  .hero-state {
    position:absolute; inset:0;
    display:flex; flex-direction:column; justify-content:center;
    padding: 0 24px;
    opacity:0; pointer-events:none;
    transition: opacity 0.6s ease;
    will-change: opacity;
  }
  .hero-state.is-active { opacity:1; pointer-events:auto; }

  .mascot-wrap { position:relative; width:96px; height:96px; }
  .mascot { width:96px; height:96px; border-radius:24px; object-fit:cover; }
  .brand { display:flex; flex-direction:column; align-items:flex-start; gap:8px; }
  .brand .logo { height:34px; width:auto; }
  .live-pill {
    display:inline-flex; align-items:center; gap:6px;
    font-size:15px; font-weight:800; letter-spacing:0.04em; color:var(--lime);
    background: rgba(214,242,36,0.12); border:1px solid rgba(214,242,36,0.4);
    border-radius:999px; padding:4px 12px;
  }

  .cta { display:flex; flex-direction:column; gap:10px; align-items:flex-end; }
  .cta-label {
    display:inline-flex; align-items:center; gap:8px;
    font-size:22px; font-weight:900; color:var(--ink);
    background:var(--lime); border-radius:999px; padding:10px 20px;
  }
  .cta-url { font-size:17px; font-weight:600; color:var(--w-75); }

  .conn { position:absolute; bottom:10px; left:16px; font-size:12px; font-weight:700; color:var(--w-50); opacity:0; }
  .conn.offline { opacity:1; }
</style>
</head>
<body>
<div class="banner" id="banner">
  <div class="rail rail-left">
    <div class="mascot-wrap"><img class="mascot" id="mascot" src="assets/neo-mascot-cropped.png" alt=""></div>
    <div class="brand">
      <svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 80" width="360" height="80">
        <title>Restackd — Wordmark (White)</title>
        <text x="0" y="60" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="64" font-weight="800" fill="#FFFFFF" letter-spacing="-2.5">restackd</text>
      </svg>
      <span class="live-pill"><span>●</span> LIVE</span>
    </div>
  </div>

  <div class="hero" id="hero">
    <section class="hero-state" data-state="testimonial"></section>
    <section class="hero-state" data-state="live"></section>
    <section class="hero-state" data-state="bnpl"></section>
    <section class="hero-state" data-state="features"></section>
    <section class="hero-state" data-state="burst"></section>
    <section class="hero-state" data-state="empty"></section>
    <section class="hero-state" data-state="offline"></section>
  </div>

  <div class="rail rail-right">
    <div class="cta">
      <span class="cta-label">LINK IN BIO →</span>
      <span class="cta-url">stan.store/startwithjake</span>
    </div>
  </div>

  <span class="conn" id="conn"></span>
</div>

<script>
(() => {
  const $hero = document.getElementById('hero');
  const heroStates = Array.from($hero.querySelectorAll('.hero-state'));
  let activeState = null;

  function showState(name) {
    activeState = name;
    for (const el of heroStates) {
      el.classList.toggle('is-active', el.dataset.state === name);
    }
  }

  window.__testHooks = {
    showState,
    get activeState() { return activeState; },
  };

  showState('testimonial');
})();
</script>
</body>
</html>
```

Notes for the implementer: the inline logo SVG above is copied verbatim from the real, canonical brand asset at `C:\Users\Jake\Projects\restackd-brand\01-logos\wordmark\restackd-wordmark-white.svg` (white variant, correct for this dark banner background). This is deliberately **not** copied from the current live `index.html`'s header markup — that file renders the brand name as plain styled text (`<span class="wm-restackd">Restackd</span>`) plus a small unrelated decorative bars icon, which violates the standing brand rule that "Restackd" must never appear as styled HTML text where a logo belongs. Do not use that pattern. The wordmark SVG's `font-family="Plus Jakarta Sans"` requires the Plus Jakarta Sans font import already added to `<head>` above — do not drop that font link.

- [ ] **Step 4: Write the verification harness**

```javascript
// verify.mjs
// Screenshot a single hero-state of index.html for review.
// Run: node verify.mjs --state=testimonial --out=out/testimonial.png
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HTML = path.join(__dirname, 'index.html')

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  })
)

const state = args.state || 'testimonial'
const out = args.out || `out/${state}.png`
const urgent = args.urgent === '1' || args.urgent === true && args.urgent !== undefined

fs.mkdirSync(path.dirname(path.join(__dirname, out)), { recursive: true })

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 2000, height: 750 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

// Stub the real network calls so this never hits production.
await page.route('https://restackd.com/api/overlay/spots', r => r.fulfill({
  status: 200, contentType: 'application/json',
  headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ remaining: urgent ? 3 : 7, total: 10, soldToday: 3 }),
}))
await page.route('https://restackd.com/api/founding/ticker', r => r.fulfill({
  status: 200, contentType: 'application/json',
  headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({
    entries: [{ name: 'Dario', position: 148, timeLabel: 'just now' }],
    latestEntry: { name: 'Dario', position: 148, timeLabel: 'just now' },
    realCount: 148,
  }),
}))
await page.route('https://restackd.com/api/overlay/stream', r => r.abort())

await page.goto(pathToFileURL(HTML).toString(), { waitUntil: 'networkidle' })
await page.waitForTimeout(400)

await page.evaluate((s) => window.__testHooks.showState(s), state)
await page.waitForTimeout(700) // let the crossfade settle

await page.screenshot({ path: path.join(__dirname, out) })
console.log('saved:', out)

await ctx.close()
await browser.close()
```

- [ ] **Step 5: Run it and verify the skeleton**

```bash
node verify.mjs --state=testimonial --out=out/01-skeleton.png
```

Expected console output: `saved: out/01-skeleton.png`. Then read `out/01-skeleton.png` — confirm: exactly 2000×750, dark gradient background, real logo + mascot + "● LIVE" pill in the left rail, "LINK IN BIO → / stan.store/startwithjake" lime pill in the right rail, center zone empty (no testimonial content yet — that's Task 2).

- [ ] **Step 6: Commit**

```bash
git add index.html verify.mjs package.json package-lock.json
git commit -m "feat: landscape overlay skeleton + verification harness"
```

---

### Task 2: Testimonial hero state

**Files:**
- Modify: `index.html` (fill in `.hero-state[data-state="testimonial"]`, add its CSS)

**Interfaces:**
- Consumes: `.hero-state[data-state="testimonial"]` empty section from Task 1.
- Produces: no new JS interface — pure content/CSS.

- [ ] **Step 1: Add the testimonial markup inside the empty section**

Replace `<section class="hero-state" data-state="testimonial"></section>` with:

```html
<section class="hero-state" data-state="testimonial">
  <div class="testi">
    <p class="testi-quote">
      “DAD OF 3
      <span class="testi-line"><span class="testi-arrow">»</span> PAYCHECK TO PAYCHECK</span>
      <span class="testi-line"><span class="testi-arrow">»</span> CORPORATE WORKER</span>
      <span class="testi-highlight">TO $30K/MONTH</span>
      FROM MY PHONE”
    </p>
    <p class="testi-sub">Now helping ordinary people build online income with NEO.</p>
  </div>
</section>
```

- [ ] **Step 2: Add its CSS**

```css
.testi { max-width: 1180px; }
.testi-quote {
  font-size: 46px; font-weight: 900; line-height: 1.15; color: var(--cream);
  letter-spacing: -0.01em;
}
.testi-line { display:block; font-size: 32px; font-weight: 800; color: var(--w-75); margin: 4px 0; }
.testi-arrow { color: var(--lime); margin-right: 6px; }
.testi-highlight { display:block; color: var(--lime); font-size: 58px; margin: 6px 0; }
.testi-sub {
  display:inline-block; margin-top: 18px;
  font-size: 18px; font-weight: 700; color: var(--ink);
  background: var(--lime); padding: 8px 16px; border-radius: 6px;
}
```

- [ ] **Step 3: Verify**

```bash
node verify.mjs --state=testimonial --out=out/02-testimonial.png
```

Read `out/02-testimonial.png` — confirm the full testimonial block renders left-aligned in the center zone, fits within the 2000×750 frame with no clipping, lime highlight on "TO $30K/MONTH", lime sub-strip readable.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: testimonial hero state"
```

---

### Task 3: Live-data hero state (spots-left + buyer, cold-load wired)

**Files:**
- Modify: `index.html` (fill in `.hero-state[data-state="live"]`, add odometer + buyer-flash JS reused from the current design, add cold-load fetches)

**Interfaces:**
- Consumes: `showState()` from Task 1.
- Produces: `renderCount(n)`, `renderBuyer(name, animate)`, `fitBuyerName()`, element ids `#spotsNum`, `#soldToday`, `#buyerName`, `#buyerFlash` — **Task 7 (SSE) and Task 8 (urgent) call these exact functions**, so names must match exactly.

- [ ] **Step 1: Add the live-data markup**

```html
<section class="hero-state" data-state="live">
  <div class="live-block">
    <div class="live-num-row">
      <span class="live-num" id="spotsNum">–</span>
      <div class="live-num-label">
        <span>SPOTS LEFT TODAY</span>
        <span class="live-sold" id="soldToday">– sold today</span>
      </div>
    </div>
    <div class="buyer-flash" id="buyerFlash">
      <span class="buyer-flash-dot"></span>
      <span class="buyer-name" id="buyerName">Loading…</span>
      <span class="buyer-suffix">just joined · $249 Lifetime</span>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add its CSS**

```css
.live-block { display:flex; flex-direction:column; gap:22px; }
.live-num-row { display:flex; align-items:baseline; gap:20px; }
.live-num { font-size: 130px; font-weight: 900; color: var(--lime); line-height:1; text-shadow: 0 0 40px rgba(214,242,36,0.35); }
.live-num-label { display:flex; flex-direction:column; gap:4px; }
.live-num-label span:first-child { font-size: 26px; font-weight: 800; color: var(--cream); letter-spacing:0.02em; }
.live-sold { font-size: 17px; font-weight: 700; color: var(--w-50); }

.buyer-flash {
  display:inline-flex; align-items:center; gap:12px; align-self:flex-start;
  background: rgba(214,242,36,0.08); border:1px solid rgba(214,242,36,0.35); border-radius:14px;
  padding: 12px 20px; max-width: 640px;
  opacity:0; transform: translateY(6px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.buyer-flash.enter { opacity:1; transform:none; }
.buyer-flash-dot { width:9px; height:9px; border-radius:50%; background:var(--lime); box-shadow:0 0 8px rgba(214,242,36,0.7); flex-shrink:0; }
.buyer-name { font-size: 22px; font-weight: 800; color: var(--cream); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.buyer-suffix { font-size: 15px; font-weight: 600; color: var(--w-50); flex-shrink:0; }

.banner.is-urgent .live-num { color: var(--red); text-shadow: 0 0 40px rgba(255,77,77,0.4); }
```

- [ ] **Step 3: Add the reused odometer + buyer-flash JS and wire cold-load fetches**

Add this inside the existing `<script>` IIFE, after the `showState` block from Task 1:

```javascript
const $spotsNum = document.getElementById('spotsNum');
const $soldToday = document.getElementById('soldToday');
const $buyerFlash = document.getElementById('buyerFlash');
const $buyerName = document.getElementById('buyerName');
const $banner = document.getElementById('banner');
const $conn = document.getElementById('conn');

const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const API_BASE = 'https://restackd.com';
const SPOTS = '/api/overlay/spots';
const TICKER = '/api/founding/ticker';
const SSE = '/api/overlay/stream';

let currentRemaining = null;

function renderCount(n) {
  $spotsNum.textContent = String(Math.max(0, n));
}

function fitBuyerName() {
  $buyerName.style.fontSize = '';
  let size = 22;
  while (size > 15 && $buyerName.scrollWidth > $buyerName.clientWidth) {
    size -= 0.5;
    $buyerName.style.fontSize = size + 'px';
  }
}

const cap = s => !s ? '' : s.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w).join(' ');

function renderBuyer(name, animate) {
  $buyerFlash.classList.remove('enter'); void $buyerFlash.offsetWidth;
  $buyerName.textContent = cap(name);
  fitBuyerName();
  if (animate && !reduceMotion) $buyerFlash.classList.add('enter');
  else $buyerFlash.classList.add('enter');
}

function applySpots(spots) {
  currentRemaining = spots.remaining;
  renderCount(spots.remaining);
  $soldToday.textContent = `${spots.soldToday} sold today`;
  $banner.classList.toggle('is-urgent', spots.remaining <= 5);
}

function markConn(s) {
  if (s === 'offline') { $conn.textContent = '● offline'; $conn.classList.add('offline'); }
  else { $conn.textContent = ''; $conn.classList.remove('offline'); }
}

async function loadSpotsColdStart() {
  try {
    const r = await fetch(`${API_BASE}${SPOTS}`, { cache: 'no-store', mode: 'cors' });
    if (r.ok) { applySpots(await r.json()); markConn('ok'); }
    else markConn('offline');
  } catch { markConn('offline'); }
}

async function loadTickerColdStart() {
  try {
    const r = await fetch(`${API_BASE}${TICKER}`, { cache: 'no-store', mode: 'cors' });
    if (r.ok) {
      const d = await r.json();
      const top = d.entries && d.entries[0];
      if (top) renderBuyer(top.name, false);
      markConn('ok');
    } else markConn('offline');
  } catch { markConn('offline'); }
}

loadSpotsColdStart();
loadTickerColdStart();
```

- [ ] **Step 4: Verify with mock data**

```bash
node verify.mjs --state=live --out=out/03-live.png
```

`verify.mjs`'s existing route stubs (from Task 1) already fake `/api/overlay/spots` → `remaining:7` and `/api/founding/ticker` → `Dario`. Read `out/03-live.png` — confirm big lime "7", "SPOTS LEFT TODAY" / "3 sold today", and a buyer-flash card reading "Dario · just joined · $249 Lifetime".

- [ ] **Step 5: Verify urgent styling**

```bash
node verify.mjs --state=live --urgent=1 --out=out/03b-live-urgent.png
```

Read the PNG — confirm the "7" is now red (route stub returns `remaining:3` when `--urgent=1`), matching the ≤5 urgent threshold.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: live spots-left + buyer hero state, cold-load wired"
```

---

### Task 4: BNPL + discount code hero state

**Files:**
- Modify: `index.html` (fill in `.hero-state[data-state="bnpl"]`)

**Interfaces:**
- Consumes: nothing beyond Task 1's skeleton.
- Produces: nothing consumed by later tasks — pure content/CSS.

- [ ] **Step 1: Add the markup**

```html
<section class="hero-state" data-state="bnpl">
  <div class="bnpl">
    <div class="bnpl-hero">
      <span class="bnpl-amount">$0</span>
      <span class="bnpl-down">DOWN</span>
    </div>
    <span class="bnpl-sub">PAY LATER WITH</span>
    <div class="bnpl-badges">
      <span class="bnpl-badge bnpl-badge--afterpay">afterpay</span>
      <span class="bnpl-badge bnpl-badge--klarna">Klarna.</span>
    </div>
    <div class="bnpl-code">
      <span class="bnpl-code-label">USE CODE <b>JAKE</b></span>
      <span class="bnpl-code-off">GET $25 OFF</span>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add its CSS**

```css
.bnpl { display:flex; flex-direction:column; gap:14px; align-items:flex-start; }
.bnpl-hero { display:flex; align-items:baseline; gap:14px; }
.bnpl-amount { font-size: 120px; font-weight: 900; color: var(--lime); line-height:1; }
.bnpl-down { font-size: 30px; font-weight: 800; color: var(--cream); }
.bnpl-sub { font-size: 18px; font-weight: 700; color: var(--w-50); letter-spacing:0.06em; }
.bnpl-badges { display:flex; gap:12px; }
.bnpl-badge {
  display:inline-flex; align-items:center; padding:10px 20px; border-radius:10px;
  font-size:18px; font-weight:800;
}
.bnpl-badge--afterpay { background:#B2FCE4; color:#111; }
.bnpl-badge--klarna { background:#FFB3C7; color:#111; }
.bnpl-code {
  display:flex; align-items:center; gap:16px; margin-top:6px;
  border:2px solid var(--lime); border-radius:12px; padding:10px 22px;
}
.bnpl-code-label { font-size:20px; font-weight:800; color:var(--cream); }
.bnpl-code-label b { color:var(--lime); }
.bnpl-code-off { font-size:20px; font-weight:900; color:var(--ink); background:var(--lime); padding:6px 14px; border-radius:8px; }
```

- [ ] **Step 3: Verify**

```bash
node verify.mjs --state=bnpl --out=out/04-bnpl.png
```

Read `out/04-bnpl.png` — confirm huge "$0 DOWN", Afterpay/Klarna badges, and the "USE CODE JAKE — GET $25 OFF" box all fit cleanly in the center zone without overlapping the fixed rails.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: BNPL + discount code hero state"
```

---

### Task 5: Feature-icon row hero state (Phosphor icons)

**Files:**
- Modify: `index.html` (fill in `.hero-state[data-state="features"]`)

**Interfaces:**
- Consumes: nothing beyond Task 1's skeleton.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Fetch the 5 real Phosphor bold-weight SVGs**

Do not hand-draw icon paths. Pull the real ones:

```bash
mkdir -p /tmp/phosphor && cd /tmp/phosphor
curl -sL -o currency-dollar.svg https://unpkg.com/@phosphor-icons/core@2/assets/bold/currency-dollar-bold.svg
curl -sL -o calendar-check.svg https://unpkg.com/@phosphor-icons/core@2/assets/bold/calendar-check-bold.svg
curl -sL -o shield-check.svg   https://unpkg.com/@phosphor-icons/core@2/assets/bold/shield-check-bold.svg
curl -sL -o headset.svg        https://unpkg.com/@phosphor-icons/core@2/assets/bold/headset-bold.svg
curl -sL -o users-three.svg    https://unpkg.com/@phosphor-icons/core@2/assets/bold/users-three-bold.svg
```

Each file is a small `<svg viewBox="0 0 256 256">...<path d="..."/></svg>`. Copy each one's inner `<path>` element into the markup below, replacing the `<!-- PATH -->` placeholders — this is copying real, verified path data, not writing a permanent placeholder into the plan.

- [ ] **Step 2: Add the markup**

```html
<section class="hero-state" data-state="features">
  <div class="features">
    <div class="feature">
      <svg class="feature-icon" viewBox="0 0 256 256"><!-- PATH: currency-dollar.svg --></svg>
      <span>PAY $0<br>TODAY</span>
    </div>
    <div class="feature">
      <svg class="feature-icon" viewBox="0 0 256 256"><!-- PATH: calendar-check.svg --></svg>
      <span>FLEXIBLE<br>PAYMENTS</span>
    </div>
    <div class="feature">
      <svg class="feature-icon" viewBox="0 0 256 256"><!-- PATH: shield-check.svg --></svg>
      <span>NO HIDDEN<br>FEES</span>
    </div>
    <div class="feature">
      <svg class="feature-icon feature-icon--accent" viewBox="0 0 256 256"><!-- PATH: headset.svg --></svg>
      <span>24/7<br>SUPPORT</span>
    </div>
    <div class="feature">
      <svg class="feature-icon feature-icon--accent" viewBox="0 0 256 256"><!-- PATH: users-three.svg --></svg>
      <span>OVER 200+ TRUSTED<br>CREATORS &amp; GROWING</span>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Add its CSS**

```css
.features { display:flex; gap:44px; align-items:center; flex-wrap:wrap; max-width: 1200px; }
.feature { display:flex; flex-direction:column; align-items:center; gap:10px; width:180px; text-align:center; }
.feature-icon { width:44px; height:44px; fill: var(--lime); }
.feature-icon--accent { fill: #B892FF; }
.feature span { font-size:16px; font-weight:800; color: var(--cream); line-height:1.3; }
```

- [ ] **Step 4: Verify**

```bash
node verify.mjs --state=features --out=out/05-features.png
```

Read `out/05-features.png` — confirm all 5 icons render as real glyphs (not empty/broken `<svg>` boxes — this specifically checks the path data was copied correctly), evenly spaced, labels legible.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: feature-icon row hero state (Phosphor icons)"
```

---

### Task 6: Rotation timer

**Files:**
- Modify: `index.html` (add rotation state machine)
- Test: new fake-clock Playwright test

**Interfaces:**
- Consumes: `showState()` from Task 1, the 4 content states from Tasks 2-5.
- Produces: `ROTATION_STATES`, `advanceRotation()`, `startRotation()`, `stopRotation()`, `ROTATION_MS` — **Task 7's `triggerSaleBurst` calls `stopRotation()`/`startRotation()` by these exact names.**

- [ ] **Step 1: Add the rotation engine**

Add inside the script IIFE, after the Task 3 data-layer code:

```javascript
const ROTATION_STATES = ['testimonial', 'live', 'bnpl', 'features'];
const ROTATION_MS = 5500;
let rotationIndex = 0;
let rotationTimer = null;

function advanceRotation() {
  rotationIndex = (rotationIndex + 1) % ROTATION_STATES.length;
  showState(ROTATION_STATES[rotationIndex]);
}

function startRotation() {
  if (rotationTimer) return;
  rotationTimer = setInterval(advanceRotation, ROTATION_MS);
}

function stopRotation() {
  clearInterval(rotationTimer);
  rotationTimer = null;
}

showState(ROTATION_STATES[0]);
startRotation();
```

Remove the standalone `showState('testimonial');` call from the end of Task 1's block (it's now redundant with `showState(ROTATION_STATES[0])` above) — search for it and delete that one line.

- [ ] **Step 2: Extend `__testHooks` for deterministic rotation testing**

```javascript
window.__testHooks = {
  showState,
  stopRotation,
  startRotation,
  get activeState() { return activeState; },
  get rotationIndex() { return rotationIndex; },
};
```

- [ ] **Step 3: Write the fake-clock rotation test**

```javascript
// test-rotation.mjs
// Confirms the hero zone actually advances through all 4 states on schedule.
// Run: node test-rotation.mjs
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HTML = path.join(__dirname, 'index.html')

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 2000, height: 750 } })
const page = await ctx.newPage()

await page.route('https://restackd.com/api/overlay/spots', r => r.fulfill({
  status: 200, contentType: 'application/json',
  headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ remaining: 7, total: 10, soldToday: 3 }),
}))
await page.route('https://restackd.com/api/founding/ticker', r => r.fulfill({
  status: 200, contentType: 'application/json',
  headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ entries: [{ name: 'Dario', position: 148 }], realCount: 148 }),
}))
await page.route('https://restackd.com/api/overlay/stream', r => r.abort())

await page.clock.install()
await page.goto(pathToFileURL(HTML).toString(), { waitUntil: 'networkidle' })

const seen = [];
for (let i = 0; i < 5; i++) {
  const s = await page.evaluate(() => window.__testHooks.activeState);
  seen.push(s);
  await page.clock.fastForward(5600);
}

const expected = ['testimonial', 'live', 'bnpl', 'features', 'testimonial'];
const pass = JSON.stringify(seen) === JSON.stringify(expected);
console.log('seen:', seen);
console.log(pass ? 'PASS' : 'FAIL — expected: ' + JSON.stringify(expected));
process.exit(pass ? 0 : 1);

await ctx.close();
await browser.close();
```

- [ ] **Step 4: Run it and verify it fails first (sanity check the test can fail)**

Temporarily change `ROTATION_MS` to `99999` in `index.html`, run:

```bash
node test-rotation.mjs
```

Expected: `FAIL` (all 5 entries will be `'testimonial'` since nothing advances). Revert `ROTATION_MS` back to `5500`.

- [ ] **Step 5: Run it for real**

```bash
node test-rotation.mjs
```

Expected: `seen: [ 'testimonial', 'live', 'bnpl', 'features', 'testimonial' ]` then `PASS`, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add index.html test-rotation.mjs
git commit -m "feat: hero rotation timer, 5.5s crossfade through 4 states"
```

---

### Task 7: SSE wiring, ticker resiliency poll, and sale-burst state

**Files:**
- Modify: `index.html` (add SSE, ticker poll, `onNewSale`, sale-burst content + choreography — this absorbs `celebrate.html`'s job)

**Interfaces:**
- Consumes: `renderCount`/`renderBuyer`/`applySpots` from Task 3, `stopRotation`/`startRotation` from Task 6, `showState` from Task 1.
- Produces: `onNewSale(name, remaining, soldToday)`, `openSSE()`, `pollTicker()`, `BURST_MS` — nothing later depends on these by name, but they're the integration point Task 9 (empty state) also touches.

- [ ] **Step 1: Add the sale-burst markup**

```html
<section class="hero-state" data-state="burst">
  <div class="burst">
    <div class="burst-name" id="burstName">—</div>
    <div class="burst-sub">JUST JOINED · $249 LIFETIME</div>
  </div>
  <canvas class="confetti" id="confetti"></canvas>
</section>
```

- [ ] **Step 2: Add its CSS**

```css
.burst { display:flex; flex-direction:column; gap:10px; align-items:flex-start; }
.burst-name { font-size: 84px; font-weight: 900; color: var(--lime); text-shadow: 0 0 40px rgba(214,242,36,0.4); }
.burst-sub { font-size: 24px; font-weight: 800; color: var(--cream); letter-spacing:0.03em; }
.confetti { position:absolute; inset:0; pointer-events:none; }

.mascot.react { animation: mascot-react 0.26s cubic-bezier(0.34,1.56,0.64,1) both; }
@keyframes mascot-react {
  0%   { transform: rotate(0deg) scale(1); }
  28%  { transform: rotate(-6deg) scale(1.09); }
  62%  { transform: rotate(6deg) scale(1.05); }
  100% { transform: rotate(0deg) scale(1); }
}
```

- [ ] **Step 3: Add the confetti + mascot-react choreography (adapted from current `index.html`)**

This is the same canvas-particle approach already proven in the current live `index.html` (lines ~404-438), retargeted from the old `.card` element to the new full-banner `.banner` element (a landscape celebration should burst across the visible banner, not just the narrow hero zone) and renamed `burst()` → `fireConfetti()` to avoid clashing with the `.hero-state[data-state="burst"]` naming:

```javascript
const $mascot = document.getElementById('mascot');
const $confetti = document.getElementById('confetti');

let mascotTimer = 0;
function mascotReact() {
  if (reduceMotion) return;
  $mascot.classList.remove('react'); void $mascot.offsetWidth; $mascot.classList.add('react');
  clearTimeout(mascotTimer);
  mascotTimer = setTimeout(() => $mascot.classList.remove('react'), 320);
}

let cw = 0, ch = 0, cctx = null, raf = 0;
const parts = [];
function sizeConfetti() {
  cw = $banner.clientWidth; ch = $banner.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  $confetti.width = cw * dpr; $confetti.height = ch * dpr;
  $confetti.style.width = cw + 'px'; $confetti.style.height = ch + 'px';
  cctx = $confetti.getContext('2d'); cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function fireConfetti() {
  if (reduceMotion) return;
  if (cw === 0) sizeConfetti();
  const colors = ['#D6F224', '#DFF584', '#FAFBF7'];
  const ox = cw * 0.5, oy = ch * 0.3;
  for (let i = 0; i < 24; i++) {
    const a = Math.random() * Math.PI * 2, sp = 2.5 + Math.random() * 4;
    parts.push({
      x: ox + (Math.random() * 16 - 8), y: oy,
      vx: Math.cos(a) * sp * 0.6, vy: Math.sin(a) * sp * 0.6 - 2.5,
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.35,
      size: 3.5 + Math.random() * 3.5,
      color: colors[(Math.random() * colors.length) | 0], life: 1,
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}
function tick() {
  cctx.clearRect(0, 0, cw, ch);
  const g = 0.3, d = 0.99;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.vy += g; p.vx *= d; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.014;
    if (p.life <= 0 || p.y > ch + 10) { parts.splice(i, 1); continue; }
    cctx.save(); cctx.translate(p.x, p.y); cctx.rotate(p.rot);
    cctx.globalAlpha = Math.max(0, Math.min(1, p.life)); cctx.fillStyle = p.color;
    cctx.fillRect(-p.size / 2, -p.size * 0.2, p.size, p.size * 0.4);
    cctx.restore();
  }
  raf = parts.length > 0 ? requestAnimationFrame(tick) : 0;
}
window.addEventListener('resize', sizeConfetti, { passive: true });
sizeConfetti();
```

Move the `<canvas class="confetti" id="confetti">` element from inside `.hero-state[data-state="burst"]` (Step 1 above) to be a direct child of `.banner` instead, positioned last (so it paints on top of both rails and the hero zone) — update the CSS `.confetti` rule's `position:absolute; inset:0;` to size against `.banner` rather than the hero state, matching the `sizeConfetti()` targeting `$banner` above.

- [ ] **Step 4: Add `onNewSale`, SSE, and ticker poll**

```javascript
const BURST_MS = 4500;
let burstTimer = 0;

function triggerSaleBurst(name, remaining, soldToday) {
  stopRotation();
  document.getElementById('burstName').textContent = cap(name);
  mascotReact();
  fireConfetti();
  showState('burst');
  clearTimeout(burstTimer);
  burstTimer = setTimeout(() => {
    showState(ROTATION_STATES[rotationIndex]);
    startRotation();
  }, BURST_MS);
}

let lastSeenId = null;

function onNewSale(name, position, remaining, soldToday) {
  const id = `${position ?? ''}-${name}`;
  if (id === lastSeenId) return; // dedupe: SSE + ticker poll can both report the same sale
  lastSeenId = id;
  renderBuyer(name, true);
  if (typeof remaining === 'number') applySpots({ remaining, soldToday: soldToday ?? 0 });
  triggerSaleBurst(name, remaining, soldToday);
}

async function pollTicker() {
  try {
    const r = await fetch(`${API_BASE}${TICKER}`, { cache: 'no-store', mode: 'cors' });
    if (r.ok) {
      const d = await r.json();
      const top = d.entries && d.entries[0];
      if (top) {
        const id = `${top.position ?? ''}-${top.name}`;
        if (lastSeenId !== null && id !== lastSeenId) {
          onNewSale(top.name, top.position);
        } else if (lastSeenId === null) {
          lastSeenId = id;
        }
      }
      markConn('ok');
    } else markConn('offline');
  } catch { markConn('offline'); }
}

const POLL_MS = 3000;
setInterval(pollTicker, POLL_MS);

let es = null;
function openSSE() {
  try {
    es = new EventSource(`${API_BASE}${SSE}`);
    es.addEventListener('message', ev => {
      try {
        const p = JSON.parse(ev.data);
        if (p?.name) onNewSale(p.name, p.position, p.spotsRemaining, p.soldToday);
      } catch {}
    });
    es.addEventListener('error', () => {
      if (es && es.readyState === EventSource.CLOSED) { es.close(); es = null; setTimeout(openSSE, 4000); }
    });
  } catch {}
}
openSSE();
```

Note: `loadTickerColdStart()` from Task 3 already sets the first buyer name on initial paint — update it to also set `lastSeenId` so the very first `pollTicker()` tick doesn't misfire `onNewSale` for data it already rendered:

Find this in `loadTickerColdStart()` (Task 3):
```javascript
      const top = d.entries && d.entries[0];
      if (top) renderBuyer(top.name, false);
```
Replace with:
```javascript
      const top = d.entries && d.entries[0];
      if (top) { renderBuyer(top.name, false); lastSeenId = `${top.position ?? ''}-${top.name}`; }
```

- [ ] **Step 5: Verify the burst state renders**

Extend `verify.mjs` to support triggering a burst directly — add this branch after the existing `showState` call:

```javascript
if (state === 'burst') {
  await page.evaluate(() => window.__testHooks.showState('burst'))
  await page.evaluate(() => document.getElementById('burstName').textContent = 'Dario')
}
```

(Insert this instead of the plain `showState` call when `state === 'burst'`, since burst content is populated by `onNewSale`/`triggerSaleBurst` at runtime, not present in the empty section markup.)

```bash
node verify.mjs --state=burst --out=out/07-burst.png
```

Read `out/07-burst.png` — confirm "Dario" renders large in lime, "JUST JOINED · $249 LIFETIME" subtext, mascot visible in the left rail (its react animation only fires on trigger, a static screenshot won't show the bounce — that's expected).

- [ ] **Step 6: Verify burst-then-resume end-to-end with a real SSE mock**

```javascript
// test-burst-resume.mjs
// Confirms a real SSE 'message' event interrupts rotation, shows burst,
// then resumes rotation after BURST_MS.
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HTML = path.join(__dirname, 'index.html')

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 2000, height: 750 } })
const page = await ctx.newPage()

await page.route('https://restackd.com/api/overlay/spots', r => r.fulfill({
  status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ remaining: 7, total: 10, soldToday: 3 }),
}))
await page.route('https://restackd.com/api/founding/ticker', r => r.fulfill({
  status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ entries: [{ name: 'Owen', position: 147 }], realCount: 147 }),
}))
// Fake an SSE stream that immediately pushes one sale.
await page.route('https://restackd.com/api/overlay/stream', r => r.fulfill({
  status: 200,
  contentType: 'text/event-stream',
  body: `event: message\ndata: ${JSON.stringify({ name: 'Priya', position: 148, spotsRemaining: 6, soldToday: 4 })}\n\n`,
}))

await page.clock.install()
await page.goto(pathToFileURL(HTML).toString(), { waitUntil: 'networkidle' })
await page.waitForTimeout(500); // let the fake SSE message land

const duringBurst = await page.evaluate(() => window.__testHooks.activeState);
await page.clock.fastForward(4600); // past BURST_MS
const afterBurst = await page.evaluate(() => window.__testHooks.activeState);
const spotsNum = await page.evaluate(() => document.getElementById('spotsNum').textContent);

const pass = duringBurst === 'burst' && afterBurst !== 'burst' && spotsNum === '6';
console.log({ duringBurst, afterBurst, spotsNum });
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);

await ctx.close();
await browser.close();
```

```bash
node test-burst-resume.mjs
```

Expected: `{ duringBurst: 'burst', afterBurst: <one of testimonial/live/bnpl/features>, spotsNum: '6' }` then `PASS`.

- [ ] **Step 7: Commit**

```bash
git add index.html verify.mjs test-burst-resume.mjs
git commit -m "feat: SSE wiring, ticker resiliency poll, sale-burst state (absorbs celebrate.html)"
```

---

### Task 8: Urgent state polish

**Files:**
- Modify: `index.html` (left-rail urgent accent — the live-state number urgency CSS already landed in Task 3)

**Interfaces:**
- Consumes: `.banner.is-urgent` class from Task 3's `applySpots()`.
- Produces: nothing new consumed later.

- [ ] **Step 1: Add the left-rail urgent accent**

```css
.banner.is-urgent .live-pill { color: var(--red); background: rgba(255,77,77,0.12); border-color: rgba(255,77,77,0.4); }
.banner.is-urgent .live-pill span:first-child { animation: urgent-pulse 1.1s ease-in-out infinite; }
@keyframes urgent-pulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
```

- [ ] **Step 2: Verify**

```bash
node verify.mjs --state=live --urgent=1 --out=out/08-urgent-full.png
```

Read `out/08-urgent-full.png` — confirm both the center "3" (already red from Task 3) and the left-rail LIVE pill are now in the red urgent treatment, consistent single "we're almost sold out" signal across the banner.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: urgent-state left-rail accent"
```

---

### Task 9: Empty + offline fallback states

**Files:**
- Modify: `index.html` (fill in `.hero-state[data-state="empty"]` and `[data-state="offline"]`, wire the swap conditions)

**Interfaces:**
- Consumes: `applySpots()` from Task 3, `markConn()` from Task 3.
- Produces: nothing consumed later.

- [ ] **Step 1: Add the markup**

```html
<section class="hero-state" data-state="empty">
  <div class="empty-block">
    <span class="empty-title">SOLD OUT TODAY</span>
    <span class="empty-sub">New spots drop at midnight PT — follow for the next drop.</span>
  </div>
</section>
```

```html
<section class="hero-state" data-state="offline">
  <div class="empty-block">
    <span class="empty-title" style="color:var(--w-75);">$249 LIFETIME</span>
    <span class="empty-sub">Once · + 1:1 coaching at checkout</span>
  </div>
</section>
```

- [ ] **Step 2: Add its CSS**

```css
.empty-block { display:flex; flex-direction:column; gap:12px; }
.empty-title { font-size: 54px; font-weight: 900; color: var(--lime); }
.empty-sub { font-size: 18px; font-weight: 600; color: var(--w-50); }
```

- [ ] **Step 3: Wire the empty-state swap into `applySpots`**

Find `applySpots` from Task 3:
```javascript
function applySpots(spots) {
  currentRemaining = spots.remaining;
  renderCount(spots.remaining);
  $soldToday.textContent = `${spots.soldToday} sold today`;
  $banner.classList.toggle('is-urgent', spots.remaining <= 5);
}
```
Replace with:
```javascript
function applySpots(spots) {
  currentRemaining = spots.remaining;
  renderCount(spots.remaining);
  $soldToday.textContent = `${spots.soldToday} sold today`;
  $banner.classList.toggle('is-urgent', spots.remaining > 0 && spots.remaining <= 5);
  const wasLive = ROTATION_STATES[rotationIndex] === 'live';
  if (spots.remaining <= 0 && !ROTATION_STATES.includes('empty')) {
    ROTATION_STATES.splice(ROTATION_STATES.indexOf('live'), 1, 'empty');
    if (wasLive) showState('empty');
  } else if (spots.remaining > 0 && ROTATION_STATES.includes('empty')) {
    ROTATION_STATES.splice(ROTATION_STATES.indexOf('empty'), 1, 'live');
    if (activeState === 'empty') showState('live');
  }
}
```

This swaps `'live'` for `'empty'` inside the rotation list itself when spots hit 0 (and swaps back if a new day resets the count while the page is still open), rather than adding a 5th rotation entry — keeps the "sold out" state from competing for airtime with the still-relevant testimonial/BNPL/features content.

- [ ] **Step 4: Wire the offline fallback**

`markConn('offline')` already exists (Task 3) and shows the small `● offline` corner indicator. Extend it: if BOTH cold-load fetches fail (never got real data at all), also swap the hero into the offline state so there's no "Loading…"/dash forever. Find `markConn`:

```javascript
function markConn(s) {
  if (s === 'offline') { $conn.textContent = '● offline'; $conn.classList.add('offline'); }
  else { $conn.textContent = ''; $conn.classList.remove('offline'); }
}
```
Replace with:
```javascript
let everGotData = false;
function markConn(s) {
  if (s === 'ok') everGotData = true;
  if (s === 'offline') {
    $conn.textContent = '● offline'; $conn.classList.add('offline');
    if (!everGotData && !ROTATION_STATES.includes('offline')) {
      ROTATION_STATES.splice(ROTATION_STATES.indexOf('live'), 1, 'offline');
      showState('offline');
      stopRotation();
    }
  } else { $conn.textContent = ''; $conn.classList.remove('offline'); }
}
```

- [ ] **Step 5: Verify empty state**

Add an `--empty=1` flag to `verify.mjs` (mirror the existing `--urgent=1` pattern) that makes the `/api/overlay/spots` route stub return `remaining: 0` instead, then:

```bash
node verify.mjs --state=live --empty=1 --out=out/09-empty.png
```

Read `out/09-empty.png` — confirm it shows "SOLD OUT TODAY" (the `applySpots` swap redirects `'live'` to `'empty'` content).

- [ ] **Step 6: Verify offline state**

```bash
node verify.mjs --state=offline --out=out/09-offline.png
```

Read `out/09-offline.png` — confirm the static "$249 LIFETIME · Once + 1:1 coaching" fallback renders (this doesn't require network mocking since it's just checking the static content of that state directly).

- [ ] **Step 7: Commit**

```bash
git add index.html verify.mjs
git commit -m "feat: empty (sold out) and offline fallback states"
```

---

### Task 10: Perf-contract audit

**Files:**
- Modify: `index.html` (fix any violations found)

**Interfaces:** None — this is a static-analysis pass over the finished file.

- [ ] **Step 1: Grep for animated properties outside the allowed transform/opacity contract**

```bash
grep -nE "^\s*(box-shadow|filter|background(-color)?|width|height|top|left|right|bottom)\s*:" index.html | grep -v "^\s*//"
```

This won't perfectly distinguish "inside a `@keyframes` block" from "a normal static rule" — read each hit's surrounding ~5 lines manually and confirm: any property that CHANGES across animation states (via `@keyframes` or a `.foo.active { ... }` toggle with a `transition:`) must be `transform` or `opacity` only.

- [ ] **Step 2: Specifically double check the confetti canvas and mascot-react keyframes carried over from Task 7**

```bash
grep -n "@keyframes" index.html
```

For each `@keyframes` block found, confirm every property inside its percentage steps is `transform` and/or `opacity` — matches `mascot-react` (already transform-only per Task 7's Step 2) and `urgent-pulse` (already opacity-only per Task 8).

- [ ] **Step 3: Fix any violations found, or confirm none exist**

If Step 1/2 found a violation, rewrite it to an equivalent transform/opacity-only version (e.g., an animated `box-shadow` glow becomes a separate pre-blurred static layer whose `opacity` animates instead — the exact technique already used by the current live `index.html`'s `.mascot-glow`/`glow-breathe` pattern). If none found, note "no violations" and move on — this step doesn't require a code change every time.

- [ ] **Step 4: Commit** (only if Step 3 made changes)

```bash
git add index.html
git commit -m "fix: perf-contract audit — ensure transform/opacity-only animation"
```

---

### Task 11: Contact-sheet script

**Files:**
- Create: `contact-sheet.mjs`

**Interfaces:**
- Consumes: `verify.mjs`'s route-stubbing + screenshot logic (reused, not re-implemented).

- [ ] **Step 1: Write the contact-sheet script**

```javascript
// contact-sheet.mjs
// Renders every hero state in one pass so review doesn't require sitting
// through the full ~22s rotation loop each time.
// Run: node contact-sheet.mjs
import { execSync } from 'node:child_process'

const RUNS = [
  ['--state=testimonial', 'out/state-testimonial.png'],
  ['--state=live', 'out/state-live.png'],
  ['--state=live', '--urgent=1', 'out/state-live-urgent.png'],
  ['--state=live', '--empty=1', 'out/state-live-empty.png'],
  ['--state=bnpl', 'out/state-bnpl.png'],
  ['--state=features', 'out/state-features.png'],
  ['--state=burst', 'out/state-burst.png'],
  ['--state=offline', 'out/state-offline.png'],
]

for (const run of RUNS) {
  const outArg = run[run.length - 1]
  const flags = run.slice(0, -1).join(' ')
  console.log(`rendering ${outArg}...`)
  execSync(`node verify.mjs ${flags} --out=${outArg}`, { stdio: 'inherit' })
}

console.log(`DONE — ${RUNS.length} states rendered to out/`)
```

- [ ] **Step 2: Run it**

```bash
node contact-sheet.mjs
```

Expected: 8 lines of `rendering ...` output, then `DONE — 8 states rendered to out/`, and `out/` contains all 8 PNGs.

- [ ] **Step 3: Read all 8 PNGs and confirm nothing regressed**

Read each of `out/state-testimonial.png`, `out/state-live.png`, `out/state-live-urgent.png`, `out/state-live-empty.png`, `out/state-bnpl.png`, `out/state-features.png`, `out/state-burst.png`, `out/state-offline.png` — this is the "everything at once" review pass equivalent to this repo's existing `CONTACT-SHEET.png` convention.

- [ ] **Step 4: Commit**

```bash
git add contact-sheet.mjs
git commit -m "feat: contact-sheet script — all 8 states in one pass"
```

---

### Task 12: File cleanup and docs rewrite

**Files:**
- Delete: `badge.html`, `celebrate.html`, `VARIANTS.md`
- Modify: `README.md`

**Interfaces:** None.

- [ ] **Step 1: Delete the retired files**

```bash
git rm badge.html celebrate.html VARIANTS.md
```

- [ ] **Step 2: Rewrite README.md**

```markdown
# Restackd Live Overlay

Standalone TikTok-Live overlay for Restackd. **One HTML file, no build, edit → push → live in ~30 seconds.**

Lives separately from the main Restackd Next.js app so it can iterate independently. Polls restackd.com's public overlay APIs for live data.

## Files

| File | Purpose |
|---|---|
| `index.html` | The overlay itself — open in OBS browser source |
| `verify.mjs` | Playwright screenshot of a single hero-state, for local review |
| `contact-sheet.mjs` | Renders all 8 states in one pass |
| `test-rotation.mjs` | Fake-clock test confirming the 5.5s rotation advances correctly |
| `test-burst-resume.mjs` | Confirms an SSE sale event interrupts and resumes rotation |

## Use in OBS

1. Add a **Browser Source** in OBS
2. URL: `https://overlay.restackd.com/`
3. Width: `2000`, Height: `750`
4. Position as a horizontal band inside your TikTok LIVE portrait canvas
5. Custom CSS: leave blank (transparent background is already set)
6. This is the **only** overlay source you need — it absorbs what used to be a separate `celebrate.html` sale-popup source. If you still have that as a second OBS source from before, remove it.

## Data sources

Polls these public, CORS-open Restackd APIs:

- `GET https://restackd.com/api/overlay/spots` — `{ remaining, total, soldToday }` (cold-load only)
- `GET https://restackd.com/api/founding/ticker` — `{ entries[], latestEntry, realCount }` (cold-load + 3s poll)
- `GET https://restackd.com/api/overlay/stream` (SSE) — pushes `{ name, position, spotsRemaining, soldToday }` on every new $249 sale

## Local preview

```sh
npm install
node verify.mjs --state=live --out=out/preview.png   # one state
node contact-sheet.mjs                                 # all 8 states
node test-rotation.mjs                                 # rotation timing test
node test-burst-resume.mjs                              # sale-burst test
```

## Design

- **Landscape 16:6 banner** — 2000×750px, runs as a horizontal band inside the TikTok portrait frame.
- Lime `#D6F224` + ink `#13150E`, Inter, real Restackd logo SVG + real Neo mascot PNG.
- 3 zones: fixed left rail (logo/LIVE/mascot), rotating center hero (4 content states, 5.5s crossfade), fixed right rail (CTA).
- Center rotation: testimonial → live spots-left/buyer → BNPL+code → feature-icon row.
- A real sale (SSE) interrupts rotation for a ~4.5s celebration beat, then resumes.
- Urgent (≤5 spots) turns the live-data number and LIVE pill red. Sold out (0 spots) swaps the live state for a "SOLD OUT TODAY" message.
- Motion is GPU-only (transform + opacity), no animated shadows — encodes cleanly through TikTok Live's H.264 re-encode.

## changelog

- **v17 (landscape):** full rebuild from the compact vertical corner-badge into a 2000×750 landscape banner. Merged the separate `celebrate.html` sale-popup into this single source. See `docs/superpowers/specs/2026-07-15-landscape-rebuild-design.md` for the full design rationale.
- v16 (vertical): compact corner badge, member odometer + buyer flash.
- v15: horizontal banner — logo, newest buyer, spots-left, greyed tail (predecessor to v17's live-data state).
```

- [ ] **Step 3: Commit**

```bash
git add README.md badge.html celebrate.html VARIANTS.md
git commit -m "docs: rewrite README for landscape rebuild, remove retired files"
```

---

### Task 13: Full-loop verification and review checkpoint

**Files:** None modified — verification only.

**Interfaces:** Consumes everything built in Tasks 1-12.

- [ ] **Step 1: Fake-clock the full ~22s loop and screenshot every transition boundary**

```javascript
// test-full-loop.mjs
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HTML = path.join(__dirname, 'index.html')

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 2000, height: 750 } })
const page = await ctx.newPage()

await page.route('https://restackd.com/api/overlay/spots', r => r.fulfill({
  status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ remaining: 7, total: 10, soldToday: 3 }),
}))
await page.route('https://restackd.com/api/founding/ticker', r => r.fulfill({
  status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ entries: [{ name: 'Dario', position: 148 }], realCount: 148 }),
}))
await page.route('https://restackd.com/api/overlay/stream', r => r.abort())

await page.clock.install()
await page.goto(pathToFileURL(HTML).toString(), { waitUntil: 'networkidle' })
await page.waitForTimeout(400)

for (let i = 0; i < 4; i++) {
  const s = await page.evaluate(() => window.__testHooks.activeState)
  await page.screenshot({ path: path.join(__dirname, `out/loop-${i}-${s}.png`) })
  console.log(`t=${i * 5.5}s: ${s}`)
  await page.clock.fastForward(5600)
}

await ctx.close()
await browser.close()
console.log('DONE')
```

```bash
node test-full-loop.mjs
```

Expected: 4 lines like `t=0s: testimonial`, `t=5.5s: live`, `t=11s: bnpl`, `t=16.5s: features`, then `DONE`. Read all 4 `out/loop-*.png` — confirm no visual glitch at any transition boundary (no double-visible states, no layout jump).

- [ ] **Step 2: Manual real-browser check**

Open `index.html` directly in a real browser (not headless) and watch a full loop with your own eyes — this is the actual "iterate locally" moment. Since it fetches from real production APIs when opened this way (they're public, read-only, CORS-open — safe), you'll see real current data (today's real spots-left count, the real newest buyer).

```bash
start index.html
```

- [ ] **Step 3: Stop here — do not push to `main`**

This branch (`feat/landscape-overlay-2026-07-15`) has everything committed locally. Per the Global Constraints, pushing to `main` is the actual production deploy trigger for this repo (GitHub Pages, live in ~30s) — that's an explicit, separate, Jake-approved action outside this plan, not an automatic final step.

Present to Jake: the contact sheet from Task 11 (`out/state-*.png`, 8 files) and the loop screenshots from Step 1 above (`out/loop-*.png`, 4 files) for review. Iterate on any visual feedback by returning to the relevant task's hero-state file section, editing, and re-running that task's `verify.mjs` command — no need to redo the whole plan for a copy/spacing tweak.

Once Jake explicitly approves:
```bash
git push -u origin feat/landscape-overlay-2026-07-15
# Then, only on Jake's explicit go-ahead to make it live:
git checkout main && git merge feat/landscape-overlay-2026-07-15 && git push origin main
```
