// ═══════════════════════════════════════════════════════════════
// garden-rooms.js — Garden Galaxy layer
//
// Kirk's sketch (live Garden): ONE Garden Galaxy.
// Bodies IN the garden: The Core (left), The Nursery (below), Settings (right).
// Unnamed pieces still orbit. Title "Garden Galaxy" fades after a few seconds.
// Bottom-right arrow → NEXT GALAXY (Art). Not a 4-page room tour.
// Glass is not a peer room. Team (garden-within-the-garden) is named later.
// Chat is a thread. No 7-specialist router. No wallet/share galaxy.
// Fade: opacity 400ms. No flash. No Unreal engine.
//
// Mirror: docs/code-garden.html · vision: docs/GALAXIES.md
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var FADE_MS = 400;
  var TITLE_HOLD_MS = 3200;
  var leaving = false;

  // Live galaxies only. Workshop / Round Table stay named later.
  // Do not put Nursery/Settings/Team on this rail.
  var GALAXIES = [
    { id: 'garden', href: './', label: 'Garden Galaxy' },
    { id: 'art', href: 'music.html', label: 'Art' }
  ];

  function reduceMotion() {
    return window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function currentGalaxy() {
    var attr = document.documentElement.getAttribute('data-garden-galaxy');
    if (attr) return attr;
    var path = (location.pathname || '').replace(/\/+$/, '');
    var file = path.split('/').pop() || '';
    if (file === 'music.html') return 'art';
    return 'garden';
  }

  function indexOf(id) {
    for (var i = 0; i < GALAXIES.length; i++) {
      if (GALAXIES[i].id === id) return i;
    }
    return 0;
  }

  function neighbor(dir) {
    var i = indexOf(currentGalaxy());
    var next = (i + dir + GALAXIES.length) % GALAXIES.length;
    return GALAXIES[next];
  }

  function showRoom() {
    document.documentElement.classList.add('garden-ready');
    document.documentElement.classList.remove('garden-leaving');
  }

  function go(href) {
    if (!href || leaving) return;
    if (reduceMotion()) {
      location.href = href;
      return;
    }
    leaving = true;
    document.documentElement.classList.remove('garden-ready');
    document.documentElement.classList.add('garden-leaving');
    setTimeout(function () {
      location.href = href;
    }, FADE_MS);
  }

  function bindGalaxyNav() {
    var prev = document.querySelector('[data-galaxy-dir="prev"]');
    var next = document.querySelector('[data-galaxy-dir="next"]');
    var prevGalaxy = neighbor(-1);
    var nextGalaxy = neighbor(1);

    if (prev) {
      prev.setAttribute('aria-label', 'Previous galaxy: ' + prevGalaxy.label);
      prev.title = prevGalaxy.label;
      prev.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        go(prevGalaxy.href);
      });
    }
    if (next) {
      next.setAttribute('aria-label', 'Next galaxy: ' + nextGalaxy.label);
      next.title = nextGalaxy.label;
      next.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        go(nextGalaxy.href);
      });
    }
  }

  function bindPlaceDoors() {
    var doors = document.querySelectorAll('[data-garden-go]');
    for (var i = 0; i < doors.length; i++) {
      (function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          go(el.getAttribute('data-garden-go'));
        });
      })(doors[i]);
    }
  }

  function fadeGalaxyTitle() {
    var title = document.getElementById('galaxy-title');
    if (!title) return;
    if (reduceMotion()) {
      title.classList.add('is-faded');
      return;
    }
    setTimeout(function () {
      title.classList.add('is-faded');
    }, TITLE_HOLD_MS);
  }

  document.documentElement.classList.add('garden-enter');

  function boot() {
    bindGalaxyNav();
    bindPlaceDoors();
    fadeGalaxyTitle();
    if (reduceMotion()) {
      showRoom();
      return;
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(showRoom);
    });
    setTimeout(showRoom, 80);
  }

  window.addEventListener('pageshow', function () {
    leaving = false;
    showRoom();
  });

  window.GardenRooms = {
    galaxies: GALAXIES,
    current: currentGalaxy,
    go: go,
    fadeMs: FADE_MS
  };

  if (document.querySelector('[data-galaxy-dir], [data-garden-go], #galaxy-title')) {
    boot();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
