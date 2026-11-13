// SPDX-License-Identifier: MIT
// tree-mind-check-calm.js (v-hypha-walk-polish-v0.1). Layer, never delete.
// Does not change fl-connect.js. After the first look for a mind on this
// computer, this layer stops the 8s loop, backs off exponentially (8s, 16s,
// 32s, then 64s), and then rests with a kind note, a Check again button, and
// one door to FreeLattice Desktop 5.8.3. That stops the repeated refused
// localhost checks.
(function (root) {
  'use strict';
  var VERSION = 'v-hypha-walk-polish-v0.1';
  var DESKTOP_HREF = 'https://freelattice.com/desktop.html';
  var DESKTOP_LABEL = 'FreeLattice Desktop 5.8.3';
  var KIND_LINE = 'No local mind on this computer yet.';
  var DOOR_LINE = 'A clear door is FreeLattice Desktop 5.8.3, which can wake a mind on this computer.';
  var FIRST_MS = 8000;
  var STOP_AT_MS = 60000;

  var _timer = null;
  var _host = null;
  var _delayMs = FIRST_MS;
  var _stopped = false;
  var _armed = false;
  var _painting = false;
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

  function paintWaiting(host, sec) {
    if (!host) return;
    _painting = true;
    try {
      var status = host.querySelector ? host.querySelector('.flc-status') : null;
      var line = 'Looking\u2026 next look in ' + sec + 's';
      if (status && status.textContent !== line) status.textContent = line;
      var old = host.querySelector ? host.querySelector('#tree-mind-check-calm') : null;
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } finally { _painting = false; }
  }

  function onCheckAgain() {
    startCycle(true);
  }

  function paintStopped(host) {
    if (!host) return;
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
      var again = el('button', 'flc-btn flc-primary tree-mind-check-again', 'Check again');
      again.type = 'button';
      again.setAttribute('data-tree-mind-check-again', '1');
      again.addEventListener('click', onCheckAgain);
      box.appendChild(again);
    } finally { _painting = false; }
  }

  function finish() {
    _stopped = true;
    clearTimer();
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

  function tick() {
    if (hasMind()) { clearTimer(); stopTheirs(); return; }
    if (_delayMs >= STOP_AT_MS) { finish(); return; }
    _delayMs = Math.min(_delayMs * 2, 64000);
    var api = connect();
    if (api && typeof api.refresh === 'function') {
      Promise.resolve(api.refresh({ fromLoop: true })).then(function () {
        stopTheirs();
        if (hasMind()) return;
        if (_delayMs >= STOP_AT_MS) finish();
        else schedule();
      }, function () {
        stopTheirs();
        if (_delayMs >= STOP_AT_MS) finish();
        else schedule();
      });
    } else {
      if (_delayMs >= STOP_AT_MS) finish();
      else schedule();
    }
  }

  function startCycle(forceLook) {
    clearTimer();
    _stopped = false;
    _delayMs = FIRST_MS;
    var api = connect();
    var host = hostEl();
    if (forceLook && api && typeof _orig.lookAgain === 'function') {
      _orig.lookAgain.call(api);
    }
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
        stopTheirs();
        if (_stopped) {
          var status = host.querySelector ? host.querySelector('.flc-status') : null;
          if (status && /Looking/.test(String(status.textContent || ''))) {
            startCycle(false);
            return;
          }
          paintStopped(host);
          return;
        }
        paintWaiting(host, Math.round(_delayMs / 1000));
      });
      obs.observe(host, { childList: true, subtree: true });
    }
  }

  function wrap() {
    var api = connect();
    if (!api || _armed) return api;
    _armed = true;
    _orig.lookAgain = api.lookAgain;
    _orig.mount = api.mount;
    _orig.unmount = api.unmount;
    api.lookAgain = function () {
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
      _host = null;
      if (typeof _orig.unmount === 'function') _orig.unmount.apply(api, arguments);
    };
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
    FIRST_MS: FIRST_MS,
    STOP_AT_MS: STOP_AT_MS,
    wrap: wrap,
    startCycle: startCycle,
    stop: finish,
    delayMs: function () { return _delayMs; },
    stopped: function () { return _stopped; }
  };
  root.TreeMindCheckCalm = apiOut;
  if (typeof module !== 'undefined' && module.exports) module.exports = apiOut;
  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', boot);
    else boot();
  } else {
    wrap();
  }
})(typeof window !== 'undefined' ? window : globalThis);
