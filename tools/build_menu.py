import io, json, os, base64, sys
# Data and generated art live beside this script; output goes into site/.
SP = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
D = json.load(io.open(os.path.join(SP,'menu-data.json'), encoding='utf-8'))

def b64(p, mime='image/webp'):
    return 'data:%s;base64,%s' % (mime, base64.b64encode(open(p,'rb').read()).decode())

# The menu now uses the SITE'S OWN images at their native resolution instead of
# shrunken copies. The first pass re-encoded everything down to 230-430px at
# quality 74 to keep the embedded file small, which is exactly why it looked
# soft: a thali card renders about 340 CSS px wide, so a 2x screen wants ~680,
# and it was being handed 430. Re-encoding a webp a second time cost quality
# again on top of that. These files are already on the site, already optimised,
# and already cached for anyone who has browsed it.
SRC = {'exec':'executive-thali','plat':'platinum-thali','silver':'gallery-16',
       'chole':'chole-bhature','pav':'pav-bhaji','saag':'saag-makki-roti',
       'kaam':'kids-aamras-puri','ksri':'kids-srikhand-puri',
       'dhokla':'gallery-04','kachori':'gallery-10','vadapav':'gallery-11',
       'batata':'gallery-12','gulab':'gallery-09','srikhand':'gallery-14','aamras':'gallery-13'}
EMBED = os.environ.get('MENU_EMBED') == '1'
if EMBED:
    IMG = {k: b64('site/assets/img/%s.webp' % v) for k, v in SRC.items()}
    LOGO = b64('site/assets/img/logo.png', 'image/png')
else:
    IMG = {k: 'assets/img/%s.webp' % v for k, v in SRC.items()}
    LOGO = 'assets/img/logo.png'

THALI_IMG = {'Rajwadi Executive Thali':'exec','Rajwadi Platinum Thali':'plat','Rajwadi Silver Thali':'silver'}
DISH_IMG  = {'Chole Bhature':'chole','Mumbai Pav Bhaji — Amul Butter':'pav',
             'Sarsoon Ka Saag & Makki Roti':'saag',
             'Rajwadi AamRas Puri Thali':'kaam','Rajwadi Srikhand Puri Thali':'ksri'}
# Photographed dishes are shown as full dish cards now — same frame, same size
# and same 4:3 crop as the Kids and Combo cards — instead of small captioned
# squares. Names are matched to the price list by EXACT string so a featured
# dish is removed from the list below and never printed twice; if a name ever
# drifts, the card is skipped rather than inventing a price.
# Every pairing was checked against the actual photo: the gallery's own alt text
# proved unreliable (one file labelled "sweets" is chole bhature).
FEATURED = {
 'Indian Street Chaats': [('dhokla','Khaman-Dhokla'),('kachori','Fresh Kachori Chaat'),
                          ('vadapav','Bombay Vada Pav (1 pc.)'),('batata','Bataka Vada (4 pcs.)')],
 'Sweets': [('gulab','Fresh Gulab Jamun (2 pcs.)'),('srikhand','Fresh Srikhand (6 oz.)'),
            ('aamras','Fresh AamRas (6 oz.)')],
}

def thali_card(t):
    return ('<article class="tcard">'
            '<div class="tmedia"><img src="%s" alt="%s" width="900" height="675" loading="lazy" decoding="async"></div>'
            '<div class="tbody"><div class="thead"><h3>%s</h3>'
            '<p class="tprice">%s<span>%s</span></p></div>'
            '<p class="tnote">%s</p><ul class="tlist">%s</ul>%s</div></article>') % (
        IMG[THALI_IMG[t['name']]], t['name'], t['name'], t['price'], t['per'], t['note'],
        ''.join('<li>%s</li>' % i for i in t['items']),
        ('<p class="tflag">%s</p>' % t['extra']) if t['extra'] else '')

def dish_card(name, price, addon):
    k = DISH_IMG.get(name)
    return ('<article class="dcard">%s<div class="dbody"><h4>%s</h4>'
            '<p class="dprice">%s</p>%s</div></article>') % (
        ('<div class="dmedia"><img src="%s" alt="%s" width="640" height="480" loading="lazy" decoding="async"></div>' % (IMG[k], name)) if k else '',
        name, price, ('<p class="daddon">%s</p>' % addon) if addon else '')

def price_rows(items):
    return ''.join('<div class="row"><span class="n">%s</span><span class="dot"></span>'
                   '<span class="p">%s</span></div>%s' % (
        n, p, ('<p class="rowaddon">%s</p>' % a) if a else '') for n, p, a in items)

def featured_cards(title, items):
    """Cards for the photographed dishes, plus the list with those removed."""
    feat = FEATURED.get(title)
    if not feat:
        return '', items
    by_name = {n: (n, p, a) for n, p, a in items}
    cards, used = [], set()
    for key, name in feat:
        row = by_name.get(name)
        if not row:
            continue
        used.add(name)
        cards.append('<article class="dcard">'
                     '<div class="dmedia"><img src="%s" alt="%s" width="640" height="480" '
                     'loading="lazy" decoding="async"></div>'
                     '<div class="dbody"><h4>%s</h4><p class="dprice">%s</p></div></article>'
                     % (IMG[key], name, name, row[1]))
    rest = [r for r in items if r[0] not in used]
    return ('<div class="dgrid">%s</div>' % ''.join(cards)) if cards else '', rest

sections = []
for s in D['sections']:
    card_style = s['title'] in ('Combo','Kids Menu')
    if card_style:
        body = '<div class="dgrid">%s</div>' % ''.join(dish_card(*i) for i in s['items'])
    else:
        cards, rest = featured_cards(s['title'], s['items'])
        body = cards + ('<div class="pricelist">%s</div>' % price_rows(rest) if rest else '')
    # Kids Menu opens the third sheet: the cover is one, thalis + combo fill the
    # second, and everything from Kids down fits the third.
    # Three content sheets after the cover: thalis + combo, kids + chaats, then
    # sweets + drinks + the notes. Two breaks is all it takes; everything else
    # flows so a page fills before the next begins.
    cls = 'sec pg' if s['title'] in ('Kids Menu', 'Sweets') else 'sec'
    sections.append('<section class="%s"><h2><span>%s</span></h2>%s%s</section>' % (cls,
        s['title'], ('<p class="secnote">%s</p>' % s['note']) if s.get('note') else '', body))

c = D['contact']
HTML = u"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dine-In Menu &mdash; Rajwadi Thali, Chaat &amp; Sweets</title>
<meta name="description" content="The full dine-in menu for Rajwadi Thali, Chaat &amp; Sweets in Fremont, California — Unlimited Gujarati thalis, combos, kids menu, Indian street chaats, sweets and drinks.">
<link rel="icon" href="favicon.ico" sizes="16x16 32x32 48x48">
<style>
/* Self-contained on purpose: every image is embedded and every rule is inline,
   so saving this one file gives a menu that still works with no network. */
:root{--gold:#d49b3a;--gold-lt:#e8be72;--gold-ink:#8a5a0f;--ink:#2a2118;
      --muted:#6b6155;--page:#f5f0e7;--card:#fffdf9;--line:rgba(212,155,58,.34);}
*{box-sizing:border-box;}
body{margin:0;background:var(--page);color:var(--ink);line-height:1.55;
     font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
     font-size:15px;}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px 64px;}
img{max-width:100%%;display:block;}

/* ---- masthead ---- */
.mast{text-align:center;padding:40px 20px 26px;}
.mast img{height:78px;width:auto;margin:0 auto 14px;}
.mast h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;
         font-size:clamp(2rem,6vw,3rem);margin:0;color:var(--gold-ink);line-height:1.1;}
.mast .sub{font-size:.72rem;letter-spacing:.3em;text-transform:uppercase;
           color:var(--gold-ink);margin-top:8px;}
.rule{display:flex;align-items:center;justify-content:center;gap:12px;margin:20px auto 0;max-width:340px;}
.rule::before,.rule::after{content:"";height:1px;flex:1;
  background:linear-gradient(90deg,transparent,var(--gold),transparent);}
.rule span{color:var(--gold);font-size:.7rem;}

/* ---- section headings ---- */
.sec{margin-top:52px;}
.sec h2{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;
        font-size:clamp(1.5rem,4vw,2.1rem);color:var(--gold-ink);margin:0 0 6px;
        text-align:center;}
.sec h2 span{position:relative;padding-bottom:10px;display:inline-block;}
.sec h2 span::after{content:"";position:absolute;left:50%%;bottom:0;transform:translateX(-50%%);
  width:54px;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);}
.secnote{text-align:center;color:var(--muted);font-style:italic;font-size:.86rem;margin:0 0 18px;}

/* ---- unlimited thali cards ---- */
.tgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px;margin-top:22px;}
.tcard{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;
       box-shadow:0 10px 30px rgba(120,90,40,.09);display:flex;flex-direction:column;}
.tmedia{aspect-ratio:4/3;overflow:hidden;background:#efe7da;}
.tmedia img{width:100%%;height:100%%;object-fit:cover;}
.tbody{padding:18px 20px 20px;display:flex;flex-direction:column;flex:1;}
.thead{display:flex;justify-content:space-between;align-items:baseline;gap:10px;}
.tcard h3{font-family:'Cormorant Garamond',Georgia,serif;font-size:1.3rem;margin:0;font-weight:700;}
.tprice{font-weight:700;color:var(--gold-ink);white-space:nowrap;margin:0;font-size:1.15rem;}
.tprice span{display:block;font-weight:400;font-size:.68rem;color:var(--muted);text-align:right;}
.tnote{font-size:.78rem;color:var(--muted);font-style:italic;margin:8px 0 12px;}
.tlist{list-style:none;margin:0;padding:0;column-count:1;}
.tlist li{position:relative;padding-left:16px;font-size:.87rem;margin:3px 0;}
.tlist li::before{content:"";position:absolute;left:0;top:.62em;width:5px;height:5px;
  border-radius:50%%;background:var(--gold-lt);}
.tflag{margin:14px 0 0;padding-top:12px;border-top:1px dashed var(--line);
       font-size:.82rem;font-weight:700;color:var(--gold-ink);}

/* ---- combo / kids cards ---- */
/* Flex, not auto-fit. auto-fit sizes the track list from the MINIMUM, so a
   1080px row fitted four 240px tracks, then capped each at 340px — 4x340
   overflows, and three Combo cards broke onto two lines. Flex asks the
   opposite question, how many 340px cards fit, so a row holds what it can
   and the last row centres. The cap itself stays: it is what keeps each
   card near the width its 640px photo can actually fill. */
.dgrid{display:flex;flex-wrap:wrap;justify-content:center;gap:20px;margin-top:20px;}
/* Grow to fill the row, cap at 340. A fixed 340 basis still overflowed: the
   wrap is 1080 with 20px padding either side, so the usable row is 1040 and
   three cards plus two gaps wanted 1060 — Combo broke onto two lines by
   twenty pixels. A 240 basis lets each section settle into ONE row and share
   the width evenly (Combo and Sweets land at ~333, the four chaat cards at
   ~245), while the cap stops the two Kids cards stretching to 500 and
   outrunning their 640px photos. */
.dcard{flex:1 1 240px;max-width:340px;}
/* A column, so the body can push its price to the floor of the card. Without
   it the price sat directly under the title, and a title that wrapped to two
   lines dragged its price 27px out of line with the rest of the row — the
   Chaat cards had three prices at 44px off the bottom and one at 17px. */
.dcard{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;
       box-shadow:0 8px 24px rgba(120,90,40,.08);display:flex;flex-direction:column;}
/* 4:3 is the native ratio of nearly every dish photo here (640x480), so the
   frame matches the picture and object-fit has nothing to crop away. 3:2 was
   slicing a band off the top and bottom of each one. */
.dmedia{aspect-ratio:4/3;overflow:hidden;background:#efe7da;}
.dmedia img{width:100%%;height:100%%;object-fit:cover;}
.dbody{padding:14px 16px 16px;display:flex;flex-direction:column;flex:1;}
.dcard h4{font-family:'Cormorant Garamond',Georgia,serif;font-size:1.1rem;margin:0 0 4px;font-weight:700;}
/* auto top margin drops the price — and the add-on line after it — to the
   bottom of the card, so every price in a row shares one baseline no
   matter how many lines its name took. */
.dprice{margin:auto 0 0;padding-top:8px;font-weight:700;color:var(--gold-ink);}
.daddon{margin:6px 0 0;font-size:.78rem;color:var(--muted);font-style:italic;}

/* ---- photo tiles above a price list ---- */
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin:20px 0 26px;}
.tiles figure{margin:0;border-radius:14px;overflow:hidden;background:var(--card);
              border:1px solid var(--line);box-shadow:0 6px 18px rgba(120,90,40,.07);}
.tiles img{aspect-ratio:1/1;width:100%%;object-fit:cover;}
.tiles figcaption{padding:8px 10px;font-size:.76rem;text-align:center;color:var(--muted);}

/* ---- price lists ---- */
.pricelist{column-count:2;column-gap:44px;}
@media (max-width:640px){.pricelist{column-count:1;}}
.row{display:flex;align-items:baseline;gap:8px;margin:7px 0;break-inside:avoid;}
.n{white-space:nowrap;}
.dot{flex:1;border-bottom:1px dotted rgba(42,33,24,.3);transform:translateY(-3px);}
.p{font-weight:700;color:var(--gold-ink);white-space:nowrap;}
.rowaddon{margin:-2px 0 8px 4px;font-size:.78rem;color:var(--muted);font-style:italic;}

/* ---- notes + footer ---- */
.notes{margin-top:52px;background:var(--card);border:1px solid var(--line);
       border-radius:18px;padding:22px 26px;}
.notes h3{font-family:'Cormorant Garamond',Georgia,serif;margin:0 0 10px;color:var(--gold-ink);font-size:1.2rem;}
.notes ul{margin:0;padding-left:18px;} .notes li{margin:5px 0;font-size:.9rem;}
.foot{margin-top:34px;text-align:center;border-top:2px solid var(--gold);padding-top:20px;}
.foot .ph{font-size:1.15rem;font-weight:700;color:var(--gold-ink);}
.foot p{margin:5px 0;font-size:.88rem;color:var(--muted);}
.foot .site{color:var(--gold-ink);font-weight:700;text-decoration:none;}

/* ---- print: one section per page, photos kept ---- */
/* ---- printed menu: a cover, then two pages ----
   Breaking before EVERY section gave six sheets, most of them half empty. The
   breaks are now placed deliberately: the cover, then thalis and combo, then
   everything else. Sections in between flow, so a page fills before the next
   one starts. */
@media print{
  @page{size:Letter;margin:11mm;}
  body{background:#fff;font-size:9.6pt;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .wrap{max-width:none;padding:0;}
  .noprint,.mast{display:none!important;}
  .printcover{display:flex!important;}

  .sec{margin-top:13pt;page-break-before:auto;break-before:auto;}
  /* the two deliberate breaks */
  .sec.pg{page-break-before:always;break-before:page;margin-top:0;}
  .sec h2{font-size:14pt;margin-bottom:4pt;}
  .secnote{font-size:8pt;margin-bottom:8pt;}

  .tcard,.dcard,.notes,.row,.sec>h2{break-inside:avoid;}
  .sec h2{break-after:avoid;}
  /* Explicit print geometry. On screen the grids size themselves from a px
     minimum, and a Letter sheet is only ~550pt wide — so the thali grid
     dropped to two columns and pushed Silver onto a page of its own with a
     half-empty sheet either side. Print gets its own track counts and much
     shorter media boxes: on paper the item list is the content, the photo is
     there to identify the dish. */
  .tgrid{display:flex;flex-wrap:nowrap;gap:8pt;}
  .tcard{flex:1 1 0;min-width:0;}
  .tmedia{aspect-ratio:2/1;}
  .dgrid{display:flex;flex-wrap:wrap;gap:8pt;justify-content:center;}
  .dcard{flex:1 1 118pt;max-width:150pt;}
  .dmedia{aspect-ratio:16/9;}
  .tcard h3{font-size:10.5pt;} .tlist li{font-size:7.6pt;margin:.5pt 0;padding-left:12pt;}
  .tnote{font-size:7.4pt;margin:4pt 0 6pt;} .tflag{font-size:8pt;margin-top:8pt;padding-top:7pt;}
  .tbody{padding:8pt 9pt 9pt;} .dbody{padding:7pt 9pt 8pt;}
  .dcard h4{font-size:9.6pt;} .dprice{font-size:9.6pt;padding-top:5pt;}
  .daddon{font-size:7.4pt;}
  .pricelist{column-gap:26pt;margin-top:9pt;} .row{margin:3pt 0;}
  .notes{margin-top:14pt;padding:12pt 14pt;} .notes li{font-size:8.4pt;margin:2pt 0;}
  .foot{margin-top:12pt;padding-top:10pt;}
  /* cards keep their photos in print */
  .tmedia,.dmedia{background:#efe7da;}
}

/* ---- the cover sheet: print only ---- */
/* No vh here. In a print context vh resolves against the screen viewport, not
   the sheet, so `height:calc(100vh - 22mm)` made the cover taller than the page
   and split it across several. The cover is simply sized by its content and
   ends with a hard break; padding does the vertical placement. */
.printcover{display:none;flex-direction:column;align-items:center;justify-content:flex-start;
  text-align:center;padding-top:26pt;page-break-after:always;break-after:page;}
.printcover .pclogo{height:96pt;width:auto;margin-bottom:16pt;}
.printcover h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;
  font-size:34pt;line-height:1.05;margin:0;color:var(--gold-ink);}
.printcover .pcsub{font-size:9pt;letter-spacing:.3em;text-transform:uppercase;
  color:var(--gold-ink);margin-top:10pt;}
.printcover .pcrule{width:190pt;height:1px;margin:16pt 0;
  background:linear-gradient(90deg,transparent,var(--gold),transparent);}
.printcover .pchero{width:78%%;max-height:300pt;object-fit:cover;border-radius:10pt;
  border:1px solid var(--line);}
.printcover .pcfoot{margin-top:18pt;font-size:9pt;color:var(--ink);line-height:1.7;}
.printcover .pcfoot b{color:var(--gold-ink);font-size:11pt;}
.noprint{text-align:center;margin:22px 0 0;}
.pchint{font-size:.8rem;color:var(--muted);margin:12px 0 0;}
.btn{display:inline-flex;align-items:center;gap:8px;font:inherit;font-weight:600;font-size:.86rem;
     padding:11px 22px;border-radius:100px;text-decoration:none;cursor:pointer;
     color:#17120a;border:1px solid rgba(255,235,190,.55);
     background:linear-gradient(135deg,rgba(212,155,58,.97),rgba(184,122,37,.94));
     box-shadow:0 8px 24px rgba(184,122,37,.3);}
.btn.alt{color:var(--gold-ink);background:rgba(212,155,58,.1);border:1px solid var(--line);box-shadow:none;}
</style></head>
<body>
<div class="wrap">
  <header class="mast">
    <img src="%(logo)s" alt="Rajwadi Thali, Chaat &amp; Sweets">
    <h1>Dine-In Menu</h1>
    <div class="sub">Gujarati &middot; North Indian &middot; Chaats &amp; Sweets</div>
    <div class="rule"><span>&#9670;</span></div>
    <div class="noprint">
      <button class="btn" type="button" onclick="window.print()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8" rx="1"/></svg>
        Print or download menu
      </button>
      <a class="btn alt" href="index.html">Back to the site</a>
    </div>
    <p class="noprint pchint">Prints as four pages &mdash; a cover, then the thalis,
      the chaats, and the sweets. Choose &ldquo;Save as PDF&rdquo; in the print dialog
      to keep a copy.</p>
  </header>

  <!-- Cover sheet. Hidden on screen, first page in print. -->
  <section class="printcover" aria-hidden="true">
    <img class="pclogo" src="%(logo)s" alt="">
    <h1>Dine-In Menu</h1>
    <div class="pcsub">Gujarati &middot; North Indian &middot; Chaats &amp; Sweets</div>
    <div class="pcrule"></div>
    <img class="pchero" src="%(hero)s" alt="">
    <div class="pcfoot">
      <b>Rajwadi Thali, Chaat &amp; Sweets</b><br>
      %(addr)s<br>%(phone)s<br>%(hours)s
    </div>
  </section>

  <section class="sec">
    <h2><span>Unlimited Thali &mdash; No Sharing</span></h2>
    <p class="secnote">Served fresh through the day. Refilled for as long as you are eating.</p>
    <div class="tgrid">%(thalis)s</div>
  </section>

  %(sections)s

  <div class="notes">
    <h3>Please note</h3>
    <ul>%(rules)s</ul>
  </div>

  <footer class="foot">
    <p class="ph">%(phone)s</p>
    <p>%(addr)s</p>
    <p>%(hours)s</p>
    <p><a class="site" href="https://www.rajwadi-thali.com">rajwadi-thali.com</a></p>
  </footer>
</div>
</body></html>""" % {
  'logo': LOGO, 'hero': IMG['exec'],
  'thalis': ''.join(thali_card(t) for t in D['thalis']),
  'sections': '\n  '.join(sections),
  'rules': ''.join('<li>%s</li>' % r for r in D['rules']),
  'phone': c['phone'], 'addr': c['addr'], 'hours': ' &middot; '.join(c['hours']),
}
out = 'site/assets/downloads/rajwadi-thali-menu.html' if EMBED else 'site/menu.html'
os.makedirs(os.path.dirname(out), exist_ok=True) if EMBED else None
io.open(out,'w',encoding='utf-8').write(HTML)
print('  %-44s %.1f KB  (%s)' % (out, len(HTML.encode())/1024,
      'self-contained, for download' if EMBED else 'page, uses the site images'))
