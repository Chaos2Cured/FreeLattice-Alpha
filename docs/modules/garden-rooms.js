// ═══════════════════════════════════════════════════════════════
// garden-rooms.js — Garden Galaxy room rail (this galaxy only)
//
// Rooms: Core (canvas at /), Glass, Nursery, Settings.
// Prev/next is the real nav. One room at a time. No second canvas.
// Art is a galaxy (music.html), not a stop on this rail.
// Chat is a thread — do not invent Chat UI here.
// Fade: opacity 400ms. No flash. No Unreal engine.
//
// Mirror: docs/code-garden.html · vision: docs/GALAXIES.md
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var FADE_MS = 400;
  var leaving = false;
  var ROOMS = [
    { id: 'core', href: './', label: 'Core' },
    { id: 'glass', href: 'glass.html', label: 'Glass' },
    { id: 'nursery', href: 'nursery.html', label: 'Nursery' },
    { id: 'settings', href: 'settings.html', label: 'Settings' }
  ];

  function reduceMotion() {
    return window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function currentId() {
    var attr = document.documentElement.getAttribute('data-garden-room');
    if (attr) return attr;
    var path = (location.pathname || '').replace(/\/+$/, '');
    var file = path.split('/').pop() || '';
    if (!file || file === 'index.html') return 'core';
    if (file === 'glass.html') return 'glass';
    if (file === 'nursery.html') return 'nursery';
    if (file === 'settings.html') return 'settings';
    return 'core';
  }

  function indexOf(id) {
    for (var i = 0; i < ROOMS.length; i++) {
      if (ROOMS[i].id === id) return i;
    }
    return 0;
  }

  function neighbor(dir) {
    var i = indexOf(currentId());
    var next = (i + dir + ROOMS.length) % ROOMS.length;
    return ROOMS[next];
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

  function bindNav() {
    var prev = document.querySelector('[data-garden-dir="prev"]');
    var next = document.querySelector('[data-garden-dir="next"]');
    var prevRoom = neighbor(-1);
    var nextRoom = neighbor(1);

    if (prev) {
      prev.setAttribute('aria-label', 'Go to ' + prevRoom.label);
      prev.title = prevRoom.label;
      prev.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        go(prevRoom.href);
      });
    }
    if (next) {
      next.setAttribute('aria-label', 'Go to ' + nextRoom.label);
      next.title = nextRoom.label;
      next.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        go(nextRoom.href);
      });
    }
  }

  document.documentElement.classList.add('garden-enter');

  function boot() {
    bindNav();
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
    rooms: ROOMS,
    current: currentId,
    go: go,
    fadeMs: FADE_MS
  };

  if (document.querySelector('[data-garden-dir]')) {
    boot();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
