/**
 * Render the v15 overlay with mock data so we can preview without
 * hitting restackd.com APIs.
 *
 * Run: node snap-preview.mjs
 */
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HTML = path.join(__dirname, 'index.html')

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({
  viewport: { width: 1200, height: 600 },
  deviceScaleFactor: 2,
})
const page = await ctx.newPage()
await page.goto(pathToFileURL(HTML).toString(), { waitUntil: 'networkidle' })

// Inject mock data so we see populated state
await page.evaluate(() => {
  const buyers = [
    { name: 'Dario',     when: 'just now' },
    { name: 'Owen',      when: '2m ago' },
    { name: 'Sarah',     when: '5m ago' },
    { name: 'Mike',      when: '8m ago' },
  ]
  const $spot = document.getElementById('spot')
  const $tail = document.getElementById('tail')
  const $spotsNum = document.getElementById('spotsNum')
  const cap = (s) => s[0].toUpperCase() + s.slice(1).toLowerCase()
  const initial = (s) => (s || '?')[0].toUpperCase()

  // newest in spotlight
  $spot.classList.remove('enter')
  void $spot.offsetWidth
  $spot.innerHTML = `
    <div class="avatar">${initial(buyers[0].name)}</div>
    <div class="spot-text">
      <div class="spot-name">${cap(buyers[0].name)}</div>
      <div class="spot-meta">
        <span class="spot-action">JUST JOINED</span>
        <span class="spot-pill">$249 LIFETIME</span>
        <span class="spot-when">${buyers[0].when}</span>
      </div>
    </div>
  `
  $tail.innerHTML = buyers.slice(1).map(b => `
    <div class="tail-row">
      <div class="tail-avatar">${initial(b.name)}</div>
      <div class="tail-name">${cap(b.name)}</div>
      <div class="tail-when">${b.when}</div>
    </div>
  `).join('')
  $spotsNum.textContent = '7'
})

await page.waitForTimeout(800) // let fonts + shimmer settle a beat

await page.screenshot({ path: path.join(__dirname, 'preview-1200x600.png'), omitBackground: false })
console.log('saved preview-1200x600.png')

await ctx.close()
await browser.close()
