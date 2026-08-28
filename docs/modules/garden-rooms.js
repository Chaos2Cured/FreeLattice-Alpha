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
    { id: 'art', href: 'music.html', label: 'Art' },
    { id: 'workshop', href: 'workshop.html', label: 'Workshop' },
    { id: 'round-table', href: 'round-table.html', label: 'Round Table' }
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
    if (file === 'workshop.html') return 'workshop';
    if (file === 'round-table.html') return 'round-table';
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
    var prevGalaxy = neighbor(-1);
    var nextGalaxy = neighbor(1);
    var buttons = document.querySelectorAll('[data-galaxy-dir]');

    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        var dir = btn.getAttribute('data-galaxy-dir');
        var target = dir === 'prev' ? prevGalaxy : nextGalaxy;
        btn.setAttribute('aria-label', (dir === 'prev' ? 'Previous' : 'Next') + ' galaxy: ' + target.label);
        btn.title = target.label;
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          go(target.href);
        });
      })(buttons[i]);
    }
  }

  function bindPlaceDoors() {
    var copy = {
      core: '',
      nursery: 'Nursery is grow. The trainer lives here later, not a maze.',
      settings: 'Settings will be tiny: local minds + quality.'
    };
    var veil = document.getElementById('place-veil');
    var line = document.getElementById('place-veil-line');
    var closeBtn = document.getElementById('place-veil-close');
    var label = document.getElementById('room-label');

    function closePlace() {
      if (!veil) return;
      veil.classList.remove('is-open');
      if (label) label.textContent = 'you are in Core';
      setTimeout(function () {
        if (!veil.classList.contains('is-open')) veil.hidden = true;
      }, FADE_MS);
    }

    function openPlace(id) {
      if (id === 'core') {
        closePlace();
        return;
      }
      if (!veil || !copy[id]) return;
      if (line) line.textContent = copy[id];
      veil.hidden = false;
      if (label) {
        label.textContent = id === 'nursery' ? 'you are in Nursery' : 'you are in Settings';
      }
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { veil.classList.add('is-open'); });
      });
    }

    var doors = document.querySelectorAll('[data-garden-place]');
    for (var i = 0; i < doors.length; i++) {
      (function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          openPlace(el.getAttribute('data-garden-place'));
        });
      })(doors[i]);
    }
    if (closeBtn) closeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      closePlace();
    });

    var goDoors = document.querySelectorAll('[data-garden-go]');
    for (var j = 0; j < goDoors.length; j++) {
      (function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          go(el.getAttribute('data-garden-go'));
        });
      })(goDoors[j]);
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

  if (document.querySelector('[data-galaxy-dir], [data-garden-go], [data-garden-place], #galaxy-title')) {
    boot();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
