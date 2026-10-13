# gym-journal-website

The marketing site for **Gym Journal** — a lifting journal for iPhone and iPad.

Live at: <https://pcristo.dev/gym-journal-website/>
App Store: <https://apps.apple.com/us/app/gym-journal-sets-reps-log/id6817376632>

Static HTML, CSS and a single small script. No build step, no dependencies, no tracking of its
own — the same shape as the other app sites in `WEBSITES/`.

## Design

Aesthetic: **iron and ember**. A training logbook rendered in near-black steel, with the app's own
ember orange as the only heat in the room.

- **Colour, radii and spacing** come from the app's `src/theme/tokens.ts`, so the site and the
  product cannot drift apart. `--ink-3` is the one deliberate exception: the app's `#6E7681`
  measures 3.94:1 on the page colour, which is below WCAG AA for web text, so it is lightened to
  `#868E99` (5.47:1 on the page, 4.99:1 on a card).
- **Type** is Big Shoulders Display (sign-like condensed display), Barlow (the dry body register
  the app's own copy uses) and IBM Plex Mono (the logbook — sets, reps, loads, records).
- **Depth** follows the app's own rule: a fill step plus a rim, never a shadow. Shadow is spent
  only where it should read as glow — the ember primary and the handset.
- The **nav** is the app's floating glass capsule tab bar, promoted to the top of the page, and the
  section markers are set like plate labels.

## Pages

| File | What it is |
|---|---|
| `index.html` | The landing page: hero, positioning, four screens, logging, the record, Lifty, free vs Pro, privacy, FAQ, closing CTA |
| `privacy.html` | Privacy policy — **generated**, see below |
| `terms.html` | Terms of use — **generated**, see below |
| `styles.css` | The whole design system |
| `main.js` | Scroll reveals, the personal-record count-up, the nav's stuck state, the footer year |

### Progressive enhancement

Nothing on the page is hidden by CSS unless JavaScript is present: the reveal styles are scoped to
a `.js` class that an inline head script sets. With JavaScript unavailable the page is simply
fully visible and unanimated. The personal-record number is written into the HTML as its final
value and only animates towards it.

## Generating the legal pages

`privacy.html` and `terms.html` are **generated, never hand-edited**. Their body text is extracted
verbatim from the app's own source of truth — `gym-journal/src/lib/legal.ts`, the same string the
in-app Legal sheet renders — so the website, the in-app modal and the App Store listing cannot
diverge. The script only wraps the text in markup; it does not rewrite a word of it.

```bash
python3 build_legal.py
```

If the app's legal text changes, re-run this. Do not edit the two HTML files by hand.

## Generating the social card

`assets/img/og.png` is rendered from `tools/og-card.html`, so it uses the same tokens and fonts as
the site rather than being maintained as a separate image.

```bash
NP=/Users/paulocristo/workspace/mines/career-ops/node_modules
NODE_PATH=$NP node tools/build_og.mjs      # writes assets/img/og.png (1200x630)
```

Playwright is borrowed read-only from the `career-ops` checkout, the same way the App Store
creative pipeline borrows it — hence the explicit `NODE_PATH`.

## Verifying the site

```bash
python3 -m http.server 8899
NP=/Users/paulocristo/workspace/mines/career-ops/node_modules
NODE_PATH=$NP node tools/verify.mjs http://127.0.0.1:8899
```

Checks all three pages at four widths for: HTTP status, a clean console, every local asset loading,
broken or lazy images, horizontal overflow, scroll reveals firing, the record bars growing, the
count-up landing on its final value, internal links resolving, in-page anchors existing, and every
link and image having an accessible name. Screenshots land in `.verify/` (git-ignored).

## Assets

`assets/img/` holds the only binaries. Everything came from the app or its marketing folder:

| File | Source |
|---|---|
| `screen-log.webp` | `GymJournal/iPhone/EN/…18.54.33.png` — the Log tab |
| `screen-setsheet.webp` | `…18.54.45.png` — the Log a set sheet |
| `screen-progress.webp` | `…19.35.38.png` — the Progress tab |
| `screen-you.webp` | `…19.36.38.png` — the You tab |
| `screen-exercises.webp` | `…19.39.31.png` — the Exercises tab |
| `lifty-male.png`, `lifty-female.png` | `GymJournal/lifty-*-512.png` |
| `icon-*.png`, `favicon.*`, `apple-touch-icon.png` | `gym-journal/assets/icon.png` |

The raw captures are 1206×2622, which is heavier than a web page needs; they are resized to 780px
wide and encoded as WebP (38–57 KB each).

## Editorial rules

These come from the app's own store metadata and matter more than they look:

- **No prices are stated.** A hardcoded price is wrong in every storefront but one, so the plans
  are described and the App Store is linked for the localised figure.
- **No "export".** The in-app paywall promises export, but version 1.0.0 does not implement it, so
  the site does not claim it either.
- **Pro sells depth, never access.** Logging, history, streaks, records and plate maths are free
  for ever; Pro adds the longer chart ranges and unlimited custom movements. Nothing is taken away
  when a subscription lapses.
- **Voice is described honestly** — transcribed on-device where the offline model exists, iOS
  dictation otherwise, and the audio is never stored.

Also included for crawlers and assistants, matching the other app sites: `robots.txt`,
`sitemap.xml`, `llms.txt` and `llms-full.txt`.

## Deploying

Static — publish the repository root with GitHub Pages. The site assumes the
`https://pcristo.dev/gym-journal-website/` base path, which the canonical URLs, `sitemap.xml`,
`robots.txt` and the `og:image` tag all reference.

## Licence

MIT — see [LICENSE](./LICENSE). Gym Journal is an independent app and is not affiliated with Apple.
