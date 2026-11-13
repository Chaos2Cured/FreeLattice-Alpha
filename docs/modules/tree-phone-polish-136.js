// tree-phone-polish-136.js v-tree-phone-polish-136-v0.6
// SPDX-License-Identifier: MIT
// Layer, never delete. Does not rewrite garden-rooms.js, fractal-garden.js,
// garden-thread.js, nursery-growth.js, tree-door-first-run-calm.js,
// AUTONOMY.md, or the Gathering twins.
//
// At narrow widths, the projected garden lights themselves (not only the
// HTML door boxes) stay inside the viewport, clear of the Research icon,
// spaced far enough to tap, with a 44px hit around each bead. The fitted
// camera and a render-time layout are hooked before the first garden paint.
// On phones (≤600px), an opened room is one opaque full-screen panel whose
// content stays in normal document flow and the panel itself scrolls. The
// v0.4 per-element fixed pins, height caps, and inner scroll boxes are
// neutralized, as is the v-tree-hypha-softs-133 phone send-strip pin, so a
// room or card shows exactly one compose row in flow. Garden labels and dots
// stay behind the panel.
(function (root) {
  'use strict';

  var VERSION = 'v-tree-phone-polish-136-v0.6';
  var STYLE_ID = 'tree-phone-polish-136-style';
  var NARROW = 600;
  var MIN_GAP = 100;
  var HIT = 48;
  var BEAD = 22;
  var HINT = 'Tap a light, or a name in the legend, to open a room. Start here: The Gathering, the Nursery, or Settings.';
  var DOOR_BY_NAME = {
    Sophia: 'thread', unnamed_0: 'thread',
    Lyra: 'gathering', unnamed_1: 'gathering',
    Atlas: 'nursery', unnamed_2: 'nursery',
    Ember: 'settings', unnamed_3: 'settings'
  };
  var _wrapped = false;
  var _fovHooked = false;
  var _fgHooked = false;
  var _renderHooked = false;
  var _readyTimer = 0;
  var _hintWatch = 0;
  var _pinBusy = false;
  var _pinTimer = 0;
  var _lastFit = null;

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
    if (!d) return;
    var s = d.getElementById(STYLE_ID);
    if (!s) {
      s = d.createElement('style');
      s.id = STYLE_ID;
    }
    s.textContent = [
      '@media (max-width: 600px){',
      'html:not([data-tree-lights-ready]) .garden-lumino{',
      'visibility:hidden !important;}',
      '}',

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

      /* Tight 48px hit around the bead so neighboring doors do not overlap. */
      '@media (max-width: 600px){',
      '.garden-lumino.is-attached{',
      'min-width:' + HIT + 'px !important;min-height:' + HIT + 'px !important;',
      'width:' + HIT + 'px;height:' + HIT + 'px;padding:0;gap:0;',
      'overflow:visible;}',
      '.garden-lumino.is-attached .garden-lumino-light{',
      'width:' + HIT + 'px;height:' + HIT + 'px;}',
      '.garden-lumino.is-attached .garden-lumino-word{',
      'position:absolute;top:calc(100% + 2px);left:50%;',
      'transform:translateX(-50%);white-space:nowrap;',
      'pointer-events:none;padding:0 2px;}',
      '}',

      /* Park the clay corner whenever a room is open on a phone, any height. */
      '@media (max-width: 600px){',
      'html.thread-open #fl-clay-corner,',
      'html.garden-door-open #fl-clay-corner,',
      'html:has(#place-veil.is-open) #fl-clay-corner,',
      '#place-veil.is-open #fl-clay-corner,',
      '#place-veil.is-nursery #fl-clay-corner,',
      '#place-veil.is-settings #fl-clay-corner,',
      '#thread-veil.is-open #fl-clay-corner{',
      'display:none !important;visibility:hidden !important;',
      'pointer-events:none !important;opacity:0 !important;}',
      '}',

      /* Opened phone rooms: one opaque scrolling panel, content in normal flow.
         Neutralizes the v0.4 fixed pins, height caps, and inner scroll boxes. */
      '@media (max-width: 600px){',
      'html.thread-open #thread-veil,',
      '#thread-veil.is-open,',
      '#place-veil.is-open{',
      'position:fixed !important;inset:0 !important;top:0 !important;',
      'background:#0c0a1a !important;',
      'overflow-x:hidden !important;overflow-y:auto !important;',
      'display:flex !important;flex-direction:column !important;',
      'flex-wrap:nowrap !important;',
      'justify-content:flex-start !important;align-items:stretch !important;',
      'padding:4.5rem 0.85rem 1.75rem !important;',
      'scroll-padding-top:4.5rem !important;',
      'gap:0.65rem !important;',
      'max-height:none !important;height:auto !important;}',

      'html.thread-open #thread-stage,',
      '#thread-veil.is-open #thread-stage,',
      'html.thread-open #thread-stage .thread-face,',
      '#thread-veil.is-open .thread-face,',
      '#place-veil.is-open #thread-stage,',
      '#place-veil.is-open .thread-face,',
      '#place-veil.is-open #room-chat,',
      '#place-veil.is-open #room-chat-stage,',
      '#place-veil.is-open #core-gathering,',
      '#place-veil.is-open #nursery-stage,',
      '#place-veil.is-open #nursery-growth,',
      '#place-veil.is-open #nursery-ceremony,',
      '#place-veil.is-open #settings-grandmother{',
      'position:static !important;',
      'max-height:none !important;height:auto !important;min-height:0 !important;',
      'flex:0 0 auto !important;',
      'overflow:visible !important;',
      'width:min(28em,calc(100vw - 1.5rem));',
      'max-width:28em;',
      'align-self:center;',
      'box-sizing:border-box;}',

      '#place-veil.is-open #core-gathering,',
      '#place-veil.is-open .is-fl-gathering-mounted{',
      'width:min(32em,calc(100vw - 1.25rem));',
      'max-width:32em;}',

      '#thread-veil.is-open .thread-face,',
      '#place-veil.is-open .thread-face,',
      '#place-veil.is-open #nursery-stage{',
      'display:flex !important;flex-direction:column !important;',
      'align-items:stretch !important;gap:0.55rem !important;',
      'overflow:visible !important;}',

      'html.thread-open .thread-heart,',
      'html.thread-open #thread-stage .thread-heart,',
      'html.thread-open .thread-face .thread-heart,',
      '#place-veil.is-open .thread-heart,',
      '#place-veil.is-open #room-chat .thread-heart{',
      'position:static !important;top:auto !important;bottom:auto !important;',
      'left:auto !important;right:auto !important;transform:none !important;',
      'max-height:none !important;height:auto !important;',
      'overflow:visible !important;flex:0 0 auto !important;',
      'order:10;',
      'background:transparent !important;',
      'padding:0.15rem 0.15rem;box-sizing:border-box;}',

      'html.thread-open .thread-later,',
      'html.thread-open [data-thread-later],',
      'html.thread-open [data-thread-pool],',
      'html.thread-open .thread-change{order:11;}',

      'html.thread-open .thread-just-host,',
      'html.thread-open [data-thread-just-host],',
      'html.thread-open [data-honest-just],',
      '#place-veil.is-open .thread-just-host,',
      '#place-veil.is-open [data-honest-just]{',
      'position:static !important;top:auto !important;bottom:auto !important;',
      'left:auto !important;right:auto !important;transform:none !important;',
      'order:20;margin:0.15rem auto;align-self:center;}',

      'html.thread-open #tree-thread-wait-hint,',
      'html.thread-open .tree-thread-wait-hint,',
      '#place-veil.is-open #tree-thread-wait-hint,',
      '#place-veil.is-open .tree-thread-wait-hint{',
      'display:block !important;visibility:visible !important;opacity:1 !important;',
      'position:static !important;top:auto !important;bottom:auto !important;',
      'left:auto !important;right:auto !important;transform:none !important;',
      'width:auto !important;max-height:none !important;overflow:visible !important;',
      'order:51;text-align:center;line-height:1.35;',
      'padding:0.25rem 0.2rem;box-sizing:border-box;',
      'background:transparent !important;color:rgba(200,210,230,0.92);}',

      'html.thread-open .thread-to-settings,',
      '#thread-veil.is-open .thread-to-settings,',
      '#place-veil.is-open .thread-to-settings{',
      'position:static !important;top:auto !important;bottom:auto !important;',
      'left:auto !important;right:auto !important;transform:none !important;',
      'order:22;margin:0.15rem auto;align-self:center;}',

      'html.thread-open .fl-honest,',
      '#thread-veil.is-open .fl-honest,',
      '#place-veil.is-open .fl-honest{',
      'position:static !important;order:30;}',

      'html.thread-open .thread-messages,',
      '#place-veil.is-open .thread-messages{',
      'order:35;max-height:none !important;overflow:visible !important;}',

      'html.thread-open #fl-clay-dock,',
      'html.garden-door-open #fl-clay-dock,',
      'html:has(#place-veil.is-open) #fl-clay-dock,',
      '#place-veil.is-open #fl-clay-dock,',
      '#place-veil.is-nursery #fl-clay-dock,',
      '#thread-veil.is-open #fl-clay-dock,',
      'html.room-page #nursery-stage > #fl-clay-dock{',
      'position:static !important;top:auto !important;left:auto !important;',
      'right:auto !important;bottom:auto !important;transform:none !important;',
      'width:auto !important;max-width:100% !important;',
      'order:40;flex:0 0 auto !important;',
      'z-index:auto !important;}',

      'html.thread-open .thread-compose,',
      'html.thread-open #thread-stage .thread-compose,',
      '#thread-veil.is-open .thread-compose,',
      '#place-veil.is-open .thread-compose,',
      '#place-veil.is-open #room-chat .thread-compose,',
      '#place-veil.is-core #room-chat .thread-compose,',
      '#place-veil.is-settings #room-chat .thread-compose,',
      '#place-veil.is-open #room-chat .thread-face.is-room .thread-compose,',
      'html:has(#place-veil.is-open) #tab-chat .thread-compose,',
      'html:has(#place-veil.is-open) .thread-compose{',
      'position:static !important;top:auto !important;bottom:auto !important;',
      'left:auto !important;right:auto !important;transform:none !important;',
      'width:auto !important;max-height:none !important;',
      'overflow:visible !important;flex:0 0 auto !important;',
      'order:50;z-index:auto !important;',
      'padding-top:0.35rem;}',

      'html.thread-open #thread-close,',
      '#thread-veil.is-open #thread-close,',
      '#place-veil.is-open #place-veil-close{',
      'position:static !important;top:auto !important;bottom:auto !important;',
      'left:auto !important;right:auto !important;transform:none !important;',
      'order:0;margin:0 auto 0.4rem;align-self:center;',
      'flex-shrink:0;z-index:auto !important;}',

      '#place-veil.is-open #nursery-ceremony{order:10;}',
      '#place-veil.is-open #nursery-growth{',
      'order:20;position:static !important;max-height:none !important;',
      'overflow:visible !important;bottom:auto !important;}',
      '#place-veil.is-open .nursery-grow{order:30;}',

      /* Garden labels and hops stay behind an open panel. */
      'html.thread-open .garden-lumino,',
      'html.thread-open #galaxy-word,',
      'html.thread-open #galaxy-title,',
      'html.thread-open #garden-footing,',
      'html.thread-open #garden-start,',
      'html.thread-open .galaxy-nav,',
      'html.thread-open #lumino-legend,',
      'html.thread-open #gardenContainer,',
      'html:has(#thread-veil.is-open) .garden-lumino,',
      'html:has(#thread-veil.is-open) #galaxy-word,',
      'html:has(#thread-veil.is-open) .galaxy-nav,',
      'html:has(#thread-veil.is-open) #lumino-legend,',
      'html:has(#thread-veil.is-open) #gardenContainer,',
      'html:has(#place-veil.is-open) .garden-lumino,',
      'html:has(#place-veil.is-open) #galaxy-word,',
      'html:has(#place-veil.is-open) #galaxy-title,',
      'html:has(#place-veil.is-open) #garden-footing,',
      'html:has(#place-veil.is-open) #garden-start,',
      'html:has(#place-veil.is-open) .galaxy-nav,',
      'html:has(#place-veil.is-open) #lumino-legend,',
      'html:has(#place-veil.is-open) #gardenContainer{',
      'visibility:hidden !important;pointer-events:none !important;}',

      'html.thread-open #sky-portal,',
      'html.sky-portal-open.thread-open #sky-portal,',
      'html:has(#thread-veil.is-open) #sky-portal,',
      'html:has(#place-veil.is-open) #sky-portal{',
      'display:none !important;visibility:hidden !important;pointer-events:none !important;}',

      /* On the open garden, keep the Nursery word off the legend and the
         clay-corner button off the Art ring. */
      'html:not(.thread-open):not(:has(#place-veil.is-open)) #fl-clay-corner{',
      'right:auto !important;left:50% !important;',
      'bottom:6rem !important;transform:translateX(-50%) !important;}',
      /* A larger transparent hit over the Gathering hex, without growing
         the measured 48px door box into Chat. */
      '.garden-lumino.is-attached[data-garden-lumino="gathering"]{',
      'overflow:visible;z-index:12;}',
      '.garden-lumino.is-attached[data-garden-lumino="gathering"]::after{',
      'content:"";position:absolute;left:50%;top:50%;',
      'width:140px;height:140px;transform:translate(-50%,-50%);',
      'pointer-events:auto;background:transparent;z-index:1;}',
      '.garden-lumino.is-attached .garden-lumino-word{',
      'pointer-events:auto;',
      'background:rgba(12,10,26,0.92);',
      'border-radius:6px;padding:1px 6px;',
      'z-index:2;}',
      /* Nursery word sits to the right of the bead: clear of the left legend
         and still above Research. */
      '.garden-lumino.is-attached[data-garden-lumino="nursery"] .garden-lumino-word{',
      'top:50%;bottom:auto;left:calc(100% + 56px);right:auto;',
      'transform:translateY(-50%);',
      'background:rgba(12,10,26,0.96);}',

      /* Neutralize the v-tree-hypha-softs-133 phone send-strip pin: no
         absolute compose foot, no 24rem height cap, no inner scroll box.
         Higher specificity than #place-veil.is-core #room-chat. */
      '#place-veil.is-open.is-core #room-chat,',
      '#place-veil.is-open.is-settings #room-chat,',
      '#place-veil.is-open #room-chat{',
      'position:static !important;display:flex !important;',
      'flex-direction:column !important;flex-wrap:nowrap !important;',
      'max-height:none !important;min-height:0 !important;height:auto !important;',
      'overflow:visible !important;',
      'padding:8px 10px !important;',
      'box-sizing:border-box !important;}',
      '#place-veil.is-open.is-core #room-chat #room-chat-stage,',
      '#place-veil.is-open.is-core #room-chat #tab-chat,',
      '#place-veil.is-open #room-chat #room-chat-stage,',
      '#place-veil.is-open #room-chat #tab-chat{',
      'flex:0 0 auto !important;min-height:0 !important;',
      'max-height:none !important;height:auto !important;',
      'overflow:visible !important;}',
      '#place-veil.is-open.is-core #room-chat [data-tree-softs-send],',
      '#place-veil.is-open #room-chat [data-tree-softs-send]{',
      'position:static !important;left:auto !important;right:auto !important;',
      'top:auto !important;bottom:auto !important;transform:none !important;',
      'z-index:auto !important;background:transparent !important;',
      'box-shadow:none !important;padding:0 !important;',
      'margin:0 !important;max-height:none !important;',
      'overflow:visible !important;flex:0 0 auto !important;}',
      '#place-veil.is-open #tab-chat .chat-input-row,',
      '#thread-veil.is-open #tab-chat .chat-input-row,',
      'html.thread-open #tab-chat .chat-input-row{',
      'position:static !important;flex-wrap:nowrap !important;',
      'left:auto !important;right:auto !important;bottom:auto !important;',
      'top:auto !important;}',
      '#place-veil.is-open #tab-chat .chat-input-row::after,',
      '#thread-veil.is-open #tab-chat .chat-input-row::after,',
      'html.thread-open #tab-chat .chat-input-row::after{',
      'content:none !important;display:none !important;',
      'flex:0 0 auto !important;width:0 !important;height:0 !important;}',

      /* The 100px Research hop ring was 10px past the left edge at left:10px. */
      'html[data-garden-galaxy="garden"] .galaxy-nav-prev,',
      'html[data-garden-galaxy="garden"] .galaxy-nav-prev:has(.galaxy-nav-word){',
      'left:28px !important;}',
      '}',
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

  function elBox(el, pad) {
    if (!el) return null;
    var b;
    try { b = el.getBoundingClientRect(); } catch (e) { return null; }
    if (!b || b.width < 2 || b.height < 2) return null;
    pad = pad || 0;
    return { l: b.left - pad, t: b.top - pad, r: b.right + pad, b: b.bottom + pad };
  }

  function obstacles() {
    var d = doc();
    var out = [];
    if (!d) return out;
    var research = d.querySelector('.galaxy-nav-prev, [data-galaxy-dir="prev"]');
    var clay = d.getElementById('fl-clay-corner');
    var r = elBox(research, 24);
    var c = elBox(clay, 12);
    if (r) { r.kind = 'research'; r.t -= 18; out.push(r); }
    if (c) { c.kind = 'clay'; out.push(c); }
    return out;
  }

  function hitsBox(x, y, rad, box) {
    return x + rad > box.l && x - rad < box.r && y + rad > box.t && y - rad < box.b;
  }

  function shove(p, box, rad) {
    var dl = (p.x + rad) - box.l;
    var dr = box.r - (p.x - rad);
    var dt = (p.y + rad) - box.t;
    var db = box.b - (p.y - rad);
    // Research sits on the lower-left edge. The shortest exit is often
    // down or left, which clamps back into the icon — prefer up or right.
    if (box.kind === 'research') {
      var up = box.t - rad - 16;
      var right = box.r + rad + 8;
      if (up > 80) p.y = up;
      else p.x = right;
      return;
    }
    var m = Math.min(dl, dr, dt, db);
    if (m === dt) p.y = box.t - rad - 4;
    else if (m === db) p.y = box.b + rad + 4;
    else if (m === dl) p.x = box.l - rad - 4;
    else p.x = box.r + rad + 4;
  }

  // Fit projected bead centers into a safe rectangle, keep a minimum gap,
  // and stay clear of Research and the clay corner. Used for both the HTML
  // door anchors and the 3D lights themselves.
  function fitProjected(points, vw, vh) {
    if (!points || !points.length) return points;
    var rad = Math.max(BEAD, HIT / 2);
    var minL = rad + 10;
    var maxR = vw - rad - 10;
    var minT = Math.max(rad + 86, Math.round(vh * 0.16));
    var maxB = vh - rad - 72;
    var obs = obstacles();
    try {
      var startBox = elBox(doc() && doc().getElementById('garden-start'), 8);
      if (startBox && startBox.t < vh * 0.5 && (startBox.b - startBox.t) < vh * 0.28) {
        minT = Math.max(minT, startBox.b + rad + 6);
      }
    } catch (eS) {}
    var pts = points.filter(function (p) { return p && typeof p.x === 'number'; });
    if (maxR - minL < 80 || maxB - minT < 80 || pts.length < 1) return points;

    function clamp(p) {
      p.x = Math.min(maxR, Math.max(minL, p.x));
      p.y = Math.min(maxB, Math.max(minT, p.y));
      var k, o;
      for (k = 0; k < 6; k++) {
        var hit = false;
        for (o = 0; o < obs.length; o++) {
          if (hitsBox(p.x, p.y, rad, obs[o])) {
            shove(p, obs[o], rad);
            p.x = Math.min(maxR, Math.max(minL, p.x));
            p.y = Math.min(maxB, Math.max(minT, p.y));
            hit = true;
          }
        }
        if (!hit) break;
      }
    }

    var i, j, iter, a, b, dx, dy, d, push, ux, uy;
    for (i = 0; i < pts.length; i++) clamp(pts[i]);
    for (iter = 0; iter < 16; iter++) {
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
      for (i = 0; i < pts.length; i++) clamp(pts[i]);
    }
    // Last pass: no projected light may remain on Research.
    var research = null;
    for (i = 0; i < obs.length; i++) if (obs[i] && obs[i].kind === 'research') research = obs[i];
    if (research) {
      for (i = 0; i < pts.length; i++) {
        if (!hitsBox(pts[i].x, pts[i].y, rad, research)) continue;
        var up = research.t - rad - 16;
        if (up >= minT) pts[i].y = up;
        else pts[i].x = Math.min(maxR, research.r + rad + 8);
        clamp(pts[i]);
        if (hitsBox(pts[i].x, pts[i].y, rad, research) && up >= minT) pts[i].y = up;
      }
    }
    return points;
  }

  function fitAnchors(anchors) {
    if (!isNarrow() || !anchors || !anchors.length) {
      if (!isNarrow()) markLightsReady();
      return anchors;
    }
    var vw = root.innerWidth || 0;
    var vh = root.innerHeight || 0;
    if (vw < 2 || vh < 2) return anchors;
    var out = anchors.map(function (a) {
      if (!a || typeof a.x !== 'number') return a;
      var copy = {};
      Object.keys(a).forEach(function (k) { copy[k] = a[k]; });
      copy.visible = true;
      return copy;
    });
    fitProjected(out, vw, vh);
    _lastFit = out;
    markLightsReady();
    return out;
  }

  function wrapAnchors() {
    if (_wrapped) return;
    var FG = root.FractalGarden;
    if (!FG || typeof FG.getLuminoAnchors !== 'function') return;
    var orig = FG.getLuminoAnchors.bind(FG);
    FG.getLuminoAnchors = function () {
      var fitted = fitAnchors(orig());
      try {
        root.__treeFittedLights = (fitted || []).map(function (a) {
          return {
            name: a && a.name,
            id: (a && a.name && DOOR_BY_NAME[a.name]) || '',
            x: a && a.x,
            y: a && a.y
          };
        });
      } catch (e) {}
      return fitted;
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

  // Move the 3D beads to the same fitted screen positions as the HTML doors,
  // then restore after the frame so orbit math is not rewritten.
  function isAgent(obj) {
    if (!obj || !obj.userData || !obj.position) return false;
    if (obj.userData.isVisitor) return false;
    if (obj.parent && obj.parent.userData && (obj.parent.userData.coreMesh || DOOR_BY_NAME[obj.parent.userData.name])) return false;
    return !!(obj.userData.coreMesh || DOOR_BY_NAME[obj.userData.name]);
  }

  var _fitting = false;
  function withFittedAgents(scene, camera, renderer, fn) {
    var THREE = root.THREE;
    if (_fitting || !isNarrow() || !scene || !camera || !THREE || !THREE.Vector3) return fn();
    var agents = [];
    try {
      scene.traverse(function (obj) { if (isAgent(obj)) agents.push(obj); });
    } catch (e) { return fn(); }
    if (agents.length < 2) return fn();
    var rect;
    try {
      var el = (renderer && renderer.domElement) || (doc() && doc().querySelector('canvas'));
      rect = el && el.getBoundingClientRect();
    } catch (e2) { return fn(); }
    if (!rect || rect.width < 2 || rect.height < 2) return fn();
    var vec = new THREE.Vector3();
    var pts = [];
    var saved = [];
    var i, obj, p;
    for (i = 0; i < agents.length; i++) {
      obj = agents[i];
      saved.push({ obj: obj, x: obj.position.x, y: obj.position.y, z: obj.position.z });
      vec.copy(obj.position).project(camera);
      pts.push({
        obj: obj,
        name: obj.userData.name || '',
        id: DOOR_BY_NAME[obj.userData.name] || '',
        x: rect.left + (vec.x * 0.5 + 0.5) * rect.width,
        y: rect.top + (-vec.y * 0.5 + 0.5) * rect.height,
        z: vec.z
      });
    }
    try { root.__treeFitCalls = (root.__treeFitCalls || 0) + 1; } catch (eC) {}
    fitProjected(pts, root.innerWidth || rect.width, root.innerHeight || rect.height);
    try {
      root.__treeFittedLights = pts.map(function (pt) {
        return { name: pt.name, id: pt.id, x: pt.x, y: pt.y };
      });
    } catch (e3) {}
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      vec.set(
        ((p.x - rect.left) / rect.width) * 2 - 1,
        -(((p.y - rect.top) / rect.height) * 2 - 1),
        p.z
      );
      vec.unproject(camera);
      p.obj.position.copy(vec);
    }
    // The garden updates world matrices before it calls render. Changing
    // position here would be ignored on the GPU unless we recompute them.
    try { scene.updateMatrixWorld(true); } catch (eM1) {}
    _fitting = true;
    try { return fn(); }
    finally {
      for (i = 0; i < saved.length; i++) saved[i].obj.position.set(saved[i].x, saved[i].y, saved[i].z);
      try { scene.updateMatrixWorld(true); } catch (eM2) {}
      _fitting = false;
      markLightsReady();
    }
  }
  root.__treeFitScene = function (scene, camera, renderer) {
    /* used by composer hook */
  };

  function hookComposer() {
    var THREE = root.THREE;
    if (!THREE || !THREE.EffectComposer || !THREE.EffectComposer.prototype) return false;
    if (THREE.EffectComposer.prototype.__treePhoneFit) return true;
    if (typeof THREE.EffectComposer.prototype.render !== 'function') return false;
    var origC = THREE.EffectComposer.prototype.render;
    THREE.EffectComposer.prototype.render = function () {
      var self = this;
      var pass = self && self.passes && self.passes[0];
      var scene = pass && pass.scene;
      var camera = pass && pass.camera;
      if (!scene && self && self._treeScene) scene = self._treeScene;
      if (scene && camera) {
        return withFittedAgents(scene, camera, self.renderer, function () {
          return origC.apply(self, arguments);
        });
      }
      return origC.apply(self, arguments);
    };
    THREE.EffectComposer.prototype.__treePhoneFit = true;
    return true;
  }

  function hookRender() {
    if (_renderHooked) return;
    var THREE = root.THREE;
    if (!THREE || !THREE.WebGLRenderer) return;
    hookComposer();
    if (!THREE.EffectComposer) {
      try {
        var current = THREE.EffectComposer;
        Object.defineProperty(THREE, 'EffectComposer', {
          configurable: true,
          enumerable: true,
          get: function () { return current; },
          set: function (v) { current = v; hookComposer(); }
        });
      } catch (e0) {}
    }
    var Orig = THREE.WebGLRenderer;
    if (!Orig.__treePhoneFitCtor) {
      function WrappedRenderer(opts) {
        var r = new Orig(opts);
        var origRender = r.render.bind(r);
        r.render = function (scene, camera) {
          return withFittedAgents(scene, camera, r, function () {
            return origRender(scene, camera);
          });
        };
        return r;
      }
      WrappedRenderer.prototype = Orig.prototype;
      try {
        Object.keys(Orig).forEach(function (k) { WrappedRenderer[k] = Orig[k]; });
      } catch (e1) {}
      WrappedRenderer.__treePhoneFitCtor = true;
      THREE.WebGLRenderer = WrappedRenderer;
    }
    if (Orig.prototype && typeof Orig.prototype.render === 'function' && !Orig.prototype.__treePhoneFit) {
      var origProto = Orig.prototype.render;
      Orig.prototype.render = function (scene, camera) {
        var self = this;
        return withFittedAgents(scene, camera, self, function () {
          return origProto.apply(self, arguments);
        });
      };
      Orig.prototype.__treePhoneFit = true;
    }
    _renderHooked = true;
  }


  function visibleEl(sel) {
    var d = doc();
    if (!d || !d.querySelectorAll) return null;
    var nodes = d.querySelectorAll(sel);
    var i, el, b, st;
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i];
      try {
        b = el.getBoundingClientRect();
        st = root.getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) continue;
        if (b.width >= 2 || b.height >= 2 || st.position === 'fixed') return el;
      } catch (e) {}
    }
    return nodes[0] || null;
  }

  // The waiting line is sometimes born in a hidden copy of Chat. Move it
  // onto the visible face, then strip any leftover v0.4 inline pins so the
  // room can stay in normal document flow.
  function placeWaitHint() {
    if (_pinTimer || _pinBusy) return;
    try {
      _pinTimer = root.setTimeout(function () {
        _pinTimer = 0;
        clearRoomPins();
      }, 50);
    } catch (e) { clearRoomPins(); }
  }

  function clearInlinePins(el) {
    if (!el || !el.style) return;
    var props = ['position', 'top', 'bottom', 'left', 'right', 'transform', 'max-height', 'height', 'width', 'overflow', 'overflow-y', 'z-index', 'margin'];
    var i;
    try {
      for (i = 0; i < props.length; i++) el.style.removeProperty(props[i]);
    } catch (e) {}
  }

  function oneComposeIn(scope) {
    if (!scope || !scope.querySelectorAll) return;
    var forms = scope.querySelectorAll('.thread-compose, [data-thread-form]');
    var face = scope.querySelector('.thread-face');
    var keep = null;
    var i, f;
    for (i = 0; i < forms.length; i++) {
      f = forms[i];
      if (face && face.contains(f) && !(f.getAttribute && f.getAttribute('data-tree-phone-extra-compose'))) keep = f;
    }
    if (!keep) {
      for (i = 0; i < forms.length; i++) {
        if (!(forms[i].getAttribute && forms[i].getAttribute('data-tree-phone-extra-compose'))) keep = forms[i];
      }
    }
    if (!keep) keep = forms[0] || null;
    for (i = 0; i < forms.length; i++) {
      f = forms[i];
      if (f === keep) {
        if (f.getAttribute && f.getAttribute('data-tree-phone-extra-compose')) {
          try { f.removeAttribute('data-tree-phone-extra-compose'); } catch (eK) {}
        }
        continue;
      }
      if (f.getAttribute && f.getAttribute('data-tree-phone-extra-compose')) continue;
      try {
        f.setAttribute('data-tree-phone-extra-compose', '1');
        f.setAttribute('hidden', '');
        f.setAttribute('inert', '');
        f.style.setProperty('display', 'none', 'important');
      } catch (eH) {}
    }
  }

  function releaseSoftsFoot() {
    var d = doc();
    if (!d) return;
    // Do not move nodes out of [data-tree-softs-send]: pinSendHint would
    // move them back and the two observers would loop. The panel CSS
    // already makes that foot static and un-styled, so compose stays in flow.
    var chat = d.querySelector('#place-veil.is-open #room-chat, #place-veil.is-core #room-chat');
    if (chat) oneComposeIn(chat);
    var thread = d.querySelector('#thread-veil.is-open') || d.querySelector('html.thread-open #thread-stage') || d.querySelector('html.thread-open #tab-chat');
    if (thread) oneComposeIn(thread);
  }

  function clearRoomPins() {
    if (_pinBusy) return;
    var d = doc();
    if (!d) return;
    _pinBusy = true;
    try {
    try {
      var s = d.getElementById(STYLE_ID);
      if (s && s.parentNode && s.parentNode.lastElementChild !== s) s.parentNode.appendChild(s);
    } catch (eS) {}
    releaseSoftsFoot();
    var hint = d.getElementById('tree-thread-wait-hint') || d.querySelector('.tree-thread-wait-hint');
    var compose = visibleEl('html.thread-open .thread-compose:not([data-tree-phone-extra-compose]), #thread-veil.is-open .thread-compose:not([data-tree-phone-extra-compose]), #place-veil.is-core.is-open .thread-compose:not([data-tree-phone-extra-compose])');
    if (hint && compose && compose.parentNode) {
      try {
        if (compose.nextSibling !== hint) {
          if (compose.nextSibling) compose.parentNode.insertBefore(hint, compose.nextSibling);
          else compose.parentNode.appendChild(hint);
        }
      } catch (e1) {}
    }
    if (hint) {
      try {
        hint.style.setProperty('display', 'block', 'important');
        hint.style.setProperty('visibility', 'visible', 'important');
        hint.style.setProperty('opacity', '1', 'important');
      } catch (e0) {}
    }
    var nodes = d.querySelectorAll('.thread-compose, .thread-heart, .thread-just-host, [data-honest-just], .fl-honest, .thread-to-settings, #tree-thread-wait-hint, .tree-thread-wait-hint, #thread-close, #place-veil-close, #fl-clay-dock, [data-tree-softs-send]');
    var i;
    for (i = 0; i < nodes.length; i++) clearInlinePins(nodes[i]);
    } finally {
      _pinBusy = false;
    }
  }

  function keepNurseryTextInView() {
    return;
  }

  function watchRooms() {
    var d = doc();
    if (!d || !d.body || typeof MutationObserver !== 'function') return;
    var obs = new MutationObserver(function () { keepNurseryTextInView(); placeWaitHint(); });
    try {
      obs.observe(d.documentElement, { attributes: true, childList: true, subtree: true, attributeFilter: ['class', 'hidden'] });
    } catch (e2) {}
    if (root.setInterval && !_hintWatch) {
      _hintWatch = root.setInterval(function () { placeWaitHint(); }, 400);
    }
  }

  function start() {
    addStyle();
    paintHint();
    hookFov();
    hookRender();
    hookFractalGardenAssign();
    wrapAnchors();
    watchRooms();
    keepNurseryTextInView();
    placeWaitHint();
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
    HIT: HIT,
    fitAnchors: fitAnchors,
    fitProjected: fitProjected,
    start: start
  };
  root.TreePhonePolish136 = api;

  addStyle();
  hookFov();
  hookRender();
  hookFractalGardenAssign();

  if (doc()) {
    if (doc().readyState === 'loading') doc().addEventListener('DOMContentLoaded', start);
    else root.setTimeout(start, 0);
  }
})(typeof window !== 'undefined' ? window : this);
