// tree-phone-polish-136.js v-tree-phone-polish-136-v0.1
// SPDX-License-Identifier: MIT
// Layer, never delete. Does not rewrite garden-rooms.js, fractal-garden.js,
// tree-door-first-run-calm.js, AUTONOMY.md, or the Gathering twins.
//
// At narrow widths, keep the garden room lights inside the viewport.
// The hint bar mentions that the legend opens rooms. While a room
// opens, "you are in Nursery" does not sit on the clay Not now button.
(function (root) {
  'use strict';

  var VERSION = 'v-tree-phone-polish-136-v0.1';
  var STYLE_ID = 'tree-phone-polish-136-style';
  var NARROW = 600;
  var HINT = 'Tap a light, or a name in the legend, to open a room. Start here: The Gathering, the Nursery, or Settings.';
  var _wrapped = false;
  var _fovHooked = false;

  function doc() {
    try { return root.document || null; } catch (e) { return null; }
  }

  function isNarrow() {
    try { return (root.innerWidth || 0) <= NARROW; } catch (e) { return false; }
  }

  function addStyle() {
    var d = doc();
    if (!d || d.getElementById(STYLE_ID)) return;
    var s = d.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      /* Instantly hide the room label while a room veil is open, so the */
      /* 8s fade cannot sit on the clay "Not now" button mid-open. */
      'html:has(#place-veil.is-open) #room-label,',
      'html:has(#place-veil.is-open) #room-label.is-shown,',
      'html:has(#place-veil.is-open) #room-label.is-fading{',
      'opacity:0 !important;visibility:hidden !important;',
      'transition:none !important;pointer-events:none !important;}'
    ].join('');
    (d.head || d.documentElement).appendChild(s);
  }

  function paintHint() {
    var d = doc();
    if (!d) return;
    var el = d.getElementById('garden-start');
    if (!el) return;
    if ((el.textContent || '').indexOf('legend') === -1) el.textContent = HINT;
    el.setAttribute('data-tree-phone-polish', VERSION);
  }

  // Fit a set of screen-space anchors into the visible garden, as a group,
  // so Nursery and Settings come in from the sides on a phone. Desktop
  // (wider than 600px) is left untouched.
  function fitAnchors(anchors) {
    if (!isNarrow() || !anchors || !anchors.length) return anchors;
    var vw = root.innerWidth || 0;
    var vh = root.innerHeight || 0;
    if (vw < 2 || vh < 2) return anchors;
    var padL = 10, padR = 10;
    var padT = Math.min(210, Math.max(130, Math.round(vh * 0.24)));
    var padB = Math.min(170, Math.max(90, Math.round(vh * 0.2)));
    var minL = padL, maxR = vw - padR, minT = padT, maxB = vh - padB;
    if (maxR - minL < 80 || maxB - minT < 80) return anchors;
    var xs = [], ys = [];
    for (var i = 0; i < anchors.length; i++) {
      if (!anchors[i] || typeof anchors[i].x !== 'number') continue;
      xs.push(anchors[i].x);
      ys.push(anchors[i].y);
    }
    if (xs.length < 2) return anchors;
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY);
    var scale = Math.min(1, (maxR - minL) / spanX, (maxB - minT) / spanY);
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    var ncx = (minL + maxR) / 2, ncy = (minT + maxB) / 2;
    return anchors.map(function (a) {
      if (!a || typeof a.x !== 'number') return a;
      var copy = {};
      Object.keys(a).forEach(function (k) { copy[k] = a[k]; });
      copy.x = ncx + (a.x - cx) * scale;
      copy.y = ncy + (a.y - cy) * scale;
      copy.visible = true;
      return copy;
    });
  }

  function wrapAnchors() {
    if (_wrapped) return;
    var FG = root.FractalGarden;
    if (!FG || typeof FG.getLuminoAnchors !== 'function') return;
    var orig = FG.getLuminoAnchors.bind(FG);
    FG.getLuminoAnchors = function () {
      return fitAnchors(orig());
    };
    _wrapped = true;
  }

  // On a tall narrow phone the default 55° vertical FOV leaves a tight
  // horizontal view, so Nursery and Settings project off the sides.
  // Widen only that garden camera, and only at ≤600px.
  function hookFov() {
    if (_fovHooked) return;
    var THREE = root.THREE;
    if (!THREE || !THREE.PerspectiveCamera || !THREE.PerspectiveCamera.prototype) return;
    var proto = THREE.PerspectiveCamera.prototype;
    if (typeof proto.updateProjectionMatrix !== 'function') return;
    var orig = proto.updateProjectionMatrix;
    proto.updateProjectionMatrix = function () {
      var saved = this.fov;
      try {
        if (isNarrow() && saved === 55 && this.aspect && this.aspect < 0.95) {
          var wantH = 78 * Math.PI / 180;
          var v = 2 * Math.atan(Math.tan(wantH / 2) / this.aspect) * 180 / Math.PI;
          this.fov = Math.min(110, Math.max(saved, v));
        }
        return orig.apply(this, arguments);
      } finally {
        this.fov = saved;
      }
    };
    _fovHooked = true;
    try { orig.call({ fov: 55, aspect: 1, updateProjectionMatrix: function () {} }); } catch (e) {}
    // Nudge any existing garden camera to recompute.
    try {
      if (root.FractalGarden && typeof root.FractalGarden.setQuality === 'function') {
        /* quality touch is a no-op for layout; projection updates on resize */
      }
      if (typeof root.dispatchEvent === 'function') {
        root.dispatchEvent(new root.Event('resize'));
      }
    } catch (e2) {}
  }

  function start() {
    addStyle();
    paintHint();
    hookFov();
    wrapAnchors();
    if (root.FractalGarden && !_wrapped) {
      var n = 0;
      var wait = root.setInterval(function () {
        wrapAnchors();
        n += 1;
        if (_wrapped || n > 80) root.clearInterval(wait);
      }, 50);
    }
  }

  var api = {
    VERSION: VERSION,
    HINT: HINT,
    NARROW: NARROW,
    fitAnchors: fitAnchors,
    start: start
  };
  root.TreePhonePolish136 = api;

  if (doc()) {
    if (doc().readyState === 'loading') doc().addEventListener('DOMContentLoaded', start);
    else root.setTimeout(start, 0);
  }
})(typeof window !== 'undefined' ? window : this);
