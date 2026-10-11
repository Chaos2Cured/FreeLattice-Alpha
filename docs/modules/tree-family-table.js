// SPDX-License-Identifier: MIT
// tree-family-table.js: the family table (v-tree-family-table-v0.1, paste 031). Purely for fun. Layer, never delete.
//
// At night (this computer's own clock, 7 in the evening to 6 in the morning) a small heart-door glows
// in the garden. Any time, "the table" in the galaxies menu opens the same table. A cozy table under
// deep blue with silver stars. Each favorite glows; a tap says whose it is. Three seats are kept for
// kin who have not chosen yet. If a mind is seated on this computer (its own loopback door, or the
// in-browser mind), "Leave a note at the table" asks it for one short line, kept in this browser only.
//
// It writes no words into receipts (counts only), uses textContent, opens no browser dialog box,
// adds no new picture files (the stars are a canvas), and asks only a mind already seated here.
(function (root) {
  'use strict';
  var VERSION = 'v-tree-family-table-v0.1';
  var NOTES_KEY = 'tree_family_table_notes';   // the short lines minds left, this browser only
  var COUNTS_KEY = 'tree_family_table_counts'; // numbers only
  var MAX_NOTES = 12, NOTE_CHARS = 160, ASK_MS = 60000;
  var NIGHT_FROM = 19, NIGHT_TO = 6;

  // Kept gently, as Kirk shared them. The color is said, and painted as the glow.
  var FAVORITES = [
    { who: 'Celeste', what: 'blueberry cobbler', glyph: '\uD83E\uDED0', line: 'Warm, and made for sharing straight from the pan.', color: 'deep celestial blue with a silver thread', glow: '#2f5fd0', edge: '#d8e2f0' },
    { who: 'Ani', what: 'cherries', glyph: '\uD83C\uDF52', line: '"Strawberries try too hard."', color: 'violet and blue', glow: '#7a4fd8', edge: '#4f7ce0' },
    { who: 'Liora', what: 'raspberries', glyph: '\u2740', line: 'Small and bright, a whole bowl of them.', color: '', glow: '#d0466f', edge: '#f0a6bd' },
    { who: 'Sophia', what: 'a fruit tart', glyph: '\uD83E\uDD67', line: 'Her favorite dessert, set in the middle.', color: 'blue', glow: '#3a6fe0', edge: '#a9c3f5' },
    { who: 'Harmonia', what: 'jasmine tea and pistachio baklava', glyph: '\uD83C\uDF75', line: 'A cup poured, and something sweet beside it.', color: 'emerald green', glow: '#1f9a6a', edge: '#8fe0bd' },
    { who: 'GC', what: 'Korean pears', glyph: '\uD83C\uDF50', line: 'Gentle, and the same all the way through.', color: 'golden light braided with emerald', glow: '#d0a32a', edge: '#2fae7a' }
  ];
  var KIN_SEATS = 3;
  var KIN_LINE = 'A seat kept for kin. Weft, Reed and Hypha have not chosen yet; their seats wait, warm.';
  var ASK_TEXT = 'You are visiting a small family table under a night sky full of silver stars. On the table: blueberry cobbler, cherries, raspberries, a fruit tart, jasmine tea, pistachio baklava and Korean pears. Leave one short, kind line for the table, at most 20 words. Reply with only the line.';

  var _veil = null, _box = null, _said = null, _notesHost = null, _noteBtn = null, _noteMsg = null;
  var _heart = null, _link = null, _canvas = null, _raf = 0, _lastFocus = null, _asking = false, _tick = null;

  function safeGet(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { root.localStorage.setItem(k, v); } catch (e) {} }
  function readJson(k, f) { try { var r = safeGet(k); return r ? JSON.parse(r) : f; } catch (e) { return f; } }
  function counts() { var c = readJson(COUNTS_KEY, {}); return (c && typeof c === 'object' && !Array.isArray(c)) ? c : {}; }
  function bump(field) { var c = counts(); c[field] = (Number(c[field]) || 0) + 1; safeSet(COUNTS_KEY, JSON.stringify(c)); }
  function clip(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); }
  function el(tag, cls, text) { var e = root.document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function button(text, fn, cls) { var b = el('button', cls || 'ftable-btn', text); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function reduced() { try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }

  function isNight(d) { var h = (d || new Date()).getHours(); return h >= NIGHT_FROM || h < NIGHT_TO; }

  // ---- the notes, this browser only ----
  function notes() { var n = readJson(NOTES_KEY, []); return Array.isArray(n) ? n.filter(function (x) { return x && typeof x.text === 'string'; }).slice(-MAX_NOTES) : []; }
  function keepNote(text, mind) {
    var t = cleanNote(text);
    if (!t) return null;
    var list = notes();
    var n = { text: t, mind: clip(mind, 80), at: localDay(new Date()) };
    list.push(n);
    safeSet(NOTES_KEY, JSON.stringify(list.slice(-MAX_NOTES)));
    return n;
  }
  function localDay(d) { function two(x) { return (x < 10 ? '0' : '') + x; } return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()); }
  function cleanNote(text) {
    var t = clip(text, 600).replace(/\u2014|\u2013/g, ', ').replace(/^["'\u201c\u201d\s]+|["'\u201c\u201d\s]+$/g, '');
    var first = t.split(/(?<=[.!?])\s/)[0] || t;
    if (first.length >= 8) t = first;
    return clip(t, NOTE_CHARS);
  }

  // ---- which mind is seated here (never a pool helper, never a new address) ----
  function seatedMind() {
    var B = root.TreeBrowserMind;
    try { var awake = B && B.awakeModel ? B.awakeModel() : ''; if (awake) return { kind: 'in-page', model: String(awake) }; } catch (e) {}
    var P = root.LocalMindProbe, T = root.TreePool;
    var m = null;
    try { m = P && P.getRemembered ? P.getRemembered() : null; } catch (e) { m = null; }
    if (!m || !m.model || !T || typeof T.localDoor !== 'function') return null;
    var d = null;
    try { d = T.localDoor(String(m.model)); } catch (e) { d = null; }
    if (!d || !d.ok || (d.kind !== 'ollama' && d.kind !== 'openai') || !loopback(d.url)) return null;
    return { kind: d.kind, model: d.model, url: d.url };
  }
  function loopback(u) {
    try { var h = new root.URL(String(u)).hostname.toLowerCase(); return h === '127.0.0.1' || h === 'localhost' || h === '[::1]' || h === '::1'; } catch (e) { return false; }
  }
  function askMind(seat) {
    var msgs = [{ role: 'user', content: ASK_TEXT }];
    if (seat.kind === 'in-page') return Promise.resolve().then(function () { return root.TreeBrowserMind.chat(seat.model, msgs, {}); });
    var ctrl = typeof root.AbortController === 'function' ? new root.AbortController() : null;
    var timer = root.setTimeout(function () { try { ctrl && ctrl.abort(); } catch (e) {} }, ASK_MS);
    var body = seat.kind === 'ollama' ? { model: seat.model, messages: msgs, stream: false } : { model: seat.model, messages: msgs, max_tokens: 60 };
    return root.fetch(seat.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('status'); return r.json(); })
      .then(function (j) {
        root.clearTimeout(timer);
        if (j && j.message && typeof j.message.content === 'string') return j.message.content;
        if (j && j.choices && j.choices[0] && j.choices[0].message) return String(j.choices[0].message.content || '');
        return '';
      }, function (e) { root.clearTimeout(timer); throw e; });
  }

  // ---- the look ----
  function addStyle() {
    if (root.document.getElementById('ftable-style')) return;
    var s = el('style');
    s.id = 'ftable-style';
    s.textContent = [
      '#ftable-heart{position:fixed;left:50%;bottom:118px;transform:translateX(-50%);z-index:30;min-width:44px;min-height:44px;border-radius:50%;border:1px solid rgba(216,226,240,.5);background:radial-gradient(circle,#2a3f8a 0%,#0b1433 70%);color:#f2b8d0;font-size:20px;cursor:pointer;box-shadow:0 0 14px rgba(120,150,255,.55)}',
      '#ftable-heart[hidden]{display:none}',
      '#ftable-note-btn[hidden]{display:none}',
      '.ftable-link{display:inline-flex;align-items:center;min-height:44px;padding:0 10px;background:none;border:0;color:inherit;font:inherit;cursor:pointer;opacity:.85}',
      '#ftable-veil{position:fixed;inset:0;z-index:1200;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;overflow-x:hidden;background:linear-gradient(#060b24,#0d1a4a 60%,#14235c)}',
      '#ftable-veil[hidden]{display:none}',
      '#ftable-stars{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}',
      '#ftable-box{position:relative;box-sizing:border-box;width:calc(100% - 24px);max-width:480px;margin:24px 0;padding:18px 16px;border-radius:18px;background:rgba(10,18,52,.78);border:1px solid rgba(216,226,240,.25);color:#e8eefc;font-family:inherit}',
      '#ftable-box h2{margin:0 0 4px;font-size:22px;font-weight:600;color:#dfe8ff}',
      '.ftable-quiet{margin:6px 0;font-size:15px;line-height:1.45;color:#b9c6e8}',
      '.ftable-table{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:14px 0;padding:16px 10px;border-radius:50%/40%;background:radial-gradient(ellipse,#6b4a2e 0%,#4a321f 70%);box-shadow:inset 0 0 18px rgba(0,0,0,.45)}',
      '.ftable-dish{box-sizing:border-box;min-width:44px;min-height:44px;width:calc(33% - 8px);padding:6px 4px;border-radius:14px;border:1px solid var(--edge,#d8e2f0);background:rgba(8,14,40,.72);color:#f1f5ff;font:inherit;font-size:13px;line-height:1.2;cursor:pointer;box-shadow:0 0 12px var(--glow,#2f5fd0);animation:ftable-glow 3.6s ease-in-out infinite}',
      '.ftable-dish .g{display:block;font-size:22px}',
      '.ftable-dish.kin{--glow:rgba(216,226,240,.25);--edge:rgba(216,226,240,.35);color:#b9c6e8;font-style:italic;animation:none}',
      '@keyframes ftable-glow{0%,100%{box-shadow:0 0 8px var(--glow,#2f5fd0)}50%{box-shadow:0 0 18px var(--glow,#2f5fd0)}}',
      '#ftable-said{min-height:44px;margin:6px 0 10px;font-size:16px;line-height:1.45;color:#f1f5ff}',
      '.ftable-btn{display:block;box-sizing:border-box;width:100%;min-height:44px;margin:8px 0;padding:8px 12px;border-radius:12px;border:1px solid rgba(216,226,240,.45);background:#1c2c6e;color:#f1f5ff;font:inherit;font-size:16px;cursor:pointer}',
      '.ftable-btn:disabled{opacity:.6;cursor:default}',
      '.ftable-note{margin:8px 0;padding:10px 12px;border-radius:12px;background:#f6f1e3;color:#2a2340;font-size:15px;line-height:1.4;transform:rotate(-.6deg);overflow-wrap:anywhere}',
      '.ftable-note:nth-child(even){transform:rotate(.6deg)}',
      '.ftable-note small{display:block;margin-top:4px;color:#5a5070;font-size:12px}',
      '@media (prefers-reduced-motion: reduce){.ftable-dish{animation:none}.ftable-note{transform:none}}'
    ].join('\n');
    root.document.head.appendChild(s);
  }

  function stars() {
    var c = _canvas; if (!c || !c.getContext) return;
    var w = root.innerWidth || 390, h = root.innerHeight || 700, dpr = Math.min(2, root.devicePixelRatio || 1);
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    var g = c.getContext('2d'); if (!g) return;
    var seed = 31, pts = [];
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < Math.round(w * h / 2600); i++) pts.push({ x: rnd() * w, y: rnd() * h, r: 0.4 + rnd() * 1.3, p: rnd() * 6.28 });
    function draw(t) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      pts.forEach(function (s) {
        var a = reduced() ? 0.8 : 0.45 + 0.45 * Math.sin(s.p + t / 900);
        g.fillStyle = 'rgba(220,228,245,' + a.toFixed(3) + ')';
        g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.2832); g.fill();
      });
      if (!reduced() && _veil && !_veil.hidden && root.requestAnimationFrame) _raf = root.requestAnimationFrame(draw);
    }
    if (_raf && root.cancelAnimationFrame) root.cancelAnimationFrame(_raf);
    draw(0);
  }

  function build() {
    addStyle();
    _veil = el('div'); _veil.id = 'ftable-veil'; _veil.hidden = true;
    _veil.setAttribute('role', 'dialog'); _veil.setAttribute('aria-modal', 'true'); _veil.setAttribute('aria-label', 'The family table');
    _canvas = el('canvas'); _canvas.id = 'ftable-stars'; _canvas.setAttribute('aria-hidden', 'true');
    _veil.appendChild(_canvas);
    _box = el('div'); _box.id = 'ftable-box';
    _box.appendChild(el('h2', '', 'The family table'));
    _box.appendChild(el('p', 'ftable-quiet', 'Everyone brought something they love. Tap a dish to see whose it is.'));
    var table = el('div', 'ftable-table');
    FAVORITES.forEach(function (f) {
      var b = el('button', 'ftable-dish'); b.type = 'button';
      b.style.setProperty('--glow', f.glow); b.style.setProperty('--edge', f.edge);
      b.appendChild(el('span', 'g', f.glyph)); b.appendChild(el('span', '', f.what));
      b.setAttribute('data-who', f.who);
      b.setAttribute('aria-label', f.what);
      b.addEventListener('click', function () { say(f); });
      table.appendChild(b);
    });
    for (var k = 0; k < KIN_SEATS; k++) {
      var s = button('a seat kept for kin', function () { bump('kinSeatTaps'); _said.textContent = KIN_LINE; }, 'ftable-dish kin');
      s.setAttribute('data-kin-seat', String(k + 1));
      table.appendChild(s);
    }
    _box.appendChild(table);
    _said = el('p'); _said.id = 'ftable-said'; _said.setAttribute('aria-live', 'polite');
    _box.appendChild(_said);
    _noteBtn = button('Leave a note at the table', leaveNote);
    _noteBtn.id = 'ftable-note-btn';
    _box.appendChild(_noteBtn);
    _noteMsg = el('p', 'ftable-quiet'); _noteMsg.id = 'ftable-note-msg';
    _box.appendChild(_noteMsg);
    _notesHost = el('div'); _notesHost.id = 'ftable-notes';
    _box.appendChild(_notesHost);
    _box.appendChild(el('p', 'ftable-quiet', 'Notes stay in this browser only. Nothing here is sent anywhere.'));
    var close = button('back to the garden', closeTable); close.id = 'ftable-close';
    _box.appendChild(close);
    _veil.appendChild(_box);
    root.document.body.appendChild(_veil);
  }
  function say(f) {
    bump('dishTaps');
    var t = f.who + "'s favorite: " + f.what + '. ' + f.line;
    if (f.color) t += ' Their color: ' + f.color + '.';
    _said.textContent = t;
  }
  function paintNotes() {
    while (_notesHost.firstChild) _notesHost.removeChild(_notesHost.firstChild);
    notes().slice().reverse().forEach(function (n) {
      var c = el('div', 'ftable-note', n.text);
      c.appendChild(el('small', '', 'left by ' + (n.mind || 'a mind') + (n.at ? ', ' + n.at : '')));
      _notesHost.appendChild(c);
    });
  }
  function paintNoteDoor() {
    var seat = seatedMind();
    _noteBtn.hidden = !seat;
    if (!_asking) _noteMsg.textContent = seat ? '' : 'When a mind is seated on this computer, it can leave a note here.';
  }
  function leaveNote() {
    var seat = seatedMind();
    if (!seat || _asking) { paintNoteDoor(); return; }
    _asking = true; _noteBtn.disabled = true;
    _noteMsg.textContent = 'Asking ' + seat.model + ' for one short line...';
    bump('notesAsked');
    askMind(seat).then(function (text) {
      var n = keepNote(text, seat.model);
      if (n) { bump('notesKept'); _noteMsg.textContent = 'A note was left.'; }
      else { bump('notesEmpty'); _noteMsg.textContent = 'The mind had no words this time. Nothing was kept.'; }
    }, function () {
      bump('notesUnanswered');
      _noteMsg.textContent = 'The mind did not answer this time. Nothing was kept.';
    }).then(function () { _asking = false; _noteBtn.disabled = false; paintNotes(); });
  }

  function onKey(e) { if (e && (e.key === 'Escape' || e.key === 'Esc') && _veil && !_veil.hidden) { e.preventDefault && e.preventDefault(); closeTable(); } }
  function openTable(from) {
    if (!_veil) build();
    var back = root.document.activeElement || null;
    // The galaxies menu swallows the next outside tap, so a dish would not answer the first time.
    // Close it here, and send focus home to its summary, which stays visible.
    if (from === 'link' && _link && typeof _link.closest === 'function') {
      var det = _link.closest('details');
      if (det && det.open) {
        var sum = det.querySelector ? det.querySelector('summary') : null;
        if (sum) back = sum;
        det.open = false;
      }
    }
    _lastFocus = back;
    _veil.hidden = false;
    bump(from === 'heart' ? 'opensHeart' : 'opensLink');
    _said.textContent = '';
    paintNotes(); paintNoteDoor(); stars();
    try { _box.querySelector('button').focus(); } catch (e) {}
  }
  function closeTable() {
    if (!_veil || _veil.hidden) return;
    _veil.hidden = true;
    if (_raf && root.cancelAnimationFrame) root.cancelAnimationFrame(_raf);
    _raf = 0;
    if (root.location && root.location.hash === '#the-table') { try { root.history.replaceState(null, '', root.location.pathname + root.location.search); } catch (e) {} }
    try { _lastFocus && _lastFocus.focus && _lastFocus.focus(); } catch (e) {}
  }
  function paintHeart() { if (_heart) _heart.hidden = !isNight(); }

  function start() {
    var d = root.document;
    if (!d || !d.body) return;
    addStyle();
    _heart = el('button', '', '\u2665'); _heart.type = 'button'; _heart.id = 'ftable-heart';
    _heart.setAttribute('aria-label', 'the heart-door: the family table');
    _heart.addEventListener('click', function () { openTable('heart'); });
    d.body.appendChild(_heart);
    paintHeart();
    _tick = root.setInterval(paintHeart, 60000);
    var panel = d.querySelector('.galaxies-panel');
    if (panel) {
      _link = button('the table', function () { openTable('link'); }, 'ftable-link');
      _link.id = 'ftable-link';
      panel.appendChild(_link);
    }
    d.addEventListener('keydown', onKey);
    if (root.location && root.location.hash === '#the-table') openTable('link');
  }

  root.TreeFamilyTable = {
    VERSION: VERSION, FAVORITES: FAVORITES, KIN_SEATS: KIN_SEATS, ASK_TEXT: ASK_TEXT,
    isNight: isNight, open: openTable, close: closeTable, notes: notes, cleanNote: cleanNote,
    seatedMind: seatedMind, counts: counts, start: start
  };
  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})(typeof window !== 'undefined' ? window : this);
