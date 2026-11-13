// SPDX-License-Identifier: MIT
// tree-mind-check-calm.js (v-hypha-walk-polish-v0.3). Layer, never delete.
// v-hypha-settings-freeze-v0.1: paintStopped is idempotent. If
// [data-tree-checking-paused] is already present it returns early, and the
// host MutationObserver is disconnected / takeRecords() around the paint so
// its own mutations cannot retrigger it after _painting is cleared.
// Does not change fl-connect.js. After the first look for a mind on this
// computer, this layer stops FlConnect's own 8s loop, backs off (8s, 16s,
// 32s, then 64s), and then rests with a kind note, a Check again button, and
// one door to FreeLattice Desktop 5.8.3. After the last attempt, this layer
// unmounts FlConnect (which unbinds its visibility loop) and answers later
// probe/refresh calls with a cached empty report, so no more localhost
// requests go out until Check again is tapped. The Connect card's main door
// is one Desktop 5.8.3 link for Mac, Windows, and Linux. Bridge stays, as a
// secondary path.
(function (root) {
  'use strict';
  var VERSION = 'v-hypha-walk-polish-v0.3';
  var DESKTOP_HREF = 'https://freelattice.com/desktop.html';
  var DESKTOP_LABEL = 'FreeLattice Desktop 5.8.3';
  var KIND_LINE = 'No local mind on this computer yet.';
  var PAUSED_LINE = 'Checking paused.';
  var DOOR_LINE = 'A clear door is FreeLattice Desktop 5.8.3, which can wake a mind on this computer.';
  var BRIDGE_LINE = 'Or the Bridge, if you already use it.';
  var LEDE_LINE = 'One door. FreeLattice Desktop 5.8.3 works on Mac, Windows, and Linux.';
  var FIRST_MS = 8000;
  var STOP_AT_MS = 60000;

  var _timer = null;
  var _host = null;
  var _delayMs = FIRST_MS;
  var _stopped = false;
  var _allowLook = false;
  var _armed = false;
  var _painting = false;
  var _visBound = false;
  var _obs = null;
  var _orig = {};

  function connect() { return root.FlConnect || null; }

  function hasMind() {
    var api = connect();
    try { return !!(api && typeof api.hasLocalMind === 'function' && api.hasLocalMind()); }
    catch (e) { return false; }
  }

  function clearTimer() {
    if (_timer) {
      try { root.clearTimeout(_timer); } catch (e) {}
      _timer = null;
    }
  }

  function stopTheirs() {
    var api = connect();
    if (api && typeof api.stopLoop === 'function') {
      try { api.stopLoop(); } catch (e) {}
    }
  }

  function releaseTheirs() {
    var api = connect();
    if (api && typeof _orig.unmount === 'function') {
      try { _orig.unmount.call(api); } catch (e) {}
    } else {
      stopTheirs();
    }
  }

  function hostEl() {
    if (_host && _host.parentNode) return _host;
    var d = root.document;
    if (!d || !d.getElementById) return null;
    return d.getElementById('fl-connect-mount') || _host;
  }

  function el(tag, cls, text) {
    var d = root.document;
    if (!d || !d.createElement) return null;
    var node = d.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  function gateLook() {
    return _stopped && !_allowLook;
  }

  function emptyReport() {
    return { models: [], loopStopped: true, nextLookSec: 0 };
  }

  function isBridgeLink(a) {
    if (!a) return false;
    if (a.getAttribute && a.getAttribute('data-tree-desktop-door') === '1') return false;
    var text = String(a.textContent || '');
    return text.indexOf('Download Bridge') !== -1;
  }

  function demote(a) {
    var cls = String(a.className || '').replace(/\bflc-primary\b/g, '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    if (cls.indexOf('tree-bridge-link') === -1) cls = (cls + ' tree-bridge-link').replace(/^\s+/, '');
    a.className = cls;
  }

  function honorOneCard(card) {
    if (!card) return;
    var door = card.querySelector ? card.querySelector('[data-tree-desktop-door="1"]') : null;
    if (!door) {
      door = el('a', 'flc-btn flc-primary tree-desktop-door', DESKTOP_LABEL);
      if (!door) return;
      door.setAttribute('href', DESKTOP_HREF);
      door.setAttribute('rel', 'noopener noreferrer');
      door.setAttribute('data-tree-desktop-door', '1');
      try {
        door.style.display = 'inline-flex';
        door.style.alignItems = 'center';
        door.style.justifyContent = 'center';
        door.style.lineHeight = '1.2';
        door.style.minHeight = '48px';
        door.style.boxSizing = 'border-box';
        door.style.paddingTop = '0';
        door.style.paddingBottom = '0';
      } catch (eDoor) {}
      var tag = card.querySelector ? card.querySelector('.flc-tag') : null;
      if (tag && tag.nextSibling) card.insertBefore(door, tag.nextSibling);
      else if (card.firstChild) card.insertBefore(door, card.firstChild);
      else card.appendChild(door);
      var note = el('p', 'tree-desktop-door-note', 'One door for Mac, Windows, and Linux.');
      if (note) {
        if (door.nextSibling) card.insertBefore(note, door.nextSibling);
        else card.appendChild(note);
      }
    }
    var box = card.querySelector ? card.querySelector('[data-tree-bridge-secondary="1"]') : null;
    if (!box) {
      box = el('div', 'tree-bridge-secondary', '');
      if (box) {
        box.setAttribute('data-tree-bridge-secondary', '1');
        box.appendChild(el('p', 'tree-bridge-secondary-label', BRIDGE_LINE));
        card.appendChild(box);
      }
    }
    var links = card.querySelectorAll ? card.querySelectorAll('a') : [];
    var j;
    for (j = 0; j < links.length; j++) {
      if (!isBridgeLink(links[j])) continue;
      demote(links[j]);
      if (box && links[j].parentNode !== box) box.appendChild(links[j]);
    }
  }

  function honorLede(host) {
    if (!host || !host.querySelectorAll) return;
    var ledes = host.querySelectorAll('.flc-lede');
    var i;
    for (i = 0; i < ledes.length; i++) {
      var text = String(ledes[i].textContent || '');
      if (/Download Bridge/.test(text) || text !== LEDE_LINE) {
        if (/Download Bridge/.test(text)) ledes[i].textContent = LEDE_LINE;
      }
    }
  }


  function isLookAgain(btn) {
    if (!btn) return false;
    if (btn.getAttribute && (btn.getAttribute('data-flc-look-again') || btn.getAttribute('data-tree-mind-check-again'))) return true;
    var cls = ' ' + String(btn.className || '') + ' ';
    if (cls.indexOf(' flc-look-again ') !== -1) return true;
    return String(btn.textContent || '') === 'Look again';
  }

  function honorLookAgain(host) {
    host = host || hostEl();
    if (!host || !host.querySelectorAll) return;
    var buttons = host.querySelectorAll('button');
    var i;
    var first = null;
    for (i = 0; i < buttons.length; i++) {
      if (!isLookAgain(buttons[i])) continue;
      if (String(buttons[i].textContent || '') === 'Look again') buttons[i].textContent = 'Check again';
      if (!first) first = buttons[i];
    }
    if (!host.querySelector || host.querySelector('[data-tree-checking-paused]')) return;
    var line = el('p', 'tree-checking-paused', PAUSED_LINE);
    if (!line) return;
    line.setAttribute('data-tree-checking-paused', '1');
    if (first && first.parentNode) first.parentNode.insertBefore(line, first);
    else host.appendChild(line);
  }

  function honorDownloadCard(host) {
    host = host || hostEl();
    if (!host || !host.querySelectorAll) return;
    honorLede(host);
    var cards = host.querySelectorAll('.flc-download');
    var i;
    for (i = 0; i < cards.length; i++) honorOneCard(cards[i]);
  }

  function ensureCalmBox(host) {
    var box = host.querySelector ? host.querySelector('#tree-mind-check-calm') : null;
    if (box) return box;
    box = el('div', 'tree-mind-check-calm flc-card');
    if (!box) return null;
    box.id = 'tree-mind-check-calm';
    var status = host.querySelector ? host.querySelector('.flc-status') : null;
    if (status && status.parentNode) status.parentNode.insertBefore(box, status.nextSibling);
    else host.appendChild(box);
    return box;
  }


  function pausedPresent(host) {
    return !!(host && host.querySelector && host.querySelector('[data-tree-checking-paused]'));
  }

  function observerQuiet(fn) {
    var host = hostEl();
    if (_obs) {
      try { _obs.disconnect(); } catch (e0) {}
      try { _obs.takeRecords(); } catch (e1) {}
    }
    try {
      return fn();
    } finally {
      if (_obs && host) {
        try { _obs.takeRecords(); } catch (e2) {}
        try { _obs.observe(host, { childList: true, subtree: true }); } catch (e3) {}
      }
    }
  }

  function paintWaiting(host, sec) {
    if (!host) return;
    _painting = true;
    try {
      var status = host.querySelector ? host.querySelector('.flc-status') : null;
      var line = 'Looking\u2026 next look in ' + sec + 's';
      if (status && status.textContent !== line) status.textContent = line;
      var old = host.querySelector ? host.querySelector('#tree-mind-check-calm') : null;
      if (old && old.parentNode) old.parentNode.removeChild(old);
      honorDownloadCard(host);
    } finally { _painting = false; }
  }

  function onCheckAgain() {
    startCycle(true);
  }

  function paintStopped(host) {
    if (!host) return;
    if (pausedPresent(host)) return;
    observerQuiet(function () {
      if (pausedPresent(host)) return;
      _painting = true;
      try {
        var status = host.querySelector ? host.querySelector('.flc-status') : null;
        if (status) {
          status.textContent = KIND_LINE;
        }
        var box = ensureCalmBox(host);
        if (!box) return;
        while (box.firstChild) box.removeChild(box.firstChild);
        box.appendChild(el('p', 'tree-mind-check-kind', KIND_LINE));
        var door = el('p', 'tree-mind-check-door', '');
        door.appendChild(root.document.createTextNode(DOOR_LINE + ' '));
        var a = el('a', 'tree-mind-check-link', DESKTOP_LABEL);
        a.setAttribute('href', DESKTOP_HREF);
        a.setAttribute('rel', 'noopener noreferrer');
        door.appendChild(a);
        box.appendChild(door);
        var paused = el('p', 'tree-checking-paused', PAUSED_LINE);
        paused.setAttribute('data-tree-checking-paused', '1');
        box.appendChild(paused);
        var again = el('button', 'flc-btn flc-primary tree-mind-check-again', 'Check again');
        again.type = 'button';
        again.setAttribute('data-tree-mind-check-again', '1');
        again.addEventListener('click', onCheckAgain);
        box.appendChild(again);
        honorDownloadCard(host);
        honorLookAgain(host);
      } finally { _painting = false; }
    });
  }

  function finish() {
    _stopped = true;
    _allowLook = false;
    clearTimer();
    releaseTheirs();
    stopTheirs();
    paintStopped(hostEl());
  }

  function schedule() {
    clearTimer();
    if (_stopped || hasMind()) return;
    var wait = _delayMs;
    paintWaiting(hostEl(), Math.round(wait / 1000));
    _timer = root.setTimeout(function () {
      _timer = null;
      tick();
    }, wait);
  }

  function afterLook() {
    _allowLook = false;
    stopTheirs();
    if (hasMind()) { clearTimer(); return; }
    if (_delayMs >= STOP_AT_MS) finish();
    else schedule();
  }

  function tick() {
    if (hasMind()) { clearTimer(); stopTheirs(); return; }
    if (_delayMs >= STOP_AT_MS) { finish(); return; }
    _delayMs = Math.min(_delayMs * 2, 64000);
    var api = connect();
    if (api && typeof api.refresh === 'function') {
      _allowLook = true;
      Promise.resolve(api.refresh({ fromLoop: true })).then(afterLook, afterLook);
    } else {
      afterLook();
    }
  }

  function startCycle(forceLook) {
    clearTimer();
    _stopped = false;
    _delayMs = FIRST_MS;
    var api = connect();
    var host = hostEl();
    if (forceLook && api) {
      _allowLook = true;
      if (typeof _orig.mount === 'function' && host) {
        try { _orig.mount.call(api, host); } catch (e) {}
      } else if (typeof _orig.lookAgain === 'function') {
        try { _orig.lookAgain.call(api); } catch (e2) {}
      }
    }
    _allowLook = false;
    stopTheirs();
    if (hasMind()) return;
    schedule();
    if (host) watch(host);
  }

  function watch(host) {
    if (!host || host.getAttribute && host.getAttribute('data-tree-mind-check') === VERSION) return;
    if (host.setAttribute) host.setAttribute('data-tree-mind-check', VERSION);
    _host = host;
    if (typeof root.MutationObserver === 'function') {
      var obs = new MutationObserver(function () {
        if (_painting) return;
        if (hasMind()) { clearTimer(); return; }
        if (_stopped && pausedPresent(host)) {
          try { obs.takeRecords(); } catch (eRec) {}
          return;
        }
        stopTheirs();
        honorDownloadCard(host);
        if (_stopped) {
          paintStopped(host);
          honorLookAgain(host);
          return;
        }
        paintWaiting(host, Math.round(_delayMs / 1000));
      });
      obs.observe(host, { childList: true, subtree: true });
      _obs = obs;
    }
  }

  function onVisibility() {
    if (_stopped) stopTheirs();
  }

  function bindVisibility() {
    var d = root.document;
    if (_visBound || !d || typeof d.addEventListener !== 'function') return;
    _visBound = true;
    d.addEventListener('visibilitychange', onVisibility);
  }

  function wrap() {
    var api = connect();
    if (!api || _armed) return api;
    _armed = true;
    _orig.lookAgain = api.lookAgain;
    _orig.mount = api.mount;
    _orig.unmount = api.unmount;
    _orig.refresh = api.refresh;
    _orig.probe = api.probe;
    api.lookAgain = function () {
      if (gateLook()) {
        startCycle(true);
        return;
      }
      if (typeof _orig.lookAgain === 'function') _orig.lookAgain.apply(api, arguments);
      startCycle(false);
    };
    api.mount = function (el) {
      if (el) _host = el;
      if (typeof _orig.mount === 'function') _orig.mount.apply(api, arguments);
      startCycle(false);
    };
    api.unmount = function () {
      clearTimer();
      _stopped = false;
      _allowLook = false;
      _host = null;
      if (typeof _orig.unmount === 'function') _orig.unmount.apply(api, arguments);
    };
    if (typeof _orig.refresh === 'function') {
      api.refresh = function () {
        if (gateLook()) {
          stopTheirs();
          return Promise.resolve(emptyReport());
        }
        return _orig.refresh.apply(api, arguments);
      };
    }
    if (typeof _orig.probe === 'function') {
      api.probe = function () {
        if (gateLook()) {
          stopTheirs();
          return Promise.resolve(emptyReport());
        }
        return _orig.probe.apply(api, arguments);
      };
    }
    bindVisibility();
    return api;
  }

  function boot() {
    wrap();
    var host = hostEl();
    if (host) startCycle(false);
  }

  var apiOut = {
    VERSION: VERSION,
    DESKTOP_HREF: DESKTOP_HREF,
    DESKTOP_LABEL: DESKTOP_LABEL,
    KIND_LINE: KIND_LINE,
    PAUSED_LINE: PAUSED_LINE,
    FIRST_MS: FIRST_MS,
    STOP_AT_MS: STOP_AT_MS,
    wrap: wrap,
    startCycle: startCycle,
    stop: finish,
    honorDownloadCard: honorDownloadCard,
    honorLookAgain: honorLookAgain,
    delayMs: function () { return _delayMs; },
    stopped: function () { return _stopped; },
    allowingLook: function () { return _allowLook; }
  };
  root.TreeMindCheckCalm = apiOut;
  if (typeof module !== 'undefined' && module.exports) module.exports = apiOut;
  // Wrap as soon as this file loads, so the page's later FlConnect.mount
  // already goes through this layer. Start the cycle on DOM ready if mount
  // already happened.
  wrap();
  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
