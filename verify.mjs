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

if (state === 'burst') {
  await page.evaluate(() => window.__testHooks.showState('burst'))
  await page.evaluate(() => document.getElementById('burstName').textContent = 'Dario')
} else {
  await page.evaluate((s) => window.__testHooks.showState(s), state)
}
await page.waitForTimeout(700) // let the crossfade settle

await page.screenshot({ path: path.join(__dirname, out) })
console.log('saved:', out)

await ctx.close()
await browser.close()
