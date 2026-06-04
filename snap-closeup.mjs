import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const WT = 'C:/Users/Jake/Projects/restackd-overlay-vertical-wt'
const data = {
  ticker: { entries: [
    { name: 'Dario', position: 75, timeLabel: 'just now' },
    { name: 'Owen', position: 74, timeLabel: '2m ago' },
    { name: 'Carldelll', position: 73, timeLabel: '8m ago' },
    { name: 'Smoke', position: 72, timeLabel: '14m ago' },
  ], latestEntry: { name: 'Dario', position: 75, timeLabel: 'just now' }, realCount: 75 },
  spots: { remaining: 7, total: 10, soldToday: 3 },
}

const browser = await chromium.launch({ headless: true })
for (const variant of ['variant-a', 'variant-b', 'variant-c']) {
  const ctx = await browser.newContext({ viewport: { width: 460, height: 900 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.route('https://restackd.com/api/founding/ticker', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data.ticker) }))
  await page.route('https://restackd.com/api/overlay/spots', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data.spots) }))
  await page.route('https://restackd.com/api/overlay/stream', r => r.abort())
  await page.goto(pathToFileURL(path.join(WT, `${variant}.html`)).toString(), { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  const el = await page.$('.rail')
  const out = path.join(WT, 'references', 'critique', 'vertical-overlay', `${variant}-closeup.png`)
  await el.screenshot({ path: out, omitBackground: true })
  console.log('saved:', out)
  await ctx.close()
}
await browser.close()
console.log('DONE')
