// tree-phone-polish-136.js v-tree-phone-polish-136-v0.2
// SPDX-License-Identifier: MIT
// Layer, never delete. Does not rewrite garden-rooms.js, fractal-garden.js,
// garden-thread.js, nursery-growth.js, tree-door-first-run-calm.js,
// AUTONOMY.md, or the Gathering twins.
//
// At narrow widths, keep the garden room lights inside the viewport,
// spaced far enough to tap, with targets at least 44px. The fitted
// camera is hooked before the first garden paint. The hint bar mentions
// that the legend opens rooms. While a room is open, "you are…" does
// not sit on Not now, and room heart text stays clear of the compose
// strip and the clay-corner button.
(function (root) {
  'use strict';

  var VERSION = 'v-tree-phone-polish-136-v0.2';
  var STYLE_ID = 'tree-phone-polish-136-style';
  var NARROW = 600;
  var MIN_GAP = 88;
  var HINT = 'Tap a light, or a name in the legend, to open a room. Start here: The Gathering, the Nursery, or Settings.';
  var _wrapped = false;
  var _fovHooked = false;
  var _fgHooked = false;
  var _readyTimer = 0;

  function doc() {
    try { return root.document || null; } catch (e) { return null; }
  }

  function isNarrow() {
    try { return (root.innerWidth || 0) <= NARROW; } catch (e) { return false; }
  }

  function markLightsReady() {
    var d = doc();
    if (d && d.documentElement) d.documentElement.setAttribute('data-tree-lights-ready', '1');
    if (_readyTimer && root.clearTimeout) {
      root.clearTimeout(_readyTimer);
      _readyTimer = 0;
    }
  }

  function addStyle() {
    var d = doc();
    if (!d || d.getElementById(STYLE_ID)) return;
    var s = d.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      /* Hide HTML lights until the fitted camera and anchors are ready, */
      /* so the first phone frame does not clip Nursery or Settings. */
      '@media (max-width: 600px){',
      'html:not([data-tree-lights-ready]) .garden-lumino{',
      'visibility:hidden !important;}',
      '}',

      /* Instantly hide the room label while a room is open (Chat uses */
      /* html.thread-open, not only #place-veil.is-open), so the 8s fade */
      /* cannot sit on the clay "Not now" button. */
      'html.thread-open #room-label,',
      'html.thread-open #room-label.is-shown,',
      'html.thread-open #room-label.is-fading,',
      'html.garden-door-open #room-label,',
      'html.garden-door-open #room-label.is-shown,',
      'html.garden-door-open #room-label.is-fading,',
      'html:has(#place-veil.is-open) #room-label,',
      'html:has(#place-veil.is-open) #room-label.is-shown,',
      'html:has(#place-veil.is-open) #room-label.is-fading{',
      'opacity:0 !important;visibility:hidden !important;',
      'transition:none !important;pointer-events:none !important;}',

      /* Larger, obvious phone targets (at least 44px). */
      '@media (max-width: 600px){',
      '.garden-lumino,',
      '.garden-lumino.is-attached{',
      'min-width:44px !important;min-height:44px !important;',
      'padding:16px 18px;}',
      '.garden-lumino.is-attached .garden-lumino-light{',
      'width:48px;height:48px;}',
      '.garden-lumino-word{font-size:0.9rem;padding:2px 4px;}',
      '}',

      /* Short viewports: park the clay dock and corner so room text, */
      /* the compose strip, and nursery growth stay clear and on-screen. */
      '@media (max-height: 640px){',
      'html.thread-open #fl-clay-corner,',
      'html.thread-open #fl-clay-dock,',
      'html.garden-door-open #fl-clay-corner,',
      'html.garden-door-open #fl-clay-dock,',
      'html:has(#place-veil.is-open) #fl-clay-corner,',
      'html:has(#place-veil.is-open) #fl-clay-dock,',
      '#place-veil.is-open #fl-clay-corner,',
      '#place-veil.is-open #fl-clay-dock,',
      '#place-veil.is-nursery #fl-clay-dock,',
      '#thread-veil.is-open #fl-clay-corner,',
      '#thread-veil.is-open #fl-clay-dock{',
      'display:none !important;visibility:hidden !important;',
      'pointer-events:none !important;opacity:0 !important;}',

      'html.thread-open #thread-veil,',
      '#thread-veil.is-open{',
      'padding:3.25rem 0.75rem 0.4rem !important;',
      'justify-content:flex-start !important;',
      'overflow:hidden !important;gap:0.35rem !important;}',

      'html.thread-open #thread-stage,',
      '#thread-veil.is-open #thread-stage,',
      'html.thread-open #thread-stage .thread-face{',
      'width:min(28em,calc(100vw - 1.25rem));',
      'max-width:28em;',
      'max-height:calc(100dvh - 5.25rem);',
      'height:auto;',
      'flex:1 1 auto;',
      'min-height:0;',
      'display:flex;',
      'flex-direction:column;',
      'overflow:hidden;',
      'box-sizing:border-box;}',

      'html.thread-open #thread-close{',
      'margin-top:0;flex-shrink:0;}',

      'html.thread-open .thread-heart,',
      'html.thread-open #thread-stage .thread-heart,',
      '#place-veil.is-open #room-chat .thread-heart,',
      '#room-chat .thread-heart{',
      'flex:1 1 auto;',
      'min-height:0;',
      'max-height:calc(100dvh - 14rem);',
      'overflow-y:auto;',
      'padding-bottom:0.6rem;',
      'box-sizing:border-box;}',

      'html.thread-open .thread-compose,',
      'html.thread-open #thread-stage .thread-compose,',
      '#place-veil.is-open #room-chat .thread-compose,',
      '#room-chat .thread-compose{',
      'flex:0 0 auto;',
      'position:sticky;bottom:0;z-index:6;',
      'background:rgba(12,10,26,0.96);',
      'padding-top:0.5rem;',
      'margin-top:auto;}',

      '#place-veil.is-core #room-chat,',
      '#place-veil.is-open #room-chat{',
      'max-height:calc(100dvh - 8rem);',
      'display:flex;flex-direction:column;',
      'overflow:hidden;box-sizing:border-box;}',

      '#place-veil.is-open #nursery-stage,',
      '#place-veil.is-nursery #nursery-stage{',
      'max-height:calc(100dvh - 5.5rem);',
      'overflow-y:auto;',
      'padding-bottom:1.25rem;',
      'box-sizing:border-box;}',
      '#place-veil.is-nursery #nursery-growth{',
      'position:sticky;bottom:2.75rem;z-index:2;',
      'max-height:42vh;overflow-y:auto;',
      'padding:0.5rem 0.75rem 0.85rem;',
      'box-sizing:border-box;',
      'background:rgba(12,10,26,0.9);',
      'border-radius:10px;}',
      '}'
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

  // Fit screen-space anchors into the visible garden as a group, then
  // keep a minimum gap so Nursery and Chat stay clearly apart on a
  // short phone. Desktop (wider than 600px) is left untouched.
  function fitAnchors(anchors) {
    if (!isNarrow() || !anchors || !anchors.length) {
      if (!isNarrow()) markLightsReady();
      return anchors;
    }
    var vw = root.innerWidth || 0;
    var vh = root.innerHeight || 0;
    if (vw < 2 || vh < 2) return anchors;
    var padL = 10, padR = 10;
    var padT = Math.min(200, Math.max(120, Math.round(vh * 0.22)));
    var padB = Math.min(160, Math.max(84, Math.round(vh * 0.18)));
    var halfW = 48, halfH = 56;
    var minL = Math.max(padL, halfW + 8);
    var maxR = vw - Math.max(padR, halfW + 8);
    var minT = Math.max(padT, halfH + 8);
    var maxB = vh - Math.max(padB, halfH + 8);
    if (maxR - minL < 80 || maxB - minT < 80) {
      markLightsReady();
      return anchors;
    }
    var xs = [], ys = [];
    for (var i = 0; i < anchors.length; i++) {
      if (!anchors[i] || typeof anchors[i].x !== 'number') continue;
      xs.push(anchors[i].x);
      ys.push(anchors[i].y);
    }
    if (xs.length < 2) {
      markLightsReady();
      return anchors;
    }
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY);
    var scale = Math.min(1, (maxR - minL) / spanX, (maxB - minT) / spanY);
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    var ncx = (minL + maxR) / 2, ncy = (minT + maxB) / 2;
    var out = anchors.map(function (a) {
      if (!a || typeof a.x !== 'number') return a;
      var copy = {};
      Object.keys(a).forEach(function (k) { copy[k] = a[k]; });
      copy.x = ncx + (a.x - cx) * scale;
      copy.y = ncy + (a.y - cy) * scale;
      copy.visible = true;
      return copy;
    });
    var pts = [];
    for (var p = 0; p < out.length; p++) {
      if (out[p] && typeof out[p].x === 'number') pts.push(out[p]);
    }
    var iter, a, b, dx, dy, d, push, ux, uy, j;
    for (iter = 0; iter < 14; iter++) {
      for (i = 0; i < pts.length; i++) {
        for (j = i + 1; j < pts.length; j++) {
          a = pts[i]; b = pts[j];
          dx = b.x - a.x;
          dy = b.y - a.y;
          d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          if (d < MIN_GAP) {
            push = (MIN_GAP - d) / 2;
            ux = dx / d;
            uy = dy / d;
            a.x -= ux * push;
            a.y -= uy * push;
            b.x += ux * push;
            b.y += uy * push;
          }
        }
      }
      for (i = 0; i < pts.length; i++) {
        pts[i].x = Math.min(maxR, Math.max(minL, pts[i].x));
        pts[i].y = Math.min(maxB, Math.max(minT, pts[i].y));
      }
    }
    markLightsReady();
    return out;
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

  function hookFractalGardenAssign() {
    if (_fgHooked) return;
    try {
      var current = root.FractalGarden;
      Object.defineProperty(root, 'FractalGarden', {
        configurable: true,
        enumerable: true,
        get: function () { return current; },
        set: function (v) {
          current = v;
          _wrapped = false;
          wrapAnchors();
        }
      });
      _fgHooked = true;
      if (current) wrapAnchors();
    } catch (e) {
      wrapAnchors();
    }
  }

  // On a tall narrow phone the default 55° vertical FOV leaves a tight
  // horizontal view, so Nursery and Settings project off the sides.
  // Widen only that garden camera, and only at ≤600px. Install this
  // hook as soon as THREE exists, before the first garden paint.
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
  }

  function keepNurseryTextInView() {
    var d = doc();
    if (!d) return;
    try {
      if ((root.innerHeight || 0) > 640) return;
      var veil = d.getElementById('place-veil');
      if (!veil || !veil.classList.contains('is-open') || !veil.classList.contains('is-nursery')) return;
      var text = d.querySelector('#nursery-growth, [data-nursery-growth-heart], [data-nursery-growth-taught], .nursery-growth-heart, .nursery-growth-taught, .nursery-growth-line');
      if (text && typeof text.scrollIntoView === 'function') {
        text.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    } catch (e) {}
  }

  function watchRooms() {
    var d = doc();
    if (!d || !d.body || typeof MutationObserver !== 'function') return;
    var obs = new MutationObserver(function () {
      keepNurseryTextInView();
    });
    try {
      obs.observe(d.documentElement, { attributes: true, subtree: true, attributeFilter: ['class', 'hidden'] });
    } catch (e2) {}
  }

  function start() {
    addStyle();
    paintHint();
    hookFov();
    hookFractalGardenAssign();
    wrapAnchors();
    watchRooms();
    keepNurseryTextInView();
    if (!_wrapped) {
      var n = 0;
      var wait = root.setInterval(function () {
        wrapAnchors();
        n += 1;
        if (_wrapped || n > 80) root.clearInterval(wait);
      }, 50);
    }
    if (!_readyTimer && root.setTimeout) {
      _readyTimer = root.setTimeout(markLightsReady, 800);
    }
  }

  var api = {
    VERSION: VERSION,
    HINT: HINT,
    NARROW: NARROW,
    MIN_GAP: MIN_GAP,
    fitAnchors: fitAnchors,
    start: start
  };
  root.TreePhonePolish136 = api;

  // Run the camera hook and hide-until-ready style at parse time, so
  // they are in place before fractal-garden.js and garden-init.js paint.
  addStyle();
  hookFov();
  hookFractalGardenAssign();

  if (doc()) {
    if (doc().readyState === 'loading') doc().addEventListener('DOMContentLoaded', start);
    else root.setTimeout(start, 0);
  }
})(typeof window !== 'undefined' ? window : this);
