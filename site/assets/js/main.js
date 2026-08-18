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
    var p = pill.parentElement.getBoundingClientRect();
    var t = target.getBoundingClientRect();
    pill.style.width = t.width + 'px';
    pill.style.height = t.height + 'px';
    pill.style.transform = 'translate(' + (t.left - p.left) + 'px,' + (t.top - p.top) + 'px)';
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
    if (active) { movePill(tabPill, active); markPillUnder(active, true); }
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
    if (active) movePill(tabPill, active);
    syncNavPill();
  }

  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function () { requestAnimationFrame(relayout); });
    [navLinksWrap, nav, mobileBar].forEach(function (el) { if (el) ro.observe(el); });
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
  var STEPS = ['text', 'line', 'align', 'contrast'];
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
      SVG displacement map fed to backdrop-filter, the map generated here on a
      canvas from the bar's own rounded-rect geometry. Chromium-only in
      practice -- Safari and Firefox support backdrop-filter but not url()
      inside it -- so it is feature-detected and simply not applied elsewhere,
      where the layered highlights below already carry the material.

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
   *   blur(1) -> displace x3 (chromatic) -> saturate -> mask by rim  *
   *   -> screen back over the refraction.                            *
   * ---------------------------------------------------------------- */

  /* Signed distance to a rounded rectangle, negative inside. The maps need to
     know how far each pixel is from the rim and which way the rim faces, and
     an SDF gives both (the direction is its gradient). */
  function sdRoundRect(px, py, hw, hh, r) {
    var qx = Math.abs(px) - hw + r;
    var qy = Math.abs(py) - hh + r;
    var ax = qx > 0 ? qx : 0;
    var ay = qy > 0 ? qy : 0;
    return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(qx, qy), 0) - r;
  }

  /* R encodes x offset, G encodes y offset, 128 being "no displacement". The
     backdrop is sampled from further OUT the closer a pixel is to the rim,
     which compresses it into the edge -- the squeeze you see through the thick
     edge of real glass. `thickness` is how deep that bend reaches; at h/2 the
     surface is a continuous lens rather than a bevelled frame, so content
     moving through the middle still bends. */
  function buildDisplacement(w, h, radius, thickness, strength) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(w, h), d = img.data;
    var hw = w / 2, hh = h / 2, e = 1;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var px = x - hw + 0.5, py = y - hh + 0.5;
        var dist = sdRoundRect(px, py, hw, hh, radius);
        var i = (y * w + x) * 4;
        var t = 1 + dist / thickness;
        if (dist > 0 || t <= 0) {
          d[i] = d[i + 1] = d[i + 2] = 128; d[i + 3] = 255; continue;
        }
        if (t > 1) t = 1;
        t = t * t;
        var nx = sdRoundRect(px + e, py, hw, hh, radius) - sdRoundRect(px - e, py, hw, hh, radius);
        var ny = sdRoundRect(px, py + e, hw, hh, radius) - sdRoundRect(px, py - e, hw, hh, radius);
        var len = Math.sqrt(nx * nx + ny * ny) || 1;
        var amt = t * strength;
        d[i]     = Math.max(0, Math.min(255, 128 + (nx / len) * amt));
        d[i + 1] = Math.max(0, Math.min(255, 128 + (ny / len) * amt));
        d[i + 2] = 128; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  }

  /* The specular rim: white where the edge faces the light, transparent where
     it faces away. Light comes from the upper-left, and the OPPOSITE edge
     catches a weaker bounce -- real glass is lit twice, once by the source and
     once by what the source is bouncing off. Alpha is the mask; the filter
     uses it to decide where the saturated layer shows through. */
  function buildSpecular(w, h, radius, width) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(w, h), d = img.data;
    var hw = w / 2, hh = h / 2, e = 1;
    /* unit vector toward the light, in screen space (y down) */
    var lx = -0.62, ly = -0.78;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var px = x - hw + 0.5, py = y - hh + 0.5;
        var dist = sdRoundRect(px, py, hw, hh, radius);
        var i = (y * w + x) * 4;
        /* only a narrow band just inside the rim is the edge */
        var band = 1 - Math.abs(dist + width / 2) / (width / 2);
        if (dist > 0 || band <= 0) { d[i + 3] = 0; continue; }
        var nx = sdRoundRect(px + e, py, hw, hh, radius) - sdRoundRect(px - e, py, hw, hh, radius);
        var ny = sdRoundRect(px, py + e, hw, hh, radius) - sdRoundRect(px, py - e, hw, hh, radius);
        var len = Math.sqrt(nx * nx + ny * ny) || 1;
        nx /= len; ny /= len;
        var facing = nx * lx + ny * ly;            /* 1 = straight at the light */
        var lit = Math.max(0, facing);
        var bounce = Math.max(0, -facing) * 0.42;  /* weaker rim from behind */
        var a = band * (lit + bounce);
        a = a * a * (3 - 2 * a);                   /* smoothstep, softer falloff */
        d[i] = d[i + 1] = d[i + 2] = 255;
        d[i + 3] = Math.max(0, Math.min(255, a * 255));
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  }

  /* backdrop-filter accepts url() per spec, but only Chromium actually renders
     an SVG filter there; the others silently drop the whole declaration, which
     would take the blur with it. Ask first. */
  var canLens = (function () {
    if (!window.CSS || !CSS.supports) return false;
    if (!CSS.supports('backdrop-filter', 'blur(1px)') &&
        !CSS.supports('-webkit-backdrop-filter', 'blur(1px)')) return false;
    return CSS.supports('backdrop-filter', 'url(#x) blur(1px)');
  })();

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

  /* One piece of glass: owns its filter, its two maps, and the class it puts
     on its element once there is something real to show. */
  function Glass(el, id, opts) {
    this.el = el; this.id = id;
    this.o = opts || {};
    this.w = 0; this.h = 0; this.pending = false;
    this.built = false;
  }

  Glass.prototype._build = function () {
    var NS = 'http://www.w3.org/2000/svg';
    var f = document.createElementNS(NS, 'filter');
    f.setAttribute('id', this.id);
    f.setAttribute('color-interpolation-filters', 'sRGB');
    /* An element whose size changes cannot use a fixed filter region -- it
       would clip or leave a gap the moment the box no longer matches. In
       objectBoundingBox units the region and the maps are always exactly the
       element, whatever it currently measures, so the drop's own lensing
       stretches along with it as it elongates. That stretching is not an
       artefact here: a bead of liquid pulling out really does stretch the
       image it is carrying. */
    if (this.o.units === 'bbox') {
      f.setAttribute('filterUnits', 'objectBoundingBox');
      f.setAttribute('primitiveUnits', 'objectBoundingBox');
      f.setAttribute('x', 0); f.setAttribute('y', 0);
      f.setAttribute('width', 1); f.setAttribute('height', 1);
    } else {
      f.setAttribute('filterUnits', 'userSpaceOnUse');
    }

    var pre = document.createElementNS(NS, 'feGaussianBlur');
    pre.setAttribute('in', 'SourceGraphic');
    pre.setAttribute('stdDeviation', this.o.pre == null ? 1 : this.o.pre);
    pre.setAttribute('result', 'pre');
    f.appendChild(pre);

    this.dmap = document.createElementNS(NS, 'feImage');
    this.dmap.setAttribute('result', 'dmap');
    this.dmap.setAttribute('preserveAspectRatio', 'none');
    f.appendChild(this.dmap);

    /* chromatic aberration: three passes at slightly different strengths, each
       reduced to one channel and screened back. Real glass disperses, and the
       fringing lands exactly where the bend is strongest -- the rim. */
    var CH = [
      { n: 'R', k: 1.08, m: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0' },
      { n: 'G', k: 1.00, m: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0' },
      { n: 'B', k: 0.92, m: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0' }
    ];
    this.disp = [];
    var self = this;
    CH.forEach(function (c) {
      var dm = document.createElementNS(NS, 'feDisplacementMap');
      dm.setAttribute('in', 'pre'); dm.setAttribute('in2', 'dmap');
      dm.setAttribute('xChannelSelector', 'R');
      dm.setAttribute('yChannelSelector', 'G');
      dm.setAttribute('result', 'd' + c.n);
      dm._k = c.k;
      f.appendChild(dm); self.disp.push(dm);
      var cm = document.createElementNS(NS, 'feColorMatrix');
      cm.setAttribute('in', 'd' + c.n); cm.setAttribute('type', 'matrix');
      cm.setAttribute('values', c.m); cm.setAttribute('result', 'c' + c.n);
      f.appendChild(cm);
    });
    var b1 = document.createElementNS(NS, 'feBlend');
    b1.setAttribute('mode', 'screen'); b1.setAttribute('in', 'cR');
    b1.setAttribute('in2', 'cG'); b1.setAttribute('result', 'rg');
    f.appendChild(b1);
    var b2 = document.createElementNS(NS, 'feBlend');
    b2.setAttribute('mode', 'screen'); b2.setAttribute('in', 'rg');
    b2.setAttribute('in2', 'cB'); b2.setAttribute('result', 'refr');
    f.appendChild(b2);

    /* the rim is lit by a SATURATED, brightened copy of the refraction, masked
       to the specular band -- so the highlight carries the colour of whatever
       is behind the glass instead of being a flat white stroke */
    var sat = document.createElementNS(NS, 'feColorMatrix');
    sat.setAttribute('in', 'refr'); sat.setAttribute('type', 'saturate');
    sat.setAttribute('values', this.o.rimSat == null ? 2.6 : this.o.rimSat);
    sat.setAttribute('result', 'sat');
    f.appendChild(sat);

    this.smap = document.createElementNS(NS, 'feImage');
    this.smap.setAttribute('result', 'smapRaw');
    this.smap.setAttribute('preserveAspectRatio', 'none');
    f.appendChild(this.smap);
    var sb = document.createElementNS(NS, 'feGaussianBlur');
    sb.setAttribute('in', 'smapRaw'); sb.setAttribute('stdDeviation', 1);
    sb.setAttribute('result', 'smap');
    f.appendChild(sb);

    var comp = document.createElementNS(NS, 'feComposite');
    comp.setAttribute('in', 'sat'); comp.setAttribute('in2', 'smap');
    comp.setAttribute('operator', 'in'); comp.setAttribute('result', 'rim');
    f.appendChild(comp);

    var out = document.createElementNS(NS, 'feBlend');
    out.setAttribute('mode', 'screen');
    out.setAttribute('in', 'refr'); out.setAttribute('in2', 'rim');
    f.appendChild(out);

    ensureDefs().appendChild(f);
    this.filter = f;
    this.built = true;
  };

  /* Re-measures inside the frame rather than capturing, and only claims a size
     once the maps for it exist. Claiming first loses the race: boot fires
     before layout settles, `load` fires again, the second call marks the real
     geometry as done and bails on the pending flag, and the queued frame then
     builds from the stale numbers its closure captured. */
  /* `atW`/`atH` build the maps for a size the element is heading TO rather than
     the one it currently measures. The drop is mid-flight most of the time it
     is asked to rebuild, and measuring then would derive its corner radius and
     rim width from a half-morphed box -- a 45x21 sliver instead of the 160x56
     bead it is becoming. */
  Glass.prototype.refresh = function (force, atW, atH) {
    if (!canLens || !stillLens()) return;
    /* Record what is WANTED and let the queued frame read it when it runs.
       Capturing the size at schedule time and returning early on `pending`
       loses every request that arrives before that frame fires — and since the
       drop changes size on each hover, it would settle on whichever width
       happened to be queued first and never correct itself. The pending frame
       supersedes rather than blocks. */
    this._wantW = atW || 0;
    this._wantH = atH || 0;
    this._force = force || this._force;
    if (this.pending) return;
    var r = this.el.getBoundingClientRect();
    if (!atW && (!r.width || !r.height)) return;
    if (!force && Math.round(r.width) === this.w && Math.round(r.height) === this.h) return;
    this.pending = true;
    var self = this;
    requestAnimationFrame(function () {
      self.pending = false;
      var force = self._force; self._force = false;
      var r2 = self.el.getBoundingClientRect();
      var w = self._wantW || Math.round(r2.width);
      var h = self._wantH || Math.round(r2.height);
      if (!w || !h) return;
      /* the size is only CLAIMED once its maps actually exist */
      if (!force && w === self.w && h === self.h) return;
      self.w = w; self.h = h;
      if (!self.built) self._build();

      var radius = self.o.radius === 'pill'
        ? h / 2
        : Math.min(parseFloat(getComputedStyle(self.el).borderRadius) || h / 2, h / 2);
      var thick = self.o.thickness ? self.o.thickness(h) : h / 2;
      var strength = self.o.strength == null ? 205 : self.o.strength;

      var bbox = self.o.units === 'bbox';
      var mw = bbox ? 1 : w, mh = bbox ? 1 : h;

      var du = buildDisplacement(w, h, radius, thick, strength);
      self.dmap.setAttribute('href', du);
      self.dmap.setAttributeNS('http://www.w3.org/1999/xlink', 'href', du);
      self.dmap.setAttribute('width', mw); self.dmap.setAttribute('height', mh);

      var su = buildSpecular(w, h, radius, self.o.rim == null ? 3.5 : self.o.rim);
      self.smap.setAttribute('href', su);
      self.smap.setAttributeNS('http://www.w3.org/1999/xlink', 'href', su);
      self.smap.setAttribute('width', mw); self.smap.setAttribute('height', mh);

      if (!bbox) {
        self.filter.setAttribute('x', 0); self.filter.setAttribute('y', 0);
        self.filter.setAttribute('width', w); self.filter.setAttribute('height', h);
      }
      /* scale is a length, so in objectBoundingBox primitive units it is a
         FRACTION of the box rather than pixels -- passing 34 there would
         displace by 34x the element's width and the drop would vanish. */
      var sc = self.o.scale == null ? 78 : self.o.scale;
      if (bbox) sc = sc / w;
      self.disp.forEach(function (d) { d.setAttribute('scale', sc * d._k); });
      self.el.classList.add(self.o.cls || 'lg-lensed');
    });
  };

  /* the panel's own controls can switch the material off underneath us */
  function stillLens() {
    return !reduceTransparency.matches &&
           !root.classList.contains('a11y-noimg') &&
           root.getAttribute('data-a11y-contrast') !== '2';
  }

  var navGlass = new Glass(nav, 'lgNavLens', { scale: 78, strength: 205 });
  function refreshLens() { navGlass.refresh(); }

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
    startX = e.clientX;
    hist = [{ x: e.clientX, t: performance.now() }];
    var r = rectOf(a);
    grabDx = (e.clientX - row.getBoundingClientRect().left) - r.x;
    row.setPointerCapture(e.pointerId);
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
    if (!moved) return;                              /* a plain tap: let it click */

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
    if (!stillLens() || !canLens) { nav.classList.remove('lg-lensed'); return; }
    if (navGlass.w) nav.classList.add('lg-lensed');
  }
  new MutationObserver(syncLensClasses)
    .observe(root, { attributes: true, attributeFilter: ['class', 'data-a11y-contrast'] });
})();
