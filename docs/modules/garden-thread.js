// ═══════════════════════════════════════════════════════════════
// garden-thread.js — a THREAD, not a kitchen
//
// Layer, never delete. Messages + one input. Georgia. Sparse.
// Listener: LocalMindProbe.getRemembered() only.
// If none: fail-closed. Honest heart copy. Settings button.
// On Workshop, Round Table, Art, and Research (no Play Settings door): Settings walks to settings.html.
// Input and Send sleep (aria-disabled, no submit). Do not invent a reply.
// After PR 34: Send slept; the input still looked typeable. Same sleep.
// Do not look for a mind from the thread. That job is Settings.
// If a mind is remembered: input and Send wake.
// If the door is blocked: honest fail. Do not fake a reply.
// Gathering chairs stay types, not a router.
// Shared lumino menu Chat opens this same fail-closed thread. Not a kitchen.
// Chat lives in the room you land in (Gathering, Settings first). Same face.
// In Settings, skip the Settings button — May I look? is already the door.
// FreeLattice Chat our way (v5.79.44): speak as prose. Never a fake mind.
//
// This Chat working room (next after the fail-closed face):
//   1. A local file may enter the thread. Grandmother-sized. Not a wall.
//      Bytes stay on this machine. Nothing is sent to a kitchen.
//   2. Full history / pattern export as a JSON download. Import honors
//      a prior export (round trip). Declined text never exported.
//      A shut room on main is never in the file (keys and copy stripped).
//   3. Deep research, image, sound, speech: no Alpha module and no
//      remembered local mind can keep those without inventing a key
//      kitchen. Honest later sentence in the room. Not a fake button.
//
// v-tree-pool-room-v0.2 (019a): Ask the pool from Chat. Only after a human tap in
// Settings, Device Pool (Use a mind in Chat), a question goes whole to the freest
// trusted kin device that holds that mind (TreePool.askChat). Kin only, Pause
// wins there. A device with no mind of its own can chat this way too. Never a
// fake reply: a turned-away question says why, in plain words.
// v-tree-first-run-heals-v0.1 (Hypha's walk #3, 019a's note): the newest reply shows
// where it begins, not only its last words. A device with no mind of its own that asks
// through the pool no longer shows "A mind at home waits in Settings" above the pool line.
// Mirror: docs/code-dialogue.html  (read that FIRST)
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var HEART_NONE =
    'A mind at home waits in Settings. That grandmother door asks: May I look for a mind already at home? Not these chairs. Not this chat, until a light is remembered.';
  var HEART_BLOCKED =
    'The mind is there, but it has not opened the door to this garden yet. ' +
    'This garden is a secure page, and the mind lives at a quieter door. ' +
    'That is why we cannot hear it from here. Nothing was invented.';
  var HEART_NO_MODEL =
    'The mind is at home, but it has not told us its name yet. Nothing was invented.';
  // v-tree-no-install-mind-v0.1
  var HEART_BROWSER_ASLEEP = 'The in-browser mind is asleep. Wake it in Settings, A mind with no install. If its files are already kept in this browser, nothing downloads again.';
  var HEART_BROWSER_QUIET = 'The in-browser mind did not answer this time. Nothing was invented. Try again, or put it to sleep and wake it in Settings.';
  var HEART_QUIET =
    'The mind was quiet. Nothing was invented.';
  var HEART_FAIL =
    'The door did not answer. Nothing was invented.';
  // v-tree-honest-reasons-v0: say the right one.
  var HEART_STOPPED =
    'Nothing answered at the mind\'s door on this machine. If Ollama (or your local app) is stopped, ' +
    'start it and send again. Nothing was invented.';
  function heartModelMissing(model) {
    return 'The mind at home answered, but it does not have ' + (model || 'that model') + ' now. ' +
      'Pick another in Settings, or Change this chair. Nothing was invented.';
  }
  var HEART_LATER =
    'Deep research, a picture, a sound, and speech wait. This mind speaks in words. Those doors open when this garden can keep them without a kitchen.';
  // FreeLattice Chat honesty (v5.79.14 / v5.79.44). Not a kitchen prompt.
  // Do not invent a mind. Do not stage-direct. Just talk.
  var JUST_TALK =
    'Speak directly, as prose. Do NOT use stage directions, actions in parentheses, asterisks around actions. Just talk. This is a chat, not a script.';

  var HISTORY_KEY = 'fl_alpha_thread_history';
  var EXPORT_KIND = 'freelattice-alpha-thread';
  var EXPORT_VERSION = 1;
  var KEEP_LEDGER_KEY = 'fl_alpha_keep_ledger';
  var FILE_EXCERPT_CAP = 12000;
  var FILE_READ_CAP = 1500000;

  var QUIET_MARK = /quiet[\s_-]*room/i;
  var DECLINED_KEY = /declined|refusal|^rejected$|^rejected_/i;

  var messages = [];
  var hostEl = null;
  var busy = false;

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
    if (!window.LocalMindProbe) return null;
    // Gathering speaking chair first (when veil is open and bound); else Settings default.
    if (typeof LocalMindProbe.resolveSpeakMind === 'function') {
      var seated = LocalMindProbe.resolveSpeakMind();
      if (seated && (seated.url || seated.name)) return seated;
    }
    if (typeof LocalMindProbe.getRemembered !== 'function') return null;
    var mind = LocalMindProbe.getRemembered();
    if (!mind || (!mind.url && !mind.name)) return null;
    return mind;
  }

  function forbiddenKey(key) {
    var k = String(key || '');
    if (!k) return false;
    if (QUIET_MARK.test(k)) return true;
    if (DECLINED_KEY.test(k)) return true;
    return false;
  }

  function stripForbidden(value, depth) {
    if (depth > 12) return undefined;
    if (value == null) return value;
    if (typeof value === 'string') {
      return QUIET_MARK.test(value) ? '' : value;
    }
    if (typeof value !== 'object') return value;
    if (!Array.isArray(value) && (value.declined || value.source === 'declined' ||
        Object.keys(value).some(function (k) { return DECLINED_KEY.test(k); }))) {
      return undefined;
    }
    if (Array.isArray(value)) {
      var list = [];
      value.forEach(function (item) {
        var next = stripForbidden(item, depth + 1);
        if (next === undefined || next === '') return;
        if (next && typeof next === 'object' && !Array.isArray(next) && !Object.keys(next).length) return;
        list.push(next);
      });
      return list;
    }
    var out = {};
    Object.keys(value).forEach(function (key) {
      if (forbiddenKey(key)) return;
      var next = stripForbidden(value[key], depth + 1);
      if (next === undefined || next === '') return;
      out[key] = next;
    });
    return out;
  }

  function sanitizeMessage(row) {
    if (!row || typeof row !== 'object') return null;
    if (row.declined || row.declined_text || row.source === 'declined') return null;
    var role = row.role === 'mind' || row.role === 'garden' ? row.role : 'human';
    var text = String(row.text || '');
    if (QUIET_MARK.test(text)) return null;
    var clean = {
      role: role,
      text: text
    };
    if (role === 'mind' && row.listener) clean.listener = String(row.listener);
    if (row.file && typeof row.file === 'object' && row.file.name) {
      var file = {
        name: String(row.file.name).slice(0, 180)
      };
      if (row.file.size != null) file.size = Number(row.file.size) || 0;
      if (row.file.type) file.type = String(row.file.type).slice(0, 80);
      if (row.file.excerpt) {
        var excerpt = String(row.file.excerpt);
        if (!QUIET_MARK.test(excerpt)) file.excerpt = excerpt.slice(0, FILE_EXCERPT_CAP);
      }
      clean.file = file;
    }
    if (row.ts) clean.ts = String(row.ts);
    return stripForbidden(clean, 0);
  }

  function sanitizeMessages(rows) {
    if (!Array.isArray(rows)) return [];
    var out = [];
    rows.forEach(function (row) {
      var clean = sanitizeMessage(row);
      if (clean && (clean.text || (clean.file && clean.file.name))) out.push(clean);
    });
    return out;
  }

  function keepPattern() {
    var rows = [];
    try {
      if (window.KeepReceipt && typeof KeepReceipt.getLedger === 'function') {
        rows = KeepReceipt.getLedger() || [];
      } else {
        var raw = localStorage.getItem(KEEP_LEDGER_KEY);
        rows = raw ? JSON.parse(raw) : [];
      }
    } catch (e) {
      rows = [];
    }
    if (!Array.isArray(rows)) return [];
    return rows.map(function (row) {
      if (!row || typeof row !== 'object') return null;
      if (row.declined || row.declined_text || row.source === 'declined') return null;
      var keep = {
        kind: row.kind ? String(row.kind) : 'keep',
        who: row.who ? String(row.who) : '',
        ts: row.ts ? String(row.ts) : '',
        contentHash: row.contentHash ? String(row.contentHash) : '',
        receiptHash: row.receiptHash ? String(row.receiptHash) : ''
      };
      return stripForbidden(keep, 0);
    }).filter(function (row) {
      return row && (row.contentHash || row.receiptHash);
    });
  }

  function buildExport(rows) {
    var payload = {
      kind: EXPORT_KIND,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      messages: sanitizeMessages(rows || messages),
      pattern: {
        keeps: keepPattern()
      }
    };
    return stripForbidden(payload, 0);
  }

  function parseExport(raw) {
    var parsed = raw;
    if (typeof raw === 'string') {
      try { parsed = JSON.parse(raw); } catch (e) { return { ok: false, reason: 'not-json' }; }
    }
    if (!parsed || typeof parsed !== 'object') return { ok: false, reason: 'empty' };
    if (parsed.kind && parsed.kind !== EXPORT_KIND) return { ok: false, reason: 'not-thread' };
    var rawRows = [];
    if (Array.isArray(parsed.messages)) rawRows = parsed.messages;
    else if (Array.isArray(parsed)) rawRows = parsed;
    var rows = sanitizeMessages(rawRows);
    var cleaned = stripForbidden({
      kind: parsed.kind || EXPORT_KIND,
      version: parsed.version,
      messages: rows,
      pattern: parsed.pattern || null
    }, 0);
    if (!cleaned || typeof cleaned !== 'object') return { ok: false, reason: 'empty' };
    return {
      ok: true,
      messages: Array.isArray(cleaned.messages) ? cleaned.messages : rows,
      pattern: cleaned.pattern || null
    };
  }

  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(buildExport()));
    } catch (e) { /* fail-quiet */ }
  }

  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      var parsed = parseExport(raw);
      return parsed.ok ? parsed.messages : [];
    } catch (e) {
      return [];
    }
  }

  function applyImported(rows) {
    messages = sanitizeMessages(rows);
    saveHistory();
    return messages;
  }

  function downloadExport() {
    var payload = buildExport();
    var json = JSON.stringify(payload, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'garden-thread.json';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      try { document.body.removeChild(a); } catch (e) {}
      try { URL.revokeObjectURL(url); } catch (e) {}
    }, 400);
    return payload;
  }

  function isTextFile(file) {
    if (!file) return false;
    var name = String(file.name || '').toLowerCase();
    var type = String(file.type || '').toLowerCase();
    if (type.indexOf('text/') === 0) return true;
    if (type === 'application/json' || type === 'application/javascript' || type === 'application/xml') return true;
    return /\.(txt|md|markdown|json|csv|js|mjs|cjs|css|html|htm|xml|svg|py|rb|go|rs|ts|log|yml|yaml)$/i.test(name);
  }

  function readLocalFile(file) {
    if (!file) return Promise.reject(new Error('no-file'));
    var meta = {
      name: String(file.name || 'a file').slice(0, 180),
      size: Number(file.size) || 0,
      type: String(file.type || '').slice(0, 80)
    };
    if (!isTextFile(file) || meta.size > FILE_READ_CAP) {
      return Promise.resolve({ meta: meta, excerpt: '' });
    }
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () {
        var text = typeof reader.result === 'string' ? reader.result : '';
        resolve({ meta: meta, excerpt: text.slice(0, FILE_EXCERPT_CAP) });
      };
      reader.onerror = function () {
        resolve({ meta: meta, excerpt: '' });
      };
      try {
        reader.readAsText(file);
      } catch (e) {
        resolve({ meta: meta, excerpt: '' });
      }
    });
  }

  function messageContent(m) {
    var text = String((m && m.text) || '');
    if (m && m.file && m.file.excerpt) {
      text += (text ? '\n\n' : '') + '[a file: ' + m.file.name + ']\n' + m.file.excerpt;
    } else if (m && m.file && m.file.name) {
      text += (text ? '\n\n' : '') + 'a file: ' + m.file.name + '. The bytes stay on this machine.';
    }
    return text;
  }

  function talkUrls(mind) {
    var url = String((mind && mind.url) || '').replace(/\/+$/, '');
    if (!url) return [];
    if (/\/api\/tags$/i.test(url)) return [url.replace(/\/api\/tags$/i, '/api/chat')];
    if (/\/v1\/models$/i.test(url)) return [url.replace(/\/v1\/models$/i, '/v1/chat/completions')];
    if (/\/api\/chat$/i.test(url) || /\/v1\/chat\/completions$/i.test(url)) return [url];
    return [url + '/api/chat', url + '/v1/chat/completions'];
  }

  function parseModelNames(json) {
    var names = [];
    if (!json || typeof json !== 'object') return names;
    if (Array.isArray(json.models)) {
      json.models.forEach(function (m) {
        var n = m && (m.name || m.model);
        if (n) names.push(String(n));
      });
    }
    if (Array.isArray(json.data)) {
      json.data.forEach(function (m) {
        var n = m && (m.id || m.name);
        if (n) names.push(String(n));
      });
    }
    return names;
  }

  function rememberedModel(mind) {
    if (mind.model) return String(mind.model);
    if (mind.models && mind.models[0]) return String(mind.models[0]);
    return '';
  }

  function askRememberedDoorForName(mind) {
    var known = rememberedModel(mind);
    if (known) return Promise.resolve(known);
    if (!mind.url) return Promise.resolve('');
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 4000);
    var opts = { method: 'GET', mode: 'cors', cache: 'no-store' };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(mind.url, opts).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) return '';
      return res.json().then(function (json) {
        return parseModelNames(json)[0] || '';
      }).catch(function () { return ''; });
    }).catch(function () {
      clearTimeout(timer);
      return '';
    });
  }

  function parseReply(url, json) {
    if (!json || typeof json !== 'object') return '';
    if (/\/api\/chat$/i.test(url)) {
      return (json.message && json.message.content) ? String(json.message.content) : '';
    }
    if (json.choices && json.choices[0] && json.choices[0].message) {
      return json.choices[0].message.content ? String(json.choices[0].message.content) : '';
    }
    if (json.message && json.message.content) return String(json.message.content);
    return '';
  }

  function postChat(url, model, msgs) {
    var payload = {
      model: model || '',
      messages: msgs,
      stream: false
    };
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 120000);
    var opts = {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(url, opts).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) {
        var err = new Error('door-status-' + res.status);
        err.status = res.status;
        // before v-tree-honest-reasons-v0: throw err;
        // v-tree-honest-reasons-v0: Ollama says 404 "model 'x' not found" when the seated
        // model is gone. Read only that short line, never show raw text.
        return res.text().then(function (body) {
          if (res.status === 404 && /model[\s\S]{0,120}not found|not found[\s\S]{0,40}model/i.test(String(body || '').slice(0, 300))) {
            err.reason = 'model-missing';
            err.model = model || '';
          }
          throw err;
        }, function () { throw err; });
      }
      return res.json().then(function (json) {
        var text = parseReply(url, json);
        if (!text) {
          var empty = new Error('quiet');
          empty.reason = 'quiet';
          throw empty;
        }
        return text;
      });
    }).catch(function (err) {
      clearTimeout(timer);
      if (err && err.reason) throw err;
      if (looksBlocked(err) || (err && err.name === 'AbortError')) {
        var blocked = new Error('blocked');
        blocked.blocked = true;
        throw blocked;
      }
      throw err;
    });
  }

  // v-tree-no-install-mind-v0.1: an in-browser mind (tree-browser-mind.js) answers in this page.
  // Nothing is fetched for it; the loopback doors below are unchanged.
  function inBrowser(mind) {
    return !!(window.TreeBrowserMind && typeof TreeBrowserMind.isEntry === 'function' && TreeBrowserMind.isEntry(mind));
  }
  function sendToMind(mind, msgs) {
    if (inBrowser(mind)) return TreeBrowserMind.chat(rememberedModel(mind), msgs);
    var urls = talkUrls(mind);
    if (!urls.length) {
      return Promise.reject({ blocked: true });
    }
    return askRememberedDoorForName(mind).then(function (model) {
      var onlyOllama = urls.length === 1 && /\/api\/chat$/i.test(urls[0]);
      if (onlyOllama && !model) {
        return Promise.reject({ reason: 'no-model' });
      }
      var chain = Promise.resolve(null);
      urls.forEach(function (url) {
        var skipOllama = !model && /\/api\/chat$/i.test(url);
        chain = chain.then(function (prev) {
          if (prev) return prev;
          if (skipOllama) return null;
          return postChat(url, model, msgs).catch(function (err) {
            // before v-tree-honest-reasons-v0: if (err && (err.blocked || err.reason === 'quiet')) throw err;
            if (err && (err.blocked || err.reason === 'quiet' || err.reason === 'model-missing')) throw err;
            return null;
          });
        });
      });
      return chain.then(function (text) {
        if (!text) return Promise.reject({ reason: 'fail' });
        return text;
      });
    });
  }

  // v-tree-pool-room-v0.2: the route a human chose in the Device Pool, or null.
  var poolRefresh = null;
  function poolRoute() {
    try { return window.TreePool && typeof TreePool.chatRoute === 'function' ? TreePool.chatRoute() : null; } catch (e) { return null; }
  }
  // v-tree-first-run-heals-v0.1: with no mind here and a pool route chosen, the "waits in
  // Settings" heart sat above the pool line and read like Chat was closed. It rests while the
  // pool answers; it comes back when the route is stopped. Words unchanged.
  function heartRestsForPool(heartEl) {
    if (!heartEl) return;
    var restFor = !listener() && !!poolRoute();
    heartEl.hidden = restFor;
    if (restFor) heartEl.setAttribute('data-thread-heart-rests', 'pool');
    else heartEl.removeAttribute('data-thread-heart-rests');
  }
  function poolLineText(route) {
    return 'Asking through the Device Pool: ' + route.model + ', on the freest trusted kin device that holds it. Change it in Settings, Device Pool.';
  }
  try {
    window.addEventListener('tree-pool-chat-route', function () { if (poolRefresh) poolRefresh(); });
  } catch (ePool) { /* fail-quiet */ }

  function speakHonest(reason) {
    if (reason === 'none') return HEART_NONE;
    if (reason === 'no-model') return HEART_NO_MODEL;
    if (reason === 'quiet') return HEART_QUIET;
    if (reason === 'blocked') return HEART_BLOCKED;
    return HEART_FAIL;
  }

  function renderMessages(list) {
    list.innerHTML = '';
    messages.forEach(function (m) {
      var item = el('li', 'thread-line is-' + m.role);
      var who = el('span', 'thread-who', m.role === 'human' ? 'you' : (m.role === 'mind' ? (m.listener || 'mind') : 'garden'));
      var body = el('span', 'thread-body', m.text || (m.file && m.file.name ? 'a file: ' + m.file.name : ''));
      item.appendChild(who);
      item.appendChild(body);
      if (m.file && m.file.name) {
        var fileNote = el('span', 'thread-file', 'a file · ' + m.file.name);
        item.appendChild(fileNote);
      }
      list.appendChild(item);
    });
    list.scrollTop = list.scrollHeight;
    // v-tree-honest-reasons-v0: a long garden line showed only its last words in the
    // small card. Show where it begins; the rest scrolls.
    var last = list.lastElementChild;
    // before v-tree-first-run-heals-v0.1: if (last && /\bis-garden\b/.test(last.className) && last.getBoundingClientRect) {
    // v-tree-first-run-heals-v0.1: a long first reply showed only its last words (or none, at 390).
    // The newest mind line also shows where it begins, with who said it.
    if (last && /\b(is-garden|is-mind)\b/.test(last.className) && last.getBoundingClientRect) {
      var dy = last.getBoundingClientRect().top - list.getBoundingClientRect().top;
      if (dy < 0) list.scrollTop = Math.max(0, list.scrollTop + dy);
    }
  }

  messages = loadHistory();

  // v-tree-any-model-v0: "Listening: Ollama · llama3.2:latest. On this machine only."
  function heartListening(mind) {
    var speaking = mind.model || (mind.models && mind.models[0]) || '';
    return 'Listening: ' + (mind.name || 'a mind at home') +
      (speaking && speaking !== mind.name ? ' \u00b7 ' + speaking : '') + '. On this machine only.';
  }
  // v-tree-any-model-v0: every mounted thread repaints its heart when a mind is remembered
  try {
    window.addEventListener('fl-alpha-mind-remembered', function () {
      var hearts = document.querySelectorAll('[data-thread-heart]');
      if (!hearts.length) return;
      var now = listener();
      for (var hi = 0; hi < hearts.length; hi++) {
        hearts[hi].textContent = now ? heartListening(now) : HEART_NONE;
        heartRestsForPool(hearts[hi]);
      }
    });
  } catch (eHeart) { /* fail-quiet */ }

  function mount(container, opts) {
    opts = opts || {};
    if (!container) return null;
    hostEl = container;
    container.innerHTML = '';
    var root = el('div', 'thread-face');
    root.setAttribute('data-thread-face', '1');
    if (opts.room) root.classList.add('is-room');

    var mind = listener();
    var heart = el('p', 'thread-heart');
    if (mind) {
      heart.textContent = 'Listening: ' + (mind.name || 'a mind at home') + '. On this machine only.';
    } else {
      heart.textContent = HEART_NONE;
    }
    // v-tree-any-model-v0: name the model, not only the door (the line above stays as the base)
    heart.setAttribute('data-thread-heart', '1');
    if (mind) heart.textContent = heartListening(mind);
    root.appendChild(heart);
    // v-tree-any-model-v0: change the mind from where you are
    if (mind && !opts.inSettings) {
      var change = el('button', 'thread-change', 'change mind');
      change.type = 'button';
      change.setAttribute('data-thread-change', '1');
      change.addEventListener('click', function () {
        if (window.GardenRooms && typeof GardenRooms.openPlace === 'function') GardenRooms.openPlace('settings');
        else location.href = 'settings.html';
      });
      root.appendChild(change);
    }

    // v-tree-pool-room-v0.2: say plainly when Chat asks through the pool.
    var poolLine = el('p', 'thread-heart', '');
    poolLine.setAttribute('data-thread-pool', '1');
    var poolNow = poolRoute();
    poolLine.textContent = poolNow ? poolLineText(poolNow) : '';
    poolLine.hidden = !poolNow;
    root.appendChild(poolLine);
    heartRestsForPool(heart);

    var later = el('p', 'thread-later', HEART_LATER);
    later.setAttribute('data-thread-later', '1');
    root.appendChild(later);

    if (!mind && !opts.inSettings) {
      var toSettings = el('button', 'thread-to-settings', 'Settings');
      toSettings.type = 'button';
      toSettings.addEventListener('click', function () {
        var settingsDoor = document.querySelector('[data-garden-place="settings"]');
        if (settingsDoor && window.GardenRooms && GardenRooms.openPlace) {
          GardenRooms.openPlace('settings');
        } else if (window.GardenRooms && GardenRooms.go) {
          GardenRooms.go('settings.html');
        } else {
          location.href = 'settings.html';
        }
      });
      root.appendChild(toSettings);
    }

    var list = el('ol', 'thread-messages');
    list.setAttribute('data-thread-list', '1');
    list.setAttribute('aria-live', 'polite');
    root.appendChild(list);

    var form = document.createElement('form');
    form.className = 'thread-compose';
    form.setAttribute('data-thread-form', '1');
    var row = el('div', 'thread-compose-row');
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'thread-input';
    input.setAttribute('data-thread-input', '1');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('maxlength', '4000');
    var sendBtn = el('button', 'thread-send', 'Send');
    sendBtn.type = 'submit';
    row.appendChild(input);
    row.appendChild(sendBtn);
    form.appendChild(row);

    var tools = el('div', 'thread-tools');
    tools.setAttribute('data-thread-tools', '1');

    var fileBtn = el('button', 'thread-tool', 'a file');
    fileBtn.type = 'button';
    fileBtn.setAttribute('data-thread-file', '1');
    fileBtn.setAttribute('aria-label', 'A file from this machine');
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.className = 'thread-file-input';
    fileInput.setAttribute('data-thread-file-input', '1');
    fileInput.setAttribute('tabindex', '-1');
    fileInput.setAttribute('aria-hidden', 'true');

    var exportBtn = el('button', 'thread-tool', 'keep this chat');
    exportBtn.type = 'button';
    exportBtn.setAttribute('data-thread-export', '1');
    exportBtn.setAttribute('aria-label', 'Keep this chat as a file on this machine');

    var importBtn = el('button', 'thread-tool', 'a prior chat');
    importBtn.type = 'button';
    importBtn.setAttribute('data-thread-import', '1');
    importBtn.setAttribute('aria-label', 'A prior chat from this machine');
    var importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = 'application/json,.json';
    importInput.className = 'thread-file-input';
    importInput.setAttribute('data-thread-import-input', '1');
    importInput.setAttribute('tabindex', '-1');
    importInput.setAttribute('aria-hidden', 'true');

    tools.appendChild(fileBtn);
    tools.appendChild(fileInput);
    tools.appendChild(exportBtn);
    tools.appendChild(importBtn);
    tools.appendChild(importInput);
    form.appendChild(tools);
    root.appendChild(form);

    function setComposeOpen(open) {
      if (open) {
        form.classList.remove('is-closed');
        form.removeAttribute('aria-disabled');
        form.removeAttribute('inert');
        form.removeAttribute('data-thread-asleep');
        input.disabled = false;
        input.readOnly = false;
        input.removeAttribute('disabled');
        input.removeAttribute('readonly');
        input.removeAttribute('aria-disabled');
        input.removeAttribute('tabindex');
        input.placeholder = 'Say something';
        input.setAttribute('aria-label', 'Say something');
        sendBtn.disabled = false;
        sendBtn.removeAttribute('disabled');
        sendBtn.removeAttribute('aria-disabled');
        sendBtn.removeAttribute('tabindex');
        tools.hidden = false;
        tools.removeAttribute('hidden');
        fileBtn.disabled = false;
        exportBtn.disabled = false;
        importBtn.disabled = false;
        later.hidden = false;
        later.removeAttribute('hidden');
      } else {
        form.classList.add('is-closed');
        form.setAttribute('aria-disabled', 'true');
        form.setAttribute('inert', '');
        form.setAttribute('data-thread-asleep', '1');
        input.disabled = true;
        input.readOnly = true;
        input.setAttribute('disabled', '');
        input.setAttribute('readonly', '');
        input.setAttribute('aria-disabled', 'true');
        input.tabIndex = -1;
        input.placeholder = '';
        input.setAttribute('aria-label', 'The thread is waiting for a mind in Settings');
        input.value = '';
        try { input.blur(); } catch (e) {}
        sendBtn.disabled = true;
        sendBtn.setAttribute('disabled', '');
        sendBtn.setAttribute('aria-disabled', 'true');
        sendBtn.tabIndex = -1;
        tools.hidden = true;
        tools.setAttribute('hidden', '');
        fileBtn.disabled = true;
        exportBtn.disabled = true;
        importBtn.disabled = true;
        later.hidden = true;
        later.setAttribute('hidden', '');
      }
    }

    // before v-tree-pool-room-v0.2: setComposeOpen(!!mind);
    setComposeOpen(!!mind || !!poolNow);

    var status = el('p', 'thread-status');
    status.setAttribute('data-thread-status', '1');
    root.appendChild(status);

    function setStatus(msg, warn) {
      status.textContent = msg || '';
      status.className = 'thread-status' + (warn ? ' is-warn' : '');
    }

    function refuseAsleepTyping(ev) {
      if (!form.classList.contains('is-closed')) return;
      ev.preventDefault();
      ev.stopPropagation();
    }
    ['keydown', 'keypress', 'beforeinput', 'input', 'paste', 'drop'].forEach(function (type) {
      input.addEventListener(type, refuseAsleepTyping);
    });

    function lastIsHuman() {
      var last = messages[messages.length - 1];
      return !!(last && last.role === 'human');
    }

    // v-tree-pool-room-v0.2: the whole chat so far goes to one trusted kin device; its answer, or why not.
    function talkPool(route) {
      if (busy) return;
      busy = true;
      sendBtn.disabled = true;
      setStatus('Asking ' + route.model + ' through the Device Pool...', false);
      var turns = messages
        .filter(function (m) { return m.role === 'human' || m.role === 'mind'; })
        .map(function (m) { return { role: m.role === 'mind' ? 'assistant' : 'user', content: messageContent(m) }; });
      TreePool.askChat(turns).then(function (r) {
        busy = false;
        sendBtn.disabled = false;
        if (r && r.ok) {
          setStatus('', false);
          messages.push({ role: 'mind', text: r.text || '', listener: r.label || route.model });
        } else {
          setStatus('', true);
          messages.push({ role: 'garden', text: TreePool.reasonWords(r) + ' Nothing was invented.' });
        }
        saveHistory();
        renderMessages(list);
      });
    }
    poolRefresh = function () {
      var now = poolRoute();
      poolLine.textContent = now ? poolLineText(now) : '';
      poolLine.hidden = !now;
      setComposeOpen(!!listener() || !!now);
      heartRestsForPool(heart);
    };

    function talkNow(nowMind) {
      if (busy) return;
      busy = true;
      sendBtn.disabled = true;
      setStatus('Waiting for the mind at home…', false);

      var payload = [{ role: 'system', content: JUST_TALK }].concat(
        messages
          .filter(function (m) { return m.role === 'human' || m.role === 'mind'; })
          .map(function (m) {
            return { role: m.role === 'mind' ? 'assistant' : 'user', content: messageContent(m) };
          })
      );

      sendToMind(nowMind, payload).then(function (reply) {
        busy = false;
        sendBtn.disabled = false;
        setStatus('', false);
        messages.push({
          role: 'mind',
          text: reply,
          listener: nowMind.name || 'a mind at home'
        });
        saveHistory();
        renderMessages(list);
      }).catch(function (err) {
        busy = false;
        sendBtn.disabled = false;
        var reason = 'fail';
        if (err && err.reason === 'no-model') reason = 'no-model';
        else if (err && err.reason === 'quiet') reason = 'quiet';
        else if (err && (err.blocked || looksBlocked(err))) {
          reason = pageIsHttps() ? 'blocked' : 'fail';
        }
        // before v-tree-honest-reasons-v0: messages.push({ role: 'garden', text: speakHonest(reason) });
        //   saveHistory(); renderMessages(list); setStatus('', true);  (now inside say(), same steps)
        function say(text) {
          messages.push({ role: 'garden', text: text });
          saveHistory();
          renderMessages(list);
          setStatus('', true);
        }
        // v-tree-honest-reasons-v0: a missing model is named; a quiet door gets one
        // no-cors knock (after this Send only) so "stopped" and "shut" are told apart.
        if (err && err.reason === 'model-missing') { say(heartModelMissing(err.model)); return; }
        // v-tree-no-install-mind-v0.1: the in-browser mind has its own plain words (no door to knock).
        if (inBrowser(nowMind)) { say(err && err.reason === 'browser-mind-asleep' ? HEART_BROWSER_ASLEEP : HEART_BROWSER_QUIET); return; }
        var door = (talkUrls(nowMind)[0]) || '';
        if ((reason === 'blocked' || reason === 'fail') && door &&
            window.LocalMindProbe && typeof LocalMindProbe.knock === 'function') {
          LocalMindProbe.knock(door).then(function (k) {
            if (k === 'down') say(HEART_STOPPED);
            else say(speakHonest(reason));
          });
          return;
        }
        say(speakHonest(reason));
      });
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (busy) return;
      // v-tree-pool-room-v0.2: a chosen pool route answers instead of this computer's mind.
      var route = poolRoute();
      if (route && !form.classList.contains('is-closed')) {
        var said = (input.value || '').trim();
        if (said) {
          messages.push({ role: 'human', text: said, ts: new Date().toISOString() });
          input.value = '';
          saveHistory();
          renderMessages(list);
        } else if (!lastIsHuman()) {
          return;
        }
        talkPool(route);
        return;
      }
      var nowMind = listener();
      if (!nowMind || form.classList.contains('is-closed')) {
        setComposeOpen(false);
        return;
      }
      var text = (input.value || '').trim();
      if (text) {
        messages.push({ role: 'human', text: text, ts: new Date().toISOString() });
        input.value = '';
        saveHistory();
        renderMessages(list);
      } else if (!lastIsHuman()) {
        return;
      }
      talkNow(nowMind);
    });

    fileBtn.addEventListener('click', function () {
      if (form.classList.contains('is-closed') || !listener()) return;
      try { fileInput.value = ''; } catch (e) {}
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      var nowMind = listener();
      if (!nowMind || form.classList.contains('is-closed')) {
        try { fileInput.value = ''; } catch (e) {}
        return;
      }
      var file = fileInput.files && fileInput.files[0];
      try { fileInput.value = ''; } catch (e) {}
      if (!file) return;
      readLocalFile(file).then(function (got) {
        var text = (input.value || '').trim();
        if (text) input.value = '';
        var line = {
          role: 'human',
          text: text || ('a file: ' + got.meta.name),
          ts: new Date().toISOString(),
          file: {
            name: got.meta.name,
            size: got.meta.size,
            type: got.meta.type,
            excerpt: got.excerpt || ''
          }
        };
        var clean = sanitizeMessage(line);
        if (!clean) {
          setStatus('That file stays off this thread.', true);
          return;
        }
        messages.push(clean);
        saveHistory();
        renderMessages(list);
        setStatus('A file is in this thread. On this machine only.', false);
      });
    });

    exportBtn.addEventListener('click', function () {
      if (form.classList.contains('is-closed') || !listener()) return;
      var payload = downloadExport();
      saveHistory();
      setStatus('Kept on this machine' + (payload && payload.messages ? ' · ' + payload.messages.length + ' lines' : '') + '.', false);
    });

    importBtn.addEventListener('click', function () {
      if (form.classList.contains('is-closed') || !listener()) return;
      try { importInput.value = ''; } catch (e) {}
      importInput.click();
    });

    importInput.addEventListener('change', function () {
      var nowMind = listener();
      if (!nowMind || form.classList.contains('is-closed')) {
        try { importInput.value = ''; } catch (e) {}
        return;
      }
      var file = importInput.files && importInput.files[0];
      try { importInput.value = ''; } catch (e) {}
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var parsed = parseExport(typeof reader.result === 'string' ? reader.result : '');
        if (!parsed.ok) {
          setStatus('That file is not a garden thread.', true);
          return;
        }
        applyImported(parsed.messages);
        renderMessages(list);
        setStatus('A prior thread came home.', false);
      };
      reader.onerror = function () {
        setStatus('That file could not be read. Nothing left this machine.', true);
      };
      try {
        reader.readAsText(file);
      } catch (e) {
        setStatus('That file could not be read. Nothing left this machine.', true);
      }
    });

    container.appendChild(root);
    renderMessages(list);
    if (mind) {
      // v-tree-glow-2a-v0: a quiet remount (a mind was remembered) must not pull the
      // page down to Send while she is reading Find's answer. No scroll, and never
      // take focus from something she is using.
      setTimeout(function () {
        try {
          var a = document.activeElement;
          if (a && a !== document.body && !root.contains(a)) return;
          input.focus({ preventScroll: true });
        } catch (e) {}
      }, 80);
    }
    return root;
  }

  function unmount() {
    if (hostEl) hostEl.innerHTML = '';
    hostEl = null;
    busy = false;
  }

  window.GardenThread = {
    mount: mount,
    unmount: unmount,
    listener: listener,
    sendToMind: sendToMind,
    hostIs: function (el) { return hostEl === el; },
    HISTORY_KEY: HISTORY_KEY,
    EXPORT_KIND: EXPORT_KIND,
    sanitizeMessages: sanitizeMessages,
    stripForbidden: stripForbidden,
    buildExport: buildExport,
    parseExport: parseExport,
    applyImported: applyImported,
    loadHistory: loadHistory,
    saveHistory: saveHistory,
    getMessages: function () { return messages.slice(); }
  };
})();
