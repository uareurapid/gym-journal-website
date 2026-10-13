/**
 * Render tools/og-card.html to assets/img/og.png (1200x630).
 *
 * Playwright is borrowed read-only from the career-ops checkout, the same way
 * the App Store creative pipeline borrows it — hence the explicit NODE_PATH:
 *
 *   NP=/Users/paulocristo/workspace/mines/career-ops/node_modules
 *   NODE_PATH=$NP node tools/build_og.mjs
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const browser = await chromium.launch();
const page = await browser.newPage({
  // 1x keeps the output exactly 1200x630, matching the og:image:width/height
  // declared on every page.
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});

await page.goto(pathToFileURL(path.join(here, 'og-card.html')).href, {
  waitUntil: 'networkidle',
});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);

const out = path.join(root, 'assets/img/og.png');
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();

console.log(`wrote ${out}`);
