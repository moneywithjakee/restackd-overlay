import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

// Render each vertical overlay variant in a real TikTok-style 9:16 portrait
// frame, with the variant's OWN data engine running against mocked APIs.
// We inject a faux-stream backdrop behind the overlay and pin the overlay
// top-left (like Jake's original concept), then screenshot the full frame.
// Run with a cwd that can resolve `playwright` (e.g. from stackd/).

const WT = 'C:/Users/Jake/Projects/restackd-overlay-vertical-wt'

const STATES = {
  healthy: {
    ticker: {
      entries: [
        { name: 'Dario', position: 75, timeLabel: 'just now' },
        { name: 'Owen', position: 74, timeLabel: '2m ago' },
        { name: 'Carldelll', position: 73, timeLabel: '8m ago' },
        { name: 'Smoke', position: 72, timeLabel: '14m ago' },
        { name: 'Jenny', position: 71, timeLabel: '20m ago' },
      ],
      latestEntry: { name: 'Dario', position: 75, timeLabel: 'just now' },
      realCount: 75,
    },
    spots: { remaining: 7, total: 10, soldToday: 3 },
  },
  urgent: {
    ticker: {
      entries: [
        { name: 'Mariana', position: 77, timeLabel: 'just now' },
        { name: 'Dario', position: 75, timeLabel: '4m ago' },
        { name: 'Owen', position: 74, timeLabel: '9m ago' },
        { name: 'Carldelll', position: 73, timeLabel: '15m ago' },
      ],
      latestEntry: { name: 'Mariana', position: 77, timeLabel: 'just now' },
      realCount: 77,
    },
    spots: { remaining: 3, total: 10, soldToday: 6 },
  },
}

const VARIANTS = ['variant-a', 'variant-b', 'variant-c']

// Faux TikTok backdrop injected behind the overlay (preview only, not shipped).
const BACKDROP = `
<div id="__tt_bg" style="position:fixed;inset:0;z-index:-1;background:
  radial-gradient(circle at 30% 18%, #45602f 0%, transparent 42%),
  radial-gradient(circle at 78% 60%, #6a5132 0%, transparent 48%),
  linear-gradient(160deg, #1c1e26 0%, #2c2820 55%, #141510 100%);"></div>
<div style="position:fixed;top:54px;left:50%;transform:translateX(-50%);z-index:-1;display:flex;align-items:center;gap:8px;
  background:rgba(0,0,0,0.35);border-radius:999px;padding:7px 14px;color:#fff;font:600 22px Plus Jakarta Sans,sans-serif;">
  <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#D1FE17,#888);"></div>
  @startwithjake <span style="color:#D1FE17;margin-left:4px;">Follow</span>
</div>
<div style="position:fixed;left:28px;bottom:118px;z-index:-1;display:flex;flex-direction:column;gap:14px;max-width:540px;color:#fff;font:500 25px Plus Jakarta Sans,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,0.85);">
  <div><b style="opacity:.7;">sara_</b> &nbsp;built mine in 20 min</div>
  <div><b style="opacity:.7;">mike_creates</b> &nbsp;link??</div>
  <div><b style="opacity:.7;">jenny</b> &nbsp;just bought 👀</div>
</div>
<div style="position:fixed;left:24px;right:130px;bottom:42px;z-index:-1;height:60px;border-radius:999px;border:1px solid rgba(255,255,255,0.3);
  display:flex;align-items:center;padding:0 24px;color:rgba(255,255,255,0.6);font:500 25px Plus Jakarta Sans,sans-serif;">Add comment…</div>
<div style="position:fixed;right:28px;bottom:150px;z-index:-1;display:flex;flex-direction:column;gap:32px;align-items:center;">
  <div style="width:62px;height:62px;border-radius:50%;background:rgba(255,59,59,0.85);"></div>
  <div style="width:62px;height:62px;border-radius:50%;background:rgba(255,255,255,0.18);"></div>
  <div style="width:62px;height:62px;border-radius:50%;background:rgba(59,130,246,0.85);"></div>
  <div style="width:62px;height:62px;border-radius:50%;background:rgba(245,200,40,0.9);"></div>
</div>
`

const browser = await chromium.launch({ headless: true })

for (const variant of VARIANTS) {
  for (const [stateName, data] of Object.entries(STATES)) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
    const page = await ctx.newPage()

    await page.route('https://restackd.com/api/founding/ticker', r => r.fulfill({
      status: 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data.ticker),
    }))
    await page.route('https://restackd.com/api/overlay/spots', r => r.fulfill({
      status: 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data.spots),
    }))
    await page.route('https://restackd.com/api/overlay/stream', r => r.abort())

    const fileUrl = pathToFileURL(path.join(WT, `${variant}.html`)).toString()
    await page.goto(fileUrl, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2200)

    // Inject backdrop behind the overlay; pin the overlay top-left and scale
    // it to TikTok-frame proportions. The variant's JS has already populated.
    await page.evaluate((bg) => {
      document.body.insertAdjacentHTML('afterbegin', bg)
      document.documentElement.style.background = 'transparent'
      const root = document.querySelector('.root')
      if (root) {
        root.style.position = 'fixed'
        root.style.top = '6px'
        root.style.left = '0'
        root.style.transformOrigin = 'top left'
        root.style.transform = 'scale(0.9)'
        root.style.zIndex = '5'
      }
    }, BACKDROP)
    await page.waitForTimeout(600)

    const out = path.join(WT, 'references', 'mockups', `${variant}-${stateName}.png`)
    await page.screenshot({ path: out })
    console.log('saved:', out)
    await ctx.close()
  }
}

await browser.close()
console.log('DONE')
