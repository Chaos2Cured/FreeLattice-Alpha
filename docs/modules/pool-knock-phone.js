// pool-knock-phone.js (MIT) v-phone-knocks-v0.1 (033c)
// The phone half of desktop pooling. The FreeLattice desktop app shows a join link (and its
// picture code) for this Wi-Fi:  https://thelatticetree.com/settings.html#fl-knock=<code>.
// Opening it here shows one question. After one tap, this page opens the desktop's small
// relay page (http://<LAN address>:<port>/relay), makes a pool invite with tree-pool.js,
// and hands the relay { offer, card, token } by postMessage, to that exact origin only.
// The computer's person still says Yes or No in its own window. The answer comes back the
// same way and finishes the join (TreePool.readReply + finish): WebRTC, iceServers [],
// tree-pool-proof|v1|. Nobody carries a code by hand. The link is single use.
// Pause wins: this never changes this phone's pool door; a paused phone still only connects.
(function (root) {
  'use strict';
  var VERSION = 'v-phone-knocks-v0.1';
  var KEY = 'fl-knock=';
  var POOL_PREFIX = 'TREEPOOL1:';
  var MAX_CODE = 16000;
  var WAIT_MS = 120000;                 // the person at the computer may take a while
  var WORDS = {
    ask: 'A computer on your Wi-Fi shared a join link.',
    detail: 'Knocking opens a small page from that computer in a new tab. Its person says Yes or No there first. If they say Yes, this phone joins its pool and trusts that computer\'s card.',
    knock: 'Knock and trust this computer',
    notNow: 'Not now',
    noCard: 'Your kin card is not ready yet. Give your mind a name in Trusted kin, then open the link again.',
    cannot: 'This browser cannot make a pool connection.',
    blocked: 'The new tab did not open. Allow pop-ups for this page, then tap Knock again.',
    waiting: 'Knocking. Waiting for the computer\'s person to say Yes.',
    joined: 'Joined. The channel opens in a moment.',
    no: 'Not joined. The computer said No, or nobody answered.',
    old: 'That link was used or is too old. Ask the computer for a new one.'
  };
  var _host = null, _link = null, _busy = false, _counts = { links: 0, knocks: 0, joined: 0, notJoined: 0 };

  function pool() { return root.TreePool || null; }
  function b64urlUtf8(s) {
    s = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = root.atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new root.TextDecoder().decode(bytes);
  }
  function isPrivateLan(ip) {
    var m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(ip || ''));
    if (!m) return false;
    var a = +m[1], b = +m[2], c = +m[3], d = +m[4];
    if ([a, b, c, d].some(function (n) { return n > 255; })) return false;
    return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  // Only a private home address, a real port and a 32-hex token; anything else is not a link.
  function parseLink(hash) {
    var h = String(hash || '');
    var i = h.indexOf(KEY);
    if (i === -1) return null;
    var c = null;
    try { c = JSON.parse(b64urlUtf8(h.slice(i + KEY.length).split('&')[0])); } catch (e) { return null; }
    if (!c || c.v !== 1 || !isPrivateLan(c.h) || !(c.p > 0 && c.p < 65536 && Math.floor(c.p) === c.p) || !/^[0-9a-f]{32}$/.test(String(c.t || ''))) return null;
    return { h: c.h, p: c.p, t: c.t, origin: 'http://' + c.h + ':' + c.p };
  }
  function cardOf(inviteCode) {
    try {
      var s = String(inviteCode).slice(POOL_PREFIX.length);
      var c = JSON.parse(b64urlUtf8(s));
      return typeof c.card === 'string' ? c.card : '';
    } catch (e) { return ''; }
  }
  function el(tag, cls, text) { var e = root.document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function say(text, buttons) {
    if (!_host) return;
    while (_host.firstChild) _host.removeChild(_host.firstChild);
    var box = el('div', 'pool-knock-phone');
    box.appendChild(el('p', 'pool-knock-phone-line', text));
    if (buttons) {
      box.appendChild(el('p', 'pool-knock-phone-detail', WORDS.detail));
      var row = el('div', 'pool-knock-phone-row');
      var k = el('button', 'pool-knock-phone-btn', WORDS.knock); k.type = 'button'; k.style.minHeight = '44px';
      k.addEventListener('click', function () { knock(); });
      var n = el('button', 'pool-knock-phone-btn', WORDS.notNow); n.type = 'button'; n.style.minHeight = '44px';
      n.addEventListener('click', function () { _link = null; say(''); while (_host.firstChild) _host.removeChild(_host.firstChild); });
      row.appendChild(k); row.appendChild(n); box.appendChild(row);
    }
    _host.appendChild(box);
  }

  // Waits for one message of a type from the relay window, from its exact origin only.
  function waitFor(win, origin, type, ms) {
    return new Promise(function (resolve) {
      var done = false;
      function fin(v) { if (done) return; done = true; root.removeEventListener('message', on); resolve(v); }
      function on(ev) {
        if (ev.origin !== origin || ev.source !== win) return;
        var m = ev.data;
        if (m && m.type === type && m.v === 1) fin(m);
      }
      root.addEventListener('message', on);
      root.setTimeout(function () { fin(null); }, ms);
    });
  }

  // The tap. The relay tab is opened inside the tap itself, so pop-up rules allow it.
  function knock(opts) {
    opts = opts || {};
    var L = _link, P = pool();
    if (!L || _busy) return Promise.resolve({ ok: false, reason: _busy ? 'busy' : 'no-link' });
    if (!P || !P.invite || !P.readReply || !P.finish) { say(WORDS.cannot); return Promise.resolve({ ok: false, reason: 'cannot' }); }
    var open = opts.open || function (u) { return root.open(u, '_blank'); };
    var win = null;
    try { win = open(L.origin + '/relay'); } catch (e) { win = null; }
    if (!win) { say(WORDS.blocked, true); return Promise.resolve({ ok: false, reason: 'blocked' }); }
    _busy = true; _counts.knocks++;
    _link = null;                                   // single use here too
    say(WORDS.waiting);
    var ready = waitFor(win, L.origin, 'fl-relay-ready', 20000);
    return Promise.resolve(P.invite()).then(function (inv) {
      if (!inv || !inv.ok || typeof inv.code !== 'string') return { ok: false, reason: (inv && inv.reason) || 'cannot' };
      var card = cardOf(inv.code);
      if (!card) return { ok: false, reason: 'no-card' };
      return ready.then(function (r) {
        if (!r) return { ok: false, reason: 'no-relay' };
        var answer = waitFor(win, L.origin, 'fl-knock-answer', WAIT_MS);
        win.postMessage({ type: 'fl-knock', v: 1, offer: inv.code, card: card, t: L.t }, L.origin);
        return answer.then(function (a) {
          if (!a) return { ok: false, reason: 'no-answer' };
          if (!a.ok || typeof a.answer !== 'string' || a.answer.indexOf(POOL_PREFIX) !== 0 || a.answer.length > MAX_CODE) {
            return { ok: false, reason: String(a.reason || 'no').slice(0, 40) };
          }
          return Promise.resolve(P.readReply(a.answer)).then(function (rr) {
            if (!rr || !rr.ok) return { ok: false, reason: (rr && rr.reason) || 'not-a-reply' };
            // The person tapped "Knock and trust this computer": trust the card that came back, if it checks.
            if (rr.card && rr.card.ok && P.trustCarried) { try { P.trustCarried(rr.card); } catch (e) {} }
            return Promise.resolve(P.finish(rr.sdp)).then(function (f) {
              return f && f.ok ? { ok: true, peerId: f.peerId, choice: a.choice } : { ok: false, reason: 'not-a-reply' };
            });
          });
        });
      });
    }).catch(function () { return { ok: false, reason: 'cannot' }; }).then(function (out) {
      _busy = false;
      if (out.ok) { _counts.joined++; say(WORDS.joined); }
      else {
        _counts.notJoined++;
        say(out.reason === 'no-card' ? WORDS.noCard : out.reason === 'link-used-or-old' ? WORDS.old : out.reason === 'cannot' ? WORDS.cannot : WORDS.no);
      }
      return out;
    });
  }

  // Reads the link once, then takes it out of the address bar so the token is not kept or shared.
  function take(loc, hist) {
    var L = parseLink(loc && loc.hash);
    if (!L) return null;
    _link = L; _counts.links++;
    try { if (hist && hist.replaceState) hist.replaceState(null, '', loc.pathname + loc.search); } catch (e) {}
    return L;
  }
  function mount(host) {
    _host = host || null;
    if (_host && _link) say(WORDS.ask, true);
    return !!_link;
  }
  function boot() {
    if (!root.document) return;
    take(root.location, root.history);
    var h = root.document.getElementById('pool-knock-phone-host');
    if (h) mount(h);
  }

  root.PoolKnockPhone = {
    VERSION: VERSION, WORDS: WORDS, parseLink: parseLink, isPrivateLan: isPrivateLan, take: take, mount: mount, knock: knock,
    link: function () { return _link ? { h: _link.h, p: _link.p } : null; },
    counts: function () { var o = {}; Object.keys(_counts).forEach(function (k) { o[k] = _counts[k]; }); return o; }
  };
  if (root.document && root.document.addEventListener) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : this);
