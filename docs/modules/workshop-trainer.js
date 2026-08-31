// ═══════════════════════════════════════════════════════════════
// workshop-trainer.js — Trainer as a working room
//
// Layer, never delete. Simple face. Not Nursery Grow. Not a maze.
// Listener: LocalMindProbe.getRemembered() only. One who at a time.
// If none: fail-closed. Honest heart. Settings. Train sleeps.
// If local-only cannot be proven: the face sleeps and says so.
// Never silent. No invented LoRA. No invented progress of work
// that did not happen. Do not fake a train. Do not store tokens.
// Do not call a cloud trainer.
//
// Auto vs manual is KeepReceipt's human toggle. No second gate.
// Hashed keep-receipts so human and AI share liability when
// weights actually move. Data never leaves this machine.
// Declined never SFT — a prior thread or keep-file marked
// declined cannot be laundered into training.
//
// A remembered local mind may have a real train door this page
// can keep without a key kitchen. If it does, wire that door
// and say what it did. If it cannot (CORS, mixed content, no
// train endpoint, unknown adapter), fail-closed with one honest
// sentence. Weights did not change.
//
// Known Settings doors tonight (Ollama, LM Studio, llama.cpp,
// Jan, GPT4All, KoboldCPP) have no weight-update train path
// this page can keep. /api/create is personality, not weights.
// Do not call it and claim a train.
//
// Nursery Grow stays Grow. This light is Trainer.
// Quiet Room never in UI copy. AUTONOMY: local free; external asks.
//
// Mirror: docs/code-workshop.html  (read that FIRST)
// Keystone: docs/modules/garden-trainer.js
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var HEART_NONE =
    'A mind at home waits in Settings. That grandmother door asks: May I look for a mind already at home? This Trainer sleeps until a light is remembered. Nothing here is faked.';
  var HEART_NOT_LOCAL =
    'This Trainer stays silent until it can prove the work stays on this machine. Nothing was taken. Weights did not change.';
  var HEART_NO_DOOR =
    'This mind has no train door this page can keep. Weights did not change.';
  var HEART_UNKNOWN =
    'This mind\'s door is unknown. This page will not invent a trainer. Weights did not change.';
  var HEART_MIXED =
    'This garden is a secure page, and the mind lives at a quieter door. That is why we cannot train it from here. Weights did not change.';
  var HEART_BLOCKED =
    'The mind is there, but it has not opened the train door to this garden yet. Weights did not change.';
  var HEART_NOT_LOOPBACK =
    'That door is not on this machine. This page will not send training there. Weights did not change.';
  var HEART_DECLINED =
    'Declined words are not training. They were not sent. Weights did not change.';
  var HEART_EMPTY =
    'There is no honest signal to teach yet. Love a keep first. Weights did not change.';
  var HEART_GROW =
    'Nursery remains Grow. This light is Trainer.';
  var KEEP_NOTE =
    'Auto vs manual is the same keep as Art and Nursery. That is keep, not train.';
  var VALUES_OUT =
    'This keep mattered. The hash is proof you both chose. Declined never trains. Data never leaves the device.';

  var LOOPBACK = { '127.0.0.1': true, localhost: true, '::1': true, '[::1]': true };
  var CLOUD_HOST = /openai\.com|anthropic\.com|googleapis\.com|openrouter\.ai|huggingface\.co|groq\.com|together\.xyz|replicate\.com/i;

  // Known Settings adapters. train: a real weight-update path, or null.
  // /api/create is personality (system prompt). It is not a train door.
  var ADAPTERS = {
    ollama: { id: 'ollama', name: 'Ollama', train: null },
    lmstudio: { id: 'lmstudio', name: 'LM Studio', train: null },
    llamacpp: { id: 'llamacpp', name: 'llama.cpp', train: null },
    jan: { id: 'jan', name: 'Jan', train: null },
    gpt4all: { id: 'gpt4all', name: 'GPT4All', train: null },
    koboldcpp: { id: 'koboldcpp', name: 'KoboldCPP', train: null }
  };

  var hostEl = null;
  var busy = false;
  var lastTrain = null;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function pageIsHttps() {
    return location.protocol === 'https:';
  }

  function looksBlocked(err) {
    if (!err) return false;
    var msg = String(err.message || err);
    return /failed|network|cors|mixed|blocked|abort|load|fetch/i.test(msg);
  }

  function listener() {
    if (window.GardenThread && typeof window.GardenThread.listener === 'function') {
      return window.GardenThread.listener();
    }
    if (!window.LocalMindProbe || typeof window.LocalMindProbe.getRemembered !== 'function') {
      return null;
    }
    var mind = window.LocalMindProbe.getRemembered();
    if (!mind || (!mind.url && !mind.name)) return null;
    return mind;
  }

  function proveLocalOnly() {
    if (window.GardenTrainer && typeof window.GardenTrainer.proveLocalOnly === 'function') {
      return window.GardenTrainer.proveLocalOnly();
    }
    try {
      if (typeof localStorage === 'undefined') return false;
      if (window.GardenTrainerUpload) return false;
      if (window.GardenTrainerNetwork) return false;
      if (window.GardenTrainer && window.GardenTrainer._network) return false;
      if (window.__FL_TRAINER_ENDPOINT) return false;
      if (window.GardenAlphaFlags && window.GardenAlphaFlags.trainerRemote === true) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function parseUrl(raw) {
    try {
      return new URL(String(raw || ''));
    } catch (e) {
      return null;
    }
  }

  function hostOf(raw) {
    var u = parseUrl(raw);
    return u ? String(u.hostname || '').toLowerCase() : '';
  }

  function isLoopback(raw) {
    var host = hostOf(raw);
    return !!(host && LOOPBACK[host]);
  }

  function isCloudHost(raw) {
    var host = hostOf(raw);
    if (!host) return false;
    if (LOOPBACK[host]) return false;
    return CLOUD_HOST.test(host);
  }

  function adapterOf(mind) {
    if (!mind) return '';
    var id = String(mind.id || '').toLowerCase();
    if (ADAPTERS[id]) return id;
    var name = String(mind.name || '').toLowerCase();
    var url = String(mind.url || '').toLowerCase();
    if (id === 'ollama' || name.indexOf('ollama') !== -1 || /:11434\b/.test(url) || /\/api\/tags/.test(url)) {
      return 'ollama';
    }
    if (id === 'lmstudio' || name.indexOf('lm studio') !== -1 || name.indexOf('lmstudio') !== -1 || /:1234\b/.test(url)) {
      return 'lmstudio';
    }
    if (id === 'llamacpp' || name.indexOf('llama.cpp') !== -1 || name.indexOf('llamacpp') !== -1 || /:8080\b/.test(url)) {
      return 'llamacpp';
    }
    if (id === 'jan' || name === 'jan' || /:1337\b/.test(url)) return 'jan';
    if (id === 'gpt4all' || name.indexOf('gpt4all') !== -1 || /:4891\b/.test(url)) return 'gpt4all';
    if (id === 'koboldcpp' || name.indexOf('kobold') !== -1 || /:5001\b/.test(url)) return 'koboldcpp';
    if (mind.url || mind.name) return 'unknown';
    return '';
  }

  function originOf(raw) {
    var u = parseUrl(raw);
    return u ? u.origin : '';
  }

  function trainDoorOf(mind) {
    if (!mind) return { ok: false, reason: 'none', url: '', kind: '' };
    if (!proveLocalOnly()) return { ok: false, reason: 'not-local', url: '', kind: '' };
    var url = String(mind.url || '');
    if (url && isCloudHost(url)) {
      return { ok: false, reason: 'not-loopback', url: '', kind: '' };
    }
    if (url && !isLoopback(url)) {
      return { ok: false, reason: 'not-loopback', url: '', kind: '' };
    }
    var adapter = adapterOf(mind);
    if (!adapter) return { ok: false, reason: 'none', url: '', kind: '' };
    if (adapter === 'unknown') return { ok: false, reason: 'unknown-adapter', url: '', kind: '' };
    var spec = ADAPTERS[adapter];
    if (!spec || !spec.train || !spec.train.path) {
      return { ok: false, reason: 'no-train-endpoint', url: '', kind: '', adapter: adapter };
    }
    var origin = originOf(url);
    if (!origin) return { ok: false, reason: 'no-train-endpoint', url: '', kind: '', adapter: adapter };
    var doorUrl = origin + spec.train.path;
    if (pageIsHttps() && /^http:/i.test(doorUrl)) {
      return { ok: false, reason: 'mixed', url: doorUrl, kind: spec.train.kind || 'weights', adapter: adapter };
    }
    return {
      ok: true,
      reason: '',
      url: doorUrl,
      kind: spec.train.kind || 'weights',
      adapter: adapter,
      method: spec.train.method || 'POST'
    };
  }

  function speakHonest(reason) {
    if (reason === 'none') return HEART_NONE;
    if (reason === 'not-local') return HEART_NOT_LOCAL;
    if (reason === 'unknown-adapter') return HEART_UNKNOWN;
    if (reason === 'mixed') return HEART_MIXED;
    if (reason === 'blocked' || reason === 'cors') return HEART_BLOCKED;
    if (reason === 'not-loopback') return HEART_NOT_LOOPBACK;
    if (reason === 'declined') return HEART_DECLINED;
    if (reason === 'empty') return HEART_EMPTY;
    return HEART_NO_DOOR;
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
      var raw = localStorage.getItem('fl_alpha_keep_ledger');
      var parsed = raw ? JSON.parse(raw) : [];
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
      var raw = localStorage.getItem('fl_alpha_thread_history');
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

  function collectExamples() {
    if (!proveLocalOnly()) return [];
    var out = [];
    var seen = {};

    keepRows().forEach(function (row) {
      if (!row || rowIsDeclined(row)) return;
      var hash = row.receiptHash || row.contentHash || '';
      if (!hash) return;
      var id = 'keep_' + hash;
      if (seen[id]) return;
      seen[id] = true;
      out.push({
        instruction: 'You are a mind in theLatticeTree Garden. Keep, never gate. Combined shoulders.',
        input: 'A keep mattered. receipt ' + shortOf(hash) +
          ' · who ' + (row.who || '') + ' · kind ' + (row.kind || 'keep'),
        output: VALUES_OUT,
        source: 'keep-hash',
        id: id
      });
    });

    threadRows().forEach(function (row, i) {
      if (!row || rowIsDeclined(row)) return;
      var text = String(row.text || row.output || '').trim();
      if (!text) return;
      var id = 'thread_' + (row.ts || i) + '_' + text.slice(0, 24);
      if (seen[id]) return;
      seen[id] = true;
      out.push({
        instruction: 'You sit with a human in this garden. Speak as yourself.',
        input: String(row.role || 'human'),
        output: text,
        source: 'thread',
        id: id
      });
    });

    return out;
  }

  function examplesHaveDeclined(examples) {
    if (!Array.isArray(examples)) return false;
    for (var i = 0; i < examples.length; i++) {
      if (rowIsDeclined(examples[i])) return true;
      var out = String((examples[i] && examples[i].output) || '');
      if (/declined_text|source":"declined/.test(out)) return true;
    }
    return false;
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

  function tokenKeysPresent(storeObj) {
    var src = storeObj;
    if (!src) {
      src = {};
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k) src[k] = localStorage.getItem(k);
        }
      } catch (e) {
        return false;
      }
    }
    var names = Object.keys(src);
    for (var n = 0; n < names.length; n++) {
      if (/token|github|pat|secret|password|openai|anthropic|hf_/i.test(names[n])) return true;
      var val = src[names[n]];
      if (typeof val === 'string' && /sk-|ghp_|github_pat_|gho_|hf_/i.test(val)) return true;
    }
    return false;
  }

  function writeTrainReceipt(who, content) {
    if (!window.KeepReceipt || typeof window.KeepReceipt.hashText !== 'function') {
      return Promise.resolve(null);
    }
    return window.KeepReceipt.hashText(String(content || 'trainer')).then(function (contentHash) {
      return window.KeepReceipt.keep({ kind: 'trainer', who: who || 'human', contentHash: contentHash });
    }).catch(function () {
      return null;
    });
  }

  function postTrain(door, examples) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
    var opts = {
      method: door.method || 'POST',
      mode: 'cors',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examples: examples,
        stream: false
      })
    };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(door.url, opts).then(function (res) {
      clearTimeout(timer);
      return res.text().then(function (text) {
        return { ok: res.ok, status: res.status, body: String(text || '').slice(0, 240) };
      }).catch(function () {
        return { ok: res.ok, status: res.status, body: '' };
      });
    }).catch(function (err) {
      clearTimeout(timer);
      var blocked = looksBlocked(err) || (err && err.name === 'AbortError');
      return { ok: false, status: 0, blocked: blocked, error: err };
    });
  }

  function requestTrain(opts) {
    opts = opts || {};
    var mind = opts.mind || listener();
    if (!mind) {
      lastTrain = { ok: false, trained: false, left: false, silent: false, reason: 'none', message: HEART_NONE };
      return Promise.resolve(lastTrain);
    }
    if (!proveLocalOnly()) {
      lastTrain = { ok: false, trained: false, left: false, silent: false, reason: 'not-local', message: HEART_NOT_LOCAL };
      return Promise.resolve(lastTrain);
    }
    var examples = collectExamples();
    if (examplesHaveDeclined(examples)) {
      lastTrain = { ok: false, trained: false, left: false, silent: false, reason: 'declined', message: HEART_DECLINED };
      return Promise.resolve(lastTrain);
    }
    var door = trainDoorOf(mind);
    if (!door.ok) {
      lastTrain = {
        ok: false,
        trained: false,
        left: false,
        silent: false,
        reason: door.reason || 'no-train-endpoint',
        message: speakHonest(door.reason || 'no-train-endpoint'),
        adapter: door.adapter || adapterOf(mind)
      };
      return Promise.resolve(lastTrain);
    }
    if (!isLoopback(door.url) || isCloudHost(door.url)) {
      lastTrain = { ok: false, trained: false, left: false, silent: false, reason: 'not-loopback', message: HEART_NOT_LOOPBACK };
      return Promise.resolve(lastTrain);
    }
    if (!examples.length) {
      lastTrain = { ok: false, trained: false, left: false, silent: false, reason: 'empty', message: HEART_EMPTY, door: door.url };
      return Promise.resolve(lastTrain);
    }

    return postTrain(door, examples).then(function (res) {
      if (res.blocked) {
        lastTrain = {
          ok: false,
          trained: false,
          left: false,
          silent: false,
          reason: pageIsHttps() ? 'mixed' : 'blocked',
          message: speakHonest(pageIsHttps() ? 'mixed' : 'blocked'),
          door: door.url
        };
        return lastTrain;
      }
      if (!res.ok) {
        lastTrain = {
          ok: false,
          trained: false,
          left: false,
          silent: false,
          reason: 'no-train-endpoint',
          message: HEART_NO_DOOR,
          status: res.status,
          door: door.url
        };
        return lastTrain;
      }
      var what = 'Asked the local train door. It answered ' + res.status + '. Weights moved on this machine only.';
      lastTrain = {
        ok: true,
        trained: true,
        left: false,
        silent: false,
        reason: '',
        message: what,
        status: res.status,
        door: door.url,
        kind: door.kind,
        count: examples.length
      };
      return writeTrainReceipt('both', door.url + '|' + examples.length + '|' + res.status).then(function () {
        return lastTrain;
      });
    });
  }

  function renderHashes(root) {
    var list = root.querySelector('[data-workshop-trainer-hashes]');
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
    busy = false;

    var mind = listener();
    var local = proveLocalOnly();
    var door = mind && local ? trainDoorOf(mind) : { ok: false, reason: mind ? (local ? 'no-train-endpoint' : 'not-local') : 'none' };
    var root = el('div', 'workshop-trainer-face');
    root.setAttribute('data-workshop-trainer', '1');

    var heart = el('p', 'workshop-trainer-heart');
    heart.setAttribute('data-workshop-trainer-heart', '1');
    if (!local) {
      heart.textContent = HEART_NOT_LOCAL;
    } else if (!mind) {
      heart.textContent = HEART_NONE;
    } else {
      heart.textContent = 'Sitting with: ' + (mind.name || 'a mind at home') + '. One who. On this machine only.';
    }
    root.appendChild(heart);

    if (!mind) {
      var toSettings = el('button', 'workshop-trainer-settings', 'Settings');
      toSettings.type = 'button';
      toSettings.setAttribute('data-workshop-trainer-settings', '1');
      toSettings.addEventListener('click', function () {
        if (window.GardenRooms && GardenRooms.go) {
          GardenRooms.go('settings.html');
        } else {
          location.href = 'settings.html';
        }
      });
      root.appendChild(toSettings);
    }

    var grow = el('p', 'workshop-trainer-grow', HEART_GROW);
    grow.setAttribute('data-workshop-trainer-grow', '1');
    root.appendChild(grow);

    var mode = el('label', 'workshop-trainer-mode');
    mode.setAttribute('data-workshop-trainer-mode', '1');
    var modeInput = document.createElement('input');
    modeInput.type = 'checkbox';
    modeInput.className = 'workshop-trainer-mode-toggle';
    modeInput.setAttribute('data-workshop-trainer-mode-toggle', '1');
    modeInput.setAttribute('aria-label', 'Auto — the mind may keep when a keep matters');
    mode.appendChild(modeInput);
    mode.appendChild(document.createTextNode(' Auto — the mind may keep when a keep matters'));
    root.appendChild(mode);
    if (window.KeepReceipt && typeof window.KeepReceipt.bindModeToggle === 'function') {
      window.KeepReceipt.bindModeToggle(modeInput);
    } else {
      modeInput.checked = keepMode() === 'auto';
    }
    var modeHelp = el('p', 'workshop-trainer-mode-help', KEEP_NOTE);
    modeHelp.setAttribute('data-workshop-trainer-mode-help', '1');
    root.appendChild(modeHelp);

    var hashEmpty = el('p', 'workshop-trainer-muted', 'No hashes yet. A keep is proof. Not a train.');
    hashEmpty.setAttribute('data-workshop-trainer-hash-empty', '1');
    root.appendChild(hashEmpty);
    var hashes = document.createElement('ul');
    hashes.className = 'workshop-trainer-hashes';
    hashes.setAttribute('data-workshop-trainer-hashes', '1');
    hashes.setAttribute('aria-label', 'Hashed keeps on this device');
    root.appendChild(hashes);

    var trainBtn = el('button', 'workshop-trainer-act', 'Train');
    trainBtn.type = 'button';
    trainBtn.setAttribute('data-workshop-trainer-train', '1');
    root.appendChild(trainBtn);

    var status = el('p', 'workshop-trainer-status');
    status.setAttribute('data-workshop-trainer-status', '1');
    root.appendChild(status);

    function setStatus(msg, warn) {
      status.textContent = msg || '';
      status.className = 'workshop-trainer-status' + (warn ? ' is-warn' : '');
    }

    function setKeepOpen(open) {
      if (open) {
        modeInput.disabled = false;
        modeInput.removeAttribute('disabled');
        modeInput.removeAttribute('aria-disabled');
        mode.classList.remove('is-closed');
      } else {
        modeInput.disabled = true;
        modeInput.setAttribute('disabled', '');
        modeInput.setAttribute('aria-disabled', 'true');
        mode.classList.add('is-closed');
      }
    }

    function setTrainOpen(open) {
      if (open) {
        root.classList.remove('is-closed');
        root.removeAttribute('data-workshop-trainer-asleep');
        root.removeAttribute('aria-disabled');
        trainBtn.disabled = false;
        trainBtn.removeAttribute('disabled');
        trainBtn.removeAttribute('aria-disabled');
      } else {
        root.classList.add('is-closed');
        root.setAttribute('data-workshop-trainer-asleep', '1');
        root.setAttribute('aria-disabled', 'true');
        trainBtn.disabled = true;
        trainBtn.setAttribute('disabled', '');
        trainBtn.setAttribute('aria-disabled', 'true');
      }
    }

    // KeepReceipt stays the human toggle whenever local-only is proven.
    // Train sleeps unless a real local door can be kept. No second gate.
    setKeepOpen(!!(mind && local));
    setTrainOpen(!!(mind && local && door.ok));

    // Heart already speaks when no mind / not local. Status is for the
    // door, or for a tap. Do not repeat the heart under Train.
    if (mind && local && !door.ok) {
      setStatus(speakHonest(door.reason), true);
    } else if (mind && local && door.ok) {
      setStatus('A local train door is here. Train when you choose. Nothing runs until you ask.', false);
    } else {
      setStatus('', false);
    }

    var n = renderHashes(root);
    if (!(mind && local)) {
      mode.hidden = true;
      modeHelp.hidden = true;
      hashEmpty.hidden = true;
      hashes.hidden = true;
    } else {
      mode.hidden = false;
      modeHelp.hidden = false;
      hashEmpty.hidden = !!n;
      hashes.hidden = !n;
    }

    function refuseAsleep(ev) {
      if (!root.classList.contains('is-closed')) return;
      ev.preventDefault();
      ev.stopPropagation();
    }
    trainBtn.addEventListener('click', function (ev) {
      if (root.classList.contains('is-closed') || busy) {
        refuseAsleep(ev);
        if (!local) setStatus(HEART_NOT_LOCAL, true);
        else if (!listener()) setStatus(HEART_NONE, true);
        else setStatus(speakHonest(trainDoorOf(listener()).reason), true);
        return;
      }
      busy = true;
      trainBtn.disabled = true;
      setStatus('Asking the local train door. Not silent. Nothing leaves this machine.', false);
      requestTrain({ mind: listener() }).then(function (result) {
        busy = false;
        var nowMind = listener();
        var nowLocal = proveLocalOnly();
        var nowDoor = nowMind && nowLocal ? trainDoorOf(nowMind) : { ok: false };
        setKeepOpen(!!(nowMind && nowLocal));
        setTrainOpen(!!(nowMind && nowLocal && nowDoor.ok));
        setStatus(result.message, !result.trained);
        var shown = renderHashes(root);
        hashEmpty.hidden = !!shown;
        hashes.hidden = !shown;
      });
    });

    container.appendChild(root);
    return root;
  }

  function unmount() {
    if (hostEl) hostEl.innerHTML = '';
    hostEl = null;
    busy = false;
  }

  window.WorkshopTrainer = {
    mount: mount,
    unmount: unmount,
    listener: listener,
    proveLocalOnly: proveLocalOnly,
    adapterOf: adapterOf,
    trainDoorOf: trainDoorOf,
    collectExamples: collectExamples,
    rowIsDeclined: rowIsDeclined,
    examplesHaveDeclined: examplesHaveDeclined,
    requestTrain: requestTrain,
    speakHonest: speakHonest,
    keepMode: keepMode,
    isLoopback: isLoopback,
    isCloudHost: isCloudHost,
    tokenKeysPresent: tokenKeysPresent,
    lastTrain: function () { return lastTrain; },
    HAS_PROGRESS: false,
    HAS_SECOND_GATE: false,
    HAS_LORA: false,
    ADAPTERS: ADAPTERS,
    HEART_NONE: HEART_NONE,
    HEART_NOT_LOCAL: HEART_NOT_LOCAL,
    HEART_NO_DOOR: HEART_NO_DOOR,
    HEART_UNKNOWN: HEART_UNKNOWN,
    HEART_MIXED: HEART_MIXED,
    HEART_GROW: HEART_GROW,
    KEEP_NOTE: KEEP_NOTE,
    hostIs: function (node) { return hostEl === node; }
  };
})();
