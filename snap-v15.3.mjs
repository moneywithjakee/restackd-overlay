import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HTML = path.join(__dirname, 'index.html')
const OUT  = path.join(__dirname, 'preview-v15.3.png')

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1200, height: 400 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.route('https://restackd.com/api/founding/ticker', route => route.fulfill({
  status: 200, contentType: 'application/json',
  headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({
    entries: [
      { name: 'Dario', position: 75, timeLabel: 'just now' },
      { name: 'Owen', position: 74, timeLabel: '2m ago' },
      { name: 'Carldelll', position: 73, timeLabel: '8m ago' },
      { name: 'Smoke', position: 72, timeLabel: '14m ago' },
    ],
    latestEntry: { name: 'Dario', position: 75, timeLabel: 'just now' },
    realCount: 75,
  })
}))
await page.route('https://restackd.com/api/overlay/spots', route => route.fulfill({
  status: 200, contentType: 'application/json',
  headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ remaining: 7, total: 10, soldToday: 3 })
}))
await page.route('https://restackd.com/api/overlay/stream', route => route.abort())
await page.goto(pathToFileURL(HTML).toString(), { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const el = await page.$('#frame')
await el.screenshot({ path: OUT, omitBackground: true })
await ctx.close()
await browser.close()
console.log('saved:', OUT)
