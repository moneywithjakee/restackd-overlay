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
// Poll for the fake SSE message to land instead of a flat timeout: the SSE
// stream and the cold-start /api/overlay/spots fetch are two independent
// real-network races (page.clock only virtualizes page timers, not fetch/
// EventSource I/O), so a fixed wait can sample mid-race and see the SSE
// burst fire before the (slower-that-run) cold-start spots fetch overwrites
// spotsNum back to its stale value. Waiting for spotsNum to actually reach
// the SSE's value removes the race instead of out-timing it.
await page.waitForFunction(
  () => window.__testHooks.activeState === 'burst' && document.getElementById('spotsNum').textContent === '6',
  { timeout: 5000 }
);

const duringBurst = await page.evaluate(() => window.__testHooks.activeState);
await page.clock.fastForward(4600); // past BURST_MS
const afterBurst = await page.evaluate(() => window.__testHooks.activeState);
const spotsNum = await page.evaluate(() => document.getElementById('spotsNum').textContent);

const pass = duringBurst === 'burst' && afterBurst !== 'burst' && spotsNum === '6';
console.log({ duringBurst, afterBurst, spotsNum });
console.log(pass ? 'PASS' : 'FAIL');
await ctx.close();
await browser.close();
process.exit(pass ? 0 : 1);
