/**
 * Local verification for the Gym Journal site. Not part of the deployable site —
 * run it against a local server to check the pages actually render.
 *
 *   python3 -m http.server 8899
 *   NODE_PATH=/Users/paulocristo/workspace/mines/career-ops/node_modules \
 *     node tools/verify.mjs http://127.0.0.1:8899
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.argv[2] || 'http://127.0.0.1:8899';
const here = path.dirname(fileURLToPath(import.meta.url));

const pages = ['/', '/privacy.html', '/terms.html'];
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1120, height: 800 },
  { name: 'tablet', width: 834, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

let failures = 0;
const note = (ok, msg) => {
  if (!ok) failures += 1;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${msg}`);
};

const browser = await chromium.launch();

for (const route of pages) {
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    const consoleErrors = [];
    const failedRequests = [];
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => failedRequests.push(`${r.url()} — ${r.failure()?.errorText}`));

    const res = await page.goto(base + route, { waitUntil: 'networkidle' });
    const label = `${route} @ ${vp.name}`;

    note(res.status() === 200, `${label} — HTTP ${res.status()}`);
    note(consoleErrors.length === 0, `${label} — console clean${consoleErrors.length ? `: ${consoleErrors[0]}` : ''}`);

    // Local assets must all resolve (the Google Fonts CDN is allowed to be flaky).
    const localFailures = failedRequests.filter((u) => !u.includes('fonts.g'));
    note(localFailures.length === 0, `${label} — assets loaded${localFailures.length ? `: ${localFailures[0]}` : ''}`);

    // Nothing pushes the page sideways.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    note(overflow <= 1, `${label} — horizontal overflow ${overflow}px`);

    // Scroll the whole page so every reveal has a chance to fire. Smooth scrolling
    // must be off first, or the scripted scrollTo calls never actually land.
    await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = 'auto';
      const step = window.innerHeight * 0.6;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1600);

    // On a phone the screenshot rail is a horizontal swiper, so anything inside it
    // that is off to the right only reveals and loads once it is swiped to.
    const swiped = await page.evaluate(async () => {
      const rail = document.querySelector('.rail');
      if (!rail || rail.scrollWidth <= rail.clientWidth) return false;
      rail.scrollIntoView({ block: 'center', behavior: 'auto' });
      await new Promise((r) => setTimeout(r, 300));
      for (let x = 0; x < rail.scrollWidth; x += rail.clientWidth * 0.6) {
        rail.scrollTo({ left: x, behavior: 'auto' });
        await new Promise((r) => setTimeout(r, 150));
      }
      await new Promise((r) => setTimeout(r, 400));
      rail.scrollTo({ left: 0, behavior: 'auto' });
      return true;
    });
    if (swiped) await page.waitForTimeout(900);

    const hiddenReveals = await page.$$eval('[data-reveal]', (els) =>
      els.filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length,
    );
    note(hiddenReveals === 0, `${label} — ${hiddenReveals} reveals stuck hidden`);

    // Lazy images only exist once they have been scrolled past.
    const lazyBroken = await page.$$eval('img', (imgs) =>
      imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')),
    );
    note(lazyBroken.length === 0, `${label} — ${lazyBroken.length} lazy images unloaded`);

    if (route === '/') {
      const prText = await page.textContent('.record__num [data-count-to]');
      note(prText.trim() === '105', `${label} — PR counted up to "${prText.trim()}"`);

      const bars = await page.$$eval('.record__bars i', (els) =>
        els.map((el) => el.getBoundingClientRect().height > 6),
      );
      note(bars.every(Boolean), `${label} — record bars grew (${bars.filter(Boolean).length}/7)`);

      await page.screenshot({
        path: path.join(here, `../.verify/${vp.name}.png`),
        fullPage: false,
      });
    }

    await context.close();
  }
}

// ── Link integrity: every internal target must exist on the server ───────────
{
  const page = await browser.newPage();
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });

  const hrefs = await page.$$eval('a[href]', (as) =>
    [...new Set(as.map((a) => a.getAttribute('href')))],
  );

  const internal = hrefs.filter((h) => !/^(https?:|mailto:|#)/.test(h));
  const anchors = hrefs
    .filter((h) => h.startsWith('#') && h !== '#')
    .map((h) => h.slice(1));

  for (const href of internal) {
    const res = await page.request.get(`${base}/${href.replace(/^\.?\//, '')}`);
    note(res.status() === 200, `link ${href} — HTTP ${res.status()}`);
  }

  const missingAnchors = await page.$$eval('a[href^="#"]', (as) =>
    as
      .map((a) => a.getAttribute('href'))
      .filter((h) => h && h !== '#' && !document.getElementById(h.slice(1))),
  );
  note(missingAnchors.length === 0, `in-page anchors resolve (${anchors.length} checked)`);

  const namelessLinks = await page.$$eval('a', (as) =>
    as.filter((a) => !(a.textContent.trim() || a.getAttribute('aria-label'))).length,
  );
  note(namelessLinks === 0, `every link has an accessible name (${namelessLinks} without)`);

  const missingAlt = await page.$$eval('img', (imgs) =>
    imgs.filter((i) => i.getAttribute('alt') === null).length,
  );
  note(missingAlt === 0, `every image has an alt attribute (${missingAlt} without)`);

  await page.close();
}

await browser.close();
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
