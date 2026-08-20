/* ==========================================================================
   Rajwadi Thali — Restaurant Dine page
   Liquid-glass nav: measured nav space, sliding active pill, scroll spy,
   menu tabs. Everything that slides animates transform/width only, from the
   element's current on-screen value, so an in-flight move can be redirected
   mid-motion instead of jumping to a target.
   ========================================================================== */
(function () {
  'use strict';

  var nav = document.getElementById('nav');
  var navLinksWrap = document.getElementById('navLinks');
  var navMobile = document.getElementById('navMobile');
  var navBackdrop = document.getElementById('navBackdrop');
  var toggle = document.getElementById('navToggle');
  var navPill = document.getElementById('navActivePill');
  var tabPill = document.getElementById('tabPill');
  var navLinks = [].slice.call(document.querySelectorAll('.nav-link'));
  var tabs = [].slice.call(document.querySelectorAll('.tab[role="tab"]'));
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------------- *
   * Reserve the real nav height so anchors never land under the nav. *
   * The CSS value is only a static fallback.                          *
   * ---------------------------------------------------------------- */
  function measureNavSpace() {
    if (!nav) return;
    var h = nav.getBoundingClientRect().height;
    var top = parseFloat(getComputedStyle(nav).top) || 18;
    document.documentElement.style.setProperty('--nav-space', (h + top + 12) + 'px');
  }

  /* ---------------------------------------------------------------- *
   * Reserve the real height of the fixed bottom bar.                 *
   * The CSS value is a static 70px, which was right for the shipped  *
   * label — but the bar grows with its text, so at the larger        *
   * accessibility text steps that reserve fell short and the bar     *
   * covered the last lines of the page. Measure it instead.          *
   * Cleared (not zeroed) above the breakpoint so the stylesheet's    *
   * own 0px keeps applying.                                          *
   * ---------------------------------------------------------------- */
  function measureBottomBar() {
    var h = mobileBar ? mobileBar.getBoundingClientRect().height : 0;
    if (h > 0) {
      document.documentElement.style.setProperty('--bottombar-space', h + 'px');
    } else {
      document.documentElement.style.removeProperty('--bottombar-space');
    }
  }

  /* ---------------------------------------------------------------- *
   * ADAPTIVE NAV THEME                                               *
   * The page alternates black and white grounds, so the floating nav *
   * has to recolour as it passes over them — same behaviour as the   *
   * catering site. Sections declare their own ground with            *
   * .section--dark / .section--light, so this is a plain rect test    *
   * against the dark ones rather than a luminance sample: no         *
   * elementFromPoint, no paint races, no forced style reads.         *
   * ---------------------------------------------------------------- */
  var DARK_SELECTOR = '.section--dark, .hero, .page-hero';

  function navOverDark() {
    var r = nav.getBoundingClientRect();
    return overDarkAt(r.top + r.height / 2);
  }

  /* same rect test, but at an arbitrary y — used for the nav (top of screen)
     and the fixed bottom action bar, which sit over different sections */
  function overDarkAt(y) {
    var darks = document.querySelectorAll(DARK_SELECTOR);
    for (var i = 0; i < darks.length; i++) {
      var b = darks[i].getBoundingClientRect();
      if (b.height > 0 && y >= b.top && y <= b.bottom) return true;
    }
    return false;
  }

  var mobileBar = document.querySelector('.mobile-cta');

  function applyNavTheme() {
    if (!nav) return;
    var dark = navOverDark();
    [nav, navMobile].forEach(function (el) {
      if (!el) return;
      el.classList.toggle('nav-theme-dark', dark);
      el.classList.toggle('nav-theme-light', !dark);
    });

    /* the bottom bar is 700+px away from the nav on a phone — it needs its own
       sample, or it wears the colour of whatever the nav happens to be over */
    if (mobileBar) {
      var barTop = mobileBar.getBoundingClientRect().top;
      mobileBar.classList.toggle('bar-dark', overDarkAt(barTop + 4));
    }
  }

  var themeTicking = false, lastThemeY = null;
  function scheduleNavTheme(force) {
    if (force === true) { themeTicking = false; lastThemeY = window.scrollY; applyNavTheme(); return; }
    if (themeTicking) return;
    themeTicking = true;
    requestAnimationFrame(function () {
      themeTicking = false;
      /* re-sample only after real movement — the theme still flips within
         ~40px of a boundary, without measuring on every scrolled frame */
      if (lastThemeY !== null && Math.abs(window.scrollY - lastThemeY) < 40) return;
      lastThemeY = window.scrollY;
      applyNavTheme();
    });
  }

  window.addEventListener('scroll', scheduleNavTheme, { passive: true });
  window.addEventListener('resize', function () { scheduleNavTheme(true); });
  window.addEventListener('pageshow', function () { scheduleNavTheme(true); });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) scheduleNavTheme(true);
  });

  /* ---------------------------------------------------------------- *
   * Pill helpers — move a pill onto a target element.                *
   * ---------------------------------------------------------------- */
  function movePill(pill, target, fast) {
    if (!pill || !target || !target.offsetParent) return;
    /* The nav pill is spring-driven by the Liquid Glass module at the bottom
       of this file once it has booted, so that a move arriving mid-flight is
       absorbed rather than restarted. Same call signature either way, so
       every existing caller — the scroll spy, the hover preview, the
       accessibility relayout — is unchanged. The tab pill keeps the CSS
       transition: nothing can grab it mid-motion, so it gains nothing. */
    if (pill === navPill && window.__lgSpringTo) { window.__lgSpringTo(target, false, fast); return; }
    var box = pill.parentElement;
    var p = box.getBoundingClientRect();
    var t = target.getBoundingClientRect();
    pill.style.width = t.width + 'px';
    pill.style.height = t.height + 'px';
    /* Scroll offsets matter now that the tab strip is a scroller. An absolutely
       positioned child of a scroll container is placed against the padding box
       and therefore travels WITH the content, while getBoundingClientRect
       reports where things currently are on screen. Differencing the two rects
       alone gives a position relative to the visible left edge, so the pill
       would sit correctly only at scrollLeft 0 and drift by exactly the scroll
       distance everywhere else. Adding the scroll offset converts back into the
       content coordinates the pill is actually positioned in. */
    pill.style.transform = 'translate(' +
      (t.left - p.left + box.scrollLeft) + 'px,' +
      (t.top - p.top + box.scrollTop) + 'px)';
    pill.classList.add('ready');
  }

  function hidePill(pill) { if (pill) pill.classList.remove('ready'); }

  /* ---------------------------------------------------------------- *
   * NAV: active pill follows the current section, and previews the   *
   * link under the pointer — the hint points where you're going.     *
   * ---------------------------------------------------------------- */
  /* on a subpage none of the links is active, so there is nothing for the pill
     to sit on — leave it hidden rather than parking it on Home */
  var activeNavLink = navLinks.filter(function (a) { return a.classList.contains('active'); })[0] || null;

  function syncNavPill() {
    if (window.innerWidth <= 1050 || !activeNavLink) { hidePill(navPill); return; }
    movePill(navPill, activeNavLink);
  }
  /* a cancelled slide (the pointer left the window, or the OS took over) has
     to put the pill back where the page actually is */
  window.__lgResync = syncNavPill;

  function setActiveSection(id) {
    var match = navLinks.filter(function (a) { return a.dataset.section === id; })[0];
    if (!match || match === activeNavLink) return;
    navLinks.forEach(function (a) { a.classList.toggle('active', a === match); });
    if (navMobile) {
      navMobile.querySelectorAll('.nav-mobile-link').forEach(function (a) {
        a.classList.toggle('active', a.dataset.section === id);
      });
    }
    activeNavLink = match;
    syncNavPill();
  }

  navLinks.forEach(function (link) {
    link.addEventListener('pointerenter', function () {
      /* a hover is a hint, not a decision — it answers the pointer at once */
      if (window.innerWidth > 1050) movePill(navPill, link, true);
    });
  });
  if (navLinksWrap) {
    navLinksWrap.addEventListener('pointerleave', syncNavPill);
  }

  /* scroll spy — which section is behind the nav right now */
  var sections = [].slice.call(document.querySelectorAll('[id]')).filter(function (el) {
    return navLinks.some(function (a) { return a.dataset.section === el.id; });
  });

  if ('IntersectionObserver' in window && sections.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setActiveSection(e.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------------------------------------------------------------- *
   * Mobile nav — a separate sheet below the nav plus a dimming        *
   * backdrop, same as catering. The sheet is the modal task, so it    *
   * gets a scrim; the page behind is pushed back, not just covered.   *
   * ---------------------------------------------------------------- */
  function setMobileNav(open) {
    if (!navMobile || !toggle) return;
    navMobile.classList.toggle('open', open);
    navMobile.setAttribute('aria-hidden', String(!open));
    if (navBackdrop) {
      navBackdrop.classList.toggle('show', open);
      navBackdrop.setAttribute('aria-hidden', String(!open));
    }
    toggle.setAttribute('aria-expanded', String(open));
    /* stop the page scrolling behind an open sheet */
    document.documentElement.style.overflow = open ? 'hidden' : '';
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      setMobileNav(!navMobile.classList.contains('open'));
    });
  }
  if (navBackdrop) {
    navBackdrop.addEventListener('click', function () { setMobileNav(false); });
  }
  if (navMobile) {
    /* an in-page anchor means the sheet's job is done */
    navMobile.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMobileNav(false);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navMobile && navMobile.classList.contains('open')) {
      setMobileNav(false);
      toggle.focus();
    }
  });
  /* if the viewport grows past the mobile breakpoint while the sheet is open,
     close it — otherwise it hangs around over the restored desktop nav */
  window.addEventListener('resize', function () {
    if (window.innerWidth > 1050 && navMobile && navMobile.classList.contains('open')) {
      setMobileNav(false);
    }
  });

  /* ---------------------------------------------------------------- *
   * FOOTER COLUMNS                                                   *
   * Four columns on desktop; below 820px each becomes an accordion,  *
   * same as catering. The heading is a real <button> so it is         *
   * keyboard-operable, and aria-expanded tracks the open state.       *
   * ---------------------------------------------------------------- */
  [].slice.call(document.querySelectorAll('.footer-h')).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var col = btn.closest('.footer-col');
      if (!col) return;
      var open = col.classList.toggle('footer-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------------------------------------------------------------- *
   * MENU TABS                                                        *
   * ---------------------------------------------------------------- */
  var underTimer;

  /* The active tab's label is dark because the gold pill sits behind it. While
     the pill is still travelling there is no gold behind that label yet, so the
     dark ink is only applied once the pill has arrived (or immediately if it
     has no distance to cover). */
  function markPillUnder(tab, instant) {
    clearTimeout(underTimer);
    tabs.forEach(function (t) { if (t !== tab) t.classList.remove('pill-under'); });
    /* "Pause animations" in the accessibility panel collapses the pill's travel
       to nothing, so waiting 300ms for it to arrive would just leave the label
       un-inked — treat it exactly like the OS-level reduced-motion setting */
    if (instant || reduceMotion.matches ||
        document.documentElement.classList.contains('a11y-motion')) {
      tab.classList.add('pill-under');
      return;
    }
    underTimer = setTimeout(function () { tab.classList.add('pill-under'); }, 300);
  }

  /* A strip only behaves like a scroller when it has something to scroll: the
     end fades and the snap points are switched on by this class rather than
     assumed, so a strip that fits is left completely alone. */
  function syncScrollable() {
    var box = tabPill && tabPill.parentElement;
    if (!box) return;
    box.classList.toggle('is-scrollable', box.scrollWidth - box.clientWidth > 1);
  }

  /* Bring a tab fully into view when it is chosen — by keyboard especially,
     where the arrow keys can walk onto an item that is entirely off screen. */
  function revealTab(tab) {
    var box = tab.parentElement;
    if (!box || box.scrollWidth <= box.clientWidth) return;
    var want = tab.offsetLeft - (box.clientWidth - tab.offsetWidth) / 2;
    var max = box.scrollWidth - box.clientWidth;
    if (want < 0) want = 0; else if (want > max) want = max;
    if (Math.abs(want - box.scrollLeft) < 2) return;
    /* Assigned, not animated from here. scrollTo({behavior:'smooth'}) hands the
       scroll to an animation, and an animation that cannot run -- a background
       tab, a browser that ignores the option -- leaves the scroller exactly
       where it was, so the chosen tab silently stays off screen. Setting the
       value commits it every time; `scroll-behavior` on the element makes it
       smooth where smoothness is possible, and drops to an instant jump where
       it is not. The reduced-motion case is handled in the stylesheet with it. */
    box.scrollLeft = want;
  }

  function selectTab(tab, instant) {
    var already = tab.classList.contains('is-active');
    tabs.forEach(function (t) {
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      var on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      if (panel) {
        panel.hidden = !on;
        panel.classList.toggle('is-active', on);
      }
    });
    movePill(tabPill, tab);
    revealTab(tab);
    markPillUnder(tab, instant || already);
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });

    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next); next.focus(); }
    });
  });

  /* deep link: #menu?tab=chaats */
  function applyHashTab() {
    var h = window.location.hash;
    if (h.indexOf('tab=') > -1) {
      var wanted = document.getElementById('tab-' + h.split('tab=')[1].split('&')[0]);
      if (wanted) selectTab(wanted, true);
    }
  }

  /* ---------------------------------------------------------------- *
   * Boot / keep pills correct as things reflow                       *
   * ---------------------------------------------------------------- */
  function boot() {
    measureNavSpace();
    measureBottomBar();
    applyNavTheme();
    applyHashTab();
    var active = tabs.filter(function (t) { return t.classList.contains('is-active'); })[0] || tabs[0];
    syncScrollable();
    if (active) { movePill(tabPill, active); markPillUnder(active, true); revealTab(active); }
    syncNavPill();
  }

  /* ---------------------------------------------------------------- *
   * KEEP THE MEASURED CHROME HONEST WHEN TEXT SIZE CHANGES           *
   *                                                                  *
   * Both pills, --nav-space and --bottombar-space are drawn from     *
   * measured pixels, so they follow nothing that resizes content     *
   * without resizing the WINDOW — most obviously the accessibility   *
   * panel's "Bigger text", which otherwise left the nav highlight    *
   * stranded at its old width around a larger label and the bottom   *
   * bar overlapping the page.                                        *
   *                                                                  *
   * Watching the elements themselves rather than the setting means   *
   * this also covers the readable-font swap, line-height changes and *
   * late-loading webfonts, without needing to know which one fired.  *
   * ---------------------------------------------------------------- */
  function relayout() {
    measureNavSpace();
    measureBottomBar();
    applyNavTheme();
    var active = tabs.filter(function (t) { return t.classList.contains('is-active'); })[0];
    syncScrollable();
    if (active) movePill(tabPill, active);
    syncNavPill();
  }

  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function () {
      /* the scroller flag is a read and a class toggle, so it is done straight
         away rather than deferred: relayout waits on a frame, and a frame is
         exactly what a backgrounded tab does not give you */
      syncScrollable();
      requestAnimationFrame(relayout);
    });
    [navLinksWrap, nav, mobileBar, tabPill && tabPill.parentElement]
      .forEach(function (el) { if (el) ro.observe(el); });
  }

  /* ...and the settings that change layout without changing any watched box —
     the nav's level-3 icon drop, for one, shrinks the row it is measured from */
  new MutationObserver(function () {
    requestAnimationFrame(relayout);
    setTimeout(relayout, 60);          // again after any width/padding transition
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-a11y-text', 'data-a11y-line', 'class']
  });

  /* pills are measured from laid-out geometry, so wait for webfonts */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(boot);
  }
  window.addEventListener('load', boot);
  boot();

  var raf;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      measureNavSpace();
      applyNavTheme();
      var active = tabs.filter(function (t) { return t.classList.contains('is-active'); })[0];
      if (active) movePill(tabPill, active);
      syncNavPill();
    });
  });

  window.addEventListener('hashchange', applyHashTab);

  /* freeze the ambient wash if the reader asks for less motion at runtime */
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', function () { measureNavSpace(); });
  }
})();

/* =========================================================================
   ACCESSIBILITY PREFERENCES PANEL
   -------------------------------------------------------------------------
   Reader preferences (text size, spacing, contrast, motion, ...). Each one is
   written onto <html> as a data-attribute or a class; styles.css does the
   work. State is persisted under 'rt-a11y' — the SAME key the catering site
   uses, so a reader who set their preferences there arrives here with them
   already on — and re-applied before first paint by the inline script in each
   page's <head>. This file only handles the UI.

   Deliberately a separate IIFE from the nav/menu bundle above: if anything in
   the page scripts throws, the control that lets someone turn on high contrast
   is the last thing that should go down with it.
   ====================================================================== */
(function () {
  'use strict';

  var btn = document.getElementById('a11yBtn');
  var panel = document.getElementById('a11yPanel');
  if (!btn || !panel) return;

  var KEY = 'rt-a11y';
  var STEPS = ['text', 'line', 'align', 'contrast', 'opacity'];
  var FLAGS = ['font', 'gray', 'noimg', 'motion', 'links'];
  var root = document.documentElement;
  var state = {};
  var backdrop = null;
  var lastFocus = null;

  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  /* ---------- apply state to <html> ---------- */
  function apply() {
    STEPS.forEach(function (k) {
      if (state[k]) root.setAttribute('data-a11y-' + k, state[k]);
      else root.removeAttribute('data-a11y-' + k);
    });
    FLAGS.forEach(function (k) { root.classList.toggle('a11y-' + k, !!state[k]); });
  }

  var live = panel.querySelector('[data-a11y-live]');
  function names(row) { return (row.getAttribute('data-a11y-names') || '').split('|'); }

  /* ---------- reflect state back into the controls ---------- */
  function sync(announce) {
    panel.querySelectorAll('[data-a11y-steps]').forEach(function (row) {
      var key = row.getAttribute('data-a11y-steps');
      var val = state[key] || 0;
      var list = names(row);
      /* fill every segment up to the active one, the way a volume control does */
      row.querySelectorAll('.a11y-steps span').forEach(function (s, i) {
        s.classList.toggle('a11y-on', i <= val);
      });
      row.setAttribute('data-a11y-level', val);
      var text = row.getAttribute('data-a11y-title') + ': ' + (list[val] || '') +
                 ' (' + (val + 1) + ' of ' + list.length + ')';
      row.setAttribute('aria-label', text);
      if (announce === key && live) live.textContent = text;
    });
    panel.querySelectorAll('[data-a11y-toggle]').forEach(function (b) {
      b.setAttribute('aria-checked', state[b.getAttribute('data-a11y-toggle')] ? 'true' : 'false');
    });
  }

  /* ---------- steppers ---------- */
  panel.querySelectorAll('[data-a11y-steps]').forEach(function (row) {
    var key = row.getAttribute('data-a11y-steps');
    var max = names(row).length - 1;

    function set(val) { state[key] = val; apply(); sync(key); save(); }

    /* one press = one level, wrapping past the top back to the default, so the
       whole row can be the target instead of asking anyone to hit a segment */
    row.addEventListener('click', function () {
      var cur = state[key] || 0;
      set(cur >= max ? 0 : cur + 1);
    });

    /* arrows step without wrapping — holding Right should settle at the top
       rather than silently dumping the reader back to the default size */
    row.addEventListener('keydown', function (e) {
      var cur = state[key] || 0, next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(max, cur + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(0, cur - 1);
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = max;
      if (next === null) return;
      e.preventDefault();
      e.stopPropagation();
      set(next);
    });
  });

  /* ---------- switches ---------- */
  panel.querySelectorAll('[data-a11y-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var key = b.getAttribute('data-a11y-toggle');
      state[key] = state[key] ? 0 : 1;
      apply(); sync(); save();
    });
  });

  /* ---------- page structure ---------- */
  var structBtn = panel.querySelector('[data-a11y-structure]');
  var structBox = document.getElementById('a11yStructure');
  if (structBtn && structBox) {
    var buildStructure = function () {
      var heads = document.querySelectorAll('main h1, main h2, main h3');
      var ul = document.createElement('ul');
      var n = 0;
      heads.forEach(function (h, i) {
        /* the menu tabs keep every inactive panel [hidden]; listing headings a
           reader cannot jump to would be a list of dead links */
        if (!h.textContent.trim() || h.closest('[hidden]')) return;
        if (!h.id) h.id = 'a11y-h-' + i;
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent.trim();
        a.className = 'a11y-' + h.tagName.toLowerCase();
        a.addEventListener('click', function () { close(true); });
        li.appendChild(a); ul.appendChild(li); n++;
      });
      structBox.textContent = '';
      if (!n) {
        var p = document.createElement('p');
        p.className = 'a11y-empty';
        p.textContent = 'No headings found on this page.';
        structBox.appendChild(p);
      } else {
        structBox.appendChild(ul);
      }
    };
    structBtn.addEventListener('click', function () {
      var open = structBox.hidden;
      if (open) buildStructure();
      structBox.hidden = !open;
      structBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- reset ---------- */
  panel.querySelector('[data-a11y-reset]').addEventListener('click', function () {
    state = {};
    apply(); sync(); save();
  });

  /* ---------- open / close ---------- */
  function isMobile() { return window.matchMedia('(max-width:560px)').matches; }

  function focusables() {
    return Array.prototype.slice.call(
      panel.querySelectorAll('button:not([tabindex="-1"]), a[href]')
    ).filter(function (el) { return el.offsetParent !== null; });
  }

  var closeTimer = null;
  /* The panel stays in the DOM un-hidden while it animates out, so panel.hidden
     is NOT the open/closed state during that window — reading it there makes a
     second click re-close instead of reopening. */
  var isOpen = false;

  function stillMotion() {
    return !root.classList.contains('a11y-motion') &&
           !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function open() {
    isOpen = true;
    lastFocus = document.activeElement;
    /* a close in flight must be grabbable — cancel it rather than waiting for
       it to finish and then reopening, which reads as a stutter */
    clearTimeout(closeTimer);
    panel.classList.remove('a11y-closing');
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('a11y-open');
    if (isMobile()) {
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'a11y-backdrop';
        backdrop.addEventListener('click', function () { close(true); });
        document.body.appendChild(backdrop);
      }
      backdrop.hidden = false;
    }
    sync();
    var f = focusables();
    (f[0] || panel).focus();
  }

  function close(restoreFocus) {
    isOpen = false;
    btn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('a11y-open');
    if (backdrop) backdrop.hidden = true;
    /* Leave along the path it arrived on rather than snapping off. Driven by a
       timer, never by animationend: if the tab is throttled that event may never
       fire, and a panel that cannot close is far worse than one that closes
       without the flourish. Reopening cancels it — the close is interruptible. */
    if (stillMotion()) {
      panel.classList.add('a11y-closing');
      clearTimeout(closeTimer);
      closeTimer = setTimeout(function () {
        panel.classList.remove('a11y-closing');
        panel.hidden = true;
      }, 200);
    } else {
      panel.hidden = true;
    }
    if (restoreFocus) {
      /* fall back to the launcher unless the opener is still a real, focusable
         element in the document — <body> reports as activeElement but cannot
         take focus, which would strand a keyboard user at the top of the page */
      var back = (lastFocus && lastFocus.focus && lastFocus !== document.body &&
                  document.contains(lastFocus)) ? lastFocus : btn;
      back.focus();
    }
  }

  btn.addEventListener('click', function () {
    if (isOpen) close(true); else open();
  });

  panel.querySelectorAll('[data-a11y-close]').forEach(function (el) {
    el.addEventListener('click', function () {
      /* "Hide" removes the launcher for this page view only — a preferences
         panel you cannot get back is a trap, so it returns on the next load */
      if (el.hasAttribute('data-a11y-hide')) root.classList.add('a11y-hidden');
      close(true);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close(true); return; }
    if (e.key !== 'Tab') return;
    /* focus trap: the panel is aria-modal, so Tab must not walk the page behind */
    var f = focusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  apply();
  sync();
})();


/* =========================================================================
   INSTALL AS AN APP
   -------------------------------------------------------------------------
   Registers the service worker (which is what makes the site installable at
   all -- a manifest on its own does not qualify) and offers an install button.

   The button is built HERE rather than in the five HTML files on purpose: it
   is only meaningful where the browser actually supports installing, so
   markup that is dead on every other browser never ships. It is appended to
   the footer's bottom row, which is where someone looks for site-level
   actions, and it never competes with the Order Online CTA.

   Separate IIFE, like the accessibility panel: nothing here should be able to
   take the rest of the page down with it.
   ====================================================================== */
(function () {
  'use strict';

  /* ---------- service worker ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {
        /* file://, a private window, or an unsupported host -- the site works
           exactly as before without it, so there is nothing to report */
      });
    });
  }

  /* ---------- install button ---------- */
  var deferred = null;
  var btn = null;

  /* standalone means it is already installed and running as the app */
  function installed() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  function make(label, onClick) {
    var row = document.querySelector('.footer-bottom');
    if (!row || installed()) return null;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'footer-install';
    b.innerHTML =
      '<span class="footer-install-ico" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3.5v11m0 0 4-4m-4 4-4-4"/><path d="M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2"/>' +
      '</svg></span><span></span>';
    b.lastChild.textContent = label;
    b.addEventListener('click', onClick);
    row.appendChild(b);
    return b;
  }

  /* Chrome/Edge/Android: the browser tells us when the site qualifies */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();               // keep the mini-infobar out of the way
    deferred = e;
    if (btn) return;
    btn = make('Install app', function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function () {
        /* the event is single-use either way; drop the button so it cannot be
           clicked a second time into a dead prompt */
        deferred = null;
        if (btn) { btn.remove(); btn = null; }
      });
    });
  });

  window.addEventListener('appinstalled', function () {
    deferred = null;
    if (btn) { btn.remove(); btn = null; }
  });

  /* iOS Safari has no beforeinstallprompt -- installing is Share > Add to
     Home Screen, so the button explains that instead of pretending to do it */
  var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var webkit = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
  if (iOS && webkit && !installed()) {
    btn = make('Add to Home Screen', function () {
      var tip = document.getElementById('installTip');
      if (tip) { tip.remove(); return; }
      tip = document.createElement('p');
      tip.id = 'installTip';
      tip.className = 'footer-install-tip';
      tip.setAttribute('role', 'status');
      tip.textContent = 'Tap the Share button in Safari, then choose "Add to Home Screen".';
      btn.insertAdjacentElement('afterend', tip);
    });
  }
})();


/* =========================================================================
   LIQUID GLASS — refraction, pointer-tracked specular, press-and-slide
   -------------------------------------------------------------------------
   Three separate things, in the order they matter:

   1. REFRACTION. The part that actually reads as glass rather than as a
      frosted panel: content behind the bar is BENT at the rim. Done with an
      SVG displacement map generated here on a canvas from the bar's own
      rounded-rect geometry, then delivered by whichever route the engine
      leaves open: straight onto the live backdrop in Chromium, and onto a
      clipped copy of the backdrop in WebKit and Gecko, which parse url()
      inside backdrop-filter and then discard it. Same maps, same bend, two
      subjects -- see THE SAME LENS, WHERE THE BACKDROP CANNOT CARRY ONE.

   2. SPECULAR. A light source that follows the pointer: a soft bloom across
      the surface and a bright rim that lights only the arc nearest the
      pointer. Both are CSS custom properties written from one rAF-throttled
      pointermove, so no layout is touched.

   3. PRESS-AND-SLIDE. Press the bar and drag: the selection follows the
      finger 1:1, its width morphing to whatever link it is over, then throws
      with the release velocity and settles on the projected link. Driven by
      real springs rather than CSS transitions, because a transition cannot be
      grabbed and reversed mid-flight -- interruptibility is the whole point.

   Everything degrades: prefers-reduced-motion drops the springs to instant,
   prefers-reduced-transparency and the accessibility panel's own "Pause
   animations" / contrast steps are all honoured.
   ====================================================================== */
(function () {
  'use strict';

  var nav = document.getElementById('nav');
  var row = document.getElementById('navLinks');
  var pill = document.getElementById('navActivePill');
  /* Queried here, not borrowed: the nav/menu bundle above has its own
     `mobileBar` in ITS closure, and referencing that name from this IIFE
     throws at module top level — which takes the entire glass module down
     with it, lens and all. */
  var mobileBar = document.querySelector('.mobile-cta');
  if (!nav) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduceTransparency = window.matchMedia('(prefers-reduced-transparency: reduce)');
  var root = document.documentElement;

  function stillMotion() {
    return !reduceMotion.matches && !root.classList.contains('a11y-motion');
  }

  /* ---------------------------------------------------------------- *
   * 1. SPRING                                                        *
   * Apple's two knobs, not mass/stiffness/damping: `response` is how *
   * quickly it reaches the target in seconds, `damping` is 1 for a   *
   * clean settle and below 1 to overshoot. Integrated per frame from *
   * the CURRENT value, which is what makes it interruptible -- a new *
   * target mid-flight just changes where it is heading, carrying the *
   * velocity it already had instead of restarting.                   *
   * ---------------------------------------------------------------- */
  function Spring(value, response, damping) {
    this.v = 0;
    this.x = value;
    this.target = value;
    this.response = response || 0.4;
    this.damping = damping == null ? 1 : damping;
  }
  Spring.prototype.step = function (dt) {
    if (!stillMotion()) { this.x = this.target; this.v = 0; return false; }
    var w = 6.283185307 / this.response;          /* natural frequency */
    var k = w * w;
    var c = 2 * this.damping * w;
    /* semi-implicit Euler: stable at the step sizes a browser hands us */
    var a = -k * (this.x - this.target) - c * this.v;
    this.v += a * dt;
    this.x += this.v * dt;
    if (Math.abs(this.x - this.target) < 0.01 && Math.abs(this.v) < 0.01) {
      this.x = this.target; this.v = 0; return false;
    }
    return true;
  };
  Spring.prototype.set = function (t, immediate) {
    this.target = t;
    if (immediate || !stillMotion()) { this.x = t; this.v = 0; }
  };

  /* one rAF loop drives every spring on the page */
  var springs = [];
  var raf = null, last = 0;
  function tick(now) {
    var dt = Math.min((now - last) / 1000, 1 / 30);   /* clamp after a stall */
    last = now;
    var alive = false;
    for (var i = 0; i < springs.length; i++) {
      if (springs[i]() ) alive = true;
    }
    raf = alive ? requestAnimationFrame(tick) : null;
  }
  function kick() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------------- *
   * 2. REFRACTION — a reusable piece of glass                        *
   *                                                                  *
   * Two generated maps, not one. That is the difference between      *
   * "the backdrop is warped" and "this is a glass object":           *
   *                                                                  *
   *   DISPLACEMENT  where and how hard to bend the backdrop.         *
   *   SPECULAR      a stroked rim whose brightness varies by angle,  *
   *                 so light lands on some parts of the edge and not *
   *                 others. Composited over the refraction rather    *
   *                 than faked with a flat inset box-shadow — a ring *
   *                 of even brightness reads as a border, a graded   *
   *                 one reads as a lit edge.                         *
   *                                                                  *
   * Pipeline, after the reference implementations:                   *
   *   blur(1) -> displace (one pass, all channels) -> lift -> mask   *
   *   by rim -> screen back over the refraction.                     *
   * ---------------------------------------------------------------- */

  /* The signed distance to a rounded rectangle, and its gradient, are both
     inlined into buildMaps below -- they share the same (qx, qy) and this is
     the innermost loop on the page. What they compute:

       qx = |px| - hw + r,  qy = |py| - hh + r
       dist = |max(q, 0)| + min(max(qx, qy), 0) - r      negative inside
       normal = normalize(q) diagonally outside, an axis otherwise

     Negative inside, so -dist/bezel is how deep into the bezel a pixel sits,
     and the gradient is the direction the rim faces there. */

  /* ---- THE SURFACE ------------------------------------------------------
     One function describes this material, and both maps are read off it: the
     HEIGHT of the glass across its bezel. `x` runs 0 at the outer rim to 1
     where the bezel meets the flat interior, and the result runs 0 to 1 in
     units of the glass's own thickness.

     This is the part the old map was guessing at. It had no surface -- it
     took the distance from the rim, raised it to 2.4, and called the result a
     displacement. That exponent was fitted by eye to a screenshot, which is
     why every attempt to change one thing about the bend (make the edge
     thicker, the bar taller) broke the rest of it: there was nothing
     underneath the number to stay consistent. Give the glass a shape and the
     bend, the highlight and the falloff all follow from it. */

  /* The squircle, which is the profile Apple actually uses. Against a plain
     circular dome its flat->curve join is far softer, and that matters more
     here than anywhere: this bar is a ~1200x94 pill, about as stretched as a
     rounded shape gets, and the circle leaves a visible seam running the
     length of it where the bezel ends and the flat top begins. */
  function pSquircle(x) { var u = 1 - x; return Math.pow(1 - u * u * u * u, 0.25); }
  function pCircle(x)   { var u = 1 - x; return Math.sqrt(1 - u * u); }
  function smootherstep(x) { return x * x * x * (x * (x * 6 - 15) + 10); }
  /* a raised rim with a shallow dish behind it, for controls rather than bars */
  function pLip(x) { var c = pSquircle(x), t = smootherstep(x); return c * (1 - t) + (1 - c) * t; }
  var PROFILE = { squircle: pSquircle, circle: pCircle, lip: pLip };

  /* dy/ds at x, in real pixels: height is scaled by `thick`, distance by
     `bezel`, so the normalised derivative has to be rescaled by their ratio.
     Central difference, clamped to the domain -- the slope runs away at x=0
     (the rim of a dome is vertical) and sampling past it returns NaN. */
  function surfaceSlope(f, x, bezel, thick) {
    var d = 0.002;
    var a = x - d < 0 ? 0 : x - d;
    var b = x + d > 1 ? 1 : x + d;
    return (f(b) - f(a)) / (b - a) * (thick / bezel);
  }

  /* ---- SNELL'S LAW ------------------------------------------------------
       n1 sin(theta1) = n2 sin(theta2)

     Working in the bezel's cross-section, where `s` runs inward from the rim
     and `y` runs up. Air above (n1 = 1), glass below (n2, ~1.5). The eye is
     straight overhead, so the incident ray is D = (0, -1) for every pixel and
     the whole problem collapses to: tilt the surface, refract once, see where
     the ray lands.

     Two consequences worth knowing, because they are what make this look
     right without any tuning:

     The bend is SELF-LIMITING. However steep the bezel gets -- even vertical
     at the very rim -- a ray entering glass can never travel more than the
     critical angle asin(1/n) from vertical, 41.8 degrees at n=1.5. So the
     displacement has a ceiling that comes out of the physics rather than out
     of a clamp, and no amount of edge curvature can smear the bar.

     The bend also goes to ZERO at the rim, because that is where the glass is
     thinnest: the ray bends hardest there and then has almost no depth left
     to fall through before it reaches the page. Peak displacement lands a
     little way INSIDE the edge, and falls off both ways. That is the band you
     see on the reference bar, and it is why the outermost hairline of it
     stays crisp while the millimetre behind it is doing all the bending. */
  function refractOffset(f, x, slope, thick, gap, eta) {
    /* surface normal in (s, y). It tilts OUTWARD wherever the glass falls
       away toward the rim, which is the whole bezel. */
    var inv = 1 / Math.sqrt(1 + slope * slope);
    var ns = -slope * inv, ny = inv;
    var cosi = ny;                                   /* = -dot(N, D) */
    var k = 1 - eta * eta * (1 - cosi * cosi);
    if (k < 0) return 0;                             /* unreachable entering glass */
    var g = eta * cosi - Math.sqrt(k);
    var ts = g * ns;                                 /* inward component of T */
    var ty = -eta + g * ny;                          /* downward component of T */
    if (ty >= 0) return 0;
    /* how far the ray still has to fall. `gap` is real: this bar floats above
       the page -- it casts a shadow onto it -- and a floating pane keeps a
       little deflection at the very rim where a pane laid flat on the page
       would have none. */
    return (gap + thick * f(x)) * (ts / -ty);        /* px, + = samples inward */
  }

  /* The offset depends only on how deep into the bezel a pixel sits, so the
     simulation runs once along a single radius and is then reused the whole
     way around the shape. 257 steps: the map that consumes this is 8-bit, so
     past ~128 distinct values it is quantisation, not sampling, that limits
     the result -- which is also the resolution the reference implementation
     settles on for the same reason. */
  function solveBezel(o) {
    var f = PROFILE[o.profile] || pSquircle;
    var eta = 1 / o.ior;
    var n = 257;
    var off = new Float64Array(n), slope = new Float64Array(n), max = 0;
    for (var i = 0; i < n; i++) {
      var x = i / (n - 1);
      slope[i] = surfaceSlope(f, x, o.bezel, o.thickness);
      off[i] = refractOffset(f, x, slope[i], o.thickness, o.gap, eta);
      var a = off[i] < 0 ? -off[i] : off[i];
      if (a > max) max = a;
    }
    return { f: f, off: off, slope: slope, max: max, n: n };
  }

  function clamp8(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

  /* BOTH MAPS, ONE PASS, ANALYTIC NORMALS.

     This was two functions walking the same pixels, each calling the SDF five
     times per pixel -- once for the distance and four more to difference a
     gradient out of it. Ten evaluations per pixel, and on the hero panel that
     came to a 199ms block on the main thread every time the window resized.

     Two things were wasted. The gradient of a rounded rectangle does not need
     differencing: the outward direction is the corner offset where the pixel
     is diagonally outside the inner box, and an axis otherwise, which falls
     straight out of the same (qx, qy) the distance already needs. And the
     specular map wants exactly the geometry the displacement map has just
     computed, so there is no reason to walk the pixels a second time.

     One pass, one SDF term, one normal, both maps written together. */
  function buildMaps(w, h, radius, o, sol, pad) {
    pad = pad || 0;
    var cw = w + pad * 2, ch = h + pad * 2;
    var norm = sol.max > 0 ? 127 / sol.max : 0;
    var hw = w / 2, hh = h / 2, r = radius;
    var inv_bezel = 1 / o.bezel, last = sol.n - 1;
    /* toward the light: upper left, and a little in front of the surface */
    var lx = -0.56, ly = -0.71, lz = 0.43;
    var spec = o.spec == null ? 2.2 : o.spec;

    var dc = document.createElement('canvas'); dc.width = cw; dc.height = ch;
    var sc = document.createElement('canvas'); sc.width = cw; sc.height = ch;
    var dctx = dc.getContext('2d'), sctx = sc.getContext('2d');
    var dimg = dctx.createImageData(cw, ch), simg = sctx.createImageData(cw, ch);
    var dd = dimg.data, sd = simg.data;

    for (var y = 0; y < ch; y++) {
      var py = y - pad - hh + 0.5;
      var ay = py < 0 ? -py : py, sy = py < 0 ? -1 : 1;
      var qy = ay - hh + r;
      for (var x = 0; x < cw; x++) {
        var px = x - pad - hw + 0.5;
        var ax = px < 0 ? -px : px, sx = px < 0 ? -1 : 1;
        var qx = ax - hw + r;
        var i = (y * cw + x) * 4;

        var mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0;
        var outer = qx > qy ? qx : qy;
        var dist = Math.sqrt(mx * mx + my * my) + (outer < 0 ? outer : 0) - r;

        dd[i + 2] = 128; dd[i + 3] = 255;
        var t = -dist * inv_bezel;
        if (dist > 0 || t > 1) { dd[i] = dd[i + 1] = 128; sd[i + 3] = 0; continue; }

        /* outward unit normal, exact */
        var nx, ny;
        if (qx > 0 && qy > 0) {
          var l = Math.sqrt(qx * qx + qy * qy) || 1;
          nx = sx * qx / l; ny = sy * qy / l;
        } else if (qx > qy) { nx = sx; ny = 0; }
        else { nx = 0; ny = sy; }

        var k = (t * last + 0.5) | 0;

        /* --- displacement: the gradient points OUT, the refracted ray goes in */
        var amt = sol.off[k] * norm;
        dd[i]     = clamp8(128 - nx * amt);
        dd[i + 1] = clamp8(128 - ny * amt);

        /* --- specular: the same normal, tilted by the bezel's own slope */
        var slope = sol.slope[k];
        var iv = 1 / Math.sqrt(1 + slope * slope);
        var n3x = nx * slope * iv, n3y = ny * slope * iv, n3z = iv;
        var facing = n3x * lx + n3y * ly + n3z * lz;
        var lit = facing > 0 ? facing : 0;
        /* real glass is lit twice, once by the source and once by whatever the
           source is bouncing off, so the far edge keeps a weaker rim */
        var bounce = (facing < 0 ? -facing : 0) * 0.42;
        var a = (1 - n3z) * (lit + bounce) * spec;
        if (a > 1) a = 1;
        a = a * a * (3 - 2 * a);                   /* smoothstep, softer falloff */
        sd[i] = sd[i + 1] = sd[i + 2] = 255;
        sd[i + 3] = clamp8(a * 255);
      }
    }
    dctx.putImageData(dimg, 0, 0);
    sctx.putImageData(simg, 0, 0);
    return { disp: dc.toDataURL('image/png'), spec: sc.toDataURL('image/png') };
  }

  /* ---- WHICH LENS THIS ENGINE CAN ACTUALLY WEAR ------------------------
     `backdrop-filter: url(#f)` is in the spec, and every engine's PARSER
     accepts it. Only Chromium renders it. WebKit has had the bug open since
     2022 (webkit.org/b/245510): it parses the declaration, keeps the blur, and
     silently discards the filter reference.

     Which means CSS.supports() cannot be asked, and asking it is what was
     wrong here. Measured on Safari 26.5:

         CSS.supports('backdrop-filter', 'url(#x) blur(1px)')   ->  true
         ...and no bend appears.

     That false positive was the whole of "the refraction does not work in
     Safari", and it was worse than it sounds. `canLens` came back true, every
     surface took .lg-lensed, and the .lg-lensed rules in the stylesheet switch
     the hand-painted sheen OFF and dim the conic rim -- correctly, on the
     grounds that the filter's own specular map has replaced them. In Safari
     the filter never arrived. So Safari was not falling back to the painted
     material; it was losing the painted material AND getting no refraction,
     which is exactly why the bar read flatter there than anywhere else.

     So the engine is identified instead, and it is identified POSITIVELY on
     both sides rather than by sniffing a version out of the UA string:

       Blink   backdrop-filter carries the filter. Nothing else does today.
       WebKit  window.GestureEvent, and -apple-pay-button-style, exist in no
               other engine.
       Gecko   -moz-osx-font-smoothing likewise.

     A wrong answer either way is not fatal, because the second path below is
     not a downgrade -- it is the same filter, delivered differently -- so if
     WebKit ships the fix tomorrow nothing here needs to know. */
  function supports(prop, val) {
    try { return !!(window.CSS && CSS.supports && CSS.supports(prop, val)); }
    catch (e) { return false; }
  }

  var isWebKit = !!window.GestureEvent || supports('-apple-pay-button-style', 'black');
  var isGecko  = supports('-moz-osx-font-smoothing', 'grayscale');

  var hasBackdrop = supports('backdrop-filter', 'blur(1px)') ||
                    supports('-webkit-backdrop-filter', 'blur(1px)');

  /* Chromium: the filter goes straight onto the live backdrop, which is both
     free of a second render pass and exact. Kept as the preferred path. */
  var backdropLens = hasBackdrop &&
                     supports('backdrop-filter', 'url(#x) blur(1px)') &&
                     !isWebKit && !isGecko;

  /* Everywhere else: the same filter, over a copy of the backdrop. The plain
     `filter` property has never had the bug -- feImage feeding
     feDisplacementMap renders correctly in WebKit through it (measured on the
     same Safari 26.5 that drops it from backdrop-filter), so the maps built
     above are usable as they stand; only what they are pointed AT changes. */
  var copyLens = !backdropLens &&
                 supports('filter', 'url(#x)') &&
                 'attachShadow' in Element.prototype &&
                 !!window.Promise;

  var canLens = backdropLens || copyLens;

  var defs = null;
  function ensureDefs() {
    if (defs) return defs;
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    defs.setAttribute('class', 'lg-defs');
    defs.setAttribute('aria-hidden', 'true');
    defs.setAttribute('focusable', 'false');
    document.body.appendChild(defs);
    return defs;
  }

  /* the panel's own controls can switch the material off underneath us */
  function stillLens() {
    return !reduceTransparency.matches &&
           !root.classList.contains('a11y-noimg') &&
           root.getAttribute('data-a11y-contrast') !== '2';
  }

  /* ---- ONE MATERIAL, IN REAL UNITS -------------------------------------
     These four numbers are the glass this whole site is cut from.

     They are in PIXELS, not in fractions of whatever element is wearing them,
     and that is the point. Glass has a thickness; a wide pane and a small chip
     cut from the same sheet have the same edge. Expressing the bezel as "42%
     of the height" made the nav look right and would have made a 677px hero
     panel into a fishbowl with a 280px rim, and a 40px chip into something
     with no flat middle at all. Same sheet everywhere means a surface can
     change size, or a breakpoint can reshape it, and it is still made of the
     same thing.

     The values are the ones solved against the reference bar (a ~17px fold at
     each long edge of a 94px bar) -- so the nav is unchanged by moving to real
     units, and everything else on the site now matches it. */
  var GLASS = { profile: 'squircle', bezel: 40, thickness: 66, gap: 12, ior: 1.5 };

  /* ---- A THICKER SHEET FOR THE COPY PATH WAS TRIED, AND IT DOES NOTHING --
     The reasoning was sound: WebKit's fold arrives softer because it is a copy
     under a surface that tints and frosts over it, so give the copy thicker
     glass -- more thickness, more gap, a higher ior -- and let the solver
     produce a bigger offset out of the physics rather than a magic multiplier.

     It was built and measured. feDisplacementMap's scale went from 88.2 to
     223.6, the filter region grew to match, and the rendered bar did not
     change by one pixel. Zoomed to the cap, the before and after are the same
     image.

     What the measurement then showed is why. Comparing the bar with the lens
     against the same bar with the reference removed -- two fresh loads, no
     runtime mutation -- the difference lands at 4.79 in the MIDDLE of the bar
     against 3.45 and 2.67 at the caps. A refraction lens acts at the rim; this
     acts hardest where the glass is flattest, which is the signature of the
     chain's tone primitives (the saturate, the brightness lift, the specular
     blend) rendering while the displacement does not.

     So on the copy path feDisplacementMap is not displacing -- most likely its
     feImage map never arrives, since in2 resolving to nothing yields a
     pass-through rather than an error. Raising the scale of a displacement
     that is not happening cannot help, which is exactly what was observed.

     The edge in Safari is carried by the mirrored bands in the copy instead --
     real content folded about the bar's edge, which needs no displacement map
     at all. Do not re-tune GLASS for the copy path without first re-checking
     that in2 actually arrives; the optional-sheet parameter this note used to
     describe was removed, because nothing passed one. */

  /* ---- THE SAME EDGE, FOR SURFACES THAT CANNOT CARRY A FILTER ----------
     Buttons and chips sit on the flat page, where a displacement lens returns
     the field it was given -- that is settled, and putting one on every button
     is precisely the mistake that made the site crawl. But the LIGHT on a
     bezel does not need a backdrop to exist. It only needs the shape.

     So the rim is generated here, from the same squircle profile, the same
     bevel slope and the same light vector the specular map uses, and handed to
     the stylesheet as one conic gradient. Every button is then lit as though
     it were cut from the sheet described by GLASS -- because the numbers it is
     lit by are literally that sheet -- while costing one gradient rather than
     a filter graph and a backdrop root.

     The slope is taken at the bezel's peak displacement: the middle of the
     curve rather than its vertical lip or its flat shoulder, which is the
     angle a real bevel reads as. */
  function bezelRimGradient(steps) {
    var geo = { profile: GLASS.profile, ior: GLASS.ior,
                bezel: GLASS.bezel, thickness: GLASS.thickness, gap: GLASS.gap };
    var sol = solveBezel(geo);
    var peak = 0, best = -1;
    for (var i = 0; i < sol.n; i++) if (sol.off[i] > best) { best = sol.off[i]; peak = i; }
    var slope = sol.slope[peak];
    var iv = 1 / Math.sqrt(1 + slope * slope);
    var lx = -0.56, ly = -0.71, lz = 0.43, spec = 2.2;
    /* Two passes, because the interesting part is the SHAPE of the falloff and
       clamping destroys it. At this bevel angle the raw response runs well past
       1 for most of the lit side, so clamping flattened the whole upper arc to
       solid white and the highlight stopped having a direction at all -- the
       brightest point came out at twelve o'clock instead of up-and-left where
       the light actually is. Normalising to the peak keeps the gradient and
       makes PEAK the only thing that needs choosing. */
    var raw = [], max = 0, k, a;
    for (k = 0; k <= steps; k++) {
      /* CSS conic angles run clockwise from 12 o'clock; screen y points down,
         so the outward normal at that angle is (sin, -cos). */
      var phi = (k / steps) * Math.PI * 2;
      var nx = Math.sin(phi), ny = -Math.cos(phi);
      var facing = slope * iv * (nx * lx + ny * ly) + iv * lz;
      var lit = facing > 0 ? facing : 0;
      var bounce = (facing < 0 ? -facing : 0) * 0.42;
      a = (1 - iv) * (lit + bounce) * spec;
      raw.push(a);
      if (a > max) max = a;
    }
    var PEAK = 0.82;
    var stops = [];
    for (k = 0; k <= steps; k++) {
      a = max > 0 ? raw[k] / max : 0;
      a = a * a * (3 - 2 * a) * PEAK;             /* smoothstep, then scale */
      stops.push('rgba(255,255,255,' + a.toFixed(3) + ') ' + Math.round(k / steps * 360) + 'deg');
    }
    return 'conic-gradient(' + stops.join(',') + ')';
  }
  try {
    root.style.setProperty('--lg-rim-conic', bezelRimGradient(24));
  } catch (e) { /* the stylesheet has a flat fallback */ }

  /* ---- SHARED FILTERS ---------------------------------------------------
     The maps depend on the element's SIZE and CORNER RADIUS and on nothing
     else about it -- not its colour, not its content, not where it sits. So
     two surfaces that measure the same can point at the same filter, and the
     four trust chips on the hero, which are identical, cost one filter between
     them rather than four.

     Keyed on rounded dimensions: a 1px reflow difference between two chips is
     not a different piece of glass, and letting it mint a second filter would
     defeat the whole cache on exactly the surfaces it is meant to help. */
  var filters = {};      /* key -> { id, scale } */
  var filterSeq = 0;

  /* A map does not need a pixel for every pixel of the surface. What it has to
     resolve is the BEZEL, and past a certain size the bezel is comfortably
     wide in map space even at half scale -- feImage stretches the result back
     with preserveAspectRatio="none". Uniformly, though: scaling x and y by
     different factors would give the shape a different bezel width on its
     long side than on its short one, which is a real distortion rather than a
     saving. Left uncapped, the hero panel alone is a ~1000x780 map built twice
     over with four SDF evaluations a pixel -- about six million of them, on
     the main thread, during scroll. */
  /* Budgeted by AREA, which is what the build actually costs -- the loop in
     buildMaps runs once per map pixel -- rather than by the long edge, which
     is not a cost at all. Capping the long edge punished exactly the wrong
     shapes: the nav is 1216x94, which is 114k pixels, comfortably inside any
     sane budget, and the old rule still built it at 0.6 scale and stretched
     it back 1.67x.

     That stretch is where Chromium and WebKit stopped agreeing. feImage
     resamples the map to the filter region, and the two engines do not
     resample it the same way -- measured on this bar's own filter, rendered
     from the same maps in both engines: identical mean, but Chromium came out
     with 35% more contrast and WebKit with visible extra oscillation across
     the fold, i.e. one engine interpolating the stretched map smoothly and
     the other stepping through it. Neither is wrong; the stretch is what
     invited the difference.

     Every surface this site actually lenses now falls inside the budget and is
     built 1:1, so there is no resample left to disagree about, and the banding
     the floor below exists to hide does not arise in the first place. The
     budget still catches anything genuinely large before it becomes a
     six-million-pixel build on the main thread. */
  var MAP_MAX_PIXELS = 240000;
  /* the bezel is never allowed to be resolved by fewer than this many pixels */
  var MIN_BEZEL_PX = 24;

  function lensFor(w, h, radius) {
    var g = GLASS;
    var key = Math.round(w) + 'x' + Math.round(h) + 'r' + Math.round(radius);
    if (filters[key]) return filters[key];

    /* Scaled down only if the map would actually be expensive, and uniformly
       when it is -- scaling x and y by different factors would give the shape
       a different bezel width on its long side than on its short one, which is
       a distortion rather than a saving. The floor is kept underneath: if a
       surface ever is big enough to be scaled, its bezel still has to survive
       as a gradient rather than a staircase. */
    var ms = 1;
    if (w * h > MAP_MAX_PIXELS) ms = Math.sqrt(MAP_MAX_PIXELS / (w * h));
    var floor = Math.min(1, MIN_BEZEL_PX / g.bezel);
    if (ms < floor) ms = floor;
    var mw = Math.max(2, Math.round(w * ms)), mh = Math.max(2, Math.round(h * ms));
    var geo = {
      profile: g.profile, ior: g.ior,
      bezel: g.bezel * ms, thickness: g.thickness * ms, gap: g.gap * ms
    };
    var lim = Math.min(mw, mh) / 2 - 1;
    if (geo.bezel > lim) geo.bezel = lim;
    if (geo.bezel < 1) return null;                 /* too small to be glass */

    var sol = solveBezel(geo);
    var pad = Math.ceil(sol.max) + 6;
    var mrad = Math.min(radius * ms, Math.min(mw, mh) / 2);
    var maps = buildMaps(mw, mh, mrad, geo, sol, pad);
    var du = maps.disp, su = maps.spec;

    /* The map was built small; it is stretched back up by 1/ms, and every
       displacement in it stretches with it -- so the scale the filter is given
       is the simulated peak divided by ms, in the surface's own pixels. */
    var scale = (sol.max * 2) / ms;
    var id = 'lgLens' + (++filterSeq);
    var NS = 'http://www.w3.org/2000/svg';

    var f = document.createElementNS(NS, 'filter');
    f.setAttribute('id', id);
    f.setAttribute('color-interpolation-filters', 'sRGB');
    f.setAttribute('filterUnits', 'userSpaceOnUse');
    /* the region is the surface plus the padding, expressed at full size */
    var fp = pad / ms;
    f.setAttribute('x', -fp); f.setAttribute('y', -fp);
    f.setAttribute('width', w + fp * 2); f.setAttribute('height', h + fp * 2);

    function prim(tag, attrs) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
      f.appendChild(e);
      return e;
    }
    function img(href, result) {
      var e = prim('feImage', { result: result, preserveAspectRatio: 'none',
        x: -fp, y: -fp, width: w + fp * 2, height: h + fp * 2 });
      e.setAttribute('href', href);
      e.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href);
      return e;
    }

    prim('feGaussianBlur', { 'in': 'SourceGraphic', stdDeviation: 0.7, result: 'pre' });
    img(du, 'dmap');
    prim('feDisplacementMap', { 'in': 'pre', in2: 'dmap', scale: scale,
      xChannelSelector: 'R', yChannelSelector: 'G', result: 'refr' });
    prim('feColorMatrix', { 'in': 'refr', type: 'saturate', values: 1.15, result: 'satRaw' });
    var lift = prim('feComponentTransfer', { 'in': 'satRaw', result: 'sat' });
    ['feFuncR', 'feFuncG', 'feFuncB'].forEach(function (fn) {
      var t = document.createElementNS(NS, fn);
      t.setAttribute('type', 'linear'); t.setAttribute('slope', 1.4);
      t.setAttribute('intercept', 0.08);
      lift.appendChild(t);
    });
    img(su, 'smapRaw');
    prim('feGaussianBlur', { 'in': 'smapRaw', stdDeviation: 1, result: 'smap' });
    prim('feComposite', { 'in': 'sat', in2: 'smap', operator: 'in', result: 'rim' });
    prim('feBlend', { mode: 'screen', 'in': 'refr', in2: 'rim' });

    ensureDefs().appendChild(f);
    filters[key] = { id: id, scale: scale };
    return filters[key];
  }

  /* ======================================================================
     THE SAME LENS, WHERE THE BACKDROP CANNOT CARRY ONE
     ----------------------------------------------------------------------
     WebKit will not run an SVG filter over a live backdrop. It will run one
     over ordinary content all day. So the fix is not a different effect, it is
     a different SUBJECT: stop filtering the backdrop, and filter a copy of it.

     A copy of the page is laid out behind each piece of glass, translated so
     it sits exactly where the real page sits, clipped to the glass's own
     rounded rect, and the filter built above -- the same maps, the same
     Snell's-law bend, the same specular rim -- is put on it through the plain
     `filter` property. The glass itself keeps its tint, its border and its
     shadow and stops carrying a backdrop-filter, because everything its
     backdrop-filter would have blurred is now sitting in the copy directly
     underneath. What comes out is the same composite in the same order.

     Three things make this safe rather than a duplicate-DOM disaster:

     IT LIVES IN A CLOSED SHADOW ROOT. The copy carries the page's own ids,
     classes and structure -- it has to, or the stylesheet would not style it.
     In the light DOM that would be poison: this page runs
     document.querySelectorAll('.section--dark, .hero, .page-hero') on every
     scroll to decide whether the nav is over a dark section, and a second set
     of those elements parked at the nav's own coordinates would flip the
     theme at random. Behind a closed shadow root the page's own JS cannot
     reach the copy at all, getElementById keeps returning the real element,
     and a #fragment link still lands on the real section.

     THE STYLESHEET IS ADOPTED, NOT REFETCHED. One constructed CSSStyleSheet,
     parsed once, shared by every copy on the page. Custom properties still
     inherit in through the host, so the copy picks up the same theme tokens
     the real page is using.

     ONLY THE CONTENT IS COPIED. Everything position:fixed is chrome -- the
     nav, the mobile bar, the back button, the accessibility panel -- and none
     of it is behind the glass, so none of it is cloned. What is left is
     <main> and the footer: the things that actually scroll under the bar.

     It is not free. This is a second render pass over the page's content,
     clipped to a bar-sized window, re-filtered whenever it moves. Paint
     containment holds the cost to that window rather than the document, and
     scrolling writes two custom properties per surface per frame and reads no
     layout at all -- every lensed surface here is position:fixed, so its rect
     only changes when the page reflows.
     ====================================================================== */

  /* Inside the shadow root only. Deliberately odd class names: adopted sheets
     are applied alongside these, and a page rule for a plain `.doc` would
     otherwise be free to move the copy. */
  var COPY_SHADOW_CSS =
    /* No filter here. It is worn by the HOST, in the light DOM -- see the note
       on .lg-refract in the stylesheet. This layer is now just the window. */
    '.lg-lens-layer{position:absolute;inset:0;}' +

    /* ---- THE FOLDED EDGE ----
       WebKit will not refract a backdrop, and feDisplacementMap does not
       displace on this copy (measured). But the copy IS the page, as real
       elements -- so the fold can be built out of it directly instead of
       filtered into existence: a narrow window onto the same content, mirrored
       about the bar's own edge, so what sits just OUTSIDE the bar is folded
       back INSIDE it. That is the part of refraction the eye actually reads,
       and it is what a gradient could never fake.

       Both bands use transform-origin 0 0 and compose the mirror explicitly.
       Left:   x_page -> -s * (x_page - barLeft)
       Right:  x_page -> band - s * (x_page - barRight)
       so the right band pre-translates by the band width rather than leaning
       on a percentage origin, which would resolve against the COPY's width
       (the whole page) rather than against the band. */
    /* The dispersion goes HERE, on the band, not on the copy inside it. It was
       on the copy first, and the copy's box is the whole cloned page -- so the
       filter was being asked to rasterise a ~998x8173 surface three times over
       (once per channel) to tint a 26px strip. WebKit did not fail loudly; it
       degraded the result into a flat pink wash across the entire band, on
       both caps. Moving it onto the band gives the filter a 26x94 source and
       the fringe lands where a fringe belongs. */
    '.lg-edge{position:absolute;top:0;height:100%;width:var(--lg-band,26px);' +
      'overflow:hidden;pointer-events:none;z-index:2;opacity:var(--lg-fold,.5);' +
      'filter:url(#lgDisperse);}' +
    '.lg-edge.l{left:0;-webkit-mask-image:linear-gradient(to right,#000 0,#000 58%,transparent 100%);' +
      'mask-image:linear-gradient(to right,#000 0,#000 58%,transparent 100%);}' +
    '.lg-edge.r{right:0;-webkit-mask-image:linear-gradient(to left,#000 0,#000 58%,transparent 100%);' +
      'mask-image:linear-gradient(to left,#000 0,#000 58%,transparent 100%);}' +
    '.lg-edge .m{position:absolute;top:0;left:0;transform-origin:0 0;' +
      'background:var(--bg-page,#fcf9f3);}' +
    '.lg-edge.l .m{transform:scaleX(calc(-1 * var(--lg-sq,.78)))' +
      ' translate(var(--lg-lx,0px),var(--lg-ey,0px));}' +
    '.lg-edge.r .m{transform:translateX(var(--lg-band,26px))' +
      ' scaleX(calc(-1 * var(--lg-sq,.78))) translate(var(--lg-rx,0px),var(--lg-ey,0px));}' +
    '.lg-doc-layer{position:absolute;top:0;left:0;transform-origin:0 0;' +
      /* 2D on purpose: translate3d would promote a layer the size of the whole
         document, and the only thing that needs rasterising is the window the
         host clips to. */
      'transform:translate(var(--lg-dx,0px),var(--lg-dy,0px));' +
      'background:var(--bg-page,#fcf9f3);}' +
    /* `body > footer` cannot match inside a shadow tree, and it is the rule
       that gives the footer its ground. Restored here so the copy does not
       show a transparent band where the footer starts. */
    '.lg-doc-layer > footer{background:var(--bg-page,#fcf9f3);}' +

    /* ---- THE COPY HAS TO SCROLL ON THE COMPOSITOR ----
       This is the one place where "the same filter, on a copy" stops being
       automatically identical to the real thing, and it is the difference you
       would actually see next to Chromium.

       A backdrop-filter has no synchronisation problem: the backdrop IS the
       page, so it cannot be out of step with it. A copy can. Safari scrolls
       asynchronously -- the page moves on the compositor while the main thread
       catches up -- so a copy translated from a scroll handler arrives late,
       and on a flick it arrives visibly late: the bar shows a slice of page
       that is a few frames behind the page it is sitting on, and the glass
       looks like it is sliding rather than sitting still.

       Driving the translate from a scroll-driven animation instead hands the
       whole thing to the compositor, where the scroll already is. The keyframes
       are the same expression the fallback computes by hand -- at scroll
       progress p the copy sits at -(rect.top) - p * range -- so the two paths
       agree exactly; one is just interpolated somewhere that cannot lag.

       The rAF path below stays for engines without scroll timelines. */
    '@supports (animation-timeline: scroll()){' +
      '@keyframes lg-track{' +
        'from{transform:translate(var(--lg-dx,0px),var(--lg-dy0,0px));}' +
        'to{transform:translate(var(--lg-dx,0px),calc(var(--lg-dy0,0px) - var(--lg-range,0px)));}' +
      '}' +
      ':host(.lg-pinned) .lg-doc-layer{animation-name:lg-track;animation-duration:auto;' +
        'animation-timing-function:linear;animation-fill-mode:both;' +
        'animation-timeline:scroll(root block);}' +
    '}';

  /* whether that @supports block above is live -- the rAF tracker stands down
     when it is, rather than fighting the compositor for the same property */
  var scrollTimeline = supports('animation-timeline', 'scroll()');

  /* below this the folded edge stands down: see mount() */
  var FOLD_MIN_WIDTH = 900;

  var COPY_SKIP = { SCRIPT: 1, STYLE: 1, LINK: 1, TEMPLATE: 1, NOSCRIPT: 1, META: 1, DIALOG: 1 };

  /* What is actually behind the glass: body's children, minus the chrome.
     Tested by computed position rather than by a list of selectors, so a new
     fixed widget is excluded by being fixed rather than by being remembered. */
  function contentRoots() {
    var out = [], kids = document.body.children, i, el, pos;
    for (i = 0; i < kids.length; i++) {
      el = kids[i];
      if (el.__lgCopyHost) continue;
      if (COPY_SKIP[el.tagName]) continue;
      if (el.classList && el.classList.contains('lg-defs')) continue;
      pos = getComputedStyle(el).position;
      if (pos === 'fixed' || pos === 'sticky') continue;
      out.push(el);
    }
    return out;
  }

  /* ---- ONE SHEET, AND NOT ONE REQUEST ----------------------------------
     The copy carries the page's own markup, so it needs the page's own CSS or
     it renders as unstyled HTML. The obvious way to get it is to fetch the
     stylesheet again. That was a mistake, and a visible one.

     The browser has ALREADY parsed that stylesheet -- it is sitting in
     document.styleSheets, rules and all -- so asking the server for it a
     second time is a request for something we are holding. Worse, it is a
     request some servers will not answer: JetBrains' built-in server (the one
     behind localhost:63342) rejects anything arriving without its _ijt token,
     so the fetch came back unauthorized, the copy had no styles, and because
     .lg-copy had already taken the backdrop-filter off the bar, the nav lost
     its frost with nothing put in its place. That is exactly the "Safari looks
     different from Chrome" in the screenshots: not a worse lens, no lens and
     no frost either.

     So the rules are read straight out of the parsed sheet. No request, no
     token, no dev-server policy to satisfy, and it is instant.

     One correction is needed on the way out. cssText serialises url() exactly
     as it was written -- "../img/hero-bg.webp" -- and a constructed sheet
     resolves relative URLs against the DOCUMENT, not against the file the rule
     came from, so every background image would 404 one directory up. Each
     sheet's rules are therefore rebased onto that sheet's own href. */
  var sheetReady = null;

  function absolutise(css, base) {
    if (!base) return css;
    return css.replace(
      /url\((\s*['"]?)((?!data:|https?:|blob:|\/\/|#)[^'")]+?)(['"]?\s*)\)/g,
      function (m, pre, u, post) {
        try { return 'url(' + pre + new URL(u, base).href + post + ')'; }
        catch (e) { return m; }
      });
  }

  function readParsedCSS() {
    var out = '', sheets = document.styleSheets, i, j, rules;
    for (i = 0; i < sheets.length; i++) {
      rules = null;
      /* cross-origin sheets (the font CDN) throw here; they carry @font-face
         only, and font faces resolve at document level anyway */
      try { rules = sheets[i].cssRules; } catch (e) { rules = null; }
      if (!rules) continue;
      var text = '';
      for (j = 0; j < rules.length; j++) text += rules[j].cssText + '\n';
      out += absolutise(text, sheets[i].href || document.baseURI);
    }
    return out;
  }

  function pageStyleLinks() {
    return [].slice.call(document.querySelectorAll('link[rel="stylesheet"]'))
      .filter(function (l) { return l.href && l.href.lastIndexOf(location.origin, 0) === 0; });
  }

  function copySheet() {
    if (sheetReady) return sheetReady;

    var constructable = typeof CSSStyleSheet === 'function' &&
                        CSSStyleSheet.prototype.replaceSync &&
                        ('adoptedStyleSheets' in document);
    if (!constructable) { sheetReady = Promise.resolve(null); return sheetReady; }

    function build(text) {
      if (!text) return null;
      try { var sh = new CSSStyleSheet(); sh.replaceSync(text); return sh; }
      catch (e) { return null; }
    }

    var direct = build(readParsedCSS());
    if (direct) { sheetReady = Promise.resolve(direct); return sheetReady; }

    /* Only if the rules could not be read at all -- a sheet still loading, or
       one the engine will not expose. Kept as a second chance rather than a
       first choice, for every reason in the note above. */
    var links = pageStyleLinks();
    if (!links.length || !window.fetch) { sheetReady = Promise.resolve(null); return sheetReady; }
    sheetReady = Promise.all(links.map(function (l) {
      return fetch(l.href, { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (t) { return absolutise(t, l.href); })
        .catch(function () { return ''; });
    })).then(function (parts) { return build(parts.join('\n')); })
      .catch(function () { return null; });
    return sheetReady;
  }

  function CopyLens(surface) {
    this.s = surface;
    this.host = null; this.sh = null; this.doc = null; this.edocs = [];
    this.rect = null; this.rad = 0; this.filled = false; this.ready = false;
  }

  CopyLens.prototype.mount = function () {
    if (this.host) return;
    var host = document.createElement('div');
    host.className = 'lg-refract';
    /* aria-hidden is not enough on its own. The copy is a real subtree with
       real links in it, and shadow content is focusable and selectable like
       any other: without `inert` the reader would tab through every link on
       the page a second time, invisibly, from inside the nav bar. `inert` also
       takes it out of find-in-page, which aria-hidden does not. */
    host.setAttribute('aria-hidden', 'true');
    if ('inert' in HTMLElement.prototype) host.inert = true;
    else host.setAttribute('inert', '');
    host.__lgCopyHost = true;
    /* Appended at the END of body, never inside the surface. The copy carries
       duplicate ids; getElementById and fragment navigation both resolve to
       the FIRST match in tree order, so the real element has to come first. */
    document.body.appendChild(host);

    var sh = host.attachShadow({ mode: 'closed' });
    /* Chromatic dispersion for the folded edge. Real glass splits wavelengths
       at a steep edge -- blue has the higher index and bends further -- so the
       channels are separated, displaced by different amounts and screened back
       together. The split happens INSIDE the filter, so the band still costs
       one copy rather than three. Safe in a shadow tree: feColorMatrix,
       feOffset and feBlend all render here; feImage is the one that does not,
       and this chain has none. */
    sh.appendChild((function () {
      var NS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      svg.innerHTML =
        '<filter id="lgDisperse" x="-20%" y="-20%" width="140%" height="140%"' +
        ' color-interpolation-filters="sRGB">' +
        '<feColorMatrix result="R" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>' +
        '<feOffset in="R" dx="-1.5" result="Ro"/>' +
        '<feColorMatrix result="G" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"/>' +
        '<feColorMatrix result="B" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"/>' +
        '<feOffset in="B" dx="1.8" result="Bo"/>' +
        '<feBlend in="Ro" in2="G" mode="screen" result="RG"/>' +
        '<feBlend in="RG" in2="Bo" mode="screen"/></filter>';
      return svg;
    })());
    var style = document.createElement('style');
    style.textContent = COPY_SHADOW_CSS;
    sh.appendChild(style);
    var lens = document.createElement('div');
    lens.className = 'lg-lens-layer';
    var doc = document.createElement('div');
    doc.className = 'lg-doc-layer';
    lens.appendChild(doc);
    sh.appendChild(lens);

    /* The folded edges. Gated by width: each band is a third copy of the page,
       and the phone is both where that cost lands hardest and where the caps
       are smallest -- so narrow screens keep the cheap painted fold and only
       wider ones pay for the real one. */
    this.edocs = [];
    if (document.documentElement.clientWidth >= FOLD_MIN_WIDTH) {
      ['l', 'r'].forEach(function (side) {
        var band = document.createElement('div');
        band.className = 'lg-edge ' + side;
        var m = document.createElement('div');
        m.className = 'm';
        band.appendChild(m);
        sh.appendChild(band);
        this.edocs.push(m);
      }, this);
      /* Tell the stylesheet the real fold is here, so the painted one can
         stand down. Two edge treatments on one cap is not twice the glass --
         it is a gradient sitting on top of a mirror, washing out the thing it
         was only ever standing in for. */
      this.s.el.classList.add('lg-fold');
    }

    this.host = host; this.sh = sh; this.doc = doc;

    /* ---- THE FROST DOES NOT COME OFF UNTIL THE COPY IS REALLY THERE ----
       .lg-copy turns the surface's backdrop-filter off, on the promise that
       the copy underneath is about to do that job instead. Adding it before
       that is true is how the bar ended up with no frost AND no lens. So the
       class is applied HERE, in the callback, and only once the page's own
       rules are actually adopted into this shadow root -- and if they cannot
       be, the whole path stands down and the surface keeps the material it
       already had. Unstyled content behind glass is worse than no glass. */
    host.style.visibility = 'hidden';
    var self = this;
    copySheet().then(function (sheet) {
      if (!self.sh) return;
      var adopted = false;
      if (sheet) {
        try { self.sh.adoptedStyleSheets = [sheet]; adopted = true; } catch (e) { adopted = false; }
      }
      if (!adopted) { self.giveUp(); return; }
      self.ready = true;
      self.host.style.visibility = '';
      self.s.el.classList.add('lg-copy');
    });
  };

  /* No stylesheet, no copy -- and no copy means this engine has no working
     lens at all, which is a bigger statement than it looks. .lg-copy coming
     off restores the backdrop-filter, but .lg-lensed ALSO switches the painted
     sheen off and dims the conic rim, on the grounds that the filter's own
     specular map has replaced them. With no filter anywhere, that trade is the
     original bug in a new place, so both classes go and canLens is retracted:
     the surface goes back to the frost and the hand-painted highlights, which
     is a material that has always looked right here.

     The whole mechanism stands down together rather than leaving one surface
     half-converted -- the sheet is shared, so if one copy cannot have it none
     of them can. */
  CopyLens.prototype.giveUp = function () {
    copyLens = false;
    canLens = false;
    for (var i = 0; i < surfaces.length; i++) {
      var su = surfaces[i];
      su.el.classList.remove('lg-copy');
      su.el.classList.remove('lg-lensed');
      if (su.cp) { su.cp.destroy(); su.cp = null; }
    }
  };

  /* The clone. Rebuilt rather than diffed: it is a few hundred nodes on this
     site, it happens on a debounce, and a MutationObserver mirror is a great
     deal of machinery to keep a decoration honest. */
  CopyLens.prototype.fill = function () {
    if (!this.doc) return;
    var roots = contentRoots(), i, j;
    var targets = [this.doc].concat(this.edocs || []);
    var vw = document.documentElement.clientWidth;
    for (j = 0; j < targets.length; j++) {
      var d = targets[j];
      while (d.firstChild) d.removeChild(d.firstChild);
      for (i = 0; i < roots.length; i++) d.appendChild(roots[i].cloneNode(true));
      d.style.width = vw + 'px';
    }
    this.filled = true;
  };

  /* ---- WHY THE FILTER IS NOT IN HERE ------------------------------------
     The first fix for Safari was to clone the <filter> into this shadow root,
     on the reasoning that a fragment-only url() reference resolves in the tree
     scope of the element wearing it -- which is true, and measurable: with the
     filter in document.body and the lens layer in here, the reference resolved
     against a tree that has no such id and found nothing.

     Cloning it in did make the reference resolve, and the lens was still dead.
     Measured in both engines: an feImage-driven filter that is DEFINED AND
     APPLIED inside a shadow tree renders nothing at all. feImage is the one
     primitive that does not survive the boundary, and the whole lens is built
     on it -- feImage carries the displacement and specular maps.

     So the subject moves instead of the filter. The filter stays in the
     document where feImage works, and it is applied to the HOST -- which is a
     light-DOM element, so the id is in scope -- rather than to a layer inside.
     A filter on the host filters everything the host draws, shadow content
     included, so the copy is filtered exactly as before.

     It is better in two other ways, both of which were real problems. The host
     is `overflow:hidden` and clipped to the glass's rounded rect, so the
     filter's source graphic is now a bar-sized slice instead of the entire
     cloned page: this lens layer had `overflow:visible` wrapped around a
     10,679px-tall copy of the document, which made the source 32 megapixels at
     2x for an 83px bar. And there is nothing left to keep in sync, so a
     surface that reflows onto a new filter cannot go stale. */

  /* Everything that changes only when the page reflows. */
  CopyLens.prototype.place = function (rad) {
    if (!this.host) return;
    var el = this.s.el, r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    var host = this.host, z = parseInt(cs.zIndex, 10);
    if (rad != null) this.rad = rad;
    host.style.left = r.left + 'px';
    host.style.top = r.top + 'px';
    host.style.width = r.width + 'px';
    host.style.height = r.height + 'px';
    host.style.borderRadius = this.rad + 'px';
    /* directly beneath its own surface, and above whatever the surface floats
       over -- which is what a backdrop is */
    if (isNaN(z)) {
      /* a surface carrying no z-index of its own cannot be undercut by
         arithmetic, so the copy moves to sit immediately before it instead and
         document order decides */
      host.style.removeProperty('z-index');
      if (host.nextSibling !== el && el.parentNode) el.parentNode.insertBefore(host, el);
    } else {
      host.style.zIndex = z - 1;
    }
    /* the shadow CSS only tracks scrolling for a surface that stays put while
       the page moves under it -- see the keyframes */
    host.classList.add('lg-pinned');
    /* The reference is rebuilt from the id rather than copied across from the
       surface's computed value, because that value is not the string that was
       put in: WebKit serialises url(#lgLens1) back out as url(\#lgLens1). The
       escape is legal and resolves to the same fragment, but round-tripping a
       serialisation is not something to rely on for the one declaration the
       whole effect hangs off.

       The computed value is still READ, for the one thing it is authoritative
       about: the accessibility panel's opacity step replaces the reference
       outright through a stylesheet rule, and the copy has to honour that the
       same way the backdrop path does. */
    var declared = cs.getPropertyValue('--lg-url').trim();
    /* A dangling reference does not degrade to "frost without the bend" -- it
       degrades to no filter at all, blur included. So the reference is written
       only once the filter is really in this tree, and if it could not be
       cloned the copy falls back to opacity(1): a no-op filter function that
       leaves the blur and the saturate standing. */
    var wantsLens = declared.indexOf('url(') === 0;
    var useLens = wantsLens && !!this.s.lensId &&
                  !!(defs && defs.querySelector('#' + this.s.lensId));
    host.style.setProperty('--lg-url',
      useLens ? 'url(#' + this.s.lensId + ')'
              : (wantsLens ? 'opacity(1)' : (declared || 'opacity(1)')));
    host.style.setProperty('--lg-copy-frost', cs.getPropertyValue('--lg-copy-frost').trim() || '6px');
    host.style.setProperty('--lg-copy-sat', cs.getPropertyValue('--lg-copy-sat').trim() || '180%');
    this.rect = { left: r.left, top: r.top, right: r.right };
    /* the two constants the scroll-driven keyframes interpolate between:
       where the copy sits at scroll 0, and how far the document can scroll */
    host.style.setProperty('--lg-dy0', -r.top + 'px');
    host.style.setProperty('--lg-range',
      Math.max(0, document.documentElement.scrollHeight -
                  document.documentElement.clientHeight) + 'px');
    this.track();
  };

  /* Everything that changes on scroll: two custom properties, no layout read.
     Document point (0,0) has to land at viewport (-scrollX, -scrollY), and the
     layer's own origin is already at the surface's top-left corner. */
  CopyLens.prototype.track = function () {
    if (!this.host || !this.rect) return;
    /* horizontal is written either way: the keyframes read --lg-dx too, and a
       page that scrolls sideways is rare enough not to earn a second timeline */
    this.host.style.setProperty('--lg-dx', -(this.rect.left + window.pageXOffset) + 'px');
    /* the folds are not on the scroll timeline -- they are two narrow strips
       rather than a document-tall layer, so a property write per frame is
       cheaper than a second and third compositor animation */
    if (this.edocs && this.edocs.length) {
      var sx = window.pageXOffset, sy = window.pageYOffset;
      this.host.style.setProperty('--lg-lx', -(this.rect.left + sx) + 'px');
      this.host.style.setProperty('--lg-rx', -(this.rect.right + sx) + 'px');
      this.host.style.setProperty('--lg-ey', -(this.rect.top + sy) + 'px');
    }
    if (scrollTimeline) return;
    this.host.style.setProperty('--lg-dy', -(this.rect.top + window.pageYOffset) + 'px');
  };

  CopyLens.prototype.show = function (on) {
    if (this.host) this.host.style.display = on ? '' : 'none';
  };

  CopyLens.prototype.destroy = function () {
    if (this.host && this.host.parentNode) this.host.parentNode.removeChild(this.host);
    if (this.s && this.s.el) this.s.el.classList.remove('lg-fold');
    this.host = this.sh = this.doc = null; this.edocs = [];
    this.rect = null; this.filled = false; this.ready = false;
  };

  /* ---- A LENSED SURFACE -------------------------------------------------
     Holds no maps of its own. It measures itself, asks the cache for a filter
     that fits, and writes the reference into a custom property the stylesheet
     reads -- so which filter a surface is using is a fact about the element,
     not something baked into a selector. */
  function Surface(el, opts) {
    this.el = el;
    this.o = opts || {};
    this.w = 0; this.h = 0;
    this.pending = false;
    this.visible = false;
  }

  Surface.prototype.clear = function () {
    this.el.classList.remove('lg-lensed');
    this.el.classList.remove('lg-copy');
    this.el.style.removeProperty('--lg-url');
    if (this.cp) { this.cp.destroy(); this.cp = null; }
    this.w = this.h = 0;
  };

  Surface.prototype.refresh = function (force) {
    if (!canLens || !stillLens()) return;
    /* Off-screen surfaces are not measured and not built. Without this every
       piece of glass on the page races to build its maps during load, on the
       main thread, before anything has been painted. */
    if (!this.visible) return;
    if (this.pending) return;
    var r = this.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var w = Math.round(r.width), h = Math.round(r.height);
    if (!force && w === this.w && h === this.h) return;
    this.pending = true;
    var self = this;
    requestAnimationFrame(function () {
      self.pending = false;
      var r2 = self.el.getBoundingClientRect();
      var w2 = Math.round(r2.width), h2 = Math.round(r2.height);
      if (!w2 || !h2) return;
      if (!force && w2 === self.w && h2 === self.h) return;
      var cs = getComputedStyle(self.el);
      var rad = self.o.radius === 'pill'
        ? h2 / 2
        : Math.min(parseFloat(cs.borderTopLeftRadius) || 0, Math.min(w2, h2) / 2);
      var lens = lensFor(w2, h2, rad);
      if (!lens) return;
      self.w = w2; self.h = h2;
      self.el.style.setProperty('--lg-url', 'url(#' + lens.id + ')');
      self.lensId = lens.id;
      self.el.classList.add('lg-lensed');
      /* Chromium stops here -- the class above is the whole delivery. Where the
         backdrop cannot carry the filter, the copy underneath does, and it has
         to be built AFTER .lg-lensed is on the element: the frost and
         saturation it reads are declared by the .lg-lensed rules. */
      if (copyLens) self.recopy(rad);
      if (self.o.gc !== false) gcFilters();
    });
  };

  /* Mounts the copy on first use, then keeps it aligned. `full` re-clones the
     page; without it this is a reposition, which is all a resize needs. */
  Surface.prototype.recopy = function (rad, full) {
    if (!copyLens || !stillLens()) return;

    /* ---- ONLY WHAT ACTUALLY FLOATS ----
       A copied backdrop is mounted BEHIND its surface, and "behind" is only a
       place you can reach if the surface floats above the page rather than
       sitting in it. `.page-back` on the subpages turns out to be a static,
       in-flow link -- the register was written believing it floated -- and for
       an in-flow surface this mechanism is both unreachable and pointless:
       unreachable because getting the copy between the section's background
       and the link means reaching into a stacking context this decoration has
       no business touching, and pointless because a surface that scrolls WITH
       the page never moves relative to what is behind it, so there is nothing
       back there but the flat ground it is already sitting on.

       Which is the register's own first test arriving a second time: is there
       anything behind it worth bending? For an in-flow chip on a solid band,
       no. It keeps its frost and its painted rim, which is what reads at that
       size anyway. */
    var pos = getComputedStyle(this.el).position;
    if (pos !== 'fixed' && pos !== 'sticky') {
      if (this.cp) { this.cp.destroy(); this.cp = null; }
      this.el.classList.remove('lg-copy');
      return;
    }

    if (!this.cp) this.cp = new CopyLens(this);
    this.cp.mount();
    if (full || !this.cp.filled) this.cp.fill();
    this.cp.place(rad);
    this.cp.show(true);
    /* not added here -- mount() adds it once the stylesheet is adopted */
    if (this.cp.ready) this.el.classList.add('lg-copy');
  };

  /* ---- THE REGISTER -----------------------------------------------------
     Which surfaces are glass, and why each one is on the list.

     Two tests, and a surface has to pass both.

     IS THERE ANYTHING BEHIND IT WORTH BENDING? A lens over a flat field
     returns the same flat field. The cards, the thali list, the reviews and
     the footer all sit on one cream colour, so refracting them would cost two
     canvas maps, a filter and a compositing layer each to produce pixels
     identical to the ones already there.

     IS THE SURFACE THIN ENOUGH TO SHOW IT? This is the one I got wrong first
     time round, and it is the more important of the two. The fold -- the
     mirrored band where the displacement reverses -- is a fixed ~17px, because
     the glass is a fixed thickness. On a 94px bar that is a fifth of the
     surface and it is the whole character of the material. On the 677px hero
     panel it is two and a half percent: invisible, while the panel pays for
     609,000 pixels of SVG-filtered backdrop on every frame it moves. The four
     chips on that panel were worse again -- nested inside a surface that is
     itself backdrop-filtered, so what they had to refract was the panel's own
     uniform blur, and nesting backdrop filters is the case engines handle
     least well.

     So the lens goes on thin floating chrome that passes over sharp content,
     and nothing else. The panels keep the frost tiers, which is what actually
     reads at that size, and they share this material's rim and edge so the
     site still looks cut from one sheet. */
  var surfaces = [];
  function lensAll(sel, opts) {
    [].slice.call(document.querySelectorAll(sel)).forEach(function (el) {
      surfaces.push(new Surface(el, opts));
    });
  }

  lensAll('#nav', { radius: 'pill' });
  lensAll('.mobile-cta');
  lensAll('.page-back', { radius: 'pill' });

  /* Only what is on screen is built, and it is built once it is close rather
     than once it is showing, so the material is already there when it arrives.
     Surfaces that scroll away keep their filter -- the cache is shared and
     tearing one down would only mean rebuilding it on the way back. */
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var s = en.target.__lgSurface;
      if (!s) return;
      s.visible = en.isIntersecting;
      if (s.visible) s.refresh();
    });
  }, { rootMargin: '200px' }) : null;

  /* IntersectionObserver answers "is it worth building"; it does not answer
     "has it changed shape". A panel that opens from display:none, a bar that
     gains a row at a breakpoint, a chip whose label rewraps -- none of those
     are scroll events and none of them are window resizes, so without this
     they wait for some unrelated resize to come along and correct them. The
     accessibility panel showed exactly that: correct size, right material, and
     no lens until something else on the page happened to move. */
  var ro = ('ResizeObserver' in window) ? new ResizeObserver(function (entries) {
    entries.forEach(function (en) {
      var s = en.target.__lgSurface;
      if (s) s.refresh();
    });
  }) : null;

  surfaces.forEach(function (s) {
    s.el.__lgSurface = s;
    if (io) io.observe(s.el); else s.visible = true;
    if (ro) ro.observe(s.el);
    if (!io && !ro) s.refresh();
  });

  /* Every distinct size mints a filter, and a window dragged slowly across a
     breakpoint would mint one per pixel of width -- each carrying two canvas
     maps -- with nothing ever pointing at them again. So after a build, sweep
     the ones nothing is using. Bounded by the number of surfaces on the page
     rather than by how much the reader has resized. */
  function gcFilters() {
    if (!defs) return;
    var live = {};
    for (var i = 0; i < surfaces.length; i++) {
      var u = surfaces[i].el.style.getPropertyValue('--lg-url');
      var m = u && u.match(/#([\w-]+)/);
      if (m) live[m[1]] = 1;
    }
    for (var k in filters) {
      if (!filters.hasOwnProperty(k)) continue;
      if (live[filters[k].id]) continue;
      var node = document.getElementById(filters[k].id);
      if (node && node.parentNode) node.parentNode.removeChild(node);
      delete filters[k];
    }
  }

  /* the two the rest of this module still talks to by name */
  var navGlass = surfaces[0];
  var barGlass = null;
  for (var si = 0; si < surfaces.length; si++) {
    if (surfaces[si].el === mobileBar) { barGlass = surfaces[si]; break; }
  }

  /* display:none surfaces measure 0 and are skipped; they build themselves the
     first time a breakpoint actually shows them. */
  function refreshLens() {
    for (var i = 0; i < surfaces.length; i++) surfaces[i].refresh();
  }

  /* THE DROP DOES NOT GET ITS OWN SVG LENS.
     It was given one, and it rendered as a solid grey block with a coloured
     fringe: an objectBoundingBox filter region driving a displacement map
     through backdrop-filter does not survive Chromium's backdrop pipeline, and
     the maps came out as a flat smear rather than a bend.

     Backing it out is also the more faithful answer. In the reference bar it
     is the BAR that refracts; the selected item is a soft lighter bead sitting
     on it, not a second lens. What that bead needs is a soft EDGE -- the real
     defect in the tinted version was never the tint, it was the hard cut at
     the border box -- so the softness is done in CSS with a mask, which is
     reliable everywhere rather than Chromium-only. */
  var pillGlass = null;

  /* ---------------------------------------------------------------- *
   * 3. POINTER SPECULAR                                              *
   * A light that follows the pointer. Written as custom properties   *
   * from a single rAF-throttled move, so the whole effect is two     *
   * gradients repainting -- no layout, no style recalc beyond the    *
   * custom property itself.                                          *
   * ---------------------------------------------------------------- */
  /* Built here, not written into the five HTML files: they are pure decoration
     for a capability not every browser has, and markup that only ever renders
     as nothing is markup a reader's screen reader still has to skip. */
  var bloom = document.createElement('span');
  bloom.className = 'lg-bloom';
  bloom.setAttribute('aria-hidden', 'true');
  var rim = document.createElement('span');
  rim.className = 'lg-rim';
  rim.setAttribute('aria-hidden', 'true');
  nav.appendChild(bloom);
  nav.appendChild(rim);

  var pending = false, mx = 0, my = 0;
  function paintSpecular() {
    pending = false;
    nav.style.setProperty('--lg-mx', mx.toFixed(1) + 'px');
    nav.style.setProperty('--lg-my', my.toFixed(1) + 'px');
  }
  nav.addEventListener('pointermove', function (e) {
    var r = nav.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
    if (!pending) { pending = true; requestAnimationFrame(paintSpecular); }
  }, { passive: true });
  nav.addEventListener('pointerenter', function () { nav.classList.add('lg-lit'); }, { passive: true });
  nav.addEventListener('pointerleave', function () { nav.classList.remove('lg-lit'); }, { passive: true });

  /* ---------------------------------------------------------------- *
   * 4. PRESS-AND-SLIDE                                               *
   * ---------------------------------------------------------------- */
  if (!row || !pill) { refreshLens(); window.addEventListener('resize', refreshLens); return; }

  /* hands geometry over to the springs below — the CSS transition on
     transform/width/height is switched off by this class */
  pill.classList.add('lg-spring');

  var links = function () {
    return [].slice.call(row.querySelectorAll('.nav-link'))
             .filter(function (a) { return a.offsetParent !== null; });
  };

  /* springs for the pill's geometry. x and width are independent springs
     (§3: a single spring across two dimensions desyncs when they carry
     different velocities). Width is a touch slower so the shape settles
     just after the position -- the pill reads as liquid catching up. */
  /* Slower and smoother: response .58 rather than .38. A bead of liquid does
     not dart -- it eases away, carries, and settles. Width trails position by
     a further .12s so the shape arrives just after the drop does, which is
     what makes it read as something flowing into place rather than a box
     being resized. Damping stays at 1: no overshoot, because a drop settling
     under its own surface tension does not bounce. */
  /* Two speeds, because a hover and a commit are different acts. A hover is a
     HINT -- it has to answer the pointer immediately or the bar feels dead,
     which is exactly how .58 across the board read. A commit is the thing you
     asked to be slow and liquid. So the springs are retuned per move: quick
     for a preview, eased for a real selection. */
  var FAST = 0.30, SLOW = 0.58;
  var sx = new Spring(0, SLOW, 1);
  var sw = new Spring(0, SLOW * 1.2, 1);
  var sy = new Spring(0, SLOW, 1);
  var sh = new Spring(0, SLOW * 1.2, 1);
  function setPace(fast) {
    var r = fast ? FAST : SLOW;
    sx.response = sy.response = r;
    sw.response = sh.response = r * 1.2;
  }
  var driving = false;

  /* ---- the liquid drop ----
     A droplet in motion is not a rectangle that slid: it elongates along the
     direction it is travelling and thins across it, then rounds back out as it
     settles. That is the whole difference between "the pill moved" and "the
     pill flowed".

     The stretch is taken from the spring's live velocity, so it is a
     consequence of the motion rather than a separate animation -- it builds as
     the drop accelerates, peaks mid-flight, and unwinds to nothing exactly as
     the spring settles, with no timing to keep in sync. The same normalised
     speed goes out as --lg-speed, which the stylesheet uses to thicken the
     material: deeper shadow, stronger rim, more blur, per Apple's rule that a
     morphing glass surface reads as a thicker one.

     Volume is roughly conserved (thins by ~55% of what it lengthens), which is
     what keeps it reading as a liquid rather than a rubber band. */
  /* Calibrated against the velocities this spring actually produces, not
     guessed. A critically damped spring with response .38s peaks at roughly
     distance/response: ~315px/s hopping between neighbouring links, ~1600px/s
     thrown the width of the bar. An earlier 2600px/s reference with a squared
     curve put a normal hover at a 0.5% stretch -- arithmetically present and
     visually nothing. 900px/s reference with a gentler 1.25 exponent puts a
     neighbour hop near 6% and a long throw at the 26% cap, while drift under
     100px/s still stays essentially round. */
  /* Retuned for the slower spring. Peak velocity is roughly distance/response,
     so raising response from .38 to .58 cuts every peak by ~35% -- keeping the
     old 780px/s reference would have quietly halved the deformation at the
     same time as slowing it down. 520px/s restores the same shape at the new
     speed. */
  var STRETCH_AT = 520;               /* px/s that counts as "full" stretch */
  var MAX_STRETCH = 0.34;

  function drawPill() {
    var speed = Math.abs(sx.v);
    var t = speed / STRETCH_AT;
    if (t > 1) t = 1;
    /* ease so slow drift stays round and only real travel deforms; 1.25 rather
       than a square, which flattened the whole usable middle of the range */
    var e = Math.pow(t, 1.25);
    var stretch = e * MAX_STRETCH;
    var squash = 1 - stretch * 0.55;

    pill.style.transform =
      'translate3d(' + sx.x.toFixed(2) + 'px,' + sy.x.toFixed(2) + 'px,0)' +
      ' scale(' + (1 + stretch).toFixed(4) + ',' + squash.toFixed(4) + ')';
    pill.style.width = Math.max(0, sw.x).toFixed(2) + 'px';
    pill.style.height = Math.max(0, sh.x).toFixed(2) + 'px';
    pill.style.setProperty('--lg-speed', e.toFixed(3));
  }
  springs.push(function () {
    if (!driving) return false;
    var dt = 1 / 60;
    var a = sx.step(dt), b = sw.step(dt), c = sy.step(dt), d = sh.step(dt);
    drawPill();
    if (!(a || b || c || d)) { driving = false; return false; }
    return true;
  });

  function rectOf(el) {
    var p = row.getBoundingClientRect();
    var t = el.getBoundingClientRect();
    return { x: t.left - p.left, y: t.top - p.top, w: t.width, h: t.height };
  }

  /* Public entry the rest of main.js already calls. Same signature, but the
     motion is now a spring rather than a CSS transition, so a move that
     arrives mid-flight is absorbed instead of restarting. */
  /* The drop is deliberately LARGER than the link it marks -- in the reference
     bar the selected item sits inside a soft blob noticeably wider and taller
     than the icon, which is what makes it read as a bead of liquid resting on
     the surface rather than a tight highlight box snapped to a hit area. It
     overlaps its neighbours slightly at the tighter gaps; that is fine, only
     one is ever visible. */
  var DROP_PAD_X = 8, DROP_PAD_Y = 5;

  function springTo(el, immediate, fast) {
    if (!el || !el.offsetParent) return;
    setPace(!!fast);
    var r = rectOf(el);
    sx.set(r.x - DROP_PAD_X, immediate); sy.set(r.y - DROP_PAD_Y, immediate);
    sw.set(r.w + DROP_PAD_X * 2, immediate); sh.set(r.h + DROP_PAD_Y * 2, immediate);
    pill.classList.add('ready');
    /* Rebuild the drop's own maps for the size it is heading TO, not the size
       it currently is: regenerating per frame while it morphs would be far too
       expensive, and the bbox units above stretch the map to whatever the
       element measures in between anyway. Guarded on the rounded target so a
       hover that lands on the same-width link costs nothing. */
    /* When motion is off the springs have already snapped to the target, so
       paint now rather than waiting on a frame: §14 — reduced motion means a
       gentler equivalent, not less feedback, and scheduling a rAF for a value
       that is not going to change is a frame of latency for nothing. */
    if (immediate || !stillMotion()) { drawPill(); return; }
    driving = true; kick();
  }
  window.__lgSpringTo = springTo;          /* handed to main.js below */

  /* ---- the gesture ---- */
  var tracking = false, moved = false, startX = 0, grabDx = 0;
  var hist = [];
  var pointerId = null;
  /* which link the press started on. A tap has to be committed explicitly --
     see release() -- so the gesture has to remember what was pressed. */
  var pressed = null;

  function linkAt(clientX) {
    var ls = links(), best = null, bestD = Infinity;
    for (var i = 0; i < ls.length; i++) {
      var b = ls[i].getBoundingClientRect();
      if (clientX >= b.left && clientX <= b.right) return ls[i];
      var d = Math.abs(clientX - (b.left + b.width / 2));
      if (d < bestD) { bestD = d; best = ls[i]; }
    }
    return best;
  }

  /* §9: past the ends the pill follows less and less rather than stopping
     dead -- a hard clamp reads as frozen, this reads as "nothing more here" */
  function rubberband(over, dim, k) {
    k = k || 0.55;
    return (over * dim * k) / (dim + k * Math.abs(over));
  }

  row.addEventListener('pointerdown', function (e) {
    if (e.button != null && e.button !== 0) return;
    var a = e.target.closest && e.target.closest('.nav-link');
    if (!a) return;
    tracking = true; moved = false; pointerId = e.pointerId;
    pressed = a;
    startX = e.clientX;
    hist = [{ x: e.clientX, t: performance.now() }];
    var r = rectOf(a);
    grabDx = (e.clientX - row.getBoundingClientRect().left) - r.x;
    /* Guarded: setPointerCapture throws NotFoundError for a pointerId with no
       active pointer behind it. Unguarded it took the rest of this handler
       with it, leaving `tracking` true but the press never shown. */
    try { row.setPointerCapture(e.pointerId); } catch (err) {}
    nav.classList.add('lg-pressing');
    /* §1: feedback on the press itself, not on release */
    springTo(a);
  });

  row.addEventListener('pointermove', function (e) {
    if (!tracking || e.pointerId !== pointerId) return;
    var dx = e.clientX - startX;
    if (!moved && Math.abs(dx) < 6) return;          /* hysteresis */
    moved = true;
    nav.classList.add('lg-sliding');

    hist.push({ x: e.clientX, t: performance.now() });
    if (hist.length > 6) hist.shift();

    var rowRect = row.getBoundingClientRect();
    var over = linkAt(e.clientX);
    var target = rectOf(over);
    /* 1:1 with the finger, honouring where inside the pill it was grabbed */
    var want = (e.clientX - rowRect.left) - grabDx;
    var min = -DROP_PAD_X, max = rowRect.width - target.w + DROP_PAD_X;
    if (want < min) want = min + rubberband(want - min, rowRect.width);
    else if (want > max) want = max + rubberband(want - max, rowRect.width);

    sx.set(want, true);                              /* position is the finger */
    /* set() zeroes velocity because the position is being forced, but the drop
       still has to deform while it is being dragged -- so hand it the finger's
       own speed afterwards. Without this the stretch only ever appeared on the
       spring-driven moves and a fast drag slid as a rigid pill. */
    if (hist.length >= 2) {
      var p0 = hist[hist.length - 2], p1 = hist[hist.length - 1];
      var hdt = Math.max((p1.t - p0.t) / 1000, 1 / 120);
      sx.v = (p1.x - p0.x) / hdt;
    }
    sw.set(target.w + DROP_PAD_X * 2); sh.set(target.h + DROP_PAD_Y * 2);
    sy.set(target.y - DROP_PAD_Y);
    driving = true; kick();
    drawPill();
  });

  function release(e) {
    if (!tracking || (e && e.pointerId !== pointerId)) return;
    tracking = false;
    nav.classList.remove('lg-pressing', 'lg-sliding');
    /* Hand the capture back first. While the row holds it, every pointer event
       retargets to the row -- and so does the click the browser synthesises
       afterwards, which lands on the <ul> instead of on the <a> inside it. */
    if (e && row.hasPointerCapture && row.hasPointerCapture(e.pointerId)) {
      row.releasePointerCapture(e.pointerId);
    }

    /* A PLAIN TAP HAS TO BE COMMITTED BY HAND.
       This used to return here and let the browser's own click do the work,
       which is correct for an ordinary link and wrong for this one: the
       pointer capture taken on pointerdown -- the thing that lets a drag keep
       following the finger past the edge of the item it started on -- also
       retargets the click to the row. So the <a> never saw a click, its
       default action never ran, and every tap on the bar did nothing at all
       except spring the drop. The drag worked, which is what hid it: only the
       plain tap, the thing people actually do, was dead.

       commit() is the same path a slide-and-release already takes, so a tap
       and a drag now end the same way. It sets `swallow`, so if a click does
       reach the link on some other engine it is suppressed rather than
       navigating twice. */
    if (!moved) { if (pressed) commit(pressed); return; }

    /* §5 + §6: carry the release velocity, and land where the throw is
       GOING rather than where the finger happened to lift */
    var n = hist.length;
    var v = 0;
    if (n >= 2) {
      var a = hist[0], b = hist[n - 1];
      /* Floor dt at a frame. Two moves delivered in the same millisecond — a
         coalesced burst, or a synthetic event — otherwise divide out to a
         velocity in the millions and sail the pill off the end of the bar. */
      var dt = Math.max((b.t - a.t) / 1000, 1 / 120);
      v = (b.x - a.x) / dt;
    }
    /* 0.99, not the 0.998 of a scroll view. 0.998 projects roughly half the
       release speed in pixels (100px/s -> 50px), which on a bar whose items
       sit ~120px apart carries a slow, deliberate drag a whole item past the
       one you let go over. 0.99 projects a tenth (100px/s -> 10px), so a
       considered drag lands where you released it and only a real flick
       (~1200px/s -> ~119px) reaches the neighbour. */
    var decel = 0.99;
    var throwPx = (v / 1000) * decel / (1 - decel);

    /* Momentum projection, BOUNDED. Projecting freely is right for a scroll,
       where the content is continuous; it is wrong for a seven-item bar,
       where each item is a separate destination and a firm flick would sail
       past four of them onto Contact. Cap the throw at one neighbour: a flick
       still carries you one further than you let go, and can never cross the
       whole nav. */
    var under = linkAt(e.clientX);
    var cap = under ? under.getBoundingClientRect().width : 120;
    if (throwPx > cap) throwPx = cap;
    else if (throwPx < -cap) throwPx = -cap;

    var landing = linkAt(e.clientX + throwPx) || under;
    if (landing) {
      sx.v = v;                                      /* velocity handoff */
      springTo(landing);
      commit(landing);
    }
  }
  row.addEventListener('pointerup', release);
  row.addEventListener('pointercancel', function (e) {
    if (!tracking) return;
    tracking = false;
    nav.classList.remove('lg-pressing', 'lg-sliding');
    if (window.__lgResync) window.__lgResync();
  });

  /* a slide that ends on a link is a choice, so honour it -- but suppress the
     click the browser is about to synthesise on whatever was under the finger */
  var swallow = false;
  function commit(a) {
    swallow = true;
    setTimeout(function () { swallow = false; }, 350);
    var href = a.getAttribute('href');
    if (!href) return;
    if (href.charAt(0) === '#') {
      var el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({
          behavior: stillMotion() ? 'smooth' : 'auto',
          block: 'start'
        });
        if (history.replaceState) history.replaceState(null, '', href);
      }
    } else {
      window.location.href = href;
    }
  }
  row.addEventListener('click', function (e) {
    if (!swallow) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  /* ---- boot ---- */
  refreshLens();
  window.addEventListener('resize', refreshLens);
  window.addEventListener('load', refreshLens);

  /* ---- keeping the copies honest ----
     Only on the engines that have one. Three things can put a copy out of
     step, and they cost three different amounts:

       SCROLL    nothing at all where scroll timelines exist -- the keyframes
                 in the shadow CSS are already tracking it on the compositor.
                 The rAF tracker below is only for engines without them.
       REFLOW    the copy is laid out at the viewport's width, so a resize
                 re-clones; refreshLens has already remeasured the surfaces by
                 then, and a surface whose box did not change would otherwise
                 never be told.
       CONTENT   a tab switching panels, a lightbox opening, anything that
                 changes what is actually under the bar. Debounced hard: this
                 re-clones, and nothing here is worth a re-clone at 60fps. */
  /* Registered whenever there is a copy at all, NOT only when the scroll
     timeline is missing. That `&& !scrollTimeline` was correct while the copy
     was one document-tall layer: the CSS timeline drove it, so a JS scroll
     handler would have been duplicated work. The folded edges are not on that
     timeline -- they are two narrow strips, and the comment in track() says
     why -- so with the guard in place nothing ever updated them: --lg-ey stayed
     at its scroll-0 value of -20px forever, and the bands went on mirroring the
     dark hero from the top of the document onto whatever section the bar had
     since reached. That is the grey wedge, and it is why it appeared once the
     page was scrolled to the cream sections.

     track() still refuses to write --lg-dy under a live timeline, so the main
     layer keeps its compositor animation and only the strips are written here. */
  if (copyLens) {
    var trackPending = false;
    var trackAll = function () {
      trackPending = false;
      for (var i = 0; i < surfaces.length; i++) {
        if (surfaces[i].cp) surfaces[i].cp.track();
      }
    };
    window.addEventListener('scroll', function () {
      if (trackPending) return;
      trackPending = true;
      requestAnimationFrame(trackAll);
    }, { passive: true });
  }

  if (copyLens) {
    var restageTimer = null;
    var restage = function () {
      clearTimeout(restageTimer);
      restageTimer = setTimeout(function () {
        for (var i = 0; i < surfaces.length; i++) {
          var s = surfaces[i];
          if (s.cp && s.cp.host) s.recopy(null, true);
        }
      }, 320);
    };
    window.addEventListener('resize', restage);
    window.addEventListener('load', restage);

    if ('MutationObserver' in window) {
      var contentWatch = new MutationObserver(restage);
      contentRoots().forEach(function (el) {
        contentWatch.observe(el, {
          childList: true, subtree: true, attributes: true, characterData: true
        });
      });
    }
  }
  if (reduceTransparency.addEventListener) {
    reduceTransparency.addEventListener('change', function () { syncLensClasses(); });
  }
  /* The accessibility panel can turn the material off at runtime. Both pieces
     of glass are handled: the bar and the drop each own their class, and each
     is only restored if its maps actually exist (.w is set once a build has
     succeeded). Reads that state off the Glass objects rather than a
     module-level variable — the refactor into the factory removed the old
     `mapW`, and this observer kept referencing it and threw on every
     accessibility toggle. */
  function syncLensClasses() {
    /* Only the BAR is lensed — the drop's own SVG lens was removed (see the
       note where pillGlass is declared), so there is no second class to keep
       in step here. Restored only if the maps actually exist: .w is set once a
       build has succeeded. */
    var i, s;
    if (!stillLens() || !canLens) {
      for (i = 0; i < surfaces.length; i++) {
        s = surfaces[i];
        s.el.classList.remove('lg-lensed');
        /* the copy is the backdrop in this mode, so it goes with the class --
           left up, it would keep painting a refracted page under a bar that
           has been told to stop being transparent */
        s.el.classList.remove('lg-copy');
        if (s.cp) s.cp.show(false);
      }
      return;
    }
    /* restored only where the maps actually exist: .w is set once a build has
       succeeded, and a surface that has never been on screen has none */
    for (i = 0; i < surfaces.length; i++) {
      s = surfaces[i];
      if (!s.w) continue;
      s.el.classList.add('lg-lensed');
      /* Not cp.show() -- a surface whose material was off at load has no copy
         to show yet, and this is the moment it becomes worth building one.
         refresh() is forced because the box has not changed size; the filter
         cache means the rebuild is a lookup. */
      if (copyLens) s.refresh(true);
    }
  }
  new MutationObserver(syncLensClasses)
    .observe(root, { attributes: true, attributeFilter: ['class', 'data-a11y-contrast'] });
})();
