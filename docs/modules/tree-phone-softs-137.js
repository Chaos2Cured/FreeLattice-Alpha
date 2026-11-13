// tree-phone-softs-137.js v-tree-phone-softs-137-v0.1
// SPDX-License-Identifier: MIT
// Layer, never delete. Does not rewrite tree-phone-polish-136.js,
// garden-rooms.js, fl-connect.js, fractal-garden.js, AUTONOMY.md,
// or the Gathering twins.
//
// After PR #137: on phones, Settings opens at the top of its panel, and
// the visible HTML room-light circle is 48 CSS pixels (computed size,
// not the door box). 1280 is unchanged.
(function (root) {
  'use strict';

  var VERSION = 'v-tree-phone-softs-137-v0.1';
  var STYLE_ID = 'tree-phone-softs-137-style';
  var NARROW = 600;
  var CIRCLE = 48;
  var HOLD_MS = 2800;
  var _openAt = 0;
  var _pinTimer = 0;
  var _hooked = false;
  var _watched = false;
  var _origScrollIntoView = null;

  function doc() {
    try { return root.document || null; } catch (e) { return null; }
  }

  function now() {
    try { return Date.now(); } catch (e) { return 0; }
  }

  function isNarrow() {
    try {
      if (root.matchMedia && root.matchMedia('(max-width: ' + NARROW + 'px)').matches) return true;
    } catch (e0) {}
    try { return (root.innerWidth || 0) <= NARROW; } catch (e1) { return false; }
  }

  function settingsVeil() {
    var d = doc();
    var veil = d && d.getElementById('place-veil');
    if (!veil || !veil.classList.contains('is-open') || !veil.classList.contains('is-settings')) return null;
    return veil;
  }

  function holdingTop() {
    if (!isNarrow()) return false;
    var veil = settingsVeil();
    if (!veil) {
      _openAt = 0;
      return false;
    }
    var t = now();
    if (!_openAt) _openAt = t;
    return (t - _openAt) < HOLD_MS;
  }

  function resetScrollers() {
    var d = doc();
    var veil = settingsVeil();
    var list = [];
    if (d) {
      if (d.documentElement) list.push(d.documentElement);
      if (d.body) list.push(d.body);
    }
    if (veil) list.push(veil);
    try { if (root.scrollTo) root.scrollTo(0, 0); } catch (e0) {}
    var i;
    for (i = 0; i < list.length; i++) {
      try { list[i].scrollTop = 0; list[i].scrollLeft = 0; } catch (e1) {}
    }
    if (!veil) return;
    var nodes = veil.querySelectorAll('*');
    for (i = 0; i < nodes.length; i++) {
      try {
        if (nodes[i].scrollTop) nodes[i].scrollTop = 0;
        if (nodes[i].scrollLeft) nodes[i].scrollLeft = 0;
      } catch (e2) {}
    }
  }

  function hookScrollIntoView() {
    if (_hooked) return;
    var proto = root.Element && root.Element.prototype;
    if (!proto || typeof proto.scrollIntoView !== 'function') return;
    _hooked = true;
    _origScrollIntoView = proto.scrollIntoView;
    proto.scrollIntoView = function () {
      var veil = settingsVeil();
      if (holdingTop() && veil && this && (this === veil || (this.nodeType === 1 && veil.contains(this)))) {
        resetScrollers();
        return;
      }
      return _origScrollIntoView.apply(this, arguments);
    };
  }

  function pinSettingsTop() {
    if (!holdingTop()) {
      if (_pinTimer && root.clearInterval) {
        try { root.clearInterval(_pinTimer); } catch (eC) {}
        _pinTimer = 0;
      }
      return;
    }
    resetScrollers();
    if (_pinTimer || !root.setInterval) return;
    _pinTimer = root.setInterval(function () {
      if (!holdingTop()) {
        try { root.clearInterval(_pinTimer); } catch (e) {}
        _pinTimer = 0;
        return;
      }
      resetScrollers();
    }, 80);
  }

  function watchSettings() {
    if (_watched) return;
    var d = doc();
    if (!d || typeof MutationObserver !== 'function') return;
    var veil = d.getElementById('place-veil');
    if (!veil) return;
    _watched = true;
    var obs = new MutationObserver(function () {
      if (settingsVeil()) pinSettingsTop();
      else _openAt = 0;
    });
    try { obs.observe(veil, { attributes: true, attributeFilter: ['class'] }); } catch (e) {}
  }

  function addStyle() {
    var d = doc();
    if (!d) return;
    var s = d.getElementById(STYLE_ID);
    if (!s) {
      s = d.createElement('style');
      s.id = STYLE_ID;
    }
    s.textContent = [
      '@media (max-width: 600px){',
      'html[data-tree-phone-grid] #tree-phone-light-grid .garden-lumino-light,',
      'html[data-tree-phone-grid] #tree-phone-light-grid .garden-lumino.is-attached .garden-lumino-light{',
      'box-sizing:border-box !important;',
      'width:' + CIRCLE + 'px !important;',
      'height:' + CIRCLE + 'px !important;',
      'min-width:' + CIRCLE + 'px !important;',
      'min-height:' + CIRCLE + 'px !important;',
      'max-width:' + CIRCLE + 'px !important;',
      'max-height:' + CIRCLE + 'px !important;',
      'padding:0 !important;border-width:0 !important;',
      'flex:0 0 ' + CIRCLE + 'px !important;',
      'aspect-ratio:1 / 1;',
      'border-radius:50% !important;',
      'background-clip:border-box !important;',
      'transform:none !important;translate:0 !important;scale:1 !important;',
      '}',
      '}',
      'html[data-tree-narrow] #tree-phone-light-grid .garden-lumino-light,',
      'html[data-tree-phone-grid] #tree-phone-light-grid .garden-lumino-light{',
      'box-sizing:border-box !important;',
      'width:' + CIRCLE + 'px !important;',
      'height:' + CIRCLE + 'px !important;',
      'min-width:' + CIRCLE + 'px !important;',
      'min-height:' + CIRCLE + 'px !important;',
      'max-width:' + CIRCLE + 'px !important;',
      'max-height:' + CIRCLE + 'px !important;',
      'padding:0 !important;border-width:0 !important;',
      'flex:0 0 ' + CIRCLE + 'px !important;',
      'aspect-ratio:1 / 1;',
      'border-radius:50% !important;',
      'transform:none !important;',
      '}'
    ].join('');
    (d.head || d.documentElement).appendChild(s);
  }

  function start() {
    hookScrollIntoView();
    addStyle();
    watchSettings();
    if (settingsVeil()) pinSettingsTop();
  }

  hookScrollIntoView();

  root.TreePhoneSofts137 = {
    VERSION: VERSION,
    CIRCLE: CIRCLE,
    HOLD_MS: HOLD_MS,
    scrollSettingsToTop: resetScrollers,
    pinSettingsTop: pinSettingsTop,
    holdingTop: holdingTop,
    start: start
  };

  addStyle();
  if (doc()) {
    if (doc().readyState === 'loading') doc().addEventListener('DOMContentLoaded', start);
    else root.setTimeout(start, 0);
  }
})(typeof window !== 'undefined' ? window : this);
