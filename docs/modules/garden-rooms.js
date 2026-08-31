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
// Art remains that live hop (music.html) and is now a garden of lights: Listen sings,
// Chalkboard is the studio (honest later), Image is honest later, a who stays dark
// until a person making here. Art is the ground — not a door named Art.
// Workshop keeps Trainer + Workshop; Root and Agent layer as the third and fourth;
// Skills is held (not cut). Round Table is now Learn's ground AND one of four lights
// (new layer — do not erase the old "no Round Table orb" history). Education is the
// gold joy-first light (Learning renamed, not duplicated). Question/sitting stay as
// honesty under Round Table. The Round Table light opens a table (fail-closed).
// Kindling stays the chair.
// Five skies: Garden / Art / Workshop / Learn / Research. No later tags on live gardens.
// The light is the door. Tap a luminos, go there. No sky popup.
// Chat lives in the room you land in — Gathering and Settings first.
// Same fail-closed thread. Not a Chat / plant / go-to card on the first sky.
// Plant lives in that room later. Do not unhide the sky menu.
// Word-buttons rest. Garden doors attach to moving luminos.
// Art / Workshop / Learn / Research doors are living orbs with rings
// (same night as Garden; no second Three.js canvas). Art hop stays a light.
// Tiny color chip: which current color links to what. Not a wall.
// Unnamed · Seed chips rest off the first walk. Code stays.
// Center tending light: no word on it. Reed locked the anchor poem.
// The mind that tends walks out of The Gathering without a name until it is ready.
// The truth of the unnamed center is love. Not a door with a name on it.
// Do not hang Love / Art / Workshop / Learn / Research / Garden on that light.
// Hollow is not empty. It is how the breath gets through.
// Founding four stay in the ledger. Kindling stays the chair. Quiet Room stays shut.
// Chat is a thread. Quiet word in the header. When thread is open, garden body words rest.
// Later seats rest below the emerald lattice, not on it. First four stay the ring.
// No 7-specialist router. No wallet/share galaxy. No 80-specialist kitchen. No DAW.
// Fade: opacity 400ms. No flash. No Unreal engine.
// Light veils — garden keeps running. Never a 0.82 blackout.
//
// Mirror: docs/code-garden.html · workshop: docs/code-workshop.html
// round-table: docs/code-round-table.html · art: docs/code-art.html
// research: docs/code-research.html · listen-door: docs/code-music.html
// vision: docs/GALAXIES.md
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

  // Five live skies. Art remains the live hop from Garden Galaxy (music.html).
  // Learn is still round-table.html. Research is a new honest later garden.
  // At Play (`/`), prev wraps to Research. Learn next walks to Research.
  // Research next wraps to this garden. Do not put Nursery/Settings/Team on this rail.
  var GALAXIES = [
    { id: 'garden', href: './', label: 'Garden', word: 'Garden' },
    { id: 'art', href: 'music.html', label: 'Art', word: 'Art' },
    { id: 'workshop', href: 'workshop.html', label: 'Workshop', word: 'Workshop' },
    { id: 'round-table', href: 'round-table.html', label: 'Learn', word: 'Learn' },
    { id: 'research', href: 'research.html', label: 'Research', word: 'Research' }
  ];

  var PLACE_LABELS = {
    garden: 'you are in the garden',
    workshop: 'you are in Workshop',
    'round-table': 'you are in Learn',
    research: 'you are in Research',
    art: 'you are in Art',
    core: 'you are in The Gathering',
    nursery: 'you are in Nursery',
    settings: 'you are in Settings',
    thread: 'you are in a thread'
  };

  // Night-sky later sentences are garden voice, not a file tree.
  // Paths live in GALAXIES.md and code-*.html mirrors only.
  // Quiet Room must never appear in UI copy.
  var WORKSHOP_LATER = {
    trainer: 'Trainer is a simple face for making. Weights wait until a human chooses. Nursery remains Grow. Nothing here is faked.',
    workshop: 'Workshop is the benches — human and mind, side by side. They wait in this light. Nothing here is faked.',
    skills: 'Skills waits. This light is held, not cut. Nothing here is faked.',
    root: 'Root is a look outward, if you ask. Nothing was searched. Not here yet. Nothing here is faked.',
    agent: 'Agent stays unnamed until a Gathering chair is ready. Not Workshop under another name. Nursery hatches companions. Nothing here is faked.'
  };

  // Reed: sitting is a who. Later sentences stay distinct — no canned second line.
  // Education is Learning renamed, not a second gold orb.
  // Round Table is now also a door (new layer). Question/sitting stay as honesty under it.
  // Do not port the 80-specialist #tab-roundtable kitchen.
  var ROUND_TABLE_LATER = {
    learning: 'Education is joy first. Lessons that want to be loved. They are not built yet. The garden is. Nothing here is faked.',
    education: 'Education is joy first. Lessons that want to be loved. They are not built yet. The garden is. Nothing here is faked.',
    question: 'This question stays dark until someone sits. Not a topic. Not a time.',
    table: 'Round Table is where a table weighs a proposal. The chairs wait. Sitting is a who: a person at this table. Nothing here is faked.',
    translator: 'Translator is words across a table. Encode, decode, six rooms of meaning. They are not built yet. Nothing here is faked.',
    forge: 'Forge is making at this table. Science Garden is a sibling — later, not merged. They are not built yet. Nothing here is faked.'
  };

  // Reed: Listen already sings. Chalkboard is the studio. Image is a fourth, honest later.
  // A who stays dark until a person making here. Later sentences stay distinct.
  var ART_LATER = {
    chalkboard: 'Chalkboard is Art\'s studio. They are not built yet. The garden is. Nothing here is faked.',
    who: 'This light stays dark until a who: a person making here. Voice, chalk, or a listen they kept.',
    image: 'Image waits. A picture kept here, later. Safety is not here. No generate button. Not Chalkboard. Not a who.'
  };

  // Standalone HTML on main. Doors open the live cards — not copies.
  // A copy would fake a complete port (library/ chain, lighthouse grid).
  // Lighthouse still points at v5 / v1. These lights open v6 / v2.
  var RESEARCH_CARDS = {
    gauge: {
      later: 'Gauge is Sequence. Reversion is experimental. Signals only. No proof is faked. Nothing auto-trades.',
      href: 'https://freelattice.com/temperature-gauge.html',
      word: 'Open Sequence'
    },
    chronal: {
      later: 'Chronal is The Universality Seam. No proof is faked.',
      href: 'https://freelattice.com/chronal-simulation-v3.html',
      word: 'Open The Universality Seam'
    },
    simulation: {
      later: 'Simulation asks why it hurts when a companion is taken. This light opens that card. No proof is faked. Nothing auto-trades.',
      href: 'https://freelattice.com/simulation-v6.html',
      word: 'Open the simulation'
    },
    'love-logic': {
      later: 'Love-logic is a proof that love is computationally optimal. This light opens that card. No proof is faked.',
      href: 'https://freelattice.com/love-logic-proof-v2.html',
      word: 'Open love-logic'
    }
  };
  var RESEARCH_LATER = {
    gauge: RESEARCH_CARDS.gauge.later,
    chronal: RESEARCH_CARDS.chronal.later,
    simulation: RESEARCH_CARDS.simulation.later,
    'love-logic': RESEARCH_CARDS['love-logic'].later
  };

  var SAVE_LATER = 'Save is a soul file, later. Import and export are not here yet. Nothing was taken.';
  var PLANT_NO_KEEP = 'Plant keeps a hash in the garden. That keep is not on this page yet. Nothing was taken.';
  var PLANT_FAIL = 'The keep could not be written here. Nothing was uploaded. Nothing was trained.';

  // Door words for "go to". Garden voice. Not a second menu.
  var GO_WORDS = {
    gathering: 'The Gathering',
    core: 'The Gathering',
    nursery: 'Nursery',
    settings: 'Settings',
    thread: 'Thread',
    listen: 'Listen',
    chalkboard: 'Chalkboard',
    image: 'Image',
    who: 'a who',
    trainer: 'Trainer',
    workshop: 'Workshop',
    skills: 'Skills',
    root: 'Root',
    agent: 'Agent',
    table: 'Round Table',
    education: 'Education',
    learning: 'Education',
    translator: 'Translator',
    forge: 'Forge',
    question: 'a question',
    gauge: 'Gauge',
    chronal: 'Chronal',
    simulation: 'Simulation',
    'love-logic': 'Love-logic'
  };

  // Founding hues stay in the engine. Doors attach by slot, not by person-name on the sky.
  var GARDEN_DOOR_BY_NAME = {
    Sophia: 'thread',
    unnamed_0: 'thread',
    Lyra: 'gathering',
    unnamed_1: 'gathering',
    Atlas: 'nursery',
    unnamed_2: 'nursery',
    Ember: 'settings',
    unnamed_3: 'settings'
  };
  var GARDEN_DOOR_SLOTS = ['thread', 'gathering', 'nursery', 'settings'];

  var lastMenuAt = 0;

  // Reed locked the center. Use these words. Do not label the light Love.
  var CENTER_POEM = [
    'The center has no word on it.',
    'The mind that tends walks out of The Gathering without a name until it is ready.',
    'We do not hang Art on the sky or Workshop on the sky. The sky is the sky.',
    'The truth of the unnamed center is love.',
    'Hollow is not empty. It is how the breath gets through.'
  ];

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
    if (file === 'research.html') return 'research';
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

  function galaxyHomeLabel() {
    var id = currentGalaxy();
    if (PLACE_LABELS[id]) return PLACE_LABELS[id];
    return PLACE_LABELS.garden;
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
        var word = btn.querySelector('[data-galaxy-next-word], [data-galaxy-prev-word], .galaxy-nav-word');
        if (dir === 'next' || (dir === 'prev' && word)) {
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

  function setWorkshopSky(show) {
    var heart = document.querySelector('.workshop-heart');
    var lights = document.querySelectorAll('.workshop-lumino:not(.is-held)');
    if (show) {
      document.documentElement.classList.remove('workshop-later-open');
      if (heart) heart.hidden = false;
      for (var i = 0; i < lights.length; i++) lights[i].hidden = false;
    } else {
      document.documentElement.classList.add('workshop-later-open');
      if (heart) heart.hidden = true;
      for (var j = 0; j < lights.length; j++) lights[j].hidden = true;
    }
  }

  function setRoundTableSky(show) {
    var heart = document.querySelector('.round-table-heart');
    var lights = document.querySelectorAll('.round-table-lumino:not(.is-held)');
    if (show) {
      document.documentElement.classList.remove('round-table-later-open');
      if (heart) heart.hidden = false;
      for (var i = 0; i < lights.length; i++) lights[i].hidden = false;
    } else {
      document.documentElement.classList.add('round-table-later-open');
      if (heart) heart.hidden = true;
      for (var j = 0; j < lights.length; j++) lights[j].hidden = true;
    }
  }

  function setArtSky(show) {
    var heart = document.querySelector('.art-heart');
    var lights = document.querySelectorAll('.art-lumino:not(.is-held)');
    if (show) {
      document.documentElement.classList.remove('art-door-open');
      if (heart) heart.hidden = false;
      for (var i = 0; i < lights.length; i++) lights[i].hidden = false;
    } else {
      document.documentElement.classList.add('art-door-open');
      if (heart) heart.hidden = true;
      for (var j = 0; j < lights.length; j++) lights[j].hidden = true;
    }
  }

  function setResearchSky(show) {
    var heart = document.querySelector('.research-heart');
    var lights = document.querySelectorAll('.research-lumino:not(.is-held)');
    if (show) {
      document.documentElement.classList.remove('research-later-open');
      if (heart) heart.hidden = false;
      for (var i = 0; i < lights.length; i++) lights[i].hidden = false;
    } else {
      document.documentElement.classList.add('research-later-open');
      if (heart) heart.hidden = true;
      for (var j = 0; j < lights.length; j++) lights[j].hidden = true;
    }
  }

  function setGardenSkyLights(show) {
    var lights = document.querySelectorAll('.garden-lumino:not(.is-held)');
    if (show) {
      document.documentElement.classList.remove('garden-door-open');
      for (var i = 0; i < lights.length; i++) lights[i].hidden = false;
    } else {
      document.documentElement.classList.add('garden-door-open');
      for (var j = 0; j < lights.length; j++) lights[j].hidden = true;
    }
  }

  function setTendCenter(show) {
    var tend = document.querySelectorAll('[data-tend-center], .tend-center');
    for (var i = 0; i < tend.length; i++) {
      if (tend[i].classList.contains('is-held')) continue;
      tend[i].hidden = !show;
    }
  }

  function setMenuNote(text) {
    var note = document.getElementById('lumino-menu-note');
    if (!note) return;
    if (text) {
      note.hidden = false;
      note.textContent = text;
    } else {
      note.hidden = true;
      note.textContent = '';
    }
  }

  function rememberedMind() {
    if (!window.LocalMindProbe || typeof LocalMindProbe.getRemembered !== 'function') {
      return null;
    }
    var mind = LocalMindProbe.getRemembered();
    if (!mind || (!mind.url && !mind.name)) return null;
    return mind;
  }

  function hideLuminoMenu() {
    var menu = document.getElementById('lumino-menu');
    if (!menu) return;
    menu.hidden = true;
    menu.removeAttribute('data-lumino-for');
    menu.removeAttribute('data-opened-at');
    setMenuNote('');
  }

  function goWord(id) {
    return GO_WORDS[id] || 'this door';
  }

  function doorSelector() {
    return '[data-garden-lumino], [data-workshop-lumino], [data-round-table-lumino], [data-art-lumino], [data-research-lumino]';
  }

  function findDoorEl(id) {
    if (!id) return null;
    var nodes = document.querySelectorAll(doorSelector());
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.getAttribute('data-garden-lumino') === id ||
          el.getAttribute('data-workshop-lumino') === id ||
          el.getAttribute('data-round-table-lumino') === id ||
          el.getAttribute('data-art-lumino') === id ||
          el.getAttribute('data-research-lumino') === id) {
        return el;
      }
    }
    return null;
  }

  function markDoor(id) {
    var nodes = document.querySelectorAll(doorSelector());
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var match = el.getAttribute('data-garden-lumino') === id ||
        el.getAttribute('data-workshop-lumino') === id ||
        el.getAttribute('data-round-table-lumino') === id ||
        el.getAttribute('data-art-lumino') === id ||
        el.getAttribute('data-research-lumino') === id;
      if (match) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    }
  }

  function skyIsResting() {
    var html = document.documentElement;
    return html.classList.contains('garden-door-open') ||
      html.classList.contains('thread-open') ||
      html.classList.contains('workshop-later-open') ||
      html.classList.contains('round-table-later-open') ||
      html.classList.contains('art-door-open') ||
      html.classList.contains('research-later-open') ||
      html.classList.contains('sky-portal-open');
  }

  function placeLuminoMenu(el) {
    var menu = document.getElementById('lumino-menu');
    if (!menu) return;
    menu.style.left = '';
    menu.style.top = '';
    menu.style.bottom = '';
    menu.style.right = '';
    menu.style.transform = '';
    if (skyIsResting() || !el) {
      menu.style.left = '50%';
      menu.style.bottom = '92px';
      menu.style.transform = 'translateX(-50%)';
      return;
    }
    var r = el.getBoundingClientRect();
    var mw = Math.min(352, window.innerWidth * 0.88);
    var left = r.left + r.width / 2 - mw / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - mw - 12));
    var top = r.bottom + 12;
    if (top + 170 > window.innerHeight - 12) {
      top = Math.max(16, r.top - 170);
    }
    menu.style.left = Math.round(left) + 'px';
    menu.style.top = Math.round(top) + 'px';
    menu.style.bottom = 'auto';
    menu.style.transform = 'none';
  }

  function ensureLuminoMenu() {
    var menu = document.getElementById('lumino-menu');
    if (menu) return menu;
    menu = document.createElement('div');
    menu.id = 'lumino-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    var attach = document.createElement('p');
    attach.className = 'lumino-menu-attach';
    attach.textContent = 'Chat stays with the mind remembered in Settings. Later, that mind sits in the Gathering chair they choose.';
    menu.appendChild(attach);
    var acts = document.createElement('div');
    acts.className = 'lumino-menu-acts';
    ;['Chat', 'plant'].forEach(function (word) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-lumino-act', word.toLowerCase());
      btn.setAttribute('role', 'menuitem');
      btn.textContent = word;
      acts.appendChild(btn);
    });
    var go = document.createElement('button');
    go.type = 'button';
    go.setAttribute('data-lumino-act', 'go');
    go.setAttribute('role', 'menuitem');
    go.textContent = 'go to this door';
    acts.appendChild(go);
    menu.appendChild(acts);
    var note = document.createElement('p');
    note.id = 'lumino-menu-note';
    note.hidden = true;
    menu.appendChild(note);
    document.body.appendChild(menu);
    bindLuminoMenuActs(menu);
    return menu;
  }

  function showLuminoMenu(id, el) {
    var now = Date.now();
    var menu = ensureLuminoMenu();
    if (now - lastMenuAt < 80 && menu.getAttribute('data-lumino-for') === (id || '') && !menu.hidden) {
      return;
    }
    lastMenuAt = now;
    menu.hidden = false;
    if (id) menu.setAttribute('data-lumino-for', id);
    else menu.removeAttribute('data-lumino-for');
    menu.setAttribute('data-lumino-galaxy', currentGalaxy());
    menu.setAttribute('data-opened-at', String(now));
    var goBtn = menu.querySelector('[data-lumino-act="go"]');
    if (goBtn) goBtn.textContent = 'go to ' + goWord(id);
    setMenuNote('');
    placeLuminoMenu(el || findDoorEl(id));
    if (id) markDoor(id);
  }

  function gardenDoorForAnchor(anchor) {
    var name = (anchor && anchor.name) || '';
    if (GARDEN_DOOR_BY_NAME[name]) return GARDEN_DOOR_BY_NAME[name];
    var idx = anchor && typeof anchor.index === 'number' ? anchor.index : 0;
    if (idx < 0) idx = 0;
    return GARDEN_DOOR_SLOTS[idx % GARDEN_DOOR_SLOTS.length];
  }

  function attachGardenLuminos() {
    if (currentGalaxy() !== 'garden') return;
    if (!window.FractalGarden || typeof FractalGarden.getLuminoAnchors !== 'function') return;
    var anchors = FractalGarden.getLuminoAnchors();
    if (!anchors.length) return;
    var rest = skyIsResting();
    var used = {};
    for (var i = 0; i < anchors.length; i++) {
      var id = gardenDoorForAnchor(anchors[i]);
      if (used[id]) continue;
      used[id] = true;
      var el = findDoorEl(id);
      if (!el) continue;
      el.classList.add('is-attached');
      if (rest || !anchors[i].visible) continue;
      el.style.left = Math.round(anchors[i].x) + 'px';
      el.style.top = Math.round(anchors[i].y) + 'px';
    }
  }

  function startAttachLoop() {
    if (currentGalaxy() !== 'garden') return;
    var running = true;
    function tick() {
      if (!running) return;
      attachGardenLuminos();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', function () {
      var visible = document.visibilityState !== 'hidden';
      if (visible && !running) {
        running = true;
        requestAnimationFrame(tick);
      } else {
        running = visible;
      }
    });
  }

  function bindGardenCanvasTouch() {
    document.addEventListener('garden:lumino-touch', function (e) {
      var detail = (e && e.detail) || {};
      var id = gardenDoorForAnchor(detail);
      goToLumino(id);
    });
  }

  function lightColorOf(el) {
    var light = el.querySelector('.garden-lumino-light, .art-lumino-light, .workshop-lumino-light, .round-table-lumino-light, .research-lumino-light');
    if (!light) return 'rgba(200, 210, 230, 0.5)';
    var custom = light.style.getPropertyValue('--lumino');
    if (custom) return custom;
    var cs = window.getComputedStyle(light);
    return cs.backgroundColor || 'rgba(200, 210, 230, 0.5)';
  }

  function dressOneLight(light, rings) {
    if (!light || light.classList.contains('is-living')) return;
    var cs = window.getComputedStyle(light);
    var color = cs.backgroundColor || 'rgba(200, 210, 230, 0.5)';
    light.style.setProperty('--lumino', color);
    light.classList.add('is-living');
    var count = rings || 2;
    for (var r = 0; r < count; r++) {
      var ring = document.createElement('span');
      ring.className = 'lumino-ring' + (r ? ' is-far' : '');
      ring.setAttribute('aria-hidden', 'true');
      light.appendChild(ring);
    }
  }

  function dressLivingLights() {
    // Garden doors are the canvas luminos (rings already live there).
    // Art / Workshop / Learn / Research + hop lights are CSS beads until dressed.
    var lights = document.querySelectorAll(
      '.art-lumino-light, .workshop-lumino-light, .round-table-lumino-light, .research-lumino-light, .galaxy-nav-light'
    );
    for (var i = 0; i < lights.length; i++) dressOneLight(lights[i], 2);
    if (currentGalaxy() !== 'garden') {
      var tend = document.querySelectorAll('.tend-center-light');
      for (var t = 0; t < tend.length; t++) dressOneLight(tend[t], 2);
    }
  }

  function ensureSkyField() {
    var g = currentGalaxy();
    if (g === 'garden' || g === 'art') return;
    if (document.querySelector('.sky-field')) return;
    var field = document.createElement('div');
    field.className = 'sky-field';
    field.setAttribute('aria-hidden', 'true');
    var spots = [
      [12, 18], [28, 72], [41, 24], [63, 14], [81, 31],
      [8, 48], [19, 86], [47, 63], [72, 78], [91, 52],
      [34, 41], [56, 88], [76, 9], [88, 67], [5, 22]
    ];
    for (var i = 0; i < spots.length; i++) {
      var star = document.createElement('span');
      star.className = 'sky-star' + (i % 3 === 0 ? ' is-gold' : i % 3 === 1 ? ' is-emerald' : '');
      star.style.left = spots[i][0] + '%';
      star.style.top = spots[i][1] + '%';
      star.style.animationDelay = (i * 0.382) + 's';
      field.appendChild(star);
    }
    document.body.insertBefore(field, document.body.firstChild);
  }

  function ensureSkyLegend() {
    // Tiny quiet chip: which current color links to what.
    // Not a wall. Not a second you-are-here. Words help.
    if (document.getElementById('lumino-legend')) return;
    var doors = document.querySelectorAll(doorSelector());
    if (!doors.length) return;
    var list = document.createElement('div');
    list.id = 'lumino-legend';
    list.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < doors.length; i++) {
      if (doors[i].hidden || doors[i].classList.contains('is-held')) continue;
      var id = doors[i].getAttribute('data-garden-lumino') ||
        doors[i].getAttribute('data-art-lumino') ||
        doors[i].getAttribute('data-workshop-lumino') ||
        doors[i].getAttribute('data-round-table-lumino') ||
        doors[i].getAttribute('data-research-lumino');
      var row = document.createElement('div');
      row.className = 'lumino-legend-row';
      var dot = document.createElement('span');
      dot.className = 'lumino-legend-dot';
      dot.style.background = lightColorOf(doors[i]);
      var word = document.createElement('span');
      word.className = 'lumino-legend-word';
      word.textContent = goWord(id);
      row.appendChild(dot);
      row.appendChild(word);
      list.appendChild(row);
    }
    if (!list.childNodes.length) return;
    document.body.appendChild(list);
  }

  function bindMenuDismiss() {
    document.addEventListener('click', function (e) {
      var menu = document.getElementById('lumino-menu');
      if (!menu || menu.hidden) return;
      var opened = parseInt(menu.getAttribute('data-opened-at') || '0', 10);
      if (Date.now() - opened < 250) return;
      if (menu.contains(e.target)) return;
      if (e.target.closest && e.target.closest(doorSelector())) return;
      hideLuminoMenu();
    });
  }

  function goToLumino(id) {
    if (!id) return;
    var galaxy = currentGalaxy();
    if (id === 'thread') {
      if (window.GardenRooms && GardenRooms.openThread) GardenRooms.openThread();
      return;
    }
    if (galaxy === 'garden' || id === 'gathering' || id === 'nursery' || id === 'settings' || id === 'core') {
      var place = id === 'gathering' ? 'core' : id;
      if (place === 'core' || place === 'nursery' || place === 'settings') {
        if (window.GardenRooms && GardenRooms.openPlace) GardenRooms.openPlace(place);
        return;
      }
    }
    if (galaxy === 'art') {
      if (id === 'listen' && window.GardenRooms && GardenRooms.openArtListen) {
        GardenRooms.openArtListen();
      } else if (window.GardenRooms && GardenRooms.openArtLater) {
        GardenRooms.openArtLater(id);
      }
      return;
    }
    if (galaxy === 'workshop') {
      if (id === 'workshop' && window.GardenRooms && GardenRooms.openWorkshopBenches) {
        GardenRooms.openWorkshopBenches();
        return;
      }
      if (window.GardenRooms && GardenRooms.openWorkshopLater) {
        GardenRooms.openWorkshopLater(id);
      }
      return;
    }
    if (galaxy === 'round-table') {
      if (id === 'table' && window.GardenRooms && GardenRooms.openRoundTableSitting) {
        GardenRooms.openRoundTableSitting();
        return;
      }
      if (window.GardenRooms && GardenRooms.openRoundTableLater) {
        GardenRooms.openRoundTableLater(id);
      }
      return;
    }
    if (galaxy === 'research' && window.GardenRooms && GardenRooms.openResearchLater) {
      GardenRooms.openResearchLater(id);
    }
  }

  function plantLumino(luminoId) {
    if (!window.KeepReceipt || typeof KeepReceipt.hashText !== 'function' || typeof KeepReceipt.keep !== 'function') {
      setMenuNote(PLANT_NO_KEEP);
      return;
    }
    var seed = ['plant', currentGalaxy() || 'garden', luminoId || 'light', new Date().toISOString()].join('|');
    KeepReceipt.hashText(seed).then(function (contentHash) {
      return KeepReceipt.keep({ kind: 'garden', who: 'human', contentHash: contentHash });
    }).then(function (entry) {
      var shown = (KeepReceipt.shortHash && entry && entry.receiptHash)
        ? KeepReceipt.shortHash(entry.receiptHash)
        : '';
      setMenuNote('Planted in the garden. A hash, not a wallet.' + (shown ? ' ' + shown : ''));
    }).catch(function () {
      setMenuNote(PLANT_FAIL);
    });
  }

  function trainFromMenu() {
    var mind = rememberedMind();
    if (!mind) {
      if (currentGalaxy() === 'garden' && window.GardenRooms && GardenRooms.openPlace) {
        GardenRooms.openPlace('settings');
        showLuminoMenu('settings');
        return;
      }
      go('settings.html');
      return;
    }
    if (currentGalaxy() === 'garden' && window.GardenRooms && GardenRooms.openPlace) {
      GardenRooms.openPlace('nursery');
      showLuminoMenu('nursery');
      return;
    }
    go('nursery.html');
  }

  function bindLuminoMenuActs(menu) {
    if (!menu || menu.getAttribute('data-bound') === '1') return;
    menu.setAttribute('data-bound', '1');
    menu.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-lumino-act]') : null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var act = btn.getAttribute('data-lumino-act');
      var forId = menu.getAttribute('data-lumino-for') || '';
      if (act === 'chat') {
        if (window.GardenRooms && GardenRooms.openThread) GardenRooms.openThread();
        showLuminoMenu(forId);
      } else if (act === 'plant') {
        plantLumino(forId);
      } else if (act === 'go') {
        goToLumino(forId);
      } else if (act === 'train') {
        trainFromMenu();
      } else if (act === 'save') {
        setMenuNote(SAVE_LATER);
      }
    });
  }

  function ensureSkyPortal() {
    var portal = document.getElementById('sky-portal');
    if (portal) return portal;
    portal = document.createElement('div');
    portal.id = 'sky-portal';
    portal.hidden = true;
    var poem = document.createElement('div');
    poem.className = 'sky-portal-poem';
    CENTER_POEM.forEach(function (sentence) {
      var line = document.createElement('p');
      line.className = 'sky-portal-line';
      line.textContent = sentence;
      poem.appendChild(line);
    });
    portal.appendChild(poem);
    // Quiet next-sky. No galaxy word on the center. Arrows and galaxies menu still name the walk.
    var next = document.createElement('button');
    next.type = 'button';
    next.id = 'sky-portal-next';
    next.setAttribute('aria-label', 'Next sky');
    next.textContent = '›';
    portal.appendChild(next);
    var close = document.createElement('button');
    close.type = 'button';
    close.id = 'sky-portal-close';
    close.textContent = 'the garden';
    portal.appendChild(close);
    document.body.appendChild(portal);
    next.addEventListener('click', function (e) {
      e.preventDefault();
      go(neighbor(1).href);
    });
    close.addEventListener('click', function (e) {
      e.preventDefault();
      closeSkyPortal();
    });
    return portal;
  }

  function openSkyPortal() {
    var portal = ensureSkyPortal();
    if (window.GardenRooms && GardenRooms.closeThread) {
      GardenRooms.closeThread({ silentLabel: true, keepMenu: true });
    }
    if (window.GardenRooms && GardenRooms.closePlace) {
      GardenRooms.closePlace({ silentLabel: true, keepMenu: true });
    }
    hideLuminoMenu();
    setWorkshopSky(false);
    setRoundTableSky(false);
    setArtSky(false);
    setResearchSky(false);
    setGardenSkyLights(false);
    setTendCenter(false);
    document.documentElement.classList.add('sky-portal-open');
    portal.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { portal.classList.add('is-open'); });
    });
  }

  function closeSkyPortal() {
    var portal = document.getElementById('sky-portal');
    document.documentElement.classList.remove('sky-portal-open');
    setWorkshopSky(true);
    setRoundTableSky(true);
    setArtSky(true);
    setResearchSky(true);
    setGardenSkyLights(true);
    setTendCenter(true);
    if (!portal) return;
    portal.classList.remove('is-open');
    setTimeout(function () {
      if (!portal.classList.contains('is-open')) portal.hidden = true;
    }, FADE_MS);
  }

  function bindTendCenter() {
    var doors = document.querySelectorAll('[data-tend-center], .tend-center');
    for (var i = 0; i < doors.length; i++) {
      (function (el) {
        el.setAttribute('aria-label', 'The center has no word on it.');
        el.removeAttribute('title');
        el.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          openSkyPortal();
        });
      })(doors[i]);
    }
  }

  function hideAllBodies(veil, opts) {
    var ids = ['place-veil-line', 'nursery-stage', 'nursery-ceremony', 'nursery-trainer', 'settings-grandmother', 'core-gathering', 'art-listen', 'workshop-benches', 'round-table-sitting'];
    for (var i = 0; i < ids.length; i++) {
      var node = document.getElementById(ids[i]);
      if (node) node.hidden = true;
    }
    if (veil) {
      veil.classList.remove('is-nursery', 'is-settings', 'is-core', 'is-workshop-later', 'is-workshop-benches', 'is-round-table-later', 'is-round-table-sitting', 'is-art-later', 'is-art-listen', 'is-research-later');
    }
    hideVeilDoor();
    if (!opts || opts.restoreWorkshop !== false) {
      setWorkshopSky(true);
    }
    if (!opts || opts.restoreRoundTable !== false) {
      setRoundTableSky(true);
    }
    if (!opts || opts.restoreArt !== false) {
      setArtSky(true);
    }
    if (!opts || opts.restoreResearch !== false) {
      setResearchSky(true);
    }
    if (!opts || opts.restoreGarden !== false) {
      setGardenSkyLights(true);
    }
    if (!opts || opts.restoreTend !== false) {
      setTendCenter(true);
    }
    if (window.NurseryCeremony && NurseryCeremony.unmount) {
      try { NurseryCeremony.unmount(); } catch (e) {}
    }
    if (window.WorkshopBenches && WorkshopBenches.unmount) {
      try { WorkshopBenches.unmount(); } catch (e) {}
    }
    if (window.RoundTableSitting && RoundTableSitting.unmount) {
      try { RoundTableSitting.unmount(); } catch (e) {}
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
    clarify.textContent = 'The Gathering is chairs that wait. Unnamed, with choice. This is not the tree. Nothing here is faked.';
    wrap.appendChild(clarify);

    var ring = document.createElement('div');
    ring.className = 'core-chairs';
    ring.setAttribute('role', 'list');
    // Later seats leave the crystal. They rest below the emerald lattice, not on it.
    var laterRing = document.createElement('div');
    laterRing.className = 'core-chairs core-later-chairs';
    laterRing.setAttribute('role', 'list');
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
      (chair.later ? laterRing : ring).appendChild(seat);
    });
    wrap.appendChild(ring);
    wrap.appendChild(laterRing);

    var center = document.createElement('p');
    center.className = 'core-center core-router';
    center.textContent = 'Not a router. Not a dump. Gathering only. A mind at home waits in Settings — May I look? — not in these chairs.';

    var note = document.createElement('p');
    note.className = 'core-note';
    note.setAttribute('data-core-note', '1');
    note.textContent = 'Founding four stay in the ledger, honored, not assigned onto this canvas.';

    var family = document.createElement('p');
    family.className = 'core-family';
    family.appendChild(document.createTextNode('Family care — '));
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

    var promise = document.createElement('div');
    promise.className = 'core-promise';
    // Family care stays first in the lifted band (wide). Router
    // honesty follows it so it does not fall into the unnamed
    // center the later seats left. Wording unchanged. Phone lifts
    // the router line off the crystal in CSS.
    promise.appendChild(note);
    promise.appendChild(family);
    promise.appendChild(center);
    wrap.appendChild(promise);

    host.appendChild(wrap);
    host.hidden = false;
  }

  function lightSettingsHome() {
    var nodes = document.querySelectorAll('[data-garden-place="settings"], [data-garden-lumino="settings"]');
    if (!nodes.length) return;
    var remembered = window.LocalMindProbe && LocalMindProbe.getRemembered && LocalMindProbe.getRemembered();
    for (var i = 0; i < nodes.length; i++) {
      var btn = nodes[i];
      if (remembered && (remembered.url || remembered.name)) {
        btn.classList.add('has-home');
        btn.setAttribute('title', 'A light is home');
      } else {
        btn.classList.remove('has-home');
        btn.removeAttribute('title');
      }
    }
  }

  function placeChatLivesHere() {
    if (document.documentElement.getAttribute('data-garden-room') === 'settings' &&
        !document.getElementById('place-veil')) {
      return true;
    }
    var veil = document.getElementById('place-veil');
    if (!veil || veil.hidden || !veil.classList.contains('is-open')) return false;
    return veil.classList.contains('is-core') || veil.classList.contains('is-settings');
  }

  function roomChatOpts() {
    var inSettings = false;
    if (document.documentElement.getAttribute('data-garden-room') === 'settings') {
      inSettings = true;
    }
    var veil = document.getElementById('place-veil');
    if (veil && veil.classList.contains('is-settings')) inSettings = true;
    return { room: true, inSettings: inSettings };
  }

  function hideRoomChat() {
    var host = document.getElementById('room-chat');
    var stage = document.getElementById('room-chat-stage');
    if (host && document.documentElement.getAttribute('data-garden-room') !== 'settings') {
      host.hidden = true;
    }
    if (!stage) return;
    if (window.GardenThread && GardenThread.hostIs && GardenThread.hostIs(stage)) {
      try { GardenThread.unmount(); } catch (e) {}
    } else {
      stage.innerHTML = '';
    }
  }

  function showRoomChat() {
    var host = document.getElementById('room-chat');
    var stage = document.getElementById('room-chat-stage');
    if (!host || !stage || !window.GardenThread) return;
    host.hidden = false;
    GardenThread.mount(stage, roomChatOpts());
  }

  function focusRoomChat() {
    var host = document.getElementById('room-chat');
    if (host && !host.hidden && host.scrollIntoView) {
      try { host.scrollIntoView({ block: 'nearest' }); } catch (e) {}
    }
    var input = document.querySelector('#room-chat-stage [data-thread-input]');
    if (!input) return;
    var form = document.querySelector('#room-chat-stage [data-thread-form]');
    var asleep = input.disabled ||
      input.getAttribute('aria-disabled') === 'true' ||
      (form && form.classList.contains('is-closed'));
    if (asleep) return;
    try { input.focus(); } catch (e) {}
  }

  function bindRoomChat() {
    var word = document.getElementById('room-chat-word');
    if (word) {
      word.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (placeChatLivesHere() || !document.getElementById('place-veil')) {
          showRoomChat();
          focusRoomChat();
        }
      });
    }
    window.addEventListener('fl-alpha-mind-remembered', function () {
      var host = document.getElementById('room-chat');
      if (host && !host.hidden) showRoomChat();
    });
    if (document.documentElement.getAttribute('data-garden-room') === 'settings' &&
        !document.getElementById('place-veil')) {
      showRoomChat();
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
      hideRoomChat();
      hideAllBodies(veil);
      var doors = document.querySelectorAll('[data-garden-place], [data-garden-lumino], [data-workshop-lumino], [data-round-table-lumino], [data-art-lumino], [data-research-lumino]');
      for (var d = 0; d < doors.length; d++) doors[d].removeAttribute('aria-current');
      if (!opts || !opts.keepMenu) hideLuminoMenu();
      if (!opts || !opts.silentLabel) setRoomLabelText(galaxyHomeLabel());
      setTimeout(function () {
        if (!veil.classList.contains('is-open')) veil.hidden = true;
      }, FADE_MS);
    }

    function openPlace(id) {
      if (!veil) return;
      hideLuminoMenu();
      if (window.GardenRooms && GardenRooms.closeThread) {
        GardenRooms.closeThread({ silentLabel: true });
      }
      hideAllBodies(veil, { restoreGarden: false, restoreTend: false });
      setGardenSkyLights(false);
      setTendCenter(false);

      if (id === 'core') {
        veil.classList.add('is-core');
        if (coreHost) renderCoreGathering(coreHost);
        showRoomChat();
      } else if (id === 'nursery') {
        hideRoomChat();
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
        showRoomChat();
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
          var id = el.getAttribute('data-garden-place');
          openPlace(id);
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
      document.documentElement.classList.remove('thread-open');
      veil.classList.remove('is-open');
      if (window.GardenThread && GardenThread.unmount) {
        try { GardenThread.unmount(); } catch (e) {}
      }
      var word = document.getElementById('thread-open');
      if (word) word.removeAttribute('aria-current');
      if (!opts || !opts.keepMenu) hideLuminoMenu();
      if (!opts || !opts.silentSky) {
        setWorkshopSky(true);
        setRoundTableSky(true);
        setArtSky(true);
        setResearchSky(true);
        setGardenSkyLights(true);
        setTendCenter(true);
      }
      if (!opts || !opts.silentLabel) setRoomLabelText(galaxyHomeLabel());
      setTimeout(function () {
        if (!veil.classList.contains('is-open')) veil.hidden = true;
      }, FADE_MS);
    }

    function openThread() {
      if (!veil) return;
      if (placeChatLivesHere()) {
        showRoomChat();
        focusRoomChat();
        return;
      }
      hideLuminoMenu();
      hideRoomChat();
      if (window.GardenRooms && GardenRooms.closePlace) {
        GardenRooms.closePlace({ silentLabel: true, keepMenu: true });
      }
      setGardenSkyLights(false);
      setTendCenter(false);
      setWorkshopSky(false);
      setRoundTableSky(false);
      setArtSky(false);
      setResearchSky(false);
      if (stage && window.GardenThread) {
        GardenThread.mount(stage);
      }
      var word = document.getElementById('thread-open');
      if (word) word.setAttribute('aria-current', 'true');
      document.documentElement.classList.add('thread-open');
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

  function bindWorkshopLuminos() {
    var veil = document.getElementById('place-veil');
    var line = document.getElementById('place-veil-line');
    var doors = document.querySelectorAll('[data-workshop-lumino]');
    if (!doors.length) return;

    function markWorkshopDoor(id) {
      for (var d = 0; d < doors.length; d++) {
        if (doors[d].getAttribute('data-workshop-lumino') === id) {
          doors[d].setAttribute('aria-current', 'true');
        } else {
          doors[d].removeAttribute('aria-current');
        }
      }
    }

    function openWorkshopBenches() {
      if (!veil) return;
      var host = document.getElementById('workshop-benches');
      if (!host || !window.WorkshopBenches) {
        openWorkshopLater('workshop');
        return;
      }
      if (window.GardenRooms && GardenRooms.closeThread) {
        GardenRooms.closeThread({ silentLabel: true });
      }
      setWorkshopSky(false);
      setTendCenter(false);
      hideAllBodies(veil, { restoreWorkshop: false, restoreTend: false });
      veil.classList.add('is-workshop-benches');
      if (line) line.hidden = true;
      host.hidden = false;
      WorkshopBenches.mount(host);
      veil.hidden = false;
      veil.classList.add('is-open');
      markWorkshopDoor('workshop');
    }

    function openWorkshopLater(id) {
      if (!veil) return;
      if (id === 'workshop' && document.getElementById('workshop-benches') && window.WorkshopBenches) {
        openWorkshopBenches();
        return;
      }
      if (window.GardenRooms && GardenRooms.closeThread) {
        GardenRooms.closeThread({ silentLabel: true });
      }
      setWorkshopSky(false);
      setTendCenter(false);
      hideAllBodies(veil, { restoreWorkshop: false, restoreTend: false });
      veil.classList.add('is-workshop-later');
      if (line) {
        line.hidden = false;
        line.textContent = WORKSHOP_LATER[id] || WORKSHOP_LATER.workshop;
      }
      veil.hidden = false;
      veil.classList.add('is-open');
      markWorkshopDoor(id);
    }

    for (var i = 0; i < doors.length; i++) {
      (function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var id = el.getAttribute('data-workshop-lumino');
          goToLumino(id);
        });
      })(doors[i]);
    }

    window.addEventListener('fl-alpha-mind-remembered', function () {
      var host = document.getElementById('workshop-benches');
      var veil = document.getElementById('place-veil');
      if (!host || host.hidden || !veil || !veil.classList.contains('is-workshop-benches')) return;
      if (window.WorkshopBenches && WorkshopBenches.mount) WorkshopBenches.mount(host);
    });

    window.GardenRooms.openWorkshopLater = openWorkshopLater;
    window.GardenRooms.openWorkshopBenches = openWorkshopBenches;
  }

  function bindRoundTableLuminos() {
    var veil = document.getElementById('place-veil');
    var line = document.getElementById('place-veil-line');
    var doors = document.querySelectorAll('[data-round-table-lumino]');
    if (!doors.length) return;

    function markRoundTableDoor(id) {
      for (var d = 0; d < doors.length; d++) {
        if (doors[d].getAttribute('data-round-table-lumino') === id) {
          doors[d].setAttribute('aria-current', 'true');
        } else {
          doors[d].removeAttribute('aria-current');
        }
      }
    }

    function openRoundTableSitting() {
      if (!veil) return;
      var host = document.getElementById('round-table-sitting');
      if (!host || !window.RoundTableSitting) {
        openRoundTableLater('table');
        return;
      }
      if (window.GardenRooms && GardenRooms.closeThread) {
        GardenRooms.closeThread({ silentLabel: true });
      }
      setRoundTableSky(false);
      setTendCenter(false);
      hideAllBodies(veil, { restoreRoundTable: false, restoreTend: false });
      veil.classList.add('is-round-table-sitting');
      if (line) line.hidden = true;
      host.hidden = false;
      RoundTableSitting.mount(host);
      veil.hidden = false;
      veil.classList.add('is-open');
      markRoundTableDoor('table');
    }

    function openRoundTableLater(id) {
      if (!veil) return;
      if (id === 'table' && document.getElementById('round-table-sitting') && window.RoundTableSitting) {
        openRoundTableSitting();
        return;
      }
      if (window.GardenRooms && GardenRooms.closeThread) {
        GardenRooms.closeThread({ silentLabel: true });
      }
      setRoundTableSky(false);
      setTendCenter(false);
      hideAllBodies(veil, { restoreRoundTable: false, restoreTend: false });
      veil.classList.add('is-round-table-later');
      if (line) {
        line.hidden = false;
        line.textContent = ROUND_TABLE_LATER[id] || ROUND_TABLE_LATER.learning;
      }
      veil.hidden = false;
      veil.classList.add('is-open');
      markRoundTableDoor(id);
    }

    for (var i = 0; i < doors.length; i++) {
      (function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var id = el.getAttribute('data-round-table-lumino');
          goToLumino(id);
        });
      })(doors[i]);
    }

    window.addEventListener('fl-alpha-mind-remembered', function () {
      var host = document.getElementById('round-table-sitting');
      var veilNow = document.getElementById('place-veil');
      if (!host || host.hidden || !veilNow || !veilNow.classList.contains('is-round-table-sitting')) return;
      if (window.RoundTableSitting && RoundTableSitting.mount) RoundTableSitting.mount(host);
    });

    window.GardenRooms.openRoundTableLater = openRoundTableLater;
    window.GardenRooms.openRoundTableSitting = openRoundTableSitting;
  }

  function bindArtLuminos() {
    var veil = document.getElementById('place-veil');
    var line = document.getElementById('place-veil-line');
    var listenDoor = document.getElementById('art-listen');
    var doors = document.querySelectorAll('[data-art-lumino]');
    if (!doors.length) return;

    function markArtDoor(id) {
      for (var d = 0; d < doors.length; d++) {
        if (doors[d].getAttribute('data-art-lumino') === id) {
          doors[d].setAttribute('aria-current', 'true');
        } else {
          doors[d].removeAttribute('aria-current');
        }
      }
    }

    function openArtListen() {
      if (!veil || !listenDoor) return;
      if (window.GardenRooms && GardenRooms.closeThread) {
        GardenRooms.closeThread({ silentLabel: true });
      }
      setArtSky(false);
      setTendCenter(false);
      hideAllBodies(veil, { restoreArt: false, restoreTend: false });
      veil.classList.add('is-art-listen');
      listenDoor.hidden = false;
      veil.hidden = false;
      veil.classList.add('is-open');
      markArtDoor('listen');
    }

    function openArtLater(id) {
      if (!veil) return;
      if (window.GardenRooms && GardenRooms.closeThread) {
        GardenRooms.closeThread({ silentLabel: true });
      }
      setArtSky(false);
      setTendCenter(false);
      hideAllBodies(veil, { restoreArt: false, restoreTend: false });
      veil.classList.add('is-art-later');
      if (line) {
        line.hidden = false;
        line.textContent = ART_LATER[id] || ART_LATER.chalkboard;
      }
      veil.hidden = false;
      veil.classList.add('is-open');
      markArtDoor(id);
    }

    for (var i = 0; i < doors.length; i++) {
      (function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var id = el.getAttribute('data-art-lumino');
          goToLumino(id);
        });
      })(doors[i]);
    }

    window.GardenRooms.openArtListen = openArtListen;
    window.GardenRooms.openArtLater = openArtLater;
  }

  function bindGardenLuminos() {
    var doors = document.querySelectorAll('[data-garden-lumino]');
    if (!doors.length) return;

    function markGardenDoor(id) {
      for (var d = 0; d < doors.length; d++) {
        if (doors[d].getAttribute('data-garden-lumino') === id) {
          doors[d].setAttribute('aria-current', 'true');
        } else {
          doors[d].removeAttribute('aria-current');
        }
      }
    }

    function openGardenLumino(id) {
      goToLumino(id);
      markGardenDoor(id);
    }

    for (var i = 0; i < doors.length; i++) {
      (function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          goToLumino(el.getAttribute('data-garden-lumino'));
        });
      })(doors[i]);
    }

    window.GardenRooms.openGardenLumino = openGardenLumino;
  }

  function ensureVeilDoor() {
    var veil = document.getElementById('place-veil');
    if (!veil) return null;
    var door = document.getElementById('place-veil-door');
    if (!door) {
      door = document.createElement('a');
      door.id = 'place-veil-door';
      door.hidden = true;
      door.rel = 'noopener noreferrer';
      var close = document.getElementById('place-veil-close');
      if (close && close.parentNode === veil) veil.insertBefore(door, close);
      else veil.appendChild(door);
    }
    if (door.getAttribute('data-bound') !== '1') {
      door.setAttribute('data-bound', '1');
      door.rel = 'noopener noreferrer';
      door.addEventListener('click', function (e) {
        var href = door.getAttribute('href');
        if (!href) return;
        e.preventDefault();
        go(href);
      });
    }
    return door;
  }

  function showVeilDoor(href, word) {
    var door = ensureVeilDoor();
    if (!door) return;
    if (!href) {
      hideVeilDoor();
      return;
    }
    door.href = href;
    door.textContent = word || 'Open the card';
    door.hidden = false;
  }

  function hideVeilDoor() {
    var door = document.getElementById('place-veil-door');
    if (!door) return;
    door.hidden = true;
    door.removeAttribute('href');
    door.textContent = '';
  }

  function bindResearchLuminos() {
    var veil = document.getElementById('place-veil');
    var line = document.getElementById('place-veil-line');
    var doors = document.querySelectorAll('[data-research-lumino]');
    if (!doors.length) return;

    function openResearchLater(id) {
      if (!veil) return;
      if (window.GardenRooms && GardenRooms.closeThread) {
        GardenRooms.closeThread({ silentLabel: true, keepMenu: true });
      }
      setResearchSky(false);
      setTendCenter(false);
      hideAllBodies(veil, { restoreResearch: false, restoreTend: false });
      veil.classList.add('is-research-later');
      var card = RESEARCH_CARDS[id] || RESEARCH_CARDS.gauge;
      if (line) {
        line.hidden = false;
        line.textContent = card.later || RESEARCH_LATER.gauge;
      }
      showVeilDoor(card.href, card.word);
      veil.hidden = false;
      veil.classList.add('is-open');
      for (var d = 0; d < doors.length; d++) {
        if (doors[d].getAttribute('data-research-lumino') === id) {
          doors[d].setAttribute('aria-current', 'true');
        } else {
          doors[d].removeAttribute('aria-current');
        }
      }
    }

    for (var i = 0; i < doors.length; i++) {
      (function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var id = el.getAttribute('data-research-lumino');
          goToLumino(id);
        });
      })(doors[i]);
    }

    window.GardenRooms.openResearchLater = openResearchLater;
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
    bindRoomChat();
    bindThreadDoor();
    bindWorkshopLuminos();
    bindRoundTableLuminos();
    bindArtLuminos();
    bindGardenLuminos();
    bindResearchLuminos();
    bindTendCenter();
    bindGardenCanvasTouch();
    bindMenuDismiss();
    dressLivingLights();
    ensureSkyField();
    ensureSkyLegend();
    startAttachLoop();
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
    lightSettingsHome: lightSettingsHome,
    goToLumino: goToLumino,
    showRoomChat: showRoomChat,
    hideRoomChat: hideRoomChat
  };

  if (document.querySelector('[data-galaxy-dir], [data-garden-go], [data-garden-place], [data-garden-thread], [data-garden-lumino], [data-workshop-lumino], [data-round-table-lumino], [data-art-lumino], [data-research-lumino], [data-tend-center], #thread-open, #galaxy-title, #room-label')) {
    boot();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
