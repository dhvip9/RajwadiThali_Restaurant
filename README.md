# Rajwadi Thali, Chaat & Sweets — restaurant site

The dine-in website for Rajwadi Thali, Chaat & Sweets in Fremont, California.
A static site: no framework, no build step for the pages themselves, no
dependencies to install before it will run. Open `site/index.html` on any
static server and it works.

There is a sister site — the catering business at `rajwadicatering.com` — and
this one is deliberately built to match it, element for element, so the two
read as one brand. Where a value here looks oddly specific, it is usually
because it was measured off the catering site rather than chosen.

---

## Contents

- [Run it](#run-it)
- [What is in the repo](#what-is-in-the-repo)
- [The pages](#the-pages)
- [Asset versioning — the thing to not forget](#asset-versioning--the-thing-to-not-forget)
- [Service worker and offline](#service-worker-and-offline)
- [The liquid glass engine](#the-liquid-glass-engine)
- [Accessibility panel](#accessibility-panel)
- [Build scripts](#build-scripts)
- [Menu data — the source of truth](#menu-data--the-source-of-truth)
- [Images](#images)
- [Deploying](#deploying)
- [Gotchas worth knowing before you edit](#gotchas-worth-knowing-before-you-edit)

---

## Run it

The site must be served over HTTP, not opened as a `file://` path — the service
worker, the manifest and the module boundaries all need an origin.

```bash
python3 -m http.server 8777 --bind 127.0.0.1 --directory site
```

Then open <http://localhost:8777>.

`.claude/launch.json` defines three preview configurations:

| name | port | what it serves |
| --- | --- | --- |
| `rajwadi-dine` | 8777 | this site |
| `rajwadi-catering` | 8778 | the sister catering site, for side-by-side comparison |
| `liquid-glass` | 3111 | a separate glass prototype, if present |

**Do not preview through the IDE's built-in server.** JetBrains serves from a
path like `/Rajwadi%20Dine%20Page%20/site/`, so every root-relative URL
(`/favicon.ico`, the manifest `start_url`, the service worker scope) resolves
against the wrong origin and the PWA silently fails to install.

---

## What is in the repo

```
.
├── site/                     everything that deploys
│   ├── index.html            the whole one-page site
│   ├── menu.html             full menu, print/PDF friendly
│   ├── allergens.html
│   ├── accessibility.html    accessibility statement
│   ├── privacy.html
│   ├── terms.html
│   ├── offline.html          service-worker fallback + a small game
│   ├── sw.js                 service worker
│   ├── site.webmanifest      PWA manifest
│   ├── sitemap.xml robots.txt llms.txt
│   ├── README.md             the long design log — see the note below
│   └── assets/
│       ├── css/styles.css    ~2,600 lines, one stylesheet
│       ├── js/main.js        ~1,900 lines, one script, no dependencies
│       └── img/              37 files — 29 WebP, 7 PNG icons, 1 JPEG
├── tools/
│   ├── build_menu.py         regenerates site/menu.html
│   └── menu-data.json        the menu, as data
├── make_favicon.py           regenerates every favicon from the master art
├── title logo.png            the 1254×1254 favicon master (build input)
└── README.md                 this file
```

`site/README.md` is a separate, much longer document — a running log of the
design decisions, with the reasoning behind particular values. It is worth
reading before changing anything visual. Two caveats:

- It **ships**, because it sits inside `site/`. It is 81 KB of internal notes
  reachable at `/README.md` on the live site. Harmless, but move it out if that
  bothers you.
- Its **glass engine sections are out of date.** That code was rewritten from
  first principles (see below) and those chapters describe the older approach.

---

## The pages

`index.html` is the entire site: hero, about, best sellers, the tabbed menu,
gallery, reviews, FAQ, footer. Everything else is a supporting page that reuses
the same header, footer and stylesheet.

`menu.html` is the full menu as one page — three Unlimited Thali cards, Combo,
Kids, Chaats, Sweets and Drinks, with photos. It has a **Print or download
menu** button; the browser's print dialog handles both paper and "Save as PDF".

It prints as **four pages**, which is designed rather than accidental:

| page | contents |
| --- | --- |
| 1 | cover — logo, title, hero photo, address, phone, hours |
| 2 | Unlimited Thali + Combo |
| 3 | Kids Menu + Indian Street Chaats |
| 4 | Sweets + Drinks + notes + contact |

The cover exists only in print (`display:none` on screen) and the screen
masthead is hidden in print, so neither duplicates the other. Only two
deliberate `page-break-before` rules do the pagination — before Kids and before
Sweets. Everything else flows so a page fills before the next begins.

Print needs its own geometry, not just smaller type. A Letter sheet is about
550pt wide, and the screen grids size themselves from a pixel minimum, so
without explicit print rules the thali grid collapses to two columns and pushes
the third card onto a page of its own.

---

## Asset versioning — the thing to not forget

Every page links its CSS and JS with a content hash:

```html
<link rel="stylesheet" href="assets/css/styles.css?v=7e5850dc">
<script src="assets/js/main.js?v=2efd8938"></script>
```

The query **is** the cache key, both for browsers and for the service worker. If
you edit `styles.css` or `main.js` and do not bump the hash, returning visitors
keep the old file indefinitely.

Bump it across all five pages:

```bash
CSS=$(md5 -q site/assets/css/styles.css | cut -c1-8)
JS=$(md5 -q site/assets/js/main.js | cut -c1-8)
for f in site/index.html site/allergens.html site/accessibility.html \
         site/terms.html site/privacy.html; do
  sed -i '' -E "s|styles\.css\?v=[0-9a-f]+|styles.css?v=$CSS|g;
                s|main\.js\?v=[0-9a-f]+|main.js?v=$JS|g" "$f"
done
```

`menu.html` and `offline.html` are self-contained and carry no versioned links.

---

## Service worker and offline

`site/sw.js`, currently at `CACHE_VERSION = 'v12'`.

**Bump `CACHE_VERSION` whenever the `SHELL` list changes, or when a precached
file changes.** The shell is only re-fetched on install, so without a bump,
anyone already installed keeps the old copy forever.

Strategy:

- **navigations** — network first; on failure, the *same page* from cache; then
  the offline page.
- **assets** — cache first on an exact URL match, network otherwise.

Two rules exist because they were violated once and caused a real bug:

1. **The navigation fallback matches the exact path, never `ignoreSearch`.**
   `ignoreSearch` does not mean "ignore the cache-buster" — it means any cached
   entry with a matching path will do. One flaky request for `/index.html?x=2`
   was answered with a copy of `/index.html?x=1` saved at some arbitrary earlier
   point; because that HTML names its CSS and JS by content hash, and those old
   hashed files were still in the runtime cache, the whole stale set was served
   together. The page came up looking perfect and was completely out of date.

2. **A new hash for a file evicts older hashes of that file.** Without this the
   runtime cache keeps one copy per version forever — it had eleven stylesheets
   and nine scripts in it during development, every one of them available for
   something to resurrect by mistake.

Navigations are cached under the **pathname**, so `?utm_source=…` and friends
do not mint a copy of the same page per query string.

The menu's sixteen photos are deliberately **not** in the shell. They all also
appear on the home page, so a visitor who has browsed the site already has them
in the runtime cache, and precaching would add ~500 KB to the install for a
second copy.

### The offline page

`offline.html` is fully self-contained — inline CSS, inline JS, no external
requests — because it is the page shown when fetching another file is the one
thing that cannot happen.

It also contains **Samosa Run**, a small canvas game: hop the chai glasses,
duck the hanging torans. Everything is drawn with paths, so there is no sprite
sheet to fail to load. The high score persists in `localStorage`. The page's
own controls come first — Space only starts the game once the game has been
deliberately focused, so pressing Space on "Try again" still reloads.

---

## The liquid glass engine

In `main.js`. This is the part most worth understanding before touching it.

The material is **one surface, simulated** — not a stack of effects:

1. A **height profile** across the bezel, `y = ⁴√(1 − (1−x)⁴)` — the squircle,
   which is what Apple uses. Its flat→curve join is far softer than a circle's,
   which matters because the nav is a ~1200×94 pill, about as stretched as a
   rounded shape gets.
2. The **surface normal** from that profile's derivative.
3. **Snell's law** through it, air into glass at n = 1.5.
4. The refracted ray falls through the glass and hits the page; the lateral
   offset is the displacement.

Two useful properties fall out of the physics rather than needing clamps:

- **The bend is self-limiting.** A ray entering glass can never exceed the
  critical angle (41.8° at n = 1.5), so no amount of edge curvature smears the
  bar.
- **The bend goes to zero at the rim**, because that is where the glass is
  thinnest — it bends hardest there but has almost no depth left to fall
  through. Peak displacement lands just *inside* the edge.

The material is four numbers, in **pixels**, not fractions:

```js
var GLASS = { profile: 'squircle', bezel: 40, thickness: 66, gap: 12, ior: 1.5 };
```

Pixels because glass has a thickness — a wide pane and a small chip cut from the
same sheet have the same edge. Expressed as a fraction of height, a 677px panel
would get a 280px rim.

### Where the lens is applied, and where it is not

Only **thin floating chrome** that passes over sharp content:

```js
lensAll('#nav',        { radius: 'pill' });
lensAll('.mobile-cta');
lensAll('.page-back',  { radius: 'pill' });
```

Two tests, and a surface must pass both:

- **Is there anything behind it worth bending?** A lens over a flat field
  returns that field. The cards, thali list, reviews and footer all sit on one
  cream colour.
- **Is the surface thin enough to show it?** The fold — the mirrored band where
  the displacement reverses — is a fixed ~17px. That is a fifth of a 94px bar
  and its whole character; on a 677px panel it is 2.5% and invisible, while the
  panel pays for 609,000 pixels of filtered backdrop every frame.

**Buttons get the light without the lens.** `bezelRimGradient()` solves the same
bezel with the same light vector and emits one conic gradient as
`--lg-rim-conic`, so every button is lit by the identical surface model for the
cost of a gradient.

### Performance rules that are load-bearing

- **Shared filters.** The maps depend only on size and corner radius, so
  surfaces that measure the same share one filter, keyed on rounded dimensions.
- **Lazy + self-correcting.** An `IntersectionObserver` (200px margin) builds
  only what is near the viewport; a `ResizeObserver` catches shape changes that
  are neither a scroll nor a window resize — a panel opening from
  `display:none`, for one.
- **Garbage collection.** Every distinct size mints a filter, so a slowly
  dragged window would mint one per pixel of width. Unreferenced filters are
  swept after each build.
- **`MAP_MAX = 420`** caps map resolution, and **`MIN_BEZEL_PX = 24`** is a
  floor under it — capping the long edge alone built the nav's map at 420×32 and
  stretched it back 2.9×, which showed as banding.
- **One pass, analytic normals.** A rounded rectangle's gradient does not need
  finite differences; it falls out of the same `(qx, qy)` the distance needs.
  Two functions each calling the SDF five times per pixel cost 199ms of blocked
  main thread per resize. Now: zero long tasks.

### No blur where there is nothing to blur

A Gaussian blur of a uniform field *is* that field, and a blur of a linear ramp
is that ramp. Surfaces on the flat page therefore run `saturate()` only.

Measured on the home page: **35 backdrop-filtered elements totalling 4.66
million pixels, 4.6× the viewport.** Trimming the no-ops and the nested cases
brought it to 759,050 px across 10 elements — **84% less, visually identical.**

Nested backdrop filters are also removed. Blurring an already-blurred backdrop
is near-idempotent, and nesting is the case engines handle least reliably.

---

## Accessibility panel

The floating button opens a panel with five stepped controls and five toggles.
State persists in `localStorage` under `rt-a11y` and is applied as attributes
and classes on `<html>`.

| stepper | attribute |
| --- | --- |
| Bigger text | `data-a11y-text` |
| Line height | `data-a11y-line` |
| Text align | `data-a11y-align` |
| Contrast | `data-a11y-contrast` |
| Opacity | `data-a11y-opacity` |

| toggle | class |
| --- | --- |
| Readable font | `a11y-font` |
| Grayscale | `a11y-gray` |
| Hide images | `a11y-noimg` |
| Pause animations | `a11y-motion` |
| Highlight links | `a11y-links` |

**Opacity** makes the glass progressively solid, which is the point of it — this
site is made of glass and glass is the first thing to go wrong for a reader who
needs contrast. It works by putting a page-coloured base *under* each surface's
own fill: every glass surface paints a translucent gradient, and a gradient is a
background-*image*, so `background-color` sits beneath it. Raising that alpha
solidifies the surface without overriding a single fill, border, rim or shadow.
At 100% the backdrop filters come off entirely — so the most accessible setting
is also the cheapest to render.

High contrast and Hide images both switch the lens off entirely.

---

## Build scripts

Neither runs automatically. Run them when their input changes.

### `tools/build_menu.py` — regenerates `site/menu.html`

```bash
python3 tools/build_menu.py tools
```

Reads `tools/menu-data.json` and the photos in `site/assets/img/`, and writes
`site/menu.html`. Every price on the menu page comes from that JSON, so edit the
data and re-run rather than editing the HTML.

It also carries the photo pairings. **Each was checked against the actual
image**, because the gallery's own `alt` text proved unreliable — one file
labelled "Platter of Rajwadi sweets" is in fact chole bhature.

Featured dishes are matched to the price list by exact string; a featured dish
is removed from the list so nothing prints twice. If a name drifts, the card is
skipped rather than inventing a price.

### `make_favicon.py` — regenerates every icon

```bash
python3 make_favicon.py     # needs Pillow and numpy
```

Reads `title logo.png` (1254×1254) and writes `icon-512/192/96/48/32.png`,
`apple-touch-icon.png` and `favicon.ico` into `site/assets/img/`.

The master lives at the repo root **on purpose**. It used to sit in
`site/assets/img/`, where it was a build input shipping 1.85 MB to every visitor
for a file no page ever fetches — 39% of the whole site payload at the time.

---

## Menu data — the source of truth

`tools/menu-data.json` holds the thalis, every priced item, the add-on lines and
the dining rules.

Two places state prices and must be changed together:

1. `site/index.html` — the tabbed menu, plus the JSON-LD `Menu` block in
   `<head>` that search engines read.
2. `tools/menu-data.json` — then re-run the builder.

`site/llms.txt` also carries a plain-text menu for AI crawlers, and
`site/README.md` documents provenance. Grep for a price before assuming one
copy is all of them:

```bash
grep -rn '\$26\.99' site/ tools/
```

---

## Images

All dish photography is WebP (29 files). The icons are PNG (7), `favicon.ico`
is an ICO, and there is exactly one JPEG — `og-image.jpg`, the social-card
image, kept as JPEG because some link scrapers still do not accept WebP.

Sources cap at **640px wide**, except the two thali photos at 900px. The menu
cards render at ~340 CSS px, so on a 2× display they want ~680px — meaning the
worst case sits at 0.95× of ideal. Not visible, but if the dishes are ever
re-photographed, exporting at 1280px would make the cards pin-sharp.

Card media frames use **4:3**, which is the native ratio of nearly every source,
so `object-fit` has nothing to crop.

Two conventions worth keeping:

- **Do not re-encode an already-optimised WebP.** A second pass costs quality
  for nothing. The menu page links the site's own images rather than making
  shrunken copies.
- **Match the card width to what the photo can fill.** Cards cap at 340px
  precisely because two Kids cards left to stretch reached 500px and asked for
  1000px from a 640px file.

---

## Deploying

`site/` is the web root. Copy it as-is; there is nothing to compile.

Before deploying:

1. Bump the `?v=` hashes if CSS or JS changed.
2. Bump `CACHE_VERSION` in `sw.js` if any precached file or the `SHELL` list
   changed.
3. Re-run `tools/build_menu.py` if the menu data changed.
4. Check for broken references:

```bash
python3 - <<'PY'
import os, io, re
missing = []
for dp, dn, fn in os.walk('site'):
    for f in fn:
        if not f.endswith(('.html', '.css', '.js', '.webmanifest', '.xml')):
            continue
        p = os.path.join(dp, f)
        t = io.open(p, encoding='utf-8', errors='ignore').read()
        for m in set(re.findall(r'(?:src|href)="([^"]*\.(?:webp|png|jpe?g|ico|css|js|html))"', t)):
            if m.startswith(('http', '//', 'data:', 'tel:', 'mailto:', '#')):
                continue
            rel = m.split('?')[0].split('#')[0].lstrip('/')
            if rel and not os.path.exists(os.path.join('site', rel)) \
                   and not os.path.exists(os.path.join(dp, rel)):
                missing.append((p, m))
print('broken references:', len(missing))
for a, b in missing:
    print('  ', a, '->', b)
PY
```

---

## Gotchas worth knowing before you edit

**`.scores`, `.tel` and similar are `<p>` elements** and inherit the base
`p { max-width: 46ch }`. That cap is right for prose and wrong for a two-item
row — it once held a centred row to 348px inside a 620px section and pinned it
to the left edge.

**`justify-content: center` breaks horizontal scrollers.** It centres
overflowing content by pushing it past *both* edges, and the part past the start
edge cannot be scrolled back to. The menu tab strip uses `safe center`, with
plain `center` declared first as the fallback.

**`auto-fit` sizes tracks from the minimum.** `repeat(auto-fit, minmax(240px,
340px))` on a 1040px row fits four 240px tracks, then caps each at 340 — and
4 × 340 overflows. The dish cards use flex for exactly this reason.

**`vh` in print means the screen viewport, not the sheet.** A cover sized with
`calc(100vh - 22mm)` came out taller than the page and split across several.

**`overflow-x: auto` forces `overflow-y` to compute to `auto` too**, so a
horizontal scroller clips vertical drop shadows unless it has vertical padding.

**Assigning `scrollLeft` on an element with `scroll-behavior: smooth` animates**
rather than jumping, and an animation that cannot run leaves the scroller where
it was.

**Setting `canvas.width` wipes the bitmap.** Outside an animation loop nothing
repaints it, so a resize leaves an empty canvas.

**`-webkit-font-smoothing: antialiased` thins every stroke on macOS.** It is
deliberately absent here; adding it makes this site's text visibly lighter than
the catering site's, with everything else identical.

---

## Verified in this repo

Numbers quoted above were measured, not estimated: backdrop-filter pixel counts
and long-task durations from the running page, image resolution ratios against
`devicePixelRatio`, printed page counts from headless Chrome, and cache contents
from the live Cache Storage API.
