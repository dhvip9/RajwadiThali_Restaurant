# Rajwadi Thali — Restaurant Dine Page

A hand-built clone of the first part of **rajwadi-thali.com**, rebuilt as plain
HTML/CSS/JS with the new best sellers, prices, and the wall menu from the photos
in the parent folder.

**Brand colour is shared with rajwadicatering.com** — same gold `#D49B3A`, same
gold-ink/gold-light text pair, same four fonts, same liquid-glass nav.
**The background is what differs**, and that's the whole point.

## Run it

```bash
python3 -m http.server 8777 --directory "/Users/dhvippatel/Documents/Rajwadi Dine Page /site"
```

Then open http://localhost:8777

Static site, no build step. Drops onto any host as-is.

## How the two sites tell themselves apart

| | Catering | Restaurant (this) |
|---|---|---|
| **Background** | warm cream `#F5F0E7` + ivory bands | **same cream, same ivory bands** |
| **Photo hero** | none | **black hero band — the distinguishing element** |
| Brand gold | `#D49B3A` | **same** |
| Gold text on light | `#8A5A0F` | **same** |
| Gold text on dark | `#E8BE72` | **same** |
| Gold fills (CTA, tabs, badges, banner) | gold | **same** |
| Fonts | Cormorant Garamond · Inter · Poppins | **same** |
| Nav geometry | — | **identical, measured off the live site** |
| Nav light theme | cream glass `rgba(250,244,233,.90)` | white glass `rgba(255,255,255,.90)` |
| Logo | `logo.webp` | **same file** |

**The ground is catering's.** `--bg-page` is catering's `#F5F0E7`, `.band`
sections use catering's `.band-ivory` values (`#FAF6EE → #F8F3E9` under a
top-right white highlight), the footer panel uses catering's warm gradient, and
the mobile bar uses its `--surface-solid` `#FCF9F3`.

**What distinguishes this site is the black photo hero** — the home `.hero` and
every subpage `.page-hero`. Catering has no such band. Everything after the hero
is the shared cream.

The `.section--dark` class and its tokens are still defined and working — nothing
uses them right now, so adding a dark section later is a one-class change.

### Background tokens taken from catering

| Token | Value | Catering's name |
|---|---|---|
| `--bg-page` | `#F5F0E7` | `--bg` |
| `--bg-surface` | `#FCF9F3` | `--surface-solid` |
| `.band` | `#FAF6EE → #F8F3E9` + white top-right highlight | `.band-ivory` |
| `.footer-panel` | `rgba(255,255,255,.92) → rgba(245,239,229,.86)` | same |

The footer takes the light palette but keeps a **transparent** ground — its
`.footer-panel` supplies the surface, so the ambient wash stays visible around
it, exactly as on catering.

### Adaptive nav

Because the nav floats over both grounds, it swaps theme the way catering's
does — `.nav-theme-dark` over the hero, `.nav-theme-light` everywhere else,
changing text, icon, hover, active-pill and glass colour. The mobile sheet and
the fixed bottom bar follow the same signal (`.bar-dark` on the bar). Catering samples background
luminance with `elementFromPoint`; here sections declare their own ground with
`.section--dark` / `.section--light`, so it's a plain rect test against the dark
ones: no hit-testing, no paint races, no forced style reads on scroll. Sampling
is rAF-throttled and skipped under 40px of movement.

### Nav matched 1:1 to the live catering site

Every value was read off `www.rajwadicatering.com` and reproduced, then verified
by measuring both navs side by side at 1440x900:

| | Catering | This site |
|---|---|---|
| Nav box | 1368 x 94 | **1368 x 94** |
| `top` / `radius` / `padding` | 20px / 999px / 12px 20px | **same** |
| Material | `rgba(18,18,20,.62)` + `blur(26px) saturate(200%)` | **same** |
| Border | `1px solid rgba(255,255,255,.16)` | **same** |
| Top hairline | `::before`, 6%→94%, `--nav-border-strong` | **same** |
| Specular sheen | `::after`, rotated ellipse, overlay blend | **same** |
| Logo height | 56px (44px at ≤768) | **same** |
| Logo left offset | 52.5px | **52.4px** |
| Tagline | `.58rem` / `.34em` (`.52rem` / `.28em` at ≤560) | **same** |
| Link | 15.36px / 650 / `12px 14px` / radius 28px / 8px gap | **same** |
| Link height | 46px | **46px** |
| Nav icon | 22 x 22 | **same** |
| List gap | 24px | **same** |
| CTA wrapper gap | 14px | **same** |
| CTA button | Poppins 13.12px / 600 / `11px 22px`, borderless | **same** |
| CTA height x width | 42 x 155 | **42 x 155** |
| CTA right offset | 21px | **21px** |
| Hamburger bars | 22 x 2px, 5px gap, 44px min target | **same** |

The breakpoint cascade is catering's, not a set of my own:

| Width | Behaviour |
|---|---|
| ≤1367px | labels become visually hidden — icons only, accessible names kept |
| ≤1050px | desktop list out, hamburger in |
| ≤768px | nav CTA out, **fixed bottom action bar in**, logo 44px |
| ≤560px | tagline shrinks |

The label breakpoint is **1367px, not catering's 1300px**. Measured, the seven
labels plus the logo and the Order Online CTA need a 1300px bar, and the bar is
`min(95%, 1600px)` — so they only fit from a 1368px viewport up. At 1301–1367
the labels were quietly wrapping to two lines inside their pills. `.nav-label`
is now `white-space: nowrap`, which is also what lets the accessibility panel's
"Bigger text" detect that the bar is out of room instead of silently wrapping.

Two things needed fixing beyond copying numbers:

- Catering's nav runs at `line-height: normal`. Our body sets `1.65`, which was
  leaking in and making every link 49px against their 46px. Now scoped to the nav.
- Catering's gold button is **borderless**. My 1px border made the CTA 44px tall
  and 157px wide against their 42 x 155.

**One quirk reproduced faithfully:** `.nav-liquid > * { position: relative }`
overrides `.nav-noise { position: absolute }` in catering's own sheet, so the
noise layer stays an in-flow, zero-width flex item. Under `justify-content:
space-between` that phantom item takes a share of the free space — which is why
the logo sits at 52px rather than the 20px padding edge, and why it drifts toward
the middle once the links are hidden (catering 296.3px at 1000px wide, this site
297.4px). It matches because you asked for exact. If you'd rather the logo stayed
pinned left, putting `position: absolute` back on `.nav-noise` fixes it in one line.

The only intentional differences remain colour: the light theme is white glass
instead of catering's cream, and the float shadow's warm tint is neutral here.

### Mobile: sticky bottom order bar

Below 768px the nav keeps only logo + hamburger, and Order Online moves to a bar
fixed at the bottom of the screen — the same pattern catering uses:

- `.mobile-cta` — `position: fixed; bottom: 0`, z-index 890, 48px min-height
  touch targets: **Order Online** (gold, flexes to fill) + **Call** (gold
  outline, phone icon).
- `body { padding-bottom: var(--bottombar-space) }` reserves 70px plus the
  safe-area inset, so no content hides under the bar.
- No hard divider: the page fades into the bar through an 18px gradient, so it
  reads as floating above the content rather than welded to it.
- **The bar adapts.** It is light by default, like the page, and flips to
  `.bar-dark` only while it overlaps a hero — sampled from the bar's own
  position, not the nav's, since on a phone they are 700px apart.

The hamburger now opens a **separate sheet** below the nav with a dimming
backdrop, exactly like catering's `.nav-mobile`: 28px radius, `min(92%,1180px)`
wide, scrollable, icon + label + chevron rows, active row gold-tinted, and a
full-width Order Online button at the bottom. Escape or a backdrop tap closes it,
and the page behind is locked from scrolling while it is open.

## Hero copy and badges

| | Before | Now |
|---|---|---|
| Headline | "Authentic Gujarati Flavors" | "Authentic Gujarati & North Indian Dining for *Every Appetite*" |
| Sub-line | "Unlimited thalis, Indian street chaats and fresh sweets — served the way they are at home in Surat." | "Experience unlimited Gujarati thalis, Indian street chaats, and fresh sweets — handcrafted daily with authentic spices and served with warm hospitality, right here in Fremont." |
| Secondary button | `Call (510) 896-8976` | `Visit Us` → `#contact` |

The headline mirrors catering's, including the `<em>` on the closing phrase:
italic **and `--gold-light`**. The stylesheet had been setting that `<em>` to
plain `#fff`, so the emphasis was carried by the italic alone and this note was
describing an intent the code never had — they now agree.

`--gold-light` specifically, not `--gold` or `--gold-ink`: the `<em>` sits on
the black photo hero, where gold-light is the palette's on-dark gold (10.6:1;
`--gold` measures 6.6:1 and `--gold-ink` is a light-background colour that would
all but disappear). It is the same token the hero eyebrow, the trust-bar numbers
and every subpage's `.page-hero-inner h1` already use, so hero emphasis is one
colour site-wide. At the panel's maximum contrast step it brightens to `#FFD98A`
rather than washing out.

**"Appetite" is the word I chose** for the blank — it's the
most restaurant-specific option and it carries the unlimited-thali positioning.
"Every Craving", "Every Table" and "Every Occasion" all fit the same slot if you
prefer one of those.

Badges use catering's own trust-bar spec — 148px cells, 14px gap, Cormorant
Garamond gold-light value over a small-caps Poppins label, on glass:

| Value | Label |
|---|---|
| 100% | Vegetarian |
| Jain & Vegan | Available |
| Allergens | May Contain |
| 20,000+ | Guests Served |

"Allergens" is a link, like catering's — but catering points at a dedicated
`allergens.html` and this site has no such page, so it points at `#faq` for now.
Worth building a real allergens page before publishing, since "May Contain" is a
claim guests will click expecting detail.

On phones ≤560px the row becomes a 2x2 **grid**, not flex-wrap: "Jain & Vegan" is
`nowrap` and its min-content is wider than half the panel, so under flex-wrap it
refused to share a row and the first two badges stretched to full width instead.

## Allergens page

`allergens.html` — same chrome as the homepage (nav, mobile sheet, bottom bar,
footer), dark header band over a white content section, so it keeps the black/
white rhythm. Linked from three places: the hero **Allergens / May Contain**
badge, the delivery FAQ answer, and the footer.

Structure follows catering's own `allergens.html`, which deliberately does **not**
publish a per-dish matrix — it names the allergens present in the kitchen and
tells guests to ask. That is the safer pattern and I kept it:

1. Callout — tell your server before the first course (thali refills come from
   shared pots)
2. Nine allergens that may be present, each with where it turns up on this menu
3. What "100% vegetarian" rules out — meat, fish, eggs; Jain and vegan available
4. Cross-contact — shared kitchen, and **shared fryer oil** across samosa,
   kachori, pakoda, bhajia, vada, puri and bhature
5. Ask us — phone, email, address
6. Back to Dine Menu / Read the FAQ

> ### ⚠️ The kitchen must verify this page before it goes live
>
> The nine allergens were inferred from the dishes on your wall-menu photos —
> paneer means dairy, roti means wheat, manchurian means soy, and so on. They are
> reasonable, but they are **not** confirmed against your actual recipes,
> spice blends or suppliers. Allergen information is a safety claim: someone will
> make an eating decision from it.
>
> Please have whoever runs the kitchen check each entry, add anything I missed
> (a supplier's asafoetida often contains wheat, for example), and then update
> the "Last updated" line. There is an HTML comment at the bottom of the page
> marking this. I wrote "Last updated" rather than "Last reviewed" precisely
> because no one has reviewed it yet.

Subpage detail: `.page-head` is registered as a dark surface in both the CSS
token list and the nav's `DARK_SELECTOR`, so tokens resolve and the nav goes dark
over the header then light over the content. No nav link is active on a subpage,
so the sliding pill stays hidden instead of parking on Home.

## Type system — catering's, element for element

Cinzel is gone. It was never part of catering's text system (that site uses it
for exactly one decorative number), and it was doing all my heading work. Every
assignment below was read out of catering's stylesheet:

| Element | Font |
|---|---|
| `body`, paragraphs | **Inter** 400 |
| `h1`–`h4` (global rule) | **Cormorant Garamond** 700, `letter-spacing: .01em` |
| `.eyebrow`, `.btn`, `.logo-tagline`, labels | **Poppins** 600 |
| Nav | SF Pro / `-apple-system` stack |
| Dish names, FAQ questions, review quotes, badge values | **Cormorant Garamond** |
| Hero sub-line, page ledes | **Inter** (catering's hero paragraph is body text, not italic serif) |

Because Cormorant Garamond is a lighter, narrower face than Cinzel, the negative
tracking I had on headings (`-.015em` to `-.022em`) was replaced by catering's
`+.01em`, weight went 400 → 700, and heading sizes came up 2–6px so the optical
weight holds. Cinzel is also dropped from the Google Fonts request on both pages
— one less family to download.

## Allergens page — catering's page, class for class

`allergens.html` now uses catering's own structure and component classes rather
than my own invention:

`.page-hero` → `.page-hero-inner` (eyebrow, h1, lede, `.breadcrumb`) over a
photo with catering's exact three-stop dark gradient · `.legal-prose` at 760px
with a `.page-back` pill · `ul.allergen-tags` gold chips · `.legal-updated`
footnote. Section order matches too: intro → allergens present → what
"100% vegetarian" rules out → cross-contact → how to tell us.

Content is restaurant-side rather than event-side ("tell your server before your
first course" instead of "when you request a quote"), and the cross-contact
paragraph adds our shared fryer oil. The seven chips are catering's exact seven;
chickpea flour (besan) and coconut are called out in the paragraph beneath rather
than added as chips, so the chip row still matches.

> ### ⚠️ Still needs kitchen sign-off
>
> The allergens were inferred from the dishes in your wall-menu photos. They are
> reasonable but **not** verified against your recipes, spice blends or
> suppliers — a supplier's asafoetida (hing) commonly contains wheat flour, for
> instance. Allergen text is a safety claim someone will eat from. Have the
> kitchen confirm each line, then update the "Last updated" date. There is an
> HTML comment in the page marking this.

## FAQ — rewritten for relevance and SEO

The four placeholder questions are gone. Fourteen new ones, every answer grounded
in your actual menu and policies:

1. What is an unlimited Gujarati thali?
2. How much does the unlimited thali cost? *(all three prices)*
3. Difference between Silver, Platinum and Executive?
4. Do you have Jain and vegan options?
5. Is all of your food vegetarian?
6. Can two people share one unlimited thali? *(your no-sharing rule)*
7. Can I take unlimited thali leftovers home? *(TOGO not allowed)*
8. Do you offer takeout or delivery?
9. Do you have a kids menu?
10. What are your most popular dishes?
11. Is there a service charge for large groups? *(15% for 5+)*
12. Do you handle food allergies?
13. Where are you located?
14. Do you cater parties and events? *(cross-links to rajwadicatering.com)*

SEO work beyond the copy:

- **`FAQPage` JSON-LD** with all fourteen Q&As, so Google can show them as rich
  results. HTML is stripped from the structured-data copies.
- **`Restaurant` JSON-LD** — name, cuisines, price range, phone, email, postal
  address, `hasMenu`, `acceptsReservations`.
- **`rel="canonical"`** on both pages.
- Visible heading is now "Frequently Asked Questions" rather than "FAQ" — the
  phrase people actually search.
- Question wording front-loads real search phrases ("unlimited Gujarati thali",
  "Jain and vegan", "kids menu", "takeout or delivery").
- The catering cross-link and the two allergens links strengthen internal linking
  across the pair of sites.

The FAQ answers double as the source of truth for the JSON-LD, so if you edit a
question, edit the `<details>` block **and** the JSON-LD entry — they are not
generated from each other.

## Footer — catering's footer, class for class

Rebuilt on catering's own structure and component classes:

`.footer-panel` (photo-backed via `::before`, washed by `::after`, 34px radius)
with a `.footer-shine` hairline · `.footer-grid` at catering's exact
`1.35fr .85fr .95fr 1.25fr` with gold column dividers · `.footer-hr` diamond
flourishes under each heading · `.footer-badges` 54px icon tiles ·
`.footer-cinfo` bordered contact rows · the two stacked CTAs · `.footer-bottom`
with socials. Accordion collapse at catering's 820px breakpoint: `.footer-heading`
hides, `.footer-h` button appears, `.footer-col-body` opens on `.footer-open`.

The one deliberate difference is the overlay — catering washes the photo cream,
this washes it black, so the footer belongs to its own site.

### Typography verified against catering, element by element

Every footer font-size, line-height, weight, tracking, margin and padding was
diffed against the live catering footer through `getComputedStyle`, at 1440px
and at 375px. They now report identically. Three things had drifted:

| Symptom | Cause | Fix |
|---|---|---|
| Every footer line ~36% further apart than catering's | catering never sets `line-height` on `body`, so its footer inherits `normal`; this page sets `1.65` for long-form copy, which leaked in | `body > footer { line-height: normal }`. The parts carrying their own value (`.footer-desc` 1.7, `.footer-cinfo` 1.5, `.footer-badge-label` 1.25) still win, exactly as on catering |
| Social icons sat *before* the copyright on desktop | `order` was on the base rules instead of inside the 820px block, and only `.footer-copy` (1) and `.footer-legal` (3) were ordered — `.footer-social` kept the default 0 | moved all three `order`s into `@media (max-width: 820px)`, where catering has them |
| Legal row double-spaced on desktop | same — `line-height: 2` was on the base `.footer-legal` | moved into the 820px block |
| Mobile contact rows lost their box inset (9px 0 instead of 12px 14px) | the contact rows *are* `li a`, so the bare `.footer-cinfo` (0,1,0) lost to the tap-target rule (0,1,2) | qualified as `.footer-col-body .footer-cinfo`, the same way catering qualifies it |

Colour and weight were diffed the same way and match throughout: headings
`700 / #8A5A0F` uppercase, body copy `400 / #333333`, contact and badge icons
`#8A5A0F`, badge labels `600 / #333333`, the gold CTA's title `700 / #2B1D06`,
the dark CTA's `700 / #FBF6EC`, the bottom row `400 / #616161`, and social
chips `#8A5A0F` on `rgba(255,255,255,.6)`.

Parity is now exact, including the mobile column links: **no padding, and
`li { margin-bottom: 12px }`**, as catering has it. That does leave those links
at catering's 19px tap height, which is under the 44px touch-target guideline —
a known, accepted difference, chosen so the two footers measure identically.

Columns: **brand** (logo, description, 3 badges) · **Menu** (deep-links to each
menu tab) · **Visit** (About, Best Sellers, Gallery, Reviews, FAQ, Allergens) ·
**Get In Touch** (phone, email, address + both CTAs).

### Social links

Five, all lifted from catering's footer so the two sites point at the same
accounts: **WhatsApp** (switched to the restaurant's number, 510-896-8976),
**Facebook**, **Instagram**, **Google** (the restaurant's own Maps listing) and
**Yelp** (the restaurant's own Yelp page — both of those were already
restaurant-specific in catering's markup).

### Catering cross-link

`.footer-rest-cta` → **"Planning an Event?" / "Visit our catering site"** →
`rajwadicatering.com`. This is the exact mirror of catering's own footer button,
which reads "Order Food Online / Pickup & delivery" and points back here — so the
two sites now cross-link reciprocally in the same slot with the same component.

The `.footer-legal` row (Privacy Policy · Terms · Accessibility) is present on
all five pages now that those pages exist.

## Legal pages

Three pages, all on the same `.page-hero` + `.legal-prose` chassis as the
allergens page, all carrying the full nav / mobile sheet / footer / bottom bar,
all `noindex, follow` (useful to visitors, not search results):

| Page | Covers |
|---|---|
| `privacy.html` | That there is no form, account or tracking cookie on this site; server logs; Google Fonts; what leaving the site to DoorDash / Maps / social means; what we do with a phone call or email |
| `terms.html` | Site use, prices excluding tax, availability changes, **the unlimited-thali house rules** (no sharing, no waste, dine-in only, 15% for 5+), DoorDash's terms governing online orders, allergen responsibility, California governing law |
| `accessibility.html` | What is actually built in, the three system preferences honoured, **where the site falls short**, WCAG 2.1 AA as a self-assessment, and how to report a barrier |

Two things worth knowing about how I wrote these:

- **They describe this site as it actually is.** The privacy page says there is
  no contact form because there isn't one; the accessibility page lists the real
  keyboard, focus, semantics and `prefers-*` work rather than boilerplate. If you
  later add a booking form or analytics, the privacy page becomes wrong and needs
  updating.
- **The accessibility page admits its gaps** — short gallery alt text, no
  external audit, untested screen-reader combinations. That is deliberate: an
  accessibility statement that overclaims is worse than none, and the honest
  version is also the one that protects you.

> **Not legal advice.** I am not a lawyer and these are not reviewed by one. They
> are a solid, accurate starting point written from how your site and restaurant
> actually work. Before publishing, have someone qualified check them against
> California and federal requirements — particularly the privacy page, since
> CCPA obligations depend on facts about your business I don't have.

## Section differentiator — catering's two devices

A flat light page runs sections together, so the site now uses the same two
devices catering does:

- **`.section-seam`** — a gold diamond between two fading hairlines, 200px wide,
  centred above each section heading. Marks where one section ends and the next
  begins.
- **`.band`** — alternating tint. Sections without it paint **flat page cream**;
  `.band` sections lift to catering's ivory with its top-right white highlight.

**Plain sections paint their cream; they do not fall through.** They used to be
`background: transparent`, which let the four fixed, drifting gold blobs in
`.liquid-canvas` (up to 34% alpha) show through every plain section — so About
Us and the footer wore a gold spot that slid across them as you scrolled, while
the band sections, which paint an opaque gradient, stayed clean. The plain half
of the alternation read as blotchy rather than calm. Both `.section--light` and
`body > footer` now paint `var(--bg-page)`.

### The ambient gold wash is gone

`.liquid-canvas` and its four `.blob` children have been **removed outright** —
markup on all five pages, the `LIQUID BACKDROP` style block, the three `drift`
keyframes, and every rule that only existed to manage them (the
reduced-motion, reduced-transparency and `prefers-contrast` overrides, plus the
panel's `a11y-noimg` / `a11y-motion` / max-contrast handling).

Once every section painted its own ground the wash was covered site-wide, so
four `will-change: transform` layers and three infinite animations were
compositing forever behind opaque content. `body` already paints
`var(--bg-page)`, so the page ground is unchanged: verified `getAnimations()`
reports **0** drift animations and the ground is still `rgb(245, 240, 231)`.
Stylesheet is 2KB smaller.

Nothing needs to be re-added if a translucent surface is introduced later —
`.glass` samples whatever section it sits on, which is now always opaque.

Rhythm on the home page: About plain → Best Sellers **band** → Dine Menu plain
→ Gallery **band** → Reviews plain → FAQ **band**. Every subpage's content
section is a band.

**The run has to END on a band.** The footer strip is transparent, so it reads
as plain page cream — which means a plain last section and the footer are the
same ground and the page's closing section runs straight into the footer with
no boundary at all. The rhythm above used to land the other way round (FAQ
plain, footer plain); flipping all six keeps every adjacent pair different
*and* ends banded, which is what the four subpages and the catering site
already do — catering closes on a banded Reviews above its cream footer.

Note the step itself is quiet by design: band bottom `#F8F3E9` against page
cream `#F5F0E7` is only 3/3/2 per channel. The band marks the boundary; the
white `.footer-panel` card lifting off the cream is what actually separates the
footer. Both sites work this way.

Adding a section: give it `section section--light` plus `band` if it should be
the lifted one, and drop a
`<div class="section-seam" aria-hidden="true"><span></span></div>` in as its
first child.

## Footer background

### Colour and shape verified against the live catering footer

Every value below was measured on `rajwadicatering.com` and on this site side by
side at 1440x900, and they now match:

| Property | Value (both sites) |
|---|---|
| Panel fill | `linear-gradient(150deg, rgba(255,255,255,.92), rgba(245,239,229,.86))` |
| Panel `::after` | gold radial `rgba(232,190,114,.16)` + `linear-gradient(150deg, rgba(255,255,255,.6), rgba(243,238,229,.5))` |
| Panel border / radius | `1px solid rgba(212,155,58,.32)` / `34px` |
| Panel shadow | `inset 0 1px 0 rgba(255,255,255,.85), 0 22px 60px rgba(120,90,40,.13)` |
| Panel blur | `blur(28px) saturate(150%)` |
| Panel text | `#333` (catering's `--charcoal`) |
| Grid columns | `380.328px 239.477px 267.641px 352.156px` — identical to the pixel |
| Column divider / padding | `1px solid rgba(212,155,58,.22)` / `2px 38px` |
| Heading | `#8A5A0F`, `13.12px`, `1.1808px` tracking |
| Contact rows | no box on desktop; boxed only below 820px |
| Mobile accordion headings | `#8A5A0F` (gold-ink), `.82rem`, 700, `.09em`, 9px gap |
| Gold CTA shadow | `0 8px 28px rgba(184,122,37,.35)` |
| Catering CTA shadow | `0 8px 20px rgba(46,42,37,.24)` |
| Bottom bar / legal text | `#616161` (catering's `--gray`) |
| Socials | `42px`, `50%`, `rgba(255,255,255,.6)` |
| Strip around the card | transparent — the page cream shows through |

Two of these reversed earlier decisions, deliberately, because you asked for an
exact replica:

- **The strip around the card is transparent again.** You had asked for it to be
  white like the Reviews section back when the page ground was a cool `#FAFAFA`
  and the strip read grey. The ground is now catering's cream, so transparent is
  both the exact match and the better-looking result. Say the word if you want
  the white band back.
- **The mobile accordion headings were the wrong gold — and failing contrast.**
  I had them on `--gold-light` (`#E8BE72`), which is the gold meant for dark
  backgrounds. On the light footer panel that measured roughly **1.7:1**, well
  under the 4.5:1 AA minimum for text. They now use catering's `--gold-ink`
  (`#8A5A0F`) at **5.49:1**. The icon and chevron were already correct, so only
  the label text was affected.
- **The contact rows lost their boxes on desktop.** Catering only boxes them once
  the columns collapse below 820px — I had been applying the boxed style at every
  width. Removing it is also what made the grid columns land on catering's exact
  pixel widths.

The `::before` photo layer stays removed, per your earlier instruction — that is
a background image rather than a colour or shape.

All page-footer rules are scoped `body > footer`, not `footer`. **The review
cards use `<footer>` for their attribution**, so a bare `footer` selector painted
a white block inside each review card behind the reviewer's name. Anything you
add for the page footer needs the same `body > footer` scope.

The photo is gone from `.footer-panel`. It is now a clean white surface with a
single gold glow at the top-right (`::after`), keeping the gold column dividers,
the `.footer-hr` diamond flourishes and the `.footer-shine` top hairline. The
`::before` photo layer and the panel's backdrop blur were removed with it —
there is nothing behind the panel to blur any more, so that was pure cost.

## Asset versioning

`styles.css` and `main.js` are linked with a content-hash query
(`?v=3d910b33`). This was not cosmetic: the browser served a **stale stylesheet**
after an edit and the new rules were silently absent from the CSSOM — the file on
disk and the file over HTTP matched, but the page did not use them. If you edit
either asset, re-run the hash so browsers pick the change up:

```bash
python3 - <<'EOF'
import glob, re, hashlib
v = hashlib.md5(open("assets/css/styles.css","rb").read()).hexdigest()[:8]
j = hashlib.md5(open("assets/js/main.js","rb").read()).hexdigest()[:8]
for f in glob.glob("*.html"):
    s = open(f, encoding="utf8").read()
    s = re.sub(r'href="assets/css/styles\.css(\?v=[0-9a-f]+)?"', f'href="assets/css/styles.css?v={v}"', s)
    s = re.sub(r'src="assets/js/main\.js(\?v=[0-9a-f]+)?"',   f'src="assets/js/main.js?v={j}"', s)
    open(f, "w", encoding="utf8").write(s)
EOF
```

## Menu and card layout

- **Equal-height cards.** Best sellers, unlimited thali cards and review cards
  all use `align-items: stretch` with the card as a flex column and one child
  set to `flex: 1 1 auto` to absorb the difference — `.card-text`,
  `.thali-items`, `.review blockquote`. That is what lets an 11-item Silver
  thali finish level with a 14-item Executive.
- **No dot leaders.** The dotted rule between dish and price is gone. Rows are
  `justify-content: space-between` with the name hard left and the price hard
  right in tabular figures, separated by a hairline and a quiet gold hover —
  alignment and whitespace carry the relationship instead of decoration.
- **Every chaat has a description.** Four were bare: Gobi Chilli Manchurian,
  Fresh Samosa, Lilva Kachori and Khaman-Dhokla. Those four descriptions are
  **written from the standard preparation of each dish**, not from your recipes
  — worth a read to confirm they match how your kitchen actually makes them
  (whether your samosa carries peas, for instance).

## Reviews

The three review cards are real quotes carried over from your existing site, now
equal height, in a grid that auto-fits 6+ cards.

**I did not invent additional reviews.** A ready-to-fill template block sits
commented out in `index.html` directly under the live cards — copy it once per
review, paste the real quote, name and source.

> Writing testimonials and putting invented names on them is prohibited by the
> **FTC Rule on Consumer Reviews and Testimonials** (16 CFR Part 465, in force
> since October 2024), which bans fake reviews and carries civil penalties per
> violation. It is also the kind of thing a guest can spot, and it costs more
> trust than the extra cards would buy.

To fill the section legitimately, quickest first:

1. **Google and Yelp** — you already have real reviews on both. Copy the text,
   the reviewer's first name and last initial, and label the source, exactly as
   the three current cards do.
2. **Ask recent guests.** A card on the table or a line on the receipt asking
   for a Google review typically fills a section like this within a fortnight.
3. **DoorDash order reviews** — the two unlabelled cards came from there
   originally, so there are likely more.

## SEO

| Asset | What it does |
|---|---|
| `sitemap.xml` | All five pages with priority and change frequency |
| `robots.txt` | Allows everything, points at the sitemap, explicitly allows AI crawlers |
| `assets/img/og-image.jpg` | 1200×630 social card, cropped from the hero and darkened |
| Open Graph + Twitter cards | On every page — title, description, URL, image, locale |
| `rel="canonical"` | On every page |
| `robots` meta | Home and allergens indexable; the three legal pages `noindex, follow` |
| `geo.region` / `geo.placename` | US-CA / Fremont, for local search |
| `favicon.ico` + `assets/img/icon-*.png` | The mark Google shows beside the result — see below |

### Site icon

Built by `make_favicon.py` in the project root (needs Pillow; run it only if the
brand mark changes, the output is committed):

| File | Used by |
|---|---|
| `favicon.ico` (16+32+48, at the **document root**) | Google's favicon crawler, older browsers |
| `assets/img/icon-32.png` | browser tabs |
| `assets/img/icon-48.png`, `icon-96.png` | high-DPI tabs, bookmarks |
| `assets/img/icon-192.png` | **the one Google Search reads** |
| `assets/img/icon-512.png` | manifest, maskable |
| `assets/img/apple-touch-icon.png` (180) | iOS home screen |
| `site.webmanifest` | installability, Android home screen |

Google shows a generic globe unless **both** of these hold, and either alone
still fails:

1. There is a `/favicon.ico` at the document root. Google's favicon crawler is a
   separate crawler from Googlebot and looks there first — declaring
   `<link rel="icon">` perfectly is not enough on its own.
2. A declared `rel="icon"` is square with sides a **multiple of 48px**. Hence
   `icon-192`. A 512 is square but not divisible by 48, and 32 is under the
   minimum. Icons that exist only inside the webmanifest do not count.

Both lessons come from the catering site, which hit exactly this.

The mark is `assets/img/title logo.png` — the brand tile: the Rajwadi arch with
a fork and spoon, which is what tells the restaurant icon apart from the
catering one in a results list. It is supplied as RGB with the squircle on a
**black square**, so `make_favicon.py` cuts the corners back to transparency
and un-premultiplies the edge (dividing colour back out by the alpha it gets);
without that the rounded edge keeps a dark fringe on a white search row, and
without the cut every tab shows a black tile. Measured on the supplied file the
corner ground is under brightness 12 and the darkest pixel inside the squircle
is 63, so the threshold has a wide margin.

`icon-512.png` is left unquantized at ~350KB: 256 colours takes it to ~100KB
but visibly dithers the gloss gradient. It is only fetched on install.

## Preview it on the project's own server, not the IDE's

```bash
python3 -m http.server 8777 --directory "/Users/dhvippatel/Documents/Rajwadi Dine Page /site"
```

**Do not preview through the JetBrains built-in server (port 63342).** It serves
from the *project* root, so the site lands at
`/Rajwadi%20Dine%20Page%20/site/` — a subdirectory — and every absolute path in
the site then points outside it:

| | resolves to | correct? |
|---|---|---|
| `<link rel="icon" href="/favicon.ico">` | `:63342/favicon.ico` | no |
| manifest `start_url: "/?source=pwa"` | `:63342/?source=pwa` | no |
| manifest `scope: "/"` | `:63342/` | no |
| `sw.js` registration scope | `:63342/Rajwadi.../site/` | mismatches the manifest |

So the app is not installable there and the icons 404 — the site is built to be
served from a **web root**, which is what it gets in production and from the
command above.

That mismatch is also the source of the *"requested without authorization"*
dialog: the IDE server authorises by token/referer, and the manifest is the one
sub-resource browsers fetch without the page's credentials, so it arrives
unauthenticated and the IDE prompts. `crossorigin="use-credentials"` on the
manifest link makes that fetch carry credentials like everything else, which is
the standard fix for a manifest behind any auth and a no-op on the public site.
If the IDE still prompts for other files, the setting is **Settings → Build,
Execution, Deployment → Debugger → "Allow unsigned requests"**.

## Installable as an app (PWA)

The site can be installed to a home screen or desktop and opens standalone.

| File | Role |
|---|---|
| `site.webmanifest` | name, `display: standalone`, brand colours, 192/512 + maskable icons, and three shortcuts (Menu, Order Online, Call) |
| `sw.js` | the service worker — **this is what makes it installable**; a manifest alone does not qualify |
| `offline.html` | fallback for an uncached page with no network; `noindex`, and deliberately self-contained (its own inline CSS, no webfonts) because it must render when nothing else loads |

Caching is deliberately conservative: **navigations are network-first** (a menu
or a price must never be served stale); **assets are cache-first on an EXACT
URL match**.

That exactness is the whole game. Every asset is linked with a content hash
(`styles.css?v=235f53ea`), so the query *is* the cache key — a new hash misses
and fetches fresh, an unchanged one hits instantly. An earlier version matched
with `ignoreSearch: true` here, which let the precached `styles.css` answer a
request for `styles.css?v=<new>` and serve the **old file after every deploy**
— precisely the staleness the content hashes exist to prevent. Reproduced
against a live cache before fixing: the loose match returned a stylesheet that
was demonstrably not the current one; the exact match returned the right file.

`ignoreSearch` therefore survives in exactly one place — the **offline
fallback**, where the precached unhashed copy is what makes the shell useful
with no network, and a slightly stale stylesheet beats an unstyled page.

Bump `CACHE_VERSION` in `sw.js` when the shell list changes; old caches are
deleted on activate.

The **Install app** button is built by `main.js` and appended to
`.footer-bottom`, not written into the five HTML files — it is only meaningful
where the browser can actually install, so no dead markup ships elsewhere. It
appears on `beforeinstallprompt` and removes itself once the choice is made or
the app is installed. iOS Safari has no such event, so there it reads **Add to
Home Screen** and explains the Share-sheet gesture instead of pretending to
prompt. It is the quiet outline pill, never the gold fill — Order Online is the
page's primary action and this must not compete with it.

Verified with the dev server stopped: cached pages still open, the hashed
stylesheet still resolves, and an unvisited URL falls back to the offline page.

### Structured data

The home page carries a four-node `@graph`:

- **`Restaurant`** — address, phone, email, `priceRange`, `servesCuisine`,
  `areaServed` (7 Bay Area cities), `sameAs` (all four social profiles, which is
  how search engines tie the site to your Google, Yelp, Facebook and Instagram
  entities), an `OrderAction` pointing at the ordering link, and `knowsAbout`.
- **`WebSite`** — publisher linked to the Restaurant node.
- **`Menu`** — **39 dishes across 5 sections**, each with name, price in USD and
  description, all marked `VegetarianDiet`. This is generated by parsing the
  rendered menu out of `index.html`, so the schema cannot drift from the page.
- **`FAQPage`** — the 14 questions.

Subpages each carry `BreadcrumbList` + `WebPage` tied back to the site node.

> **Re-run the schema after editing the menu.** The `Menu` node is a snapshot.
> If you change a dish or a price in the HTML, regenerate it or edit both.

## LLM / AI optimisation

Assistants answer restaurant questions from whatever they can parse quickly, and
they are far better at reading facts than inferring them from layout.

- **`llms.txt`** — a plain-Markdown brief at the site root: key facts, all three
  thalis with their contents, every menu section with prices, the thali rules,
  takeout policy, allergens, and a short "notes for assistants" block flagging
  that prices exclude tax, that "unlimited" never applies to takeout, and that
  opening hours are not published so people should call.
- **`robots.txt` explicitly allows** GPTBot, OAI-SearchBot, ClaudeBot,
  PerplexityBot and Google-Extended. Blocking them is the default failure mode;
  if an assistant cannot read the menu it will guess.
- **The `Menu` schema is the single biggest lever** — it turns 39 dishes and
  prices into structured facts rather than text an assistant has to infer.
- **Content is server-rendered.** Every price, description and answer is in the
  HTML, not injected by JavaScript, so a crawler that does not execute JS still
  sees the whole menu.
- **FAQ answers are self-contained** — each states its subject rather than
  relying on the question for context, which is what makes a sentence quotable
  on its own.

## Opening hours

| Days | Hours |
|---|---|
| Monday – Thursday | 11:00am – 9:30pm |
| Friday – Saturday | 11:00am – 10:30pm |
| Sunday | 11:00am – 10:00pm |

Published in three places: the footer's Get In Touch column on every page, the
first FAQ entry, and `openingHoursSpecification` in the `Restaurant` schema —
which is the field Google reads for the "Open now / Closes 9:30pm" line in local
results. Also in `llms.txt`.

**Confirmed by the owner, August 2026.** These were first sourced from
restaurantji.com and two search-result summaries (Yelp returned 403 and Google
Maps is JS-rendered, so neither would fetch directly), then verified day-by-day
against the Google Business Profile — all seven days matched.

If the hours ever change, update all four places: the footer row on each of the
five pages, the first FAQ entry, `openingHoursSpecification` in the Restaurant
schema, and `llms.txt`.

While adding these I also removed `acceptsReservations: "False"` from the
schema. I had asserted that earlier without a source, and one listing now says
reservations *are* taken. Rather than publish either claim, the field is gone —
tell me which is right and I will put it back. The FAQ does not mention
reservations either way.

## Contrast & design audit

Ran a scripted WCAG audit in the browser across all five pages at 1440px and
375px — compositing each text colour against its real (often translucent)
background and comparing to the 4.5:1 / 3:1 thresholds.

**Two real contrast failures found and fixed:**

| What | Was | Now |
|---|---|---|
| `--s-fg-faint` on light surfaces | `rgba(26,26,28,.56)` = **3.87:1** | `#616161` (catering's `--gray`) = **5.4:1** |
| `.stars` review glyphs | raw `--gold` on a light card = **2.16:1** | `var(--s-accent)` = **5.49:1** on light, gold-light on dark |

The faint-text one was the more serious: it drove the `/ person` price suffix,
`.thali-note`, `.panel-note`, the review source label, and **`.desc` — every
menu item description**, which is the most-read text on the site.

**Two touch targets fixed** (mobile):

- Menu category tabs measured 43px → pinned to `min-height: 44px`
- Footer accordion nav links measured 19px → padded to 43px+ (the `li` margin
  came off so the visual rhythm barely changed)

Left alone deliberately: footer social circles are **42px**, which is catering's
exact value and well above WCAG's 24×24 minimum. The accessibility page's claim
was corrected to say 42 rather than 44, since it was overstating.

Inline links inside FAQ answers and the legal row stay at text height — WCAG
exempts inline links in prose.

> **Measurement note.** The preview pane does not run CSS transitions, so any
> property that transitions (`transform` on the sliding pills, `background-color`
> on the nav and bottom bar) reads as its *start* value via
> `getComputedStyle`. Two apparent bugs turned out to be this. To measure a
> transitioned property, inject `transition: none !important` first — with that,
> the tab pill lands within 0px of every tab, including the wrapped mobile rows.

## Adding a section

Give it `class="section section--dark"` or `section--light`. Every component
inside recolours itself — colour on a surface always comes from the `--s-*`
tokens those two classes redefine (`--s-fg`, `--s-accent`, `--s-glass-bg`,
`--s-hairline`, `--s-chip-bg`, …), never a hardcoded value. Add it to the nav's
dark list only if it's dark; `DARK_SELECTOR` in `main.js` already covers
`.section--dark, .hero, footer`.

## Apple liquid glass

- **Floating pill nav** — blurred, hairline top highlight, diagonal specular
  sheen, SVG noise so the glass never reads flat. Content scrolls underneath.
- **One `.glass` class** for every panel, recoloured by its surface: dark glass
  on black sections, light glass on white ones.
- **Sliding pills** — nav pill follows your section and previews the link under
  the pointer; menu tabs have their own gold pill. The tab pill animates
  `transform`/`width` on `cubic-bezier(.32,.72,0,1)`; the nav pill is now
  spring-driven (below).
- **Materialize, don't fade** — tab panels animate blur + scale + opacity.
- **Feedback on press** — buttons, tabs, nav links scale to `.97` on `:active`.

### Refraction — the nav bends what is behind it

A frosted panel *blurs* its backdrop. Glass **bends** it, and that bend at the
rim is the whole difference between the two. `backdrop-filter: blur()` alone
can only ever be frost.

So `main.js` generates a **displacement map** on a canvas from the bar's own
rounded-rect geometry — a signed-distance field gives both how far each pixel
is from the rim and which way the rim faces (the SDF's gradient) — encodes the
offsets into R and G, and feeds it to an SVG `feDisplacementMap` referenced
from `backdrop-filter`. Near the rim the backdrop is sampled from further out,
which squeezes it into the edge exactly as it is through the thick edge of real
glass. The middle of the map is left neutral so text passing behind the bar is
not smeared.

- `scale: 78` → about 39px of bend. Compared against 42 (too timid to read as
  glass at this bar's 94px height) and 110 (the rim smears and the bar stops
  looking solid).
- Blur drops **26px → 13px** when the lens is on: refraction you cannot see
  through is just noise, so depth comes from the bend and the highlights.
- The map is rebuilt only when the bar's pixel size changes, not per frame.

**Browser support is the catch.** `backdrop-filter` accepts `url()` per spec,
but only Chromium renders it; Safari and Firefox drop the *entire* declaration
when it contains a filter reference, which would take the blur down with it. So
it is feature-detected (`CSS.supports('backdrop-filter', 'url(#x) blur(1px)')`)
and the `.lg-lensed` class is only added when it will actually paint. Everywhere
else the layered highlights carry the material and nothing looks broken.

### Transparency — the bar is a lens, not a lid

| Theme | Was | Now | Backdrop tint |
|---|---|---|---|
| Dark | `rgba(18,18,20,.62)` | **`.44`** | `brightness(.72) contrast(1.05)` |
| Light | `rgba(255,255,255,.9)` | **`.5`** | `brightness(1.16) contrast(.94)` |

The light bar at `.9` was a lid: whatever it passed over washed out to bare
white, which also wasted the refraction entirely — you cannot see a bend in
something you cannot see through. Both themes now sit at medium transparency,
and legibility is bought back by **`--nav-tint`**, which is composed into
`backdrop-filter` and therefore acts on the *backdrop only*, never on the
labels sitting on it. The dark theme pushes the backdrop down so white labels
hold; the light theme lifts it so dark labels hold. Opacity would have hidden
the content; this only quietens it.

Blur also comes down (26 → 20 plain, 9 with the lens) so what shows through is
recognisably the food behind the bar rather than fog.

Two traps worth remembering, both hit during this change:

- **`none` is illegal inside a filter list.** `var(--nav-tint, none)` looked
  like a safe default, but `blur(20px) saturate(200%) none` is invalid and the
  browser drops the *whole declaration* — taking the blur with it. The fallback
  is `brightness(1)`, a no-op function.
- **The mobile sheet must not inherit the tint.** It is a menu — a modal task
  over arbitrary content that simply has to be read — so it keeps its
  near-opaque fill. A bare `.nav-mobile` override loses to the `(0,2,0)` theme
  rules that set `--nav-tint`, so both `.nav-mobile.nav-theme-*` are named
  explicitly.

### The drop does NOT get its own SVG lens — and why

It was given one, and it shipped as a **solid grey block with a coloured
fringe**. An `objectBoundingBox` filter region driving a displacement map
through `backdrop-filter` does not survive Chromium's backdrop pipeline: the
maps come out as a flat smear instead of a bend. Backed out entirely.

It is also the more faithful answer. In the reference bar it is the **bar** that
refracts; the selected item is a soft lighter bead resting on it, not a second
lens. And the real defect in the earlier tinted version was never the tint — it
was the **hard cut at the border box**. `backdrop-filter` clips to that box
exactly, so however gentle the effect, it terminates on a crisp line and reads
as a cut-out rectangle.

So the bead is now:

- a plain, reliable `backdrop-filter: brightness() saturate()`
- **`mask-image`** fading its own boundary out, so the lens has no visible edge
- a **graded conic rim** on `::after` — light lands top-left, skips the sides,
  returns weaker underneath. An inset `box-shadow` rings the shape at one
  brightness, which the eye reads as a *border*; a graded stroke reads as a
  *lit edge*. That is the whole difference.

All CSS masking, so it behaves identically in every engine rather than being
Chromium-only.

### The bar's edges and centre

A single hairline across the top is not what a curved glass edge does. The rim
is now a **conic gradient** — brightest where it faces the light, dimming down
the sides, picking up a weaker bounce along the bottom — and a broad
`.nav-sheen` sits across the middle where the surface is flattest and catches
the sky, with a second tighter glance just under the top edge.

Both are per theme: dark glass takes a bright white bounce and `--nav-sheen:
.20`; the light bar halves the sheen (the same value just looks like fog) and
leans its bounce gold, which is where this bar's light actually comes from.

### Hover is a hint, a commit is a decision

Hover was not broken — it was **too slow**. At `response .58` across the board,
moving the pointer produced no perceptible answer and the bar read as dead.
Verified by event: a `pointerenter` on Gallery does move the drop from x=-8
toward x=590.

Two paces now: **`.30` for a hover preview**, `.58` for a committed selection.
A hint has to answer the pointer immediately; only the commit is liquid.

### The drop is a piece of glass, not a tinted region

This is the thing that was wrong for several passes. A `backdrop-filter`
brightness change has a **hard cut at the element's border box**, so however
subtle it is, it reads as a cutout — not as a bead sitting on a surface. What
the eye actually reads as glass is two things a tint cannot give it: the drop
**refracts what is beneath it**, and it carries **its own lit rim**.

So the refraction was rebuilt as a reusable `Glass` factory and the pill got its
own instance. It is now **100% transparent** — `--nav-active-bg: transparent` —
and visible purely through what it does to the bar behind it.

**Two generated maps, not one**, following the reference pipeline:

| map | what it encodes |
|---|---|
| displacement | R = x offset, G = y offset, 128 = neutral; bend deepest at the rim |
| **specular** | a stroked rim whose alpha varies by how far the edge faces the light |

The specular map is the part that was missing. A flat inset `box-shadow` ring is
even all the way round, which reads as a *border*; a graded one reads as a *lit
edge*. Light comes from the upper-left, and the opposite edge catches a weaker
bounce, because real glass is lit twice — once by the source, once by what the
source is bouncing off. The rim is then masked out of a **saturated copy of the
refraction**, so the highlight carries the colour of whatever is behind the
glass instead of being flat white.

Pipeline: `blur(1)` → displace ×3 (chromatic) → saturate → mask by rim →
screen back over the refraction.

**The drop's filter uses `objectBoundingBox` units.** Its width changes every
time it moves, and a fixed `userSpaceOnUse` region would clip or leave a gap the
moment the box no longer matched. In bbox units the region and both maps are
always exactly the element — so the drop's own lensing stretches as it
elongates, which is right: a bead pulling out really does stretch what it
carries. Note `scale` is a *length*, so in bbox units it is a fraction of the
box, not pixels — passing `34` there displaces by 34× the width and the drop
disappears.

> **The rebuild race, again, one layer down.** The drop rebuilds its maps for the
> size it is heading *to*. The first version tracked a separate "requested"
> value and returned early while a frame was pending — so hovering several links
> within one frame queued the first build, marked the rest as done, and the maps
> stuck at whichever width happened to be queued first. A pending frame now
> **supersedes** rather than blocks: the wanted size is recorded and read when
> the frame runs, and a size is only claimed once its maps actually exist.

### Movement

Response `.38 → .58`, width trailing position by a further `.12s` so the shape
arrives just after the drop does. Damping stays `1` — a drop settling under its
own surface tension does not bounce.

Slowing it required retuning the deformation: peak velocity is roughly
`distance / response`, so a longer response cut every peak by ~35% and the old
780px/s reference would have quietly halved the stretch at the same time as
slowing it down. The reference is now **520px/s**, which restores the same shape
at the new speed.

### The brightness mistake — read this before touching the material

The bar once used `brightness(1.42) contrast(.80)` on the backdrop to "buy back
legibility". It looked like a milky slab and the content behind it disappeared.

**`brightness()` clips.** At a 1.42 lift, every backdrop pixel above ~0.70
luminance saturates to pure white — which is most of a lit photograph or a
white review card. The information is destroyed, not quietened, and there is
nothing left for the refraction to bend. A translucent *fill* veils the same
amount while staying linear, so the backdrop keeps its structure.

There is now **no `brightness` or `contrast` term in any glass surface.** The
order is Apple's: frost (blur) mutes, fill dims, refraction separates.

| | fill | frost | saturate |
|---|---|---|---|
| Nav, dark | `rgba(16,16,20,.34)` | `14px` | `190%` |
| Nav, light | `rgba(255,255,255,.34)` | `20px` | `165%` |
| Bottom bar, dark | `rgba(12,12,14,.40)` | `18px` | `190%` |
| Bottom bar, light | `rgba(252,249,243,.46)` | `24px` | `165%` |

The light variants run a heavier frost because they sit over cards full of dark
body copy: blur turns that paragraph into soft tone and colour while keeping it
visibly *present*, which is what reads as glass. The lensed bar drops to 45% of
its frost — a bent backdrop already reads as glass, and heavy blur would only
throw the bend away.

### The drop is 96% transparent

Its fill is `rgba(255,255,255,.04)`. It is visible because of what it **does**
to the bar behind it, not what it covers — Apple's three layers with almost no
paint:

- **Illumination** — a backdrop lens, doing nearly all the work
- **Highlight** — a bright inner rim, light gathering in the bead's edge
- **Shadow** — separation from the bar

The lens direction flips per theme, and this matters: on the **dark** bar it
brightens (`1.55`), reading as light caught in the bead. On the **light** bar it
*densifies* instead (`brightness .93` + heavy saturate) — lifting a near-white
ground just clips it white again and the drop vanishes, which is the same trap
as the old nav tint, one layer down.

### Chromatic aberration

Real glass disperses — a thick rim fringes red one way and blue the other,
because the refractive index differs per wavelength. The backdrop is displaced
**three times** at 1.08 / 1.00 / 0.92 of the base scale, each pass reduced to a
single channel by `feColorMatrix` and screened back together. The centre is
unaffected (displacement is ~0 there, so all three agree); the fringing appears
exactly where the bend is strongest. It is the detail that separates "warped"
from "glass".

### Transparency, second pass

Measured against a reference recording of iOS: in that bar the text passing
behind is *readable through the glass*, not merely blurred. Ours was still a
tinted panel by comparison.

| | v1 | v2 | now |
|---|---|---|---|
| Dark fill | `.62` | `.44` → `.32` | **`.20`** |
| Light fill | `.90` | `.50` → `.38` | **`.32`** |

At these levels the fill is barely present and `--nav-tint` is doing nearly all
the legibility work — which is the point. The light theme needed a harder hand
than a straight mirror of the dark one: pale glass over a bright photo is this
site's worst case, and the logo is mid-tone *artwork* rather than a solid label,
so it washed out at `.26`. Its tint runs a low `contrast(.80)`, which flattens
the backdrop to an even pale ground and kills the colour noise bleeding through
behind the mark while the fill stays genuinely see-through.

### The material is the whole site's, not just the nav

`.mobile-cta` — the floating bottom bar, and the direct analogue of the tab bar
in the reference — carried **no `backdrop-filter` at all**. It was a solid fill,
which is why the page appeared to stop at a hard line rather than passing
beneath it. It is now the same material as the nav: thin fill, `blur(22px)
saturate(190%)`, its own `--bar-tint` dimming layer per theme, and the same
top-edge hairline where the glass catches light.

Both bars therefore adapt the same way — `.bar-dark` and `nav-theme-dark` are
driven off the same ground sampler, so each carries the tint that suits the
labels sitting on it.

> Its translucency needed new fallbacks. `.mobile-cta` was already in the
> `prefers-reduced-transparency` list, but that rule only kills `backdrop-filter`
> — with a translucent fill and no blur the page would show through raw, which
> is *worse* than the glass it replaced. Both that block and `prefers-contrast:
> more` now restore an opaque ground in both themes.

### The liquid drop

Apple's rule for a morphing glass element, from the Liquid Glass technology
overview: *"when Liquid Glass flexes and morphs to larger sizes, it simulates a
thicker material with deeper shadows and more pronounced lensing and
refraction."* The selection pill follows it literally — none of its material is
static.

`main.js` writes `--lg-speed` (0–1) onto the pill every frame from the spring's
**live velocity**, and the stylesheet scales the whole material off it:

| | at rest | at speed |
|---|---|---|
| backdrop blur | `1px` | `8px` |
| saturate | `1.15` | `1.75` |
| inner rim | `5px` @ `.10` | `17px` @ `.30` |
| drop shadow | `0 2px 10px` @ `.12` | `0 9px 34px` @ `.36` |

The shape deforms from the same number: it elongates along the direction of
travel and thins across it (volume roughly conserved — it thins by ~55% of what
it lengthens), which is the difference between "the pill moved" and "the pill
flowed". Because it is a consequence of velocity rather than a separate
animation, it builds as the drop accelerates and unwinds to nothing exactly as
the spring settles — no timing to keep in sync.

**Calibrate against real velocities, not intuition.** This spring peaks near
`distance / response`: ~315px/s between neighbouring links, ~1600px/s thrown the
width of the bar. A first pass used a 2600px/s reference with a squared curve,
which put a normal hover at a **0.5% stretch** — arithmetically present, visually
nothing. The shipped curve references 900px/s with a 1.25 exponent:

| speed | scaleX / scaleY |
|---|---|
| 100px/s (drift) | `1.017 / 0.991` — still round |
| 315px/s (neighbour hop) | `1.070 / 0.962` |
| 600px/s | `1.157 / 0.914` |
| ≥900px/s | `1.260 / 0.857` (capped) |

`transition` is deliberately **not** set on the pill's `box-shadow` or
`filter` — both are driven per frame, and a transition would lag the motion by
its own duration and smear the effect. Reduced motion and the panel's "Pause
animations" pin `--lg-speed` to 0, so the drop stays perfectly round.

### Why it reads as glass while the page moves

The displacement band spans the **full half-height** of the bar, so the surface
is a continuous lens — strongest at the rim, easing toward the middle, but
never flat. An earlier 26px band bevelled only the outer rim and left the
middle 42px of a 94px bar neutral, so anything scrolling through the centre
passed dead straight and the bar stopped reading as glass the moment the page
moved. That is the single value that decides whether this looks like glass or
like a frosted panel.

Verified with a straight-line test pattern rather than a photo: a bent line is
unarguable. Stripes are visibly squeezed and curved inside the bar and dead
straight outside it, and shifting the pattern re-bends them, which is the
"while scrolling" behaviour.

**A race worth remembering.** `refreshLens()` runs at boot, on `load` and on
resize. It used to claim `mapW/mapH` *before* bailing on its pending flag, so
the second call marked the real geometry as already-done while the queued frame
built from the stale numbers its closure had captured — shipping a **42x81 lens
stretched across a 1368x94 bar**. The size is now re-read inside the frame, and
`mapW/mapH` are only claimed once a map for them actually exists.

### Pointer light and press-and-slide

- **Specular** — a bloom that follows the pointer across the bar, and a rim that
  lights only the arc nearest it (a bright border masked by a radial gradient).
  Both are written as custom properties from one rAF-throttled `pointermove`,
  so tracking repaints two gradients and touches no layout. The bloom is white
  on the dark theme and **brand gold on the light theme** — a white bloom is
  invisible on white glass.
- **Press-and-slide** — press the bar and drag: the pill follows the finger 1:1
  (honouring where inside it you grabbed), its width morphing to whatever link
  it is over, rubber-banding past the ends. On release it throws with the real
  release velocity and settles on the projected link.
- **Springs, not transitions.** The nav pill is driven by a small spring
  integrator (Apple's two knobs — `response` and `damping`, not
  mass/stiffness/damping), stepped from the *current* value. A CSS transition
  cannot be grabbed and reversed mid-flight, and interruptibility is the entire
  point of this interaction. X and width are separate springs so they cannot
  desync. `movePill()` keeps its old signature, so the scroll spy, the hover
  preview and the accessibility relayout all call it unchanged.
- **Momentum projection is capped at one neighbour.** Free projection is right
  for a scroll, where content is continuous; on a seven-item bar a firm flick
  sailed past four links onto Contact. `dt` is also floored at one frame — two
  moves in the same millisecond otherwise divide out to a velocity in the
  millions and throw the pill off the end.
- A slide swallows the click the browser synthesises afterwards; a plain tap
  (under the 6px hysteresis) is left completely alone and behaves like a link.

**Degradation:** `prefers-reduced-transparency` and `prefers-contrast: more`
drop the lens and the bloom (at high contrast the rim stays, unmasked — there
it is a border, not a highlight). `prefers-reduced-motion` and the panel's own
"Pause animations" stop the light chasing the pointer and collapse the springs
to instant — and instant means *painted this frame*, not scheduled on a rAF
that will only show the same value.
- **Fallbacks** — `prefers-reduced-motion`, `prefers-reduced-transparency`
  (glass goes solid, per-surface), `prefers-contrast: more` (solid grounds, gold
  borders, both themes handled).

### Legibility bugs found and fixed

1. The active tab's label is dark ink because the gold pill sits behind it.
   Flipping the colour at click time left dark-on-dark text for the whole 380ms
   slide, so `.pill-under` applies the ink only once the pill lands.
2. The mobile dropdown at the nav's `.62` opacity let the page behind show
   through the links. It's now `.96` dark / `.97` white depending on theme —
   still glass via blur and highlight, but legibility no longer depends on
   what's behind it.

## What changed from the original site

| | Original | This version |
|---|---|---|
| Best sellers | Silver / Gold / Express Thali, no prices | **Executive $26.99**, **Platinum $24.99**, **Chole Bhature $17.99** — prices on each card |
| Menu heading | "Menu" | **"Our Dine-In Menu"** |
| Menu categories | Food · Drinks & Desserts · Combo · Kids Menu | **Unlimited Thali · No Sharing → Combo → Kids Menu → Chaats → Drinks & Sweets** |
| Menu contents | old website list | transcribed from the wall menu photos |
| Order Online | nav button opening a DoorDash Delivery/Pickup modal | nav + footer button linking straight to `order.online/business/-480570` — no modal |
| Logo | Framer-hosted image | catering `logo.webp`, local |
| Theme | cream, Amita / Abhaya Libre | catering brand gold + type stack, black/white alternating grounds, liquid glass |
| Reviews | 3 reviews, two labelled "DoorDash Review" | same 3 reviews, DoorDash labels dropped |

**Headline wording:** the hero reads "…North Indian **Dining** for Every
Appetite". It mirrors catering's headline rhythm while keeping the word
restaurant-side, so the two sites don't compete for the same phrase.

**To confirm:** the phone number is now only in the footer, the FAQ answer, and
the mobile bottom bar's Call button — it is off the hero. If the number itself is
wrong rather than just unwanted there, give me the correct one and I will replace
all three.

**Also worth confirming:** `order.online` is DoorDash's white-label storefront — that
link came from the original site's own Order Online button, and it's the only
working order destination I had. Say the word if it should point elsewhere.

## Notes on the menu data

Transcribed from `../Unlimate Thali  NO Sharing.HEIC`,
`../Combs , Drinks , Kids menu.HEIC`, `../Chaats -1.HEIC`, `../Chaat -2.HEIC`
and `../ Drinks , Dessert .HEIC`.

Three prices differed between the two sheets that both list drinks:

| Item | Combo sheet | Dessert/Drinks sheet | **Used (higher of the two)** |
|---|---|---|---|
| Fresh Gulab Jamun (2 pcs.) | $2.99 | $3.99 | **$3.99** |
| Fresh Kokum Sharbat | $4.99 | $3.99 | **$4.99** |
| Fresh Aam Panna | $4.99 | $3.99 | **$4.99** |

Resolved: the higher figure is used for all three, per your instruction.

Other editorial calls, all easy to change:

- `Shahi Panner` on the sheet → rendered as **Shahi Paneer**.
- Silver Thali lists "Veg. Curry" at both #4 and #5 → rendered as "Veg. Curry"
  and "Veg. Curry of the Day" so it doesn't read as a typo.
- FAQ answers were loaded dynamically on the original site and weren't
  readable, so the four answers here are **newly written**. Worth a read before
  publishing.
- The Silver Thali stays in the menu even though it's no longer a best seller.

## Photo mapping

| Where | Image |
|---|---|
| Hero | `../hero-bg.webp` |
| Executive Thali card | `../Rajwadi Executive Thali.jpg` |
| Platinum Thali card | `../Rajwadi platinum-thali.jpg` |
| Chole Bhature card / Combo | `../Gallary/w640/dish-12.webp` |
| Mumbai Pav Bhaji | `dish-11.webp` |
| Sarsoon Ka Saag | `sarson-ka-saag-makki-ki-roti.webp` |
| Kids thalis | `dish-27.webp`, `dish-28.webp` |
| Gallery (20) | mix of `dish-*` and named plates |
| Logo | `RajwadiThali_catering/site/assets/images/logo.webp` |

All photography is full colour, same as catering.

## Behaviour

- Menu tabs use real `role="tablist"` semantics with arrow / Home / End keys.
- Deep link to a category: `index.html#menu?tab=chaats`
  (`thali`, `combo`, `kids`, `chaats`, `drinks`).
- FAQ uses native `<details>` — works with JS off.
- `--nav-space` is measured from the real nav at runtime; the CSS value is a fallback.
- `--bottombar-space` is measured from the real `.mobile-cta` at runtime too — the
  bar grows with its label, so a static reserve clips content at the larger text
  steps. Cleared above 768px so the stylesheet's own `0px` keeps applying.
- Escape or a backdrop tap closes the mobile sheet; links close it on tap.
- Nav breakpoints: 1367 / 1050 / 768 / 560px (catering's, with the label
  breakpoint corrected — see above). Content breakpoints: 980 / 720px.
- Below 768px the fixed bottom bar carries Order Online + Call.

## Accessibility preferences panel

The launcher at bottom-left opens the same reader-preferences panel as
rajwadicatering.com, and shares its `localStorage` key (`rt-a11y`) so
preferences set on one site carry to the other. Text size, line height, text
align, readable font, contrast, grayscale, hide images, pause animations,
highlight links, and a page-structure outline.

Each control writes a `data-a11y-*` attribute or an `a11y-*` class onto
`<html>`; the CSS at the bottom of `styles.css` does the rest. An inline script
in each page's `<head>` re-applies the saved state **before first paint**, so a
reader who chose bigger text never sees a default frame.

It is a preferences panel, not an overlay that claims to repair the page — the
real landmarks, the skip link and the measured contrast ratios are what make the
site usable.

Two things this site needed that catering did not:

- **Every `font-size` is a `rem`.** They used to be px, so scaling the root did
  nothing to the reading copy. The conversion was exact (÷16), so rendering at
  the default root size is unchanged.
- **Contrast re-points the `--s-*` surface tokens** rather than forcing colours
  onto elements. This page alternates black and white grounds, so a blanket
  "make text black" would land the hero and every `.section--dark` on near-black
  — the exact opposite of what the reader asked for.

Bigger text is guarded so it never reshapes the page: the panel is pinned at
16px, the logo tagline is pinned in px (it is artwork, not UI text), the nav
drops its icons one step before the labels would stop fitting (thresholds
measured per level — 1440px for Large, 1500px for Larger, always for Largest),
and both pills plus `--nav-space` / `--bottombar-space` are re-measured from a
`MutationObserver` on `<html>` and a `ResizeObserver` on the nav row and bar.

## Verified

CSS parses, no 404s, no console errors, all three brand fonts load (Cinzel no
longer requested),
3 dark + 3 light sections, nav theme swaps in both directions on desktop and
mobile, gold-ink `#8A5A0F` on white and gold-light `#E8BE72` on black (both AA),
tabs and pills land correctly, hero badges sit 4-across on desktop and 2x2 at
≤560px, no phone number left in the hero.

Nav geometry measured against the live catering site at 1440x900 and 1000x760 —
every value in the table above matches. Bottom bar verified fixed to the viewport
bottom with 48px touch targets, `body` padding reserving its height, nav CTA
hidden below 768px, and the sheet + backdrop opening and closing cleanly.

Footer verified at 1440px: 4 columns measuring 377/237/265/360, panel 1354x584,
54px badge tiles, 42px social circles, both CTAs 283x56. Accordion verified at
375px: headings hidden, buttons shown, bodies toggle with `aria-expanded`
tracking. Footer present and identical on both pages, all 17 footer links
resolve.

Fonts verified by computed style: body Inter 400, headings Cormorant Garamond
700, eyebrow/button/tagline Poppins 600, nav SF Pro. Allergens page verified on
desktop and mobile — hero, breadcrumb, back pill, chips, prose and footnote all
render, nav goes dark over the photo hero and light over the prose. JSON-LD
parsed and validated: 2 graph nodes, 14 questions, no markup leaking into the
structured data.

Two measurement notes for anyone re-checking this:

- The nav's theme colours transition over 450ms, so reading `getComputedStyle`
  immediately after a class swap returns the *previous* colour mid-transition.
  Wait ~500ms before asserting.
- The in-app browser pane returns black screenshots once the page is scrolled
  (the fixed nav vanishes from the capture too, while the DOM measures fine).
  Sections were verified one at a time at scroll 0. Give it a scroll in a real
  browser before publishing.
