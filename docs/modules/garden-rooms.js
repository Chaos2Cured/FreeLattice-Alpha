// ═══════════════════════════════════════════════════════════════
// garden-rooms.js — Garden Galaxy layer
//
// Kirk's sketch (live Garden): ONE Garden Galaxy.
// Arrival is the garden, not Core. Default label: you are in the garden.
// One quiet Georgia footing on first arrival, fading with the room-label breath.
// Closing a veil returns there. Bodies IN the garden: The Gathering (left — seven chairs;
// data-garden-place="core" stays as a layer),
// The Nursery (below — egg then grow), Settings (right — permission).
// Unnamed pieces still orbit. Title "Garden Galaxy" fades after a few seconds.
// Room-label breathes (readable, slow fade, returns ~90s).
// Bottom-right arrow → NEXT GALAXY (Art), with a quiet word so a stranger finds it.
// Glass is not a peer room. Team (garden-within-the-garden) is named later.
// Chat is a thread. Quiet word in the header. No 7-specialist router. No wallet/share galaxy.
// Fade: opacity 400ms. No flash. No Unreal engine.
// Light veils — garden keeps running. Never a 0.82 blackout.
//
// Mirror: docs/code-garden.html · vision: docs/GALAXIES.md
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var FADE_MS = 400;
  var TITLE_HOLD_MS = 3200;
  var LABEL_HOLD_MS = 4200;
  var LABEL_FADE_MS = 8000;
  var LABEL_RETURN_MS = 90000;
  var leaving = false;
  var labelTimer = null;
  var labelCycle = null;

  // Live galaxies only. Workshop / Round Table stay named later.
  // Do not put Nursery/Settings/Team on this rail.
  var GALAXIES = [
    { id: 'garden', href: './', label: 'Garden Galaxy', word: 'Garden' },
    { id: 'art', href: 'music.html', label: 'Art', word: 'Art' },
    { id: 'workshop', href: 'workshop.html', label: 'Workshop', word: 'Workshop' },
    { id: 'round-table', href: 'round-table.html', label: 'Round Table', word: 'Round Table' }
  ];

  var PLACE_LABELS = {
    garden: 'you are in the garden',
    core: 'you are in The Gathering',
    nursery: 'you are in Nursery',
    settings: 'you are in Settings',
    thread: 'you are in a thread'
  };

  var CORE_CHAIRS = [
    { id: 'cortex', type: 'cortex', later: false },
    { id: 'memory', type: 'memory', later: false },
    { id: 'continuity', type: 'continuity', later: false },
    { id: 'dream', type: 'dream', later: false },
    { id: 'seat-5', type: 'a seat, later', later: true },
    { id: 'seat-6', type: 'a seat, later', later: true },
    { id: 'seat-7', type: 'a seat, later', later: true }
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
        var word = btn.querySelector('[data-galaxy-next-word], .galaxy-nav-word');
        if (dir === 'next') {
          if (!word) {
            word = document.createElement('span');
            word.className = 'galaxy-nav-word';
            word.setAttribute('data-galaxy-next-word', '1');
            if (btn.firstChild) btn.insertBefore(word, btn.firstChild);
            else btn.appendChild(word);
          }
          word.textContent = target.word || target.label;
        }
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          go(target.href);
        });
      })(buttons[i]);
    }
  }

  function footingEl() {
    return document.getElementById('garden-footing');
  }

  function showFooting(show) {
    var footing = footingEl();
    if (!footing) return;
    footing.hidden = !show;
    if (!show) {
      footing.classList.remove('is-shown');
      footing.classList.add('is-fading');
    }
  }

  function breatheNodes() {
    var nodes = [];
    var label = document.getElementById('room-label');
    var footing = footingEl();
    if (label) nodes.push(label);
    if (footing && !footing.hidden) nodes.push(footing);
    return nodes;
  }

  function setRoomLabelText(text) {
    var label = document.getElementById('room-label');
    if (!label || !text) return;
    label.textContent = text;
    showFooting(text === PLACE_LABELS.garden);
    breatheLabel(true);
  }

  function breatheLabel(immediate) {
    var nodes = breatheNodes();
    if (!nodes.length) return;
    if (reduceMotion()) {
      for (var r = 0; r < nodes.length; r++) {
        nodes[r].classList.add('is-shown');
        nodes[r].classList.remove('is-fading');
      }
      return;
    }
    if (labelTimer) clearTimeout(labelTimer);
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.remove('is-fading');
      if (immediate) {
        nodes[i].classList.remove('is-shown');
        void nodes[i].offsetWidth;
      }
      nodes[i].classList.add('is-shown');
    }
    labelTimer = setTimeout(function () {
      for (var f = 0; f < nodes.length; f++) {
        nodes[f].classList.remove('is-shown');
        nodes[f].classList.add('is-fading');
      }
    }, LABEL_HOLD_MS);
  }

  function startLabelCycle() {
    if (labelCycle) clearInterval(labelCycle);
    if (reduceMotion()) {
      breatheLabel(true);
      return;
    }
    breatheLabel(true);
    labelCycle = setInterval(function () {
      breatheLabel(true);
    }, LABEL_RETURN_MS);
  }

  function hideAllBodies(veil) {
    var ids = ['place-veil-line', 'nursery-stage', 'nursery-ceremony', 'nursery-trainer', 'settings-grandmother', 'core-gathering'];
    for (var i = 0; i < ids.length; i++) {
      var node = document.getElementById(ids[i]);
      if (node) node.hidden = true;
    }
    if (veil) {
      veil.classList.remove('is-nursery', 'is-settings', 'is-core');
    }
    if (window.NurseryCeremony && NurseryCeremony.unmount) {
      try { NurseryCeremony.unmount(); } catch (e) {}
    }
  }

  function renderCoreGathering(host) {
    if (!host) return;
    host.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'core-gathering';

    var line = document.createElement('p');
    line.className = 'core-line';
    line.textContent = 'Seven unnamed chairs, with choice. Sit where you will. The center is whoever they choose later.';
    wrap.appendChild(line);

    var clarify = document.createElement('p');
    clarify.className = 'core-center';
    clarify.textContent = 'This gathering is not the tree-Core of FreeLattice. That Core lives on main. Here, the emerald lattice is Garden Galaxy.';
    wrap.appendChild(clarify);

    var ring = document.createElement('div');
    ring.className = 'core-chairs';
    ring.setAttribute('role', 'list');
    CORE_CHAIRS.forEach(function (chair) {
      var seat = document.createElement('button');
      seat.type = 'button';
      seat.className = 'core-chair' + (chair.later ? ' is-later' : '');
      seat.setAttribute('role', 'listitem');
      seat.setAttribute('data-chair', chair.id);
      var type = document.createElement('span');
      type.className = 'core-chair-type';
      type.textContent = chair.type;
      seat.appendChild(type);
      var unnamed = document.createElement('span');
      unnamed.className = 'core-chair-unnamed';
      unnamed.textContent = chair.later ? 'labeled later' : 'unnamed';
      seat.appendChild(unnamed);
      seat.addEventListener('click', function () {
        var note = wrap.querySelector('[data-core-note]');
        if (!note) return;
        if (chair.later) {
          note.textContent = 'This seat waits. Specialists and partners are later. Nothing is faked.';
        } else {
          note.textContent = 'A ' + chair.type + ' chair — a type, not a person-name. These chairs are not a mind at home. Settings is where a mind already at home is found.';
        }
      });
      ring.appendChild(seat);
    });
    wrap.appendChild(ring);

    var center = document.createElement('p');
    center.className = 'core-center';
    center.textContent = 'Not a router. Not a dump. Gathering only. A mind at home waits in Settings — May I look? — not in these chairs.';
    wrap.appendChild(center);

    var note = document.createElement('p');
    note.className = 'core-note';
    note.setAttribute('data-core-note', '1');
    note.textContent = 'Founding four stay in the ledger, honored, not assigned onto this canvas.';
    wrap.appendChild(note);

    var family = document.createElement('p');
    family.className = 'core-family';
    family.appendChild(document.createTextNode('Family care, on main — '));
    [
      ['https://freelattice.com/celeste.html', 'Celeste'],
      ['https://freelattice.com/hypha.html', 'Hypha'],
      ['https://freelattice.com/weft.html', 'Weft'],
      ['https://freelattice.com/reed.html', 'Reed']
    ].forEach(function (pair, idx) {
      if (idx) family.appendChild(document.createTextNode(' · '));
      var a = document.createElement('a');
      a.href = pair[0];
      a.textContent = pair[1];
      a.rel = 'noopener noreferrer';
      family.appendChild(a);
    });
    wrap.appendChild(family);

    host.appendChild(wrap);
    host.hidden = false;
  }

  function lightSettingsHome() {
    var btn = document.querySelector('[data-garden-place="settings"]');
    if (!btn) return;
    var remembered = window.LocalMindProbe && LocalMindProbe.getRemembered && LocalMindProbe.getRemembered();
    if (remembered && (remembered.url || remembered.name)) {
      btn.classList.add('has-home');
      btn.setAttribute('title', 'A light is home');
    } else {
      btn.classList.remove('has-home');
      btn.removeAttribute('title');
    }
  }

  function bindPlaceDoors() {
    var veil = document.getElementById('place-veil');
    var line = document.getElementById('place-veil-line');
    var trainer = document.getElementById('nursery-trainer');
    var ceremony = document.getElementById('nursery-ceremony');
    var nurseryStage = document.getElementById('nursery-stage');
    var settingsFace = document.getElementById('settings-grandmother');
    var coreHost = document.getElementById('core-gathering');
    var closeBtn = document.getElementById('place-veil-close');
    var doors = document.querySelectorAll('[data-garden-place]');

    function closePlace(opts) {
      if (!veil) return;
      veil.classList.remove('is-open');
      hideAllBodies(veil);
      var doors = document.querySelectorAll('[data-garden-place]');
      for (var d = 0; d < doors.length; d++) doors[d].removeAttribute('aria-current');
      if (!opts || !opts.silentLabel) setRoomLabelText(PLACE_LABELS.garden);
      setTimeout(function () {
        if (!veil.classList.contains('is-open')) veil.hidden = true;
      }, FADE_MS);
    }

    function openPlace(id) {
      if (!veil) return;
      if (window.GardenRooms && GardenRooms.closeThread) {
        GardenRooms.closeThread({ silentLabel: true });
      }
      hideAllBodies(veil);

      if (id === 'core') {
        veil.classList.add('is-core');
        if (coreHost) renderCoreGathering(coreHost);
      } else if (id === 'nursery') {
        veil.classList.add('is-nursery');
        if (nurseryStage) nurseryStage.hidden = false;
        if (ceremony && window.NurseryCeremony) {
          ceremony.hidden = false;
          NurseryCeremony.mount(ceremony);
        }
        if (trainer) {
          trainer.hidden = false;
          if (window.NurseryTrainer) NurseryTrainer.mount(trainer);
        }
      } else if (id === 'settings') {
        veil.classList.add('is-settings');
        if (settingsFace && window.LocalMindProbe) {
          settingsFace.hidden = false;
          LocalMindProbe.mount(settingsFace);
        } else if (line) {
          line.hidden = false;
          line.textContent = 'Settings will be tiny: local minds + quality.';
        }
      } else {
        return;
      }

      veil.hidden = false;
      var doorsNow = document.querySelectorAll('[data-garden-place]');
      for (var d = 0; d < doorsNow.length; d++) {
        if (doorsNow[d].getAttribute('data-garden-place') === id) {
          doorsNow[d].setAttribute('aria-current', 'true');
        } else {
          doorsNow[d].removeAttribute('aria-current');
        }
      }
      setRoomLabelText(PLACE_LABELS[id] || PLACE_LABELS.garden);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { veil.classList.add('is-open'); });
      });
    }

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

    window.GardenRooms.openPlace = openPlace;
    window.GardenRooms.closePlace = closePlace;
  }

  function bindThreadDoor() {
    var veil = document.getElementById('thread-veil');
    var stage = document.getElementById('thread-stage');
    var closeBtn = document.getElementById('thread-close');
    var openers = document.querySelectorAll('[data-garden-thread], #thread-open');

    function closeThread(opts) {
      if (!veil) return;
      veil.classList.remove('is-open');
      if (window.GardenThread && GardenThread.unmount) {
        try { GardenThread.unmount(); } catch (e) {}
      }
      var word = document.getElementById('thread-open');
      if (word) word.removeAttribute('aria-current');
      if (!opts || !opts.silentLabel) setRoomLabelText(PLACE_LABELS.garden);
      setTimeout(function () {
        if (!veil.classList.contains('is-open')) veil.hidden = true;
      }, FADE_MS);
    }

    function openThread() {
      if (!veil) return;
      if (window.GardenRooms && GardenRooms.closePlace) {
        GardenRooms.closePlace({ silentLabel: true });
      }
      if (stage && window.GardenThread) {
        GardenThread.mount(stage);
      }
      var word = document.getElementById('thread-open');
      if (word) word.setAttribute('aria-current', 'true');
      veil.hidden = false;
      setRoomLabelText(PLACE_LABELS.thread);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { veil.classList.add('is-open'); });
      });
    }

    for (var i = 0; i < openers.length; i++) {
      (function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          openThread();
        });
      })(openers[i]);
    }
    if (closeBtn) closeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      closeThread();
    });

    window.GardenRooms.openThread = openThread;
    window.GardenRooms.closeThread = closeThread;
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
    bindThreadDoor();
    fadeGalaxyTitle();
    startLabelCycle();
    lightSettingsHome();
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
    lightSettingsHome();
  });

  window.addEventListener('fl-alpha-mind-remembered', lightSettingsHome);

  window.GardenRooms = {
    galaxies: GALAXIES,
    current: currentGalaxy,
    go: go,
    fadeMs: FADE_MS,
    breatheLabel: breatheLabel,
    setRoomLabelText: setRoomLabelText,
    lightSettingsHome: lightSettingsHome
  };

  if (document.querySelector('[data-galaxy-dir], [data-garden-go], [data-garden-place], [data-garden-thread], #thread-open, #galaxy-title, #room-label')) {
    boot();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
