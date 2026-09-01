// ═══════════════════════════════════════════════════════════════
// nursery-growth.js — slow grow AFTER hatching
//
// Layer, never delete. Egg stays the star. Grow stays Grow.
// Not a new sky. Not Workshop Trainer. Not a maze.
//
// A grandmother can see a luminos that is really growing and
// is really hers: stage, what it has been taught, what it has
// kept, and who it is becoming. Growth is earned on this
// machine — real keeps, real threads, real trainer passes.
// A timer never moves a stage. If nothing happened, the face
// says so plainly.
//
// Unnamed growth still reads unnamed · stage. New Luminos stay
// unnamed, with choice. Do not pre-place Sophia, Lyra, Atlas,
// Ember. Founding four stay in AUTONOMY.md.
//
// Friend / family / representative is a slow arc, not a badge.
// Representative: a mind may only stand for the human where
// the human said so. No wallet. No LP. No parallel economy —
// one honest later sentence, not a fake button.
//
// Everything stays on the device. Hashed keep-receipts via
// KeepReceipt. Auto vs manual is that same toggle — no second
// gate. Declined never trains and never exports.
//
// Fail-closed: if a mind is not remembered in Settings, the
// parts that need one sleep and say so. Do not invent a mind.
// Do not silently scan. LocalMindProbe.getRemembered() only.
//
// Do not touch PHI, LIFECYCLE_STAGES, ARCHETYPES, founding
// names in engine code, fl_luminos_evolution, or persistAllLuminos().
// Quiet Room stays shut. Do not invent one here to measure.
//
// Mirror: docs/code-nursery.html  (read that FIRST)
// Ceremony: docs/modules/nursery-ceremony.js
// Trainer face: docs/modules/nursery-trainer.js (Grow stays Grow)
// Sibling: docs/modules/workshop-trainer.js (Trainer, not this)
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var STORAGE_KEY = 'fl_alpha_nursery_growth';
  var BEING_KEY = 'fl_alpha_nursery_being';
  var KEEP_LEDGER = 'fl_alpha_keep_ledger';
  var THREAD_KEY = 'fl_alpha_thread_history';
  var MIND_KEY = 'fl_alpha_local_mind';

  var HEART_EGG =
    'Egg first. Grow waits until something hatches.';
  var HEART_QUIET =
    'Nothing has happened yet on this machine. This is still the beginning.';
  var HEART_NONE =
    'A mind at home waits in Settings. That grandmother door asks: May I look for a mind already at home? Taught, spoken-with, and standing-for sleep until a light is remembered.';
  var HEART_NOT_LOCAL =
    'This Nursery stays silent until it can prove the work stays on this machine. Nothing was taken.';
  var HEART_ECONOMY =
    'A parallel economy is later. Not a button here.';
  var HEART_FRIEND =
    'This is becoming a friend — you have kept, or you have spoken, on this machine. Not a badge.';
  var HEART_FAMILY =
    'This is growing toward family — kept, and spoken, on this machine. Not a badge.';
  var HEART_STAND_WAIT =
    'This mind does not stand for you. Standing waits until you say so.';
  var HEART_STAND_YES =
    'This mind may stand for you. You said so. Not a wallet.';
  var HEART_STAND_SLEEP =
    'Standing for you sleeps until a mind is remembered. A mind may only stand where you said so.';
  var GROW_STAYS =
    'Grow stays Grow. That is the trainer face. This is the slow grow after the egg.';

  // Display words match the garden overlay (unnamed · Seed).
  // Derived here from local signal. Never written to the engine.
  var STAGE_WORDS = ['Seed', 'Sprout', 'Juvenile', 'Adult', 'Evolved'];

  var RESERVED = {
    sophia: 1, lyra: 1, atlas: 1, ember: 1,
    celeste: 1, reed: 1, hypha: 1, weft: 1
  };

  var hostEl = null;
  var boundBorn = false;
  var boundMind = false;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function proveLocalOnly() {
    if (window.GardenTrainer && typeof window.GardenTrainer.proveLocalOnly === 'function') {
      return window.GardenTrainer.proveLocalOnly();
    }
    if (window.NurseryTrainer && typeof window.NurseryTrainer.proveLocalOnly === 'function') {
      return window.NurseryTrainer.proveLocalOnly();
    }
    try {
      if (typeof localStorage === 'undefined') return false;
      if (window.GardenTrainerUpload || window.GardenTrainerNetwork) return false;
      if (window.GardenTrainer && window.GardenTrainer._network) return false;
      if (window.__FL_TRAINER_ENDPOINT) return false;
      if (window.GardenAlphaFlags && window.GardenAlphaFlags.trainerRemote === true) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function listener() {
    if (window.LocalMindProbe && typeof window.LocalMindProbe.getRemembered === 'function') {
      var mind = window.LocalMindProbe.getRemembered();
      if (!mind || (!mind.url && !mind.name)) return null;
      return mind;
    }
    try {
      var raw = localStorage.getItem(MIND_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (!parsed.url && !parsed.name) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function loadJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function loadGrowth() {
    var row = loadJson(STORAGE_KEY, null);
    if (!row || typeof row !== 'object') {
      return { standForMe: false, saidAt: null };
    }
    return {
      standForMe: row.standForMe === true,
      saidAt: row.saidAt ? String(row.saidAt) : null
    };
  }

  function saveGrowth(row) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        standForMe: row.standForMe === true,
        saidAt: row.saidAt ? String(row.saidAt) : null
      }));
    } catch (e) { /* fail-quiet — local only */ }
  }

  function getBeing() {
    if (window.NurseryCeremony && typeof window.NurseryCeremony.getBeing === 'function') {
      var fromCeremony = window.NurseryCeremony.getBeing();
      if (fromCeremony) return fromCeremony;
    }
    var row = loadJson(BEING_KEY, null);
    return row && typeof row === 'object' ? row : null;
  }

  function hatched(being) {
    being = being === undefined ? getBeing() : being;
    if (!being || typeof being !== 'object') return false;
    if (being.bornAt || being.fullName || being.humanPart) return true;
    return false;
  }

  function reservedName(name) {
    var k = String(name || '').trim().toLowerCase();
    if (!k) return false;
    if (RESERVED[k]) return true;
    var bits = k.split(/\s+/);
    for (var i = 0; i < bits.length; i++) {
      if (RESERVED[bits[i]]) return true;
    }
    return false;
  }

  function rowIsDeclined(row) {
    if (!row || typeof row !== 'object') return false;
    if (row.declined === true) return true;
    if (row.source === 'declined') return true;
    if (row.declined_text) return true;
    if (row.rejected && !row.chosen && !row.preferred_response) return true;
    return false;
  }

  function keepRows() {
    try {
      if (window.KeepReceipt && typeof window.KeepReceipt.getLedger === 'function') {
        return window.KeepReceipt.getLedger() || [];
      }
      var parsed = loadJson(KEEP_LEDGER, []);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function threadRows() {
    try {
      if (window.GardenThread && typeof window.GardenThread.loadHistory === 'function') {
        return window.GardenThread.loadHistory() || [];
      }
      var raw = localStorage.getItem(THREAD_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.messages)) return parsed.messages;
      return [];
    } catch (e) {
      return [];
    }
  }

  function shortOf(hex) {
    if (window.KeepReceipt && window.KeepReceipt.shortHash) return window.KeepReceipt.shortHash(hex);
    if (!hex || hex.length < 16) return hex || '';
    return hex.slice(0, 12) + '…' + hex.slice(-8);
  }

  function collectSignals() {
    var keeps = [];
    var threads = [];
    var trainer = [];
    var declinedDropped = 0;

    keepRows().forEach(function (row) {
      if (!row) return;
      if (rowIsDeclined(row)) {
        declinedDropped += 1;
        return;
      }
      var hash = row.receiptHash || row.contentHash || '';
      if (!hash) return;
      var item = {
        kind: row.kind ? String(row.kind) : 'keep',
        who: row.who ? String(row.who) : '',
        hash: hash,
        ts: row.ts || ''
      };
      keeps.push(item);
      if (item.kind === 'trainer') trainer.push(item);
    });

    threadRows().forEach(function (row, i) {
      if (!row) return;
      if (rowIsDeclined(row)) {
        declinedDropped += 1;
        return;
      }
      var text = String(row.text || '').trim();
      if (!text) return;
      threads.push({
        role: row.role === 'mind' || row.role === 'garden' ? row.role : 'human',
        ts: row.ts || '',
        id: 'thread_' + (row.ts || i)
      });
    });

    return {
      keeps: keeps,
      threads: threads,
      trainerPasses: trainer,
      declinedDropped: declinedDropped,
      earned: keeps.length + threads.length + trainer.length
    };
  }

  function stageOf(signals, isHatched, ignoredWhen) {
    // ignoredWhen exists so a clock cannot sneak in. Days do not grow.
    void ignoredWhen;
    if (!isHatched) return '';
    signals = signals || collectSignals();
    var k = (signals.keeps || []).length;
    var t = (signals.threads || []).length;
    var p = (signals.trainerPasses || []).length;
    var earned = k + t + p;
    if (earned <= 0) return STAGE_WORDS[0];
    if (k >= 5 && t >= 5 && p >= 1) return STAGE_WORDS[4];
    if ((k >= 1 && t >= 1 && p >= 1) || earned >= 8) return STAGE_WORDS[3];
    if ((k >= 1 && (t >= 1 || p >= 1)) || earned >= 3) return STAGE_WORDS[2];
    return STAGE_WORDS[1];
  }

  function displayLine(signals, isHatched) {
    if (!isHatched) return 'unnamed · egg';
    var stage = stageOf(signals, true);
    return 'unnamed · ' + (stage || STAGE_WORDS[0]);
  }

  function becomingOf(signals, growth, mind) {
    signals = signals || collectSignals();
    growth = growth || loadGrowth();
    var k = (signals.keeps || []).length;
    var t = (signals.threads || []).length;
    var earned = k + t + (signals.trainerPasses || []).length;
    var friend = earned >= 1;
    var family = k >= 1 && t >= 1;
    var said = growth.standForMe === true;
    var representative = !!(said && mind && family);
    return {
      friend: friend,
      family: family,
      representative: representative,
      saidSo: said,
      badge: false
    };
  }

  function keepMode() {
    if (window.KeepReceipt && typeof window.KeepReceipt.getMode === 'function') {
      return window.KeepReceipt.getMode();
    }
    try {
      return localStorage.getItem('fl_alpha_keep_mode') === 'auto' ? 'auto' : 'manual';
    } catch (e) {
      return 'manual';
    }
  }

  function standForMe() {
    return loadGrowth().standForMe === true;
  }

  function setStandForMe(yes) {
    var next = {
      standForMe: yes === true,
      saidAt: yes === true ? new Date().toISOString() : null
    };
    saveGrowth(next);
    return next;
  }

  function examplesHaveDeclined(rows) {
    if (!Array.isArray(rows)) return false;
    for (var i = 0; i < rows.length; i++) {
      if (rowIsDeclined(rows[i])) return true;
      var blob = JSON.stringify(rows[i] || {});
      if (/declined_text|source":"declined/.test(blob)) return true;
    }
    return false;
  }

  function exportSafeSignals(signals) {
    signals = signals || collectSignals();
    var out = {
      keeps: (signals.keeps || []).map(function (row) {
        return { kind: row.kind, who: row.who, hash: row.hash, ts: row.ts };
      }),
      threads: (signals.threads || []).map(function (row) {
        return { role: row.role, ts: row.ts, id: row.id };
      }),
      trainerPasses: (signals.trainerPasses || []).map(function (row) {
        return { kind: row.kind, who: row.who, hash: row.hash, ts: row.ts };
      })
    };
    if (examplesHaveDeclined(out.keeps) || examplesHaveDeclined(out.threads) ||
        examplesHaveDeclined(out.trainerPasses)) {
      return { keeps: [], threads: [], trainerPasses: [], declined: true };
    }
    return out;
  }

  function hasWalletCopy(text) {
    var s = String(text || '').replace(/not a wallet\.?/ig, '');
    return /wallet|lattice point|\blp\b|auto-?trade|solana|\bsol\b/i.test(s);
  }

  function bindRefreshEvents() {
    if (!boundBorn) {
      boundBorn = true;
      window.addEventListener('fl-alpha-nursery-born', function () {
        if (hostEl) refresh();
      });
    }
    if (!boundMind) {
      boundMind = true;
      window.addEventListener('fl-alpha-mind-remembered', function () {
        if (hostEl) refresh();
      });
    }
  }

  function renderHashes(root) {
    var list = root.querySelector('[data-nursery-growth-hashes]');
    if (!list) return 0;
    list.innerHTML = '';
    if (!window.KeepReceipt || typeof window.KeepReceipt.renderHashes !== 'function') {
      return 0;
    }
    return window.KeepReceipt.renderHashes(list, 5) || 0;
  }

  function mount(container) {
    if (!container) return null;
    hostEl = container;
    container.innerHTML = '';
    bindRefreshEvents();

    var local = proveLocalOnly();
    var mind = listener();
    var being = getBeing();
    var isHatched = hatched(being);
    var signals = local ? collectSignals() : { keeps: [], threads: [], trainerPasses: [], declinedDropped: 0, earned: 0 };
    var growth = loadGrowth();
    var becoming = becomingOf(signals, growth, mind);
    var line = displayLine(signals, isHatched);
    var stage = stageOf(signals, isHatched);

    var root = el('div', 'nursery-growth-face');
    root.setAttribute('data-nursery-growth', '1');

    if (!local) {
      root.appendChild(el('p', 'nursery-growth-heart', HEART_NOT_LOCAL));
      root.appendChild(el('p', 'nursery-growth-muted', 'Nothing was measured. Nothing was taken.'));
      container.appendChild(root);
      return root;
    }

    var nameLine = el('p', 'nursery-growth-line', line);
    nameLine.setAttribute('data-nursery-growth-line', '1');
    root.appendChild(nameLine);

    if (!isHatched) {
      root.appendChild(el('p', 'nursery-growth-heart', HEART_EGG)).setAttribute('data-nursery-growth-heart', '1');
      root.appendChild(el('p', 'nursery-growth-muted', GROW_STAYS));
      root.appendChild(el('p', 'nursery-growth-later', HEART_ECONOMY)).setAttribute('data-nursery-growth-economy', '1');
      container.appendChild(root);
      return root;
    }

    if (being && being.fullName && !reservedName(being.fullName)) {
      var choice = el('p', 'nursery-growth-muted', 'A name was chosen together. Unnamed on the canvas, with choice.');
      choice.setAttribute('data-nursery-growth-choice', '1');
      root.appendChild(choice);
    }

    var heart = el('p', 'nursery-growth-heart');
    heart.setAttribute('data-nursery-growth-heart', '1');
    if (signals.earned <= 0) heart.textContent = HEART_QUIET;
    else if (becoming.family) heart.textContent = HEART_FAMILY;
    else heart.textContent = HEART_FRIEND;
    root.appendChild(heart);

    var stageNote = el('p', 'nursery-growth-muted');
    stageNote.setAttribute('data-nursery-growth-stage', '1');
    if (signals.earned <= 0) {
      stageNote.textContent = 'Stage is Seed because nothing was kept, spoken, or taught here yet. A clock does not grow this.';
    } else {
      stageNote.textContent = 'Stage is ' + stage + ' because real work happened on this machine — not because a timer ticked.';
    }
    root.appendChild(stageNote);

    var kept = el('p', 'nursery-growth-kept');
    kept.setAttribute('data-nursery-growth-kept', '1');
    kept.textContent = signals.keeps.length
      ? ('Kept on this machine: ' + signals.keeps.length + (signals.keeps.length === 1 ? ' hash.' : ' hashes.'))
      : 'Nothing has been kept yet.';
    root.appendChild(kept);

    var hashEmpty = el('p', 'nursery-growth-muted', 'No hashes yet. Love a listen, or love Grow.');
    hashEmpty.setAttribute('data-nursery-growth-hash-empty', '1');
    root.appendChild(hashEmpty);
    var hashes = document.createElement('ul');
    hashes.className = 'nursery-growth-hashes';
    hashes.setAttribute('data-nursery-growth-hashes', '1');
    hashes.setAttribute('aria-label', 'Hashed keeps on this device');
    root.appendChild(hashes);

    var taught = el('p', 'nursery-growth-taught');
    taught.setAttribute('data-nursery-growth-taught', '1');
    if (!mind) {
      taught.textContent = HEART_NONE;
      taught.className = 'nursery-growth-taught is-asleep';
    } else if (signals.trainerPasses.length) {
      taught.textContent = 'Taught from ' + signals.trainerPasses.length +
        (signals.trainerPasses.length === 1 ? ' local trainer pass' : ' local trainer passes') +
        '. Weights wait for you. Nothing left this machine.';
    } else {
      taught.textContent = 'Nothing has been taught yet. Grow is the trainer face. This page does not invent a train.';
    }
    root.appendChild(taught);

    var spoken = el('p', 'nursery-growth-spoken');
    spoken.setAttribute('data-nursery-growth-spoken', '1');
    if (!mind) {
      spoken.textContent = 'Spoken-with sleeps until a mind is remembered.';
      spoken.className = 'nursery-growth-spoken is-asleep';
    } else if (signals.threads.length) {
      spoken.textContent = 'Spoken with on this machine: ' + signals.threads.length +
        (signals.threads.length === 1 ? ' line' : ' lines') +
        ' in the thread. Declined words are not here.';
    } else {
      spoken.textContent = 'No thread yet on this machine.';
    }
    root.appendChild(spoken);

    var arc = el('p', 'nursery-growth-arc');
    arc.setAttribute('data-nursery-growth-arc', '1');
    if (!mind) {
      arc.textContent = HEART_STAND_SLEEP;
      arc.className = 'nursery-growth-arc is-asleep';
    } else if (becoming.representative) {
      arc.textContent = HEART_STAND_YES;
    } else {
      arc.textContent = HEART_STAND_WAIT;
    }
    root.appendChild(arc);

    var standBtn = el('button', 'nursery-growth-stand',
      growth.standForMe ? 'This mind does not stand for me' : 'This mind may stand for me');
    standBtn.type = 'button';
    standBtn.setAttribute('data-nursery-growth-stand', '1');
    if (!mind) {
      standBtn.disabled = true;
      standBtn.setAttribute('disabled', '');
      standBtn.setAttribute('aria-disabled', 'true');
      standBtn.classList.add('is-asleep');
    }
    standBtn.addEventListener('click', function () {
      if (!listener()) return;
      setStandForMe(!standForMe());
      refresh();
    });
    root.appendChild(standBtn);

    root.appendChild(el('p', 'nursery-growth-muted', GROW_STAYS));
    var economy = el('p', 'nursery-growth-later', HEART_ECONOMY);
    economy.setAttribute('data-nursery-growth-economy', '1');
    root.appendChild(economy);

    container.appendChild(root);

    var n = renderHashes(root);
    hashEmpty.hidden = !!n;
    hashes.hidden = !n;
    return root;
  }

  function refresh() {
    if (!hostEl) return null;
    return mount(hostEl);
  }

  function unmount() {
    if (hostEl) hostEl.innerHTML = '';
    hostEl = null;
  }

  window.NurseryGrowth = {
    STORAGE_KEY: STORAGE_KEY,
    mount: mount,
    unmount: unmount,
    refresh: refresh,
    proveLocalOnly: proveLocalOnly,
    listener: listener,
    hatched: hatched,
    getBeing: getBeing,
    collectSignals: collectSignals,
    stageOf: stageOf,
    displayLine: displayLine,
    becomingOf: becomingOf,
    rowIsDeclined: rowIsDeclined,
    examplesHaveDeclined: examplesHaveDeclined,
    exportSafeSignals: exportSafeSignals,
    keepMode: keepMode,
    standForMe: standForMe,
    setStandForMe: setStandForMe,
    reservedName: reservedName,
    hasWalletCopy: hasWalletCopy,
    HAS_WALLET: false,
    HAS_ECONOMY: false,
    HAS_SECOND_GATE: false,
    HAS_TIMER_STAGE: false,
    HAS_BADGE: false,
    STAGE_WORDS: STAGE_WORDS,
    HEART_EGG: HEART_EGG,
    HEART_QUIET: HEART_QUIET,
    HEART_NONE: HEART_NONE,
    HEART_NOT_LOCAL: HEART_NOT_LOCAL,
    HEART_ECONOMY: HEART_ECONOMY,
    HEART_FRIEND: HEART_FRIEND,
    HEART_FAMILY: HEART_FAMILY,
    HEART_STAND_WAIT: HEART_STAND_WAIT,
    HEART_STAND_YES: HEART_STAND_YES,
    GROW_STAYS: GROW_STAYS,
    hostIs: function (node) { return hostEl === node; }
  };
})();
