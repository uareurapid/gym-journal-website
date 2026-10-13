/* ============================================================================
   Gym Journal — site behaviour
   ----------------------------------------------------------------------------
   Three jobs only: reveal sections as they arrive, count the personal record up
   when it reaches the viewport, and keep the nav honest as the page scrolls.
   Everything degrades to a fully readable page with JavaScript disabled.
   ========================================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Reveal on scroll ────────────────────────────────────────────────────
     The hiding is scoped to `.js` in the stylesheet, which only the head script
     sets — so with JavaScript unavailable the page is simply visible. */
  var revealables = document.querySelectorAll('[data-reveal]');

  if (reduced || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(revealables, function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
    );

    Array.prototype.forEach.call(revealables, function (el) {
      revealObserver.observe(el);
    });
  }

  /* ── The personal record, counting up ────────────────────────────────────
     Once, when the card first arrives. The final value is already in the HTML,
     so this only ever animates towards the number that is on the page. */
  var counters = document.querySelectorAll('[data-count-to]');

  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-count-to'));
    var from = parseFloat(el.getAttribute('data-count-from'));
    if (isNaN(to)) return;
    if (isNaN(from)) from = 0;

    var decimals = (String(el.getAttribute('data-count-to')).split('.')[1] || '').length;
    var duration = 950;
    var started = null;

    // The green flash and the rising bars are the whole point: it is the moment
    // the number goes up. Both are keyed off the card.
    var card = el.closest('.record__card');
    if (card) card.classList.add('is-hit');

    function frame(now) {
      if (started === null) started = now;
      var t = Math.min((now - started) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (from + (to - from) * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = to.toFixed(decimals);
    }

    requestAnimationFrame(frame);
  }

  if (!reduced && 'IntersectionObserver' in window) {
    var countObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.textContent = entry.target.getAttribute('data-count-from');
          countUp(entry.target);
          countObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );

    Array.prototype.forEach.call(counters, function (el) {
      countObserver.observe(el);
    });
  }

  /* ── Nav ───────────────────────────────────────────────────────────────── */
  var nav = document.getElementById('nav');

  if (nav) {
    var stuck = false;

    var onScroll = function () {
      var next = window.scrollY > 12;
      if (next === stuck) return;
      stuck = next;
      nav.classList.toggle('is-stuck', stuck);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Footer year ───────────────────────────────────────────────────────── */
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
