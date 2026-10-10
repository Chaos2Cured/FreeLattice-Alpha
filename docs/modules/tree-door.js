// SPDX-License-Identifier: MIT
// tree-door.js: the grandmother door (v-tree-grandmother-door-v0.1, paste 029). Layer, never delete.
//
// Part A, a window that helps wake a mind. It opens on its own only when no mind is seated,
// no pool route is chosen, no in-browser mind is awake, and the person has not tapped Not now.
// Before it opens it may look at this computer's own usual doors (LocalMindProbe.look, loopback
// only), but only when the browser already lets this page do that without asking; otherwise the
// window offers a one-tap Look instead, so no browser permission box ever appears by surprise.
//
// Part B, Yes or No for pooling. The host shows one big picture code. The phone opens it and asks
// "Pool with (name)'s computer?". Yes there trusts that one card, makes this device's asking card if
// it has none, and shows a reply picture code. The host scans it and asks "(device) wants to join.
// Pool resources with it?". Yes there trusts that one card and connects. Helping is its own choice,
// worded plainly, beside that Yes. Kin only, Pause wins, the door stays off until a human tap.
//
// Honest limits: a web page cannot notice a phone plugged in by cable, and cannot find devices
// on the Wi-Fi by itself (no mDNS in browsers), and the Tree has no server. So two picture codes
// carry the connection details, one each way. A desktop helper could do better (029c, design only).
//
// This module fetches nothing itself, writes no words into receipts (counts only), uses
// textContent, and never opens a browser dialog box.
(function (root) {
  'use strict';
  var VERSION = 'v-tree-grandmother-door-v0.1';
  var NOT_NOW_KEY = 'tree_door_not_now';     // '1' after a human taps Not now
  var VISIT_KEY = 'tree_door_closed_visit';  // sessionStorage: closed for this visit only
  var COUNTS_KEY = 'tree_door_counts';       // numbers only
  var NAMES_KEY = 'tree_kin_names';          // the same names Trusted kin keeps: { ai, keeper, asks }
  var OPEN_DELAY = 900;

  var _started = false;
  var _veil = null, _box = null, _kind = '', _poll = null, _keyFn = null;
  var _relaunch = null;

  function safeGet(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { root.localStorage.setItem(k, v); } catch (e) {} }
  function sessGet(k) { try { return root.sessionStorage.getItem(k); } catch (e) { return null; } }
  function sessSet(k, v) { try { root.sessionStorage.setItem(k, v); } catch (e) {} }
  function readJson(k, f) { try { var r = safeGet(k); return r ? JSON.parse(r) : f; } catch (e) { return f; } }
  function counts() { var c = readJson(COUNTS_KEY, {}); return (c && typeof c === 'object') ? c : {}; }
  function bump(field) { var c = counts(); c[field] = (Number(c[field]) || 0) + 1; safeSet(COUNTS_KEY, JSON.stringify(c)); }
  function clip(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n); }

  function probe() { return root.LocalMindProbe || null; }
  function pool() { return root.TreePool || null; }
  function bmind() { return root.TreeBrowserMind || null; }

  // ---- when the window may open on its own ----
  function mindSeated() {
    var P = probe();
    var m = null;
    try { m = P && P.getRemembered ? P.getRemembered() : null; } catch (e) { m = null; }
    return !!(m && (m.model || m.url || (Array.isArray(m.minds) && m.minds.length)));
  }
  function poolRoute() { try { var T = pool(); return !!(T && T.chatRoute && T.chatRoute()); } catch (e) { return false; } }
  function browserAwake() { try { var B = bmind(); return !!(B && B.awakeModel && B.awakeModel()); } catch (e) { return false; } }
  function notNow() { return safeGet(NOT_NOW_KEY) === '1'; }
  function hasMind() { return mindSeated() || poolRoute() || browserAwake(); }
  function shouldOffer() { return !hasMind() && !notNow() && sessGet(VISIT_KEY) !== '1'; }

  // May this page look at this computer's own doors without the browser asking the person?
  // 'yes': the browser has no such question, or it was already answered yes. 'ask': it would ask.
  function quietLookAllowed() {
    var perms = root.navigator && root.navigator.permissions;
    if (!perms || typeof perms.query !== 'function') return Promise.resolve('yes');
    var names = ['local-network-access', 'loopback-network'];
    return Promise.all(names.map(function (n) {
      return Promise.resolve().then(function () { return perms.query({ name: n }); }).then(function (s) { return s && s.state ? s.state : 'none'; }, function () { return 'none'; });
    })).then(function (states) {
      if (states.indexOf('granted') !== -1) return 'yes';
      if (states.indexOf('prompt') !== -1 || states.indexOf('denied') !== -1) return 'ask';
      return 'yes';
    });
  }
  function look() {
    var P = probe();
    if (!P || typeof P.look !== 'function') return Promise.resolve(null);
    return Promise.resolve().then(function () { return P.look(); }).then(function (r) { return r || null; }, function () { return null; });
  }

  // ---- small builders ----
  function el(tag, cls, text) {
    var e = root.document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function button(label, fn, cls) {
    var b = el('button', cls || '', label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }
  function empty(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  var CSS = [
    '.tree-door-veil{position:fixed;left:0;top:0;right:0;bottom:0;z-index:10050;background:rgba(6,8,16,0.8);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;}',
    '.tree-door{width:100%;max-width:30rem;max-height:calc(100vh - 24px);overflow-y:auto;overflow-x:hidden;box-sizing:border-box;padding:1.1rem 1.1rem 1rem;background:rgba(12,10,26,0.97);border:1px solid rgba(74,159,212,0.4);border-radius:14px;color:rgba(226,232,240,0.96);font-family:Georgia,"Times New Roman",serif;font-size:1.05rem;line-height:1.55;text-align:left;}',
    '.tree-door h2{margin:0 0 0.5rem;font-size:1.3rem;font-weight:600;color:rgba(232,176,25,0.97);}',
    '.tree-door p{margin:0.45rem 0;}',
    '.tree-door-quiet{color:rgba(200,210,230,0.86);font-size:0.97rem;}',
    '.tree-door-part{padding:0.55rem 0;border-top:1px solid rgba(200,210,230,0.16);}',
    '.tree-door button{display:block;width:100%;min-height:52px;margin:0.4rem 0;padding:12px 16px;border-radius:12px;border:1px solid rgba(232,176,25,0.55);background:rgba(232,176,25,0.12);color:#fff;font-family:inherit;font-size:1.05rem;text-align:center;cursor:pointer;box-sizing:border-box;}',
    '.tree-door button.tree-door-main{background:#e8b019;border-color:#e8b019;color:#0e0c1e;font-weight:600;}',
    '.tree-door button.tree-door-soft{min-height:44px;font-size:0.97rem;background:transparent;border-color:rgba(200,210,230,0.35);color:rgba(226,232,240,0.92);}',
    '.tree-door button:disabled{opacity:0.55;cursor:default;}',
    '.tree-door button:focus-visible,.tree-door input:focus-visible,.tree-door textarea:focus-visible{outline:2px solid rgba(232,176,25,0.95);outline-offset:2px;}',
    '.tree-door input,.tree-door textarea{display:block;width:100%;box-sizing:border-box;min-height:44px;margin:0.35rem 0;padding:10px 12px;border-radius:10px;border:1px solid rgba(200,210,230,0.4);background:rgba(0,0,0,0.35);color:#fff;font-size:1rem;font-family:inherit;}',
    '.tree-door textarea{min-height:5rem;font-family:ui-monospace,Menlo,monospace;font-size:0.85rem;word-break:break-all;}',
    '.tree-door input::placeholder,.tree-door textarea::placeholder{color:rgba(226,232,240,0.72);}',
    '.tree-door canvas.tree-door-qr{display:block;width:100%;max-width:320px;height:auto;margin:0.5rem auto;image-rendering:pixelated;border-radius:8px;background:#fff;}',
    '.tree-door video{display:block;width:100%;max-width:320px;margin:0.4rem auto;border-radius:10px;background:#000;}',
    '.tree-door-relaunch button{min-height:44px;margin:0.6rem 0;padding:10px 16px;border-radius:10px;border:1px solid rgba(232,176,25,0.55);background:rgba(232,176,25,0.12);color:#fff;font-family:Georgia,"Times New Roman",serif;font-size:1rem;cursor:pointer;}'
  ].join('\n');
  function addStyle() {
    var d = root.document;
    if (!d || d.getElementById('tree-door-style')) return;
    var s = d.createElement('style');
    s.id = 'tree-door-style';
    s.textContent = CSS;
    (d.head || d.documentElement).appendChild(s);
  }

  // ---- the window ----
  function stopPoll() { if (_poll) { try { root.clearInterval(_poll); } catch (e) {} _poll = null; } }
  function close(forVisit) {
    stopPoll();
    try { var T = pool(); if (T && T.stopScan) T.stopScan(); } catch (e) {}
    if (forVisit) sessSet(VISIT_KEY, '1');
    if (_keyFn && root.document) { try { root.document.removeEventListener('keydown', _keyFn); } catch (e) {} }
    _keyFn = null;
    if (_veil && _veil.parentNode) _veil.parentNode.removeChild(_veil);
    _veil = null; _box = null; _kind = '';
    paintRelaunch();
  }
  function openWin(kind, label) {
    addStyle();
    if (!_veil) {
      _veil = el('div', 'tree-door-veil');
      _veil.setAttribute('data-tree-door', VERSION);
      _box = el('div', 'tree-door');
      _box.setAttribute('role', 'dialog');
      _box.setAttribute('aria-modal', 'true');
      _veil.appendChild(_box);
      root.document.body.appendChild(_veil);
      _keyFn = function (ev) { if (ev && ev.key === 'Escape') close(_kind === 'welcome'); };
      root.document.addEventListener('keydown', _keyFn);
    }
    stopPoll();
    try { var T = pool(); if (T && T.stopScan) T.stopScan(); } catch (e) {}
    _kind = kind;
    _box.setAttribute('aria-label', label);
    _box.setAttribute('data-door-kind', kind);
    empty(_box);
    return _box;
  }
  function focusFirst() {
    try { root.setTimeout(function () { var b = _box && _box.querySelector ? _box.querySelector('button') : null; if (b && b.focus) b.focus(); }, 0); } catch (e) {}
  }
  function isOpen() { return !!_veil; }

  // A picture code, big enough to scan from a phone held a little way off.
  function drawQr(where, text, label) {
    var Q = root.qrcodegen, d = root.document;
    var qr = null;
    try { qr = Q && Q.QrCode ? Q.QrCode.encodeText(String(text), Q.QrCode.Ecc.LOW) : null; } catch (e) { qr = null; }
    if (!qr) { where.appendChild(el('p', 'tree-door-quiet', 'This code is too long for one picture code. Use Copy below instead.')); return false; }
    var border = 4, scale = Math.max(3, Math.ceil(320 / (qr.size + border * 2)));
    var c = d.createElement('canvas'), size = (qr.size + border * 2) * scale;
    var g = c.getContext ? c.getContext('2d') : null;
    if (!g) return false;
    c.className = 'tree-door-qr';
    c.width = size; c.height = size;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, size, size);
    g.fillStyle = '#000000';
    for (var y = 0; y < qr.size; y++) for (var x = 0; x < qr.size; x++) if (qr.getModule(x, y)) g.fillRect((x + border) * scale, (y + border) * scale, scale, scale);
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', label);
    c.setAttribute('data-qr-size', String(qr.size));
    where.appendChild(c);
    return true;
  }
  function copyButton(text, noteEl) {
    return button('Copy instead', function () {
      try {
        if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
          root.navigator.clipboard.writeText(text).then(function () { noteEl.textContent = 'Copied. Send it by email or chat, and paste it on the other device.'; },
            function () { noteEl.textContent = 'This browser would not copy.'; });
          return;
        }
      } catch (e) {}
      noteEl.textContent = 'This browser would not copy.';
    }, 'tree-door-soft');
  }

  // =====================================================================
  // Part A: Let's wake a mind for you
  // =====================================================================
  function smallest() { var B = bmind(); return B && B.MODELS && B.MODELS[0] ? B.MODELS[0] : null; }
  function seatFound(report) {
    var P = probe();
    if (!P || !report || !report.found) return false;
    var entry = P.entryFromFoundList(report.foundList, report.found.name, report.found.url, P.getRemembered ? P.getRemembered() : null);
    P.remember(entry);
    bump('usedFound');
    return true;
  }
  function welcome(report, needAsk) {
    var w = openWin('welcome', 'Let\'s wake a mind for you');
    bump('shown');
    w.appendChild(el('h2', '', 'Let\'s wake a mind for you'));
    w.appendChild(el('p', '', 'A mind is a small AI that talks with you here. Pick one way. You can change it later in Settings.'));
    var msg = el('p', 'tree-door-quiet');
    msg.setAttribute('aria-live', 'polite');

    // 1. the AI already on this computer
    var one = el('div', 'tree-door-part');
    if (report && report.found) {
      var model = (report.foundList && report.foundList[0] && report.foundList[0].models && report.foundList[0].models[0]) || '';
      one.appendChild(button('Use ' + report.found.name + ' on this computer', function () { seatFound(report); close(false); }, 'tree-door-main'));
      one.appendChild(el('p', 'tree-door-quiet', (model ? model + ', ' : '') + 'found at its usual door on this computer. Your words stay on this computer.'));
    } else if (needAsk) {
      var lk = button('Look for an AI on this computer', function () {
        lk.disabled = true;
        msg.textContent = 'Looking only at the usual doors on this computer...';
        bump('looked');
        look().then(function (r) {
          if (!isOpen() || _kind !== 'welcome') return;
          if (r && r.found) { welcome(r, false); return; }
          lk.disabled = false;
          msg.textContent = 'No AI answered on this computer. That is all right. Try one of the other ways.';
        });
      });
      one.appendChild(lk);
      one.appendChild(el('p', 'tree-door-quiet', 'If you have Ollama, LM Studio or another local AI app. Your browser may ask once if this page may look on this computer.'));
    } else {
      one.appendChild(el('p', 'tree-door-quiet', 'No AI answered on this computer\'s usual doors. That is all right.'));
    }
    w.appendChild(one);

    // 2. a mind in this browser (028), only where WebGPU is here
    var two = el('div', 'tree-door-part');
    w.appendChild(two);
    var B = bmind(), m = smallest();
    if (B && m && typeof B.checkGpu === 'function') {
      B.checkGpu().then(function (g) {
        if (!isOpen() || _kind !== 'welcome') return;
        if (!g || !g.ok) { two.appendChild(el('p', 'tree-door-quiet', 'This browser cannot run a mind inside the page. The other ways still work.')); return; }
        var wk = button('Wake a small mind in this browser', function () {
          wk.disabled = true;
          msg.textContent = 'Downloading about ' + m.mb + ' MB once. This can take a few minutes. Keep this page open.';
          bump('wokeBrowser');
          B.wake(m.id, true).then(function (r) {
            if (!r || !r.ok) {
              wk.disabled = false;
              msg.textContent = r && r.reason === 'no-webgpu' ? 'This browser cannot run a mind inside the page after all. Nothing was kept.' : 'The download did not finish. Nothing was seated. You can try again.';
              return;
            }
            B.seat(true);
            close(false);
          });
        }, 'tree-door-main');
        two.appendChild(wk);
        two.appendChild(el('p', 'tree-door-quiet', 'About ' + m.mb + ' MB to download once (' + m.id + ', ' + m.license + '). Kept in this browser. Your words never leave this device. Other sizes are in Settings.'));
      });
    }

    // 3. ask only, another device answers
    var three = el('div', 'tree-door-part');
    three.appendChild(button('I only want to ask. Another device will answer.', function () { bump('askOnly'); askOnly(); }));
    w.appendChild(three);

    w.appendChild(msg);
    var foot = el('div', 'tree-door-part');
    foot.appendChild(button('Not now', function () { safeSet(NOT_NOW_KEY, '1'); bump('notNow'); close(false); }, 'tree-door-soft'));
    foot.appendChild(el('p', 'tree-door-quiet', 'Not now is remembered. Settings keeps a Help me wake a mind button.'));
    w.appendChild(foot);
    focusFirst();
  }
  function askOnly() {
    var w = openWin('welcome', 'Ask a mind on another device');
    w.appendChild(el('h2', '', 'Ask a mind on another device'));
    w.appendChild(el('p', '', 'On the computer that has a mind, open theLatticeTree, go to Settings, and tap Share this computer with a phone.'));
    w.appendChild(el('p', '', 'Then point this device\'s camera at the picture code it shows, and tap the link. This page will ask you one Yes or No.'));
    w.appendChild(el('p', 'tree-door-quiet', 'Both devices need the same Wi-Fi or the same wired network.'));
    var T = pool();
    if (T && T.canScan && T.canScan()) {
      var spot = el('div', '');
      w.appendChild(button('Scan the picture code with this page', function () { T.scanInto(spot, function (code) { arrive(code); }); }, 'tree-door-main'));
      w.appendChild(spot);
    }
    w.appendChild(button('Back', function () { start.again(); }, 'tree-door-soft'));
    w.appendChild(button('Close', function () { close(true); }, 'tree-door-soft'));
    focusFirst();
  }

  // =====================================================================
  // Part B, on the phone: Pool with (name)'s computer?
  // =====================================================================
  function deviceGuess() {
    var ua = String((root.navigator && root.navigator.userAgent) || '');
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android phone' : 'Android tablet';
    if (/CrOS/.test(ua)) return 'Chromebook';
    if (/Windows/.test(ua)) return 'Windows computer';
    if (/Mac OS X|Macintosh/.test(ua)) return 'Mac';
    if (/Linux/.test(ua)) return 'Linux computer';
    return 'this device';
  }
  function names() { var n = readJson(NAMES_KEY, {}); return (n && typeof n === 'object') ? n : {}; }
  function hostWords(card) {
    var b = card && card.body ? card.body : {};
    return b.keeperName ? clip(b.keeperName, 60) + '\'s computer' : (clip(b.name, 60) || 'that computer');
  }
  function arrive(code) {
    var T = pool();
    if (!T || !T.readInvite) return;
    T.readInvite(code).then(function (r) { phoneAsk(code, r); });
  }
  function phoneAsk(code, r) {
    var w = openWin('phone', 'Pool with another computer');
    var T = pool();
    if (!r || !r.ok) {
      w.appendChild(el('h2', '', 'That picture code is not an invite'));
      w.appendChild(el('p', '', 'Ask the other computer to show its picture code again.'));
      w.appendChild(button('Close', function () { close(true); }, 'tree-door-soft'));
      focusFirst(); return;
    }
    if (r.card && !r.card.ok && r.card.reason === 'own-card') {
      w.appendChild(el('h2', '', 'That is this device\'s own code'));
      w.appendChild(el('p', '', 'Point a different device\'s camera at it.'));
      w.appendChild(button('Close', function () { close(true); }, 'tree-door-soft'));
      focusFirst(); return;
    }
    if (!r.card || !r.card.ok) {
      w.appendChild(el('h2', '', 'This code has no card that checks out'));
      w.appendChild(el('p', '', 'So this device cannot know whose computer sent it, and it will not trust it. On that computer, tap Share this computer with a phone again: the window makes its card first.'));
      w.appendChild(button('Close', function () { close(true); }, 'tree-door-soft'));
      focusFirst(); return;
    }
    var host = hostWords(r.card);
    w.appendChild(el('h2', '', 'Pool with ' + host + '?'));
    w.appendChild(el('p', '', 'Its mind: ' + r.card.body.model + '.'));
    w.appendChild(el('p', 'tree-door-quiet', 'Yes means: this device trusts that computer\'s card, makes its own card if it has none, and shows a picture code to hold up to that computer. Nothing is shared until that computer says Yes too. When its mind helps, Chat on this device asks it.' +
      (r.card.trusted ? ' You already trust this computer.' : ' Tap Yes only if you know this computer.')));
    var n = names(), nameIn = null;
    if (!clip(n.ai, 60)) {
      nameIn = el('input', '');
      nameIn.type = 'text'; nameIn.maxLength = 60;
      nameIn.value = deviceGuess();
      nameIn.setAttribute('aria-label', 'This device\'s name');
      w.appendChild(el('p', 'tree-door-quiet', 'This device\'s name, so ' + host + ' knows it:'));
      w.appendChild(nameIn);
    }
    var msg = el('p', 'tree-door-quiet');
    msg.setAttribute('aria-live', 'polite');
    var yes = button('Yes, pool with ' + host, function () {
      yes.disabled = true;
      bump('phoneYes');
      if (nameIn) safeSet(NAMES_KEY, JSON.stringify({ ai: clip(nameIn.value, 60) || deviceGuess(), keeper: clip(n.keeper, 60), asks: !mindSeated() }));
      if (!r.card.trusted) T.trustCarried(r.card);
      msg.textContent = 'Making this device\'s answer...';
      T.doorJoin(r.sdp, r.room).then(function (j) {
        if (!j || !j.ok) { yes.disabled = false; msg.textContent = j && j.reason === 'full' ? 'Too many devices are connected already.' : 'That invite could not be used. Ask the other computer for a new picture code.'; return; }
        phoneReply(j, host);
      });
    }, 'tree-door-main');
    w.appendChild(yes);
    w.appendChild(button('No', function () { bump('phoneNo'); close(true); }, 'tree-door-soft'));
    w.appendChild(msg);
    focusFirst();
  }
  function phoneReply(j, host) {
    var w = openWin('phone', 'Hold this up to ' + host);
    var T = pool();
    w.appendChild(el('h2', '', 'Now hold this up to ' + host));
    w.appendChild(el('p', '', 'On ' + host + ', tap Scan the phone\'s code, then hold this screen up to its camera.'));
    drawQr(w, j.code, 'Picture code of this device\'s answer');
    var msg = el('p', 'tree-door-quiet');
    msg.setAttribute('aria-live', 'polite');
    w.appendChild(copyButton(j.code, msg));
    w.appendChild(msg);
    var status = el('p', '');
    status.setAttribute('aria-live', 'polite');
    w.appendChild(status);
    w.appendChild(button('Close', function () { close(true); }, 'tree-door-soft'));
    var routed = false;
    _poll = root.setInterval(function () {
      var s = T.peerState ? T.peerState(j.peerId) : null;
      if (!s) return;
      if (s.state === 'closed') { stopPoll(); status.textContent = 'The connection did not finish. Both devices need the same Wi-Fi or wired network. Some school or guest Wi-Fi keeps devices apart.'; return; }
      if (s.state !== 'proved') return;
      if (!s.kin) { status.textContent = 'Connected, but that computer\'s card is not trusted here, so nothing is asked.'; return; }
      if (!s.helping || !s.models.length) { status.textContent = 'Connected with ' + host + ', and trusted. Its mind is not helping yet. On ' + host + ', tap Let this device help.'; return; }
      stopPoll();
      if (!mindSeated() && !poolRoute() && !routed) { routed = true; T.useInChat(s.models[0]); }
      phoneDone(host, s.models[0], routed);
    }, 700);
  }
  function phoneDone(host, model, routed) {
    var w = openWin('phone', 'Pooled with ' + host);
    w.appendChild(el('h2', '', 'Pooled with ' + host));
    w.appendChild(el('p', '', routed ? ('Chat on this device now asks ' + model + ' on ' + host + '. If that computer pauses, nothing is answered and nothing is invented.')
      : ('Connected and trusted. Chat still uses this device\'s own mind. To ask ' + model + ' on ' + host + ' instead, use the Device Pool in Settings.')));
    var chatWord = root.document.getElementById('room-chat-word');
    if (chatWord) w.appendChild(button('Open Chat', function () { close(true); try { chatWord.click(); } catch (e) {} }, 'tree-door-main'));
    w.appendChild(button('Close', function () { close(true); }, 'tree-door-soft'));
    focusFirst();
  }

  // =====================================================================
  // Part B, on the host: one big picture code, then (device) wants to join
  // =====================================================================
  function share() {
    var T = pool();
    bump('hostShare');
    var w = openWin('host', 'Share this computer with a phone');
    if (!T || !T.invite) { w.appendChild(el('p', '', 'The Device Pool is not on this page.')); w.appendChild(button('Close', function () { close(false); }, 'tree-door-soft')); return; }
    var n = names();
    if (!clip(n.ai, 60)) { hostName(); return; }
    showCode();
  }
  function hostName() {
    var w = openWin('host', 'Share this computer with a phone');
    var P = probe(), m = null;
    try { m = P && P.getRemembered ? P.getRemembered() : null; } catch (e) { m = null; }
    w.appendChild(el('h2', '', 'Share this computer with a phone'));
    w.appendChild(el('p', '', 'First, your name, so the phone can say whose computer this is.'));
    var who = el('input', '');
    who.type = 'text'; who.maxLength = 60; who.placeholder = 'Your first name';
    who.value = clip(names().keeper, 60);
    who.setAttribute('aria-label', 'Your first name');
    w.appendChild(who);
    if (!mindSeated()) w.appendChild(el('p', 'tree-door-quiet', 'This computer has no mind seated yet, so it can join and ask, but it has nothing to share. Settings can wake one.'));
    w.appendChild(button('Show the picture code', function () {
      var model = m && (m.model || (Array.isArray(m.models) && m.models[0])) || '';
      var keeper = clip(who.value, 60);
      var ai = model ? (keeper ? keeper + '\'s mind' : 'My mind') : 'this computer';
      safeSet(NAMES_KEY, JSON.stringify({ ai: clip(ai, 60), keeper: clip(who.value, 60), asks: !mindSeated() }));
      showCode();
    }, 'tree-door-main'));
    w.appendChild(button('Close', function () { close(false); }, 'tree-door-soft'));
    focusFirst();
  }
  function showCode() {
    var T = pool();
    var w = openWin('host', 'Point your phone camera here');
    w.appendChild(el('h2', '', 'Point your phone camera here'));
    var spotQr = el('div', '');
    w.appendChild(spotQr);
    var msg = el('p', 'tree-door-quiet');
    msg.setAttribute('aria-live', 'polite');
    msg.textContent = 'Making the picture code on this computer...';
    w.appendChild(msg);
    var shown = '';
    function paintQr(code) {
      if (!code || code === shown) return;
      shown = code;
      empty(spotQr);
      drawQr(spotQr, T.inviteUrl(code), 'Picture code to join this computer');
      spotQr.appendChild(el('p', '', 'On the phone, tap the link the camera shows. The phone asks one Yes or No. Nothing is shared until both of you say Yes.'));
      msg.textContent = '';
    }
    var made = T.currentInvite() ? Promise.resolve() : (T.room && T.room() ? T.doorInvite() : T.startRoom());
    Promise.resolve(made).then(function () {
      if (!isOpen() || _kind !== 'host') return;
      var code = T.currentInvite();
      if (!code) { msg.textContent = 'This browser could not make a picture code here (it needs WebRTC).'; return; }
      paintQr(code);
      _poll = root.setInterval(function () { paintQr(T.currentInvite()); }, 1000);
    });
    var two = el('div', 'tree-door-part');
    two.appendChild(el('p', '', 'When the phone shows its own picture code:'));
    var spotCam = el('div', '');
    if (T.canScan && T.canScan()) {
      two.appendChild(button('Scan the phone\'s code', function () {
        msg.textContent = 'Hold the phone screen up to this computer\'s camera. The camera view stays on this page, and stops after reading.';
        T.scanInto(spotCam, function (got) { hostRead(got); });
      }, 'tree-door-main'));
      two.appendChild(spotCam);
    } else {
      two.appendChild(el('p', 'tree-door-quiet', 'This browser cannot read picture codes here. On the phone, tap Copy instead, send it to this computer by email or chat, and paste it below.'));
    }
    var box = el('textarea', '');
    box.placeholder = 'Or paste the phone\'s code here';
    box.setAttribute('aria-label', 'The phone\'s code');
    two.appendChild(box);
    two.appendChild(button('Use the pasted code', function () { hostRead(box.value); }, 'tree-door-soft'));
    w.appendChild(two);
    w.appendChild(button('Close', function () { close(false); }, 'tree-door-soft'));
    focusFirst();
  }
  function hostRead(code) {
    var T = pool();
    T.readReply(T.codeFrom ? (T.codeFrom(code) || code) : code).then(function (r) {
      if (!r || !r.ok) {
        var w0 = openWin('host', 'That code did not work');
        w0.appendChild(el('h2', '', r && r.reason === 'no-invite' ? 'That picture code has closed' : 'That is not a phone\'s answer'));
        w0.appendChild(el('p', '', 'Show the picture code again and let the phone answer once more.'));
        w0.appendChild(button('Show the picture code', function () { showCode(); }, 'tree-door-main'));
        w0.appendChild(button('Close', function () { close(false); }, 'tree-door-soft'));
        focusFirst(); return;
      }
      hostAsk(r);
    });
  }
  function hostAsk(r) {
    var T = pool();
    var ok = !!(r.card && r.card.ok);
    var who = ok ? clip(r.card.body.name, 60) + (r.card.body.keeperName ? ' (' + clip(r.card.body.keeperName, 60) + ')' : '') : 'A device';
    var w = openWin('host', who + ' wants to join');
    w.appendChild(el('h2', '', who + ' wants to join. Pool resources with it?'));
    if (ok) w.appendChild(el('p', 'tree-door-quiet', 'Its card checks out. ' + (r.card.trusted ? 'You already trust this device.' : 'Tap Yes only if you know this device. You can stop trusting it any time in Trusted kin.')));
    else w.appendChild(el('p', 'tree-door-quiet', 'It sent no card that checks out, so it cannot be trusted. It can connect, but it cannot ask.'));
    var msg = el('p', 'tree-door-quiet');
    msg.setAttribute('aria-live', 'polite');
    var mode = T.mode ? T.mode() : 'off';
    function go(help) {
      bump('hostYes');
      if (ok && !r.card.trusted) T.trustCarried(r.card);
      if (help) T.letHelp();
      msg.textContent = 'Connecting...';
      T.doorFinish(r.sdp).then(function (f) {
        if (!f || !f.ok) { msg.textContent = 'That answer could not be used. Show the picture code again.'; return; }
        hostWait(f.peerId, who);
      });
    }
    if (ok && mode === 'kin') {
      w.appendChild(button('Yes', function () { go(false); }, 'tree-door-main'));
      w.appendChild(el('p', 'tree-door-quiet', 'This computer already lets trusted kin ask its mind. Pause stays in Settings.'));
    } else if (ok) {
      w.appendChild(button(mode === 'pause' ? 'Yes, and resume helping trusted kin' : 'Yes, and let my mind answer it', function () { go(true); }, 'tree-door-main'));
      w.appendChild(button(mode === 'pause' ? 'Yes, connect only (helping stays paused)' : 'Yes, connect only', function () { go(false); }));
      w.appendChild(el('p', 'tree-door-quiet', 'Letting your mind answer uses this computer\'s power. Only trusted kin can ask, and Pause helping in Settings stops it any time.'));
    } else {
      w.appendChild(button('Connect without trusting', function () { go(false); }));
    }
    w.appendChild(button('No', function () { bump('hostNo'); showCode(); }, 'tree-door-soft'));
    w.appendChild(msg);
    focusFirst();
  }
  function hostWait(peerId, who) {
    var T = pool();
    var w = openWin('host', 'Connecting to ' + who);
    w.appendChild(el('h2', '', 'Connecting to ' + who));
    var status = el('p', '', 'Connecting... If nothing happens in a minute, the two devices may not be on the same network.');
    status.setAttribute('aria-live', 'polite');
    w.appendChild(status);
    var again = button('Share with another device', function () { showCode(); });
    w.appendChild(button('Done', function () { close(false); }, 'tree-door-soft'));
    _poll = root.setInterval(function () {
      var s = T.peerState ? T.peerState(peerId) : null;
      if (!s) return;
      if (s.state === 'closed') { stopPoll(); status.textContent = 'The connection did not finish. Both devices need the same Wi-Fi or wired network.'; return; }
      if (s.state !== 'proved') return;
      stopPoll();
      w.querySelector('h2').textContent = s.kin ? 'Pooled with ' + who : 'Connected to ' + who;
      status.textContent = (s.kin ? who + ' is trusted kin and connected. ' : who + ' is connected, not trusted. ') + (T.doorLine ? T.doorLine() : '');
      if (!again.parentNode) w.insertBefore(again, w.lastChild);
    }, 700);
  }

  // ---- Settings: a way back in after Not now ----
  function paintRelaunch() {
    if (!_relaunch) return;
    empty(_relaunch);
    if (hasMind()) return;
    _relaunch.appendChild(button('Help me wake a mind', function () {
      safeSet(NOT_NOW_KEY, '');
      sessSet(VISIT_KEY, '');
      quietLookAllowed().then(function (q) {
        if (q === 'yes') look().then(function (r) { welcome(r, !r); }); else welcome(null, true);
      });
    }));
  }
  function mountRelaunch(host) {
    if (!host || !root.document) return;
    addStyle();
    _relaunch = host;
    host.className = (host.className ? host.className + ' ' : '') + 'tree-door-relaunch';
    paintRelaunch();
  }

  // ---- start ----
  function start() {
    if (_started || !root.document) return;
    _started = true;
    var T = pool();
    var code = T && T.takeArrived ? T.takeArrived() : '';
    if (code) { arrive(code); return; }
    if (!shouldOffer()) return;
    root.setTimeout(function () {
      if (!shouldOffer() || isOpen()) return;
      quietLookAllowed().then(function (q) {
        if (!shouldOffer() || isOpen()) return;
        if (q !== 'yes') { welcome(null, true); return; }
        bump('quietLooks');
        look().then(function (r) { if (shouldOffer() && !isOpen()) welcome(r, false); });
      });
    }, OPEN_DELAY);
  }
  start.again = function () {
    quietLookAllowed().then(function (q) { if (q === 'yes') look().then(function (r) { welcome(r, false); }); else welcome(null, true); });
  };

  try {
    if (root.addEventListener) {
      // A mind seated anywhere (Settings, the Gathering, the in-browser card) closes the welcome window.
      var settle = function () { if (_kind === 'welcome' && hasMind()) close(false); paintRelaunch(); };
      root.addEventListener('fl-alpha-mind-remembered', settle);
      root.addEventListener('tree-browser-mind-changed', settle);
      root.addEventListener('tree-pool-chat-route', settle);
    }
  } catch (e) {}

  root.TreeDoor = {
    VERSION: VERSION,
    SENDS_NOTHING: true,
    start: start,
    share: share,
    arrive: arrive,
    welcome: welcome,
    close: close,
    isOpen: isOpen,
    kind: function () { return _kind; },
    shouldOffer: shouldOffer,
    hasMind: hasMind,
    quietLookAllowed: quietLookAllowed,
    deviceGuess: deviceGuess,
    mountRelaunch: mountRelaunch,
    counts: counts
  };

  if (!root.TreeDoorNoAuto && root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start);
    else root.setTimeout(start, 0);
  }
})(typeof window !== 'undefined' ? window : this);
