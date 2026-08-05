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
await ctx.close();
await browser.close();
process.exit(pass ? 0 : 1);
