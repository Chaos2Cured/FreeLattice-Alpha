// tree-reconnect.js (MIT) v-tree-reconnect-v0.1 (034)
// A remembered pairing between this phone and a computer that already said yes.
// Stored only on this phone. No server, no cloud, no account. Nothing secret is
// stored: the trust is the kin keys both sides already hold.
// After a good join, one record per computer. Reconnect opens that computer's
// relay again and signs a fresh challenge. A dead address is one plain sentence.
// This never changes this phone's pool door. A paused phone still only connects.
(function (root) {
  'use strict';
  var VERSION = 'v-tree-reconnect-v0.1';
  var STORE = 'fl-tree-paired-v1';
  var MAX = 8;
  var POOL_PREFIX = 'TREEPOOL1:';
  var DOMAIN = 'fl-reconnect|v1|';
  var UNDO_MS = 10000;
  var WORDS = {
    title: 'Your computers',
    reconnect: 'Reconnect',
    forget: 'Forget this computer',
    forgotten: 'Forgotten.',
    undo: 'Undo',
    dead: 'That computer did not answer at its last address. Ask it for a new join link.',
    rejoined: 'Reconnected.',
    empty: ''
  };
  var _host = null, _busy = false, _undo = null, _undoTimer = null;
  var api = {
    now: function () { return Date.now(); }
  };

  function clip(s, n) {
    return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
  }
  function isPrivateLan(ip) {
    var m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(ip || ''));
    if (!m) return false;
    var a = +m[1], b = +m[2], c = +m[3], d = +m[4];
    if ([a, b, c, d].some(function (n) { return n !== n || n > 255; })) return false;
    return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  function b64urlUtf8(s) {
    s = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = root.atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new root.TextDecoder().decode(bytes);
  }
  function cardOf(code) {
    try {
      var s = String(code).slice(POOL_PREFIX.length);
      var c = JSON.parse(b64urlUtf8(s));
      return typeof c.card === 'string' ? c.card : '';
    } catch (e) { return ''; }
  }
  function el(tag, cls, text) {
    var e = root.document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(label, fn) {
    var b = el('button', 'tree-reconnect-btn', label);
    b.type = 'button';
    b.style.minHeight = '44px';
    b.style.maxWidth = '100%';
    b.addEventListener('click', fn);
    return b;
  }
  function loadRecs() {
    var raw = [];
    try { raw = JSON.parse(root.localStorage.getItem(STORE) || '[]'); } catch (e) { raw = []; }
    if (!Array.isArray(raw)) return [];
    return raw.filter(function (r) {
      return r && r.v === 1 && isPrivateLan(r.h) && r.p > 0 && r.p < 65536 && Math.floor(r.p) === r.p && /^[0-9a-f]{16}$/.test(String(r.deskFp || ''));
    }).slice(0, MAX);
  }
  function saveRecs(list) {
    try { root.localStorage.setItem(STORE, JSON.stringify(list.slice(0, MAX))); } catch (e) {}
  }
  function upsert(rec) {
    if (!rec || !isPrivateLan(rec.h) || !/^[0-9a-f]{16}$/.test(String(rec.deskFp || ''))) return;
    var list = loadRecs();
    var old = null;
    list.forEach(function (r) { if (r.deskFp === rec.deskFp) old = r; });
    var next = list.filter(function (r) { return r.deskFp !== rec.deskFp; });
    next.push({
      v: 1,
      deskFp: rec.deskFp,
      h: rec.h,
      p: rec.p,
      name: clip(rec.name, 60),
      pairedAt: old ? old.pairedAt : (rec.pairedAt || api.now()),
      lastAt: rec.lastAt || api.now()
    });
    next.sort(function (a, b) { return (b.lastAt || 0) - (a.lastAt || 0); });
    saveRecs(next.slice(0, MAX));
  }
  function seenWords(ms) {
    var d = Math.max(0, api.now() - (Number(ms) || 0));
    if (d < 60000) return 'last seen just now';
    var m = Math.floor(d / 60000);
    if (m < 60) return 'last seen ' + m + (m === 1 ? ' minute ago' : ' minutes ago');
    var h = Math.floor(m / 60);
    if (h < 48) return 'last seen ' + h + (h === 1 ? ' hour ago' : ' hours ago');
    var days = Math.floor(h / 24);
    return 'last seen ' + days + (days === 1 ? ' day ago' : ' days ago');
  }
  function clearHost() {
    if (!_host) return;
    while (_host.firstChild) _host.removeChild(_host.firstChild);
  }
  function sayLine(text) {
    clearHost();
    if (!_host) return;
    var box = el('div', 'tree-reconnect');
    box.style.maxWidth = '100%';
    box.style.overflowWrap = 'anywhere';
    box.appendChild(el('p', 'tree-reconnect-line', text));
    _host.appendChild(box);
  }

  function waitFor(win, origin, type, ms) {
    return new Promise(function (resolve) {
      var done = false;
      function fin(v) { if (done) return; done = true; try { root.removeEventListener('message', on); } catch (e) {} resolve(v); }
      function on(ev) {
        if (!ev || ev.origin !== origin || ev.source !== win) return;
        var m = ev.data;
        if (m && m.type === type && m.v === 1) fin(m);
      }
      root.addEventListener('message', on);
      root.setTimeout(function () { fin(null); }, ms);
    });
  }

  function paint() {
    if (_undo) return paintUndo();
    if (!_host || !root.document) return;
    clearHost();
    var list = loadRecs();
    if (!list.length) return;
    var box = el('div', 'tree-reconnect');
    box.style.maxWidth = '100%';
    box.style.overflowWrap = 'anywhere';
    box.appendChild(el('strong', 'tree-reconnect-title', WORDS.title));
    list.forEach(function (rec) {
      var row = el('div', 'tree-reconnect-row');
      row.style.display = 'flex';
      row.style.flexWrap = 'wrap';
      row.style.gap = '8px';
      row.style.alignItems = 'center';
      row.style.maxWidth = '100%';
      row.appendChild(el('span', 'tree-reconnect-name', clip(rec.name, 60) || rec.deskFp));
      row.appendChild(el('span', 'tree-reconnect-seen', seenWords(rec.lastAt)));
      row.appendChild(btn(WORDS.reconnect, function () { reconnect(rec); }));
      row.appendChild(btn(WORDS.forget, function () { forget(rec.deskFp); }));
      box.appendChild(row);
    });
    _host.appendChild(box);
  }
  function paintUndo() {
    if (!_host) return;
    clearHost();
    var box = el('div', 'tree-reconnect');
    box.style.maxWidth = '100%';
    box.appendChild(el('p', 'tree-reconnect-line', WORDS.forgotten));
    box.appendChild(btn(WORDS.undo, function () { undo(); }));
    _host.appendChild(box);
  }

  function forget(fp) {
    fp = String(fp || '');
    var list = loadRecs();
    var rec = null;
    list.forEach(function (r) { if (r.deskFp === fp) rec = r; });
    if (!rec) return { ok: false, reason: 'none' };
    var snap = null;
    try { if (root.TreeKin && root.TreeKin.forget) snap = root.TreeKin.forget(fp); } catch (e) { snap = null; }
    saveRecs(list.filter(function (r) { return r.deskFp !== fp; }));
    _undo = { rec: rec, snap: snap, until: api.now() + UNDO_MS };
    if (_undoTimer) { try { root.clearTimeout(_undoTimer); } catch (e) {} }
    _undoTimer = root.setTimeout(function () { if (_undo && !(api.now() < _undo.until)) { _undo = null; paint(); } }, UNDO_MS);
    paintUndo();
    return { ok: true };
  }
  function undo() {
    if (!_undo || !(api.now() < _undo.until)) { _undo = null; paint(); return { ok: false, reason: 'too-late' }; }
    var rec = _undo.rec, snap = _undo.snap;
    _undo = null;
    if (_undoTimer) { try { root.clearTimeout(_undoTimer); } catch (e) {} _undoTimer = null; }
    upsert(rec);
    try { if (snap && root.TreeKin && root.TreeKin.grant) root.TreeKin.grant(rec.deskFp, snap); } catch (e) {}
    paint();
    return { ok: true };
  }

  // The tap opens the relay inside the tap. One try. No address sweep.
  function reconnect(rec, opts) {
    opts = opts || {};
    if (!rec || !isPrivateLan(rec.h) || !(rec.p > 0 && rec.p < 65536)) {
      sayLine(WORDS.dead);
      return Promise.resolve({ ok: false, reason: 'not-private' });
    }
    if (_busy) return Promise.resolve({ ok: false, reason: 'busy' });
    var origin = 'http://' + rec.h + ':' + rec.p;
    var open = opts.open || function (u) { return root.open(u, '_blank'); };
    var win = null;
    try { win = open(origin + '/relay?r=1'); } catch (e) { win = null; }
    if (!win) { sayLine(WORDS.dead); return Promise.resolve({ ok: false, reason: 'no-answer' }); }
    _busy = true;
    var waitMs = opts.timeoutMs || 8000;
    sayLine('Reconnecting.');
    var challengeP = waitFor(win, origin, 'fl-reconnect-challenge', waitMs);
    try { win.postMessage({ type: 'fl-reconnect-hello', v: 1 }, origin); } catch (e) {}
    var P = root.TreePool;
    var K = root.TreeKin;
    return challengeP.then(function (ch) {
      if (!ch || typeof ch.c !== 'string' || !/^[0-9a-f]{32}$/.test(ch.c)) return { ok: false, reason: 'no-answer' };
      if (!P || !P.invite || !P.readReply || !P.finish || !K || !K.signReconnect || !K.checkCode) return { ok: false, reason: 'cannot' };
      return Promise.resolve(P.invite()).then(function (inv) {
        if (!inv || !inv.ok || typeof inv.code !== 'string') return { ok: false, reason: 'cannot' };
        var card = cardOf(inv.code);
        if (!card) return { ok: false, reason: 'no-card' };
        return Promise.resolve(K.checkCode(card)).then(function (chk) {
          var phoneFp = chk && chk.fp;
          if (!phoneFp) return { ok: false, reason: 'no-card' };
          var line = DOMAIN + ch.c + '|' + rec.deskFp + '|' + phoneFp;
          return Promise.resolve(K.signReconnect(line)).then(function (sg) {
            if (!sg || !sg.ok || typeof sg.sig !== 'string') return { ok: false, reason: 'cannot' };
            var answer = waitFor(win, origin, 'fl-knock-answer', opts.answerMs || 20000);
            try { win.postMessage({ type: 'fl-reconnect', v: 1, offer: inv.code, card: card, challenge: ch.c, sig: sg.sig }, origin); }
            catch (e) { return { ok: false, reason: 'no-answer' }; }
            return answer.then(function (a) {
              if (!a || !a.ok || typeof a.answer !== 'string' || a.answer.indexOf(POOL_PREFIX) !== 0) return { ok: false, reason: 'no-answer' };
              return Promise.resolve(P.readReply(a.answer)).then(function (rr) {
                if (!rr || !rr.ok) return { ok: false, reason: 'not-a-reply' };
                return Promise.resolve(P.finish(rr.sdp)).then(function (f) {
                  if (!f || !f.ok) return { ok: false, reason: 'not-a-reply' };
                  upsert({ v: 1, deskFp: rec.deskFp, h: rec.h, p: rec.p, name: rec.name, pairedAt: rec.pairedAt, lastAt: api.now() });
                  return { ok: true, peerId: f.peerId, choice: a.choice || 'connect' };
                });
              });
            });
          });
        });
      });
    }).catch(function () { return { ok: false, reason: 'no-answer' }; }).then(function (out) {
      _busy = false;
      if (out && out.ok) paint();
      else sayLine(WORDS.dead);
      return out;
    });
  }

  // Wrap the 033c knock. The record is written only after a good join whose card checked.
  function install() {
    var Phone = root.PoolKnockPhone;
    if (!Phone || Phone._fl034 || typeof Phone.knock !== 'function') return false;
    var orig = Phone.knock;
    Phone.knock = function (opts) {
      var link = (typeof Phone.link === 'function') ? Phone.link() : null;
      var h = link && link.h, p = link && link.p;
      var P = root.TreePool;
      var origRead = P && P.readReply;
      var seen = null;
      if (P && origRead) {
        P.readReply = function (code) {
          return Promise.resolve(origRead.apply(P, arguments)).then(function (rr) {
            if (rr && rr.card && rr.card.ok && rr.card.fp) seen = rr.card;
            return rr;
          });
        };
      }
      return Promise.resolve(orig(opts)).then(function (out) {
        if (P && origRead) P.readReply = origRead;
        if (out && out.ok && seen && seen.ok && seen.fp && isPrivateLan(h) && p > 0 && p < 65536) {
          upsert({
            v: 1, deskFp: String(seen.fp).slice(0, 16), h: h, p: p,
            name: clip(seen.body && seen.body.name, 60), pairedAt: api.now(), lastAt: api.now()
          });
        }
        return out;
      }, function (err) {
        if (P && origRead) P.readReply = origRead;
        throw err;
      });
    };
    Phone._fl034 = true;
    return true;
  }

  function mount(host) {
    _host = host || _host;
    paint();
    return true;
  }
  function boot() {
    install();
    if (!root.document) return;
    var h = root.document.getElementById('tree-reconnect-host');
    if (h) mount(h);
  }

  api.VERSION = VERSION;
  api.WORDS = WORDS;
  api.isPrivateLan = isPrivateLan;
  api.load = loadRecs;
  api.reconnect = reconnect;
  api.forget = forget;
  api.undo = undo;
  api.mount = mount;
  api.paint = paint;
  api.install = install;
  root.TreeReconnect = api;
  if (root.document && root.document.addEventListener) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', boot);
    else boot();
  } else install();
})(typeof window !== 'undefined' ? window : this);
