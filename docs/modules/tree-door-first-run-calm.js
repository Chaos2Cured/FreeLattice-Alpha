// tree-door-first-run-calm.js v-tree-door-first-run-calm-v0.1
// SPDX-License-Identifier: MIT
// Layer, never delete. Does not change tree-door.js.
//
// Auto "Let's wake a mind for you" is a small, dismissible card, never a
// full-screen veil. It does not run on Settings (Help me wake a mind stays).
// It hides while the Gathering is open. Escape and Not now still work.
// A tap on Help me wake a mind still opens the ordinary window, because
// the person asked.
(function (root) {
  'use strict';

  var VERSION = 'v-tree-door-first-run-calm-v0.1';
  var DELAY = 900;
  var STYLE_ID = 'tree-door-first-run-calm-style';
  var CALM_ATTR = 'data-tree-door-calm';
  var _timer = null;
  var _obs = null;
  var _started = false;
  var _auto = false;
  var _painting = false;

  function doc() {
    try { return root.document || null; } catch (e) { return null; }
  }
  function door() { return root.TreeDoor || null; }

  function isSettingsPage() {
    try {
      var p = String((root.location && root.location.pathname) || '');
      return /settings\.html$/i.test(p);
    } catch (e) { return false; }
  }

  function gatheringOpen() {
    var d = doc();
    if (!d || !d.getElementById) return false;
    var veil = d.getElementById('place-veil');
    if (veil && !veil.hidden && veil.classList && veil.classList.contains('is-open') && veil.classList.contains('is-core')) {
      return true;
    }
    var g = d.getElementById('core-gathering');
    if (g && !g.hidden) return true;
    return false;
  }

  function addStyle() {
    var d = doc();
    if (!d || d.getElementById(STYLE_ID)) return;
    var s = d.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.tree-door-veil[' + CALM_ATTR + '="' + VERSION + '"]{',
      'position:fixed;left:0;right:auto;top:auto;bottom:0;width:auto;height:auto;',
      'background:transparent;display:block;z-index:40;pointer-events:none;',
      'padding:0;align-items:unset;justify-content:unset;box-sizing:border-box;}',
      '.tree-door-veil[' + CALM_ATTR + '="' + VERSION + '"] .tree-door{',
      'pointer-events:auto;width:min(22rem,calc(100vw - 24px));margin:12px;',
      'max-height:calc(100vh - 24px);box-shadow:0 8px 28px rgba(0,0,0,0.45);}'
    ].join('');
    (d.head || d.documentElement).appendChild(s);
  }

  function findVeil() {
    var d = doc();
    if (!d || !d.querySelector) return null;
    return d.querySelector('.tree-door-veil');
  }

  function calmVeil() {
    var veil = findVeil();
    var D = door();
    if (!veil || !D || D.kind() !== 'welcome') return false;
    addStyle();
    veil.setAttribute(CALM_ATTR, VERSION);
    var box = veil.querySelector('.tree-door');
    if (box) {
      box.setAttribute('aria-modal', 'false');
    }
    try {
      var active = doc().activeElement;
      if (active && veil.contains(active) && active.blur) active.blur();
    } catch (e) {}
    try { if (root.scrollTo) root.scrollTo(0, 0); } catch (e2) {}
    return true;
  }

  function hideAutoIfGathering() {
    var D = door();
    if (!D || !D.isOpen || !D.isOpen()) return;
    if (D.kind() !== 'welcome') return;
    if (!_auto) return;
    if (!gatheringOpen()) return;
    try { D.close(false); } catch (e) {}
    _auto = false;
  }

  function maybeOffer() {
    if (_painting) return;
    _painting = true;
    try {
      hideAutoIfGathering();
      var D = door();
      if (!D) return;
      if (isSettingsPage()) return;
      if (gatheringOpen()) return;
      if (typeof D.shouldOffer === 'function' && !D.shouldOffer()) return;
      if (D.isOpen && D.isOpen()) {
        if (_auto && D.kind() === 'welcome') calmVeil();
        return;
      }
      _auto = true;
      var look = (typeof D.quietLookAllowed === 'function')
        ? D.quietLookAllowed()
        : Promise.resolve('no');
      Promise.resolve(look).then(function (q) {
        if (!_auto) return;
        if (isSettingsPage() || gatheringOpen()) { _auto = false; return; }
        if (typeof D.shouldOffer === 'function' && !D.shouldOffer()) { _auto = false; return; }
        if (D.isOpen && D.isOpen()) { if (D.kind() === 'welcome') calmVeil(); return; }
        if (q === 'yes') {
          return Promise.resolve(root.LocalMindProbe && root.LocalMindProbe.look
            ? root.LocalMindProbe.look() : null).then(function (r) {
            if (!_auto || gatheringOpen() || isSettingsPage()) return;
            if (typeof D.shouldOffer === 'function' && !D.shouldOffer()) return;
            D.welcome(r || null, !r);
            calmVeil();
          }, function () {
            if (!_auto || gatheringOpen() || isSettingsPage()) return;
            D.welcome(null, true);
            calmVeil();
          });
        }
        D.welcome(null, true);
        calmVeil();
      }).then(function () {}, function () { _auto = false; });
    } finally {
      _painting = false;
    }
  }

  function schedule() {
    if (_timer) {
      try { root.clearTimeout(_timer); } catch (e) {}
      _timer = null;
    }
    _timer = root.setTimeout(function () {
      _timer = null;
      maybeOffer();
    }, DELAY);
  }

  function watch() {
    var d = doc();
    if (!d || typeof root.MutationObserver !== 'function' || _obs) return;
    var target = d.getElementById('place-veil') || d.body;
    if (!target) return;
    _obs = new root.MutationObserver(function () {
      if (_painting) return;
      hideAutoIfGathering();
    });
    try {
      _obs.observe(target, { attributes: true, attributeFilter: ['class', 'hidden'] });
      var g = d.getElementById('core-gathering');
      if (g) _obs.observe(g, { attributes: true, attributeFilter: ['hidden', 'class'] });
    } catch (e) {}
  }

  function start() {
    if (_started) return;
    _started = true;
    addStyle();
    watch();
    if (isSettingsPage()) return;
    var D = door();
    if (!D || (typeof D.shouldOffer === 'function' && !D.shouldOffer())) return;
    schedule();
  }

  var api = {
    VERSION: VERSION,
    DELAY: DELAY,
    start: start,
    maybeOffer: maybeOffer,
    gatheringOpen: gatheringOpen,
    isSettingsPage: isSettingsPage,
    calmVeil: calmVeil,
    isAuto: function () { return _auto; }
  };
  root.TreeDoorFirstRunCalm = api;

  if (doc()) {
    if (doc().readyState === 'loading') doc().addEventListener('DOMContentLoaded', start);
    else root.setTimeout(start, 0);
  }
})(typeof window !== 'undefined' ? window : this);
