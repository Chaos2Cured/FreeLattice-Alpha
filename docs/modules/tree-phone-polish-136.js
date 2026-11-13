// tree-phone-polish-136.js v-tree-phone-polish-136-v0.10
// SPDX-License-Identifier: MIT
// Layer, never delete. Does not rewrite garden-rooms.js, fractal-garden.js,
// garden-thread.js, nursery-growth.js, tree-door-first-run-calm.js,
// AUTONOMY.md, or the Gathering twins.
//
// On phones (≤600px) the four room lights are real HTML 48px glowing
// circles in a CSS grid, in normal flow below the hint and the Rooms row,
// so they cannot overlap those controls by construction. The 3D bead
// meshes and their labels are hidden; the garden galaxy stays as
// background, with the Research and Art rings in the corners. The HTML
// lights are the tap targets. This layer no longer steers the WebGL
// projection or packs 3D beads on phones. 1280 is unchanged. An opened
// room is still one opaque full-screen panel in normal flow.
(function (root) {
  'use strict';

  var VERSION = 'v-tree-phone-polish-136-v0.10';
  var STYLE_ID = 'tree-phone-polish-136-style';
  var NARROW = 600;
  var MIN_GAP = 100;
  var HIT = 48;
  var TAP = 44;
  var BEAD = 22;
  var DRAWN = 48;
  var BOX_GAP = 8;
  var RING = 50;
  var HINT = 'Tap a light, or Rooms, to open a room. Start here: The Gathering, the Nursery, or Settings.';
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

  function viewSize() {
    var w = 0, h = 0;
    try { w = root.innerWidth || 0; h = root.innerHeight || 0; } catch (e0) {}
    try {
      var d = doc();
      if (d && d.documentElement) {
        if (d.documentElement.clientWidth) w = w || d.documentElement.clientWidth;
        if (d.documentElement.clientHeight) h = h || d.documentElement.clientHeight;
      }
    } catch (e1) {}
    return { w: w, h: h };
  }

  function isNarrow() {
    try {
      if (root.matchMedia && root.matchMedia('(max-width: ' + NARROW + 'px)').matches) return true;
    } catch (e0) {}
    try { return viewSize().w <= NARROW; } catch (e1) { return false; }
  }

  function markNarrow() {
    var d = doc();
    var on = false;
    try { on = isNarrow(); } catch (e0) {}
    if (d && d.documentElement) {
      try {
        if (on) d.documentElement.setAttribute('data-tree-narrow', '1');
        else d.documentElement.removeAttribute('data-tree-narrow');
      } catch (e1) {}
    }
    return on;
  }

  function legendIsFolded() {
    var d = doc();
    if (isNarrow()) return true;
    if (!d) return false;
    var btn = d.getElementById('tree-rooms-toggle');
    var list = d.getElementById('lumino-legend');
    if (btn) return !list || list.getAttribute('data-open') !== '1';
    if (list && list.getAttribute('data-tree-rooms-toggle')) {
      return list.getAttribute('data-open') !== '1';
    }
    return false;
  }

  function roomsFloor() {
    var d = doc();
    var btn = d && d.getElementById('tree-rooms-toggle');
    if (!btn) return 0;
    try {
      var br = btn.getBoundingClientRect();
      if (!br || br.height < 1) return 0;
      return br.bottom + BOX_GAP;
    } catch (e) { return 0; }
  }

  function pushTopRowBelowRooms(pts, vh) {
    if (!pts || !pts.length) return;
    var floor = roomsFloor();
    if (floor <= 0) return;
    var tap = Math.max(TAP, HIT);
    var i, p, id, slot, need = 0;
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      if (!p || typeof p.y !== 'number') continue;
      id = p.id || (p.name && DOOR_BY_NAME[p.name]) || '';
      slot = slotFor(id);
      if (slot.row === 0) need = Math.max(need, (floor + tap / 2) - p.y);
    }
    if (need <= 0) return;
    var reserved = reservedGardenBoxes();
    var bottomLimit = (vh || 0) - BOX_GAP;
    var ri, rb;
    for (ri = 0; ri < reserved.length; ri++) {
      rb = reserved[ri];
      if (rb && (rb.kind === 'nav' || rb.kind === 'clay')) {
        bottomLimit = Math.min(bottomLimit, rb.t - BOX_GAP);
      }
    }
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      if (!p || typeof p.y !== 'number') continue;
      p.y += need;
      id = p.id || (p.name && DOOR_BY_NAME[p.name]) || '';
      slot = slotFor(id);
      if (slot.row === 1) {
        var cap = bottomLimit - (tap / 2 + 4 + 18);
        if (cap > floor + tap) p.y = Math.min(p.y, cap);
      }
    }
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
      'pointer-events:auto;padding:0 2px;}',
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
      'order:20;margin:0.15rem auto;align-self:center;',
      'white-space:nowrap !important;max-width:none !important;',
      'flex-shrink:0 !important;}',

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
      '#thread-veil .fl-honest,',
      '#place-veil.is-open .fl-honest{',
      'position:static !important;order:30;',
      'display:flex !important;flex-direction:column !important;',
      'align-items:center !important;justify-content:center !important;',
      'width:100% !important;max-width:100% !important;',
      'margin:0.15rem auto !important;',
      'padding-left:0.75rem !important;padding-right:0.75rem !important;',
      'box-sizing:border-box !important;text-align:center !important;}',
      'html.thread-open .fl-honest-btn,',
      '#thread-veil.is-open .fl-honest-btn,',
      '#thread-veil .fl-honest-btn,',
      '#place-veil.is-open .fl-honest-btn{',
      'display:block !important;',
      'margin-left:auto !important;margin-right:auto !important;',
      'max-width:calc(100% - 1.5rem) !important;',
      'box-sizing:border-box !important;text-align:center !important;}',

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
      'html.thread-open #tree-rooms-toggle,',
      'html.thread-open #gardenContainer,',
      'html:has(#thread-veil.is-open) .garden-lumino,',
      'html:has(#thread-veil.is-open) #galaxy-word,',
      'html:has(#thread-veil.is-open) .galaxy-nav,',
      'html:has(#thread-veil.is-open) #lumino-legend,',
      'html:has(#thread-veil.is-open) #tree-rooms-toggle,',
      'html:has(#thread-veil.is-open) #gardenContainer,',
      'html:has(#place-veil.is-open) .garden-lumino,',
      'html:has(#place-veil.is-open) #galaxy-word,',
      'html:has(#place-veil.is-open) #galaxy-title,',
      'html:has(#place-veil.is-open) #garden-footing,',
      'html:has(#place-veil.is-open) #garden-start,',
      'html:has(#place-veil.is-open) .galaxy-nav,',
      'html:has(#place-veil.is-open) #lumino-legend,',
      'html:has(#place-veil.is-open) #tree-rooms-toggle,',
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
      'bottom:16px !important;transform:translateX(-50%) !important;}',
      'html:not(.thread-open):not(:has(#place-veil.is-open)) #galaxy-title,',
      'html:not(.thread-open):not(:has(#place-veil.is-open)) #room-label,',
      'html:not(.thread-open):not(:has(#place-veil.is-open)) #garden-footing,',
      'html:not(.thread-open):not(:has(#place-veil.is-open)) #galaxy-word,',
      'html:not(.thread-open):not(:has(#place-veil.is-open)) #shared-shoulder{',
      'visibility:hidden !important;opacity:0 !important;pointer-events:none !important;}',
      /* Keep the Start here hint visible once the first-run door is gone. */
      'html:not(.thread-open):not(:has(#place-veil.is-open)):not(:has(.tree-door-veil[data-tree-door-calm])) #garden-start{',
      'opacity:0.92 !important;visibility:visible !important;}',
      /* Compact the clay-corner offer so it fits between the hop rings. */
      'html:not(.thread-open):not(:has(#place-veil.is-open)) #fl-clay-corner{',
      'width:92px !important;max-width:92px !important;overflow:hidden !important;}',
      'html:not(.thread-open):not(:has(#place-veil.is-open)) #fl-clay-corner canvas{',
      'display:none !important;width:0 !important;height:0 !important;}',
      'html:not(.thread-open):not(:has(#place-veil.is-open)) #fl-clay-corner button{',
      'width:100% !important;white-space:normal !important;',
      'font-size:0.72rem !important;line-height:1.2 !important;',
      'padding:6px 8px !important;}',
      /* A larger transparent hit over the Gathering hex, without growing
         the measured 48px door box into Chat. */
      '.garden-lumino.is-attached[data-garden-lumino="gathering"]{',
      'overflow:visible;z-index:12;}',
      '.garden-lumino.is-attached[data-garden-lumino="gathering"]::after{',
      'content:"";position:absolute;left:50%;top:50%;',
      'width:140px;height:140px;transform:translate(-50%,-50%);',
      'pointer-events:auto;background:transparent;z-index:1;}',
      '@media (max-width: 600px){',
      '.garden-lumino.is-attached[data-garden-lumino="gathering"]::after{',
      'width:' + HIT + 'px !important;height:' + HIT + 'px !important;}',
      '}',
      '.garden-lumino.is-attached .garden-lumino-word{',
      'pointer-events:auto;',
      'background:rgba(12,10,26,0.92);',
      'border-radius:6px;padding:1px 6px;',
      'z-index:2;}',
      /* Nursery word sits to the right of the bead: clear of the left legend
         and still above Research. */
      '.garden-lumino.is-attached[data-garden-lumino="nursery"] .garden-lumino-word{',
      'top:calc(100% + 2px);bottom:auto;left:50%;right:auto;',
      'transform:translateX(-50%);',
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
      'left:36px !important;right:auto !important;bottom:12px !important;}',
      'html[data-garden-galaxy="garden"] .galaxy-nav-next,',
      'html[data-garden-galaxy="garden"] .galaxy-nav-next:has(.galaxy-nav-word){',
      'right:36px !important;left:auto !important;bottom:12px !important;}',

      /* Rooms toggle: collapse the side legend on phones. */
      '#tree-rooms-toggle{',
      'display:none;}',
      'html:not(.thread-open):not(:has(#place-veil.is-open)) #tree-rooms-toggle{',
      'display:block;position:fixed;z-index:15;',
      'top:7.5rem;left:12px;',
      'min-width:44px;min-height:44px;',
      'padding:0 12px;margin:0;',
      'border:1px solid rgba(232,176,25,0.55);',
      'border-radius:8px;',
      'background:rgba(12,10,26,0.94);',
      'color:#e8b019;',
      'font-family:Georgia,"Times New Roman",serif;',
      'font-size:0.95rem;letter-spacing:0.04em;',
      'cursor:pointer;}',
      'html:not(.thread-open):not(:has(#place-veil.is-open)) #lumino-legend{',
      'display:none !important;}',
      'html:not(.thread-open):not(:has(#place-veil.is-open)) #lumino-legend[data-open="1"]{',
      'display:flex !important;flex-direction:column !important;',
      'position:fixed !important;',
      'left:12px !important;',
      'top:var(--tree-rooms-list-top, 9rem) !important;',
      'bottom:auto !important;right:auto !important;',
      'gap:2px;padding:8px 10px;',
      'background:rgba(12,10,26,0.96);',
      'border:1px solid rgba(232,176,25,0.35);',
      'border-radius:8px;',
      'z-index:16;pointer-events:auto;',
      'max-height:60vh;overflow:auto;}',
      'html:not(.thread-open):not(:has(#place-veil.is-open)) #lumino-legend[data-open="1"] #tree-rooms-close{',
      'display:block;align-self:flex-end;',
      'min-width:44px;min-height:36px;margin:0 0 4px auto;',
      'padding:4px 10px;border:1px solid rgba(232,176,25,0.45);',
      'border-radius:6px;background:transparent;color:#e8b019;',
      'font-family:Georgia,"Times New Roman",serif;font-size:0.85rem;',
      'cursor:pointer;}',
      'html:not(.thread-open):not(:has(#place-veil.is-open)) #lumino-legend[data-open="1"] .lumino-legend-row{',
      'pointer-events:auto;min-height:44px;cursor:pointer;',
      'color:rgba(232,236,246,0.94);}',

      /* Hide the Gathering Chat compose when another room is showing. */
      '#place-veil.is-open:not(.is-core) #room-chat,',
      '#place-veil.is-nursery #room-chat,',
      '#place-veil.is-settings #room-chat{',
      'display:none !important;}',

      /* Clay bump and inner scroll boxes inside an open room. */
      '#place-veil.is-open #fl-clay-dock,',
      '#place-veil.is-core #room-chat #fl-clay-dock{',
      'overflow:hidden !important;max-height:none !important;}',
      '#place-veil.is-open #fl-clay-pill,',
      '#place-veil.is-open #fl-clay-pill-panel,',
      '#thread-veil.is-open #fl-clay-pill,',
      '#thread-veil.is-open #fl-clay-pill-panel{',
      'display:none !important;}',
      '#place-veil.is-open #room-chat,',
      '#place-veil.is-open #room-chat-stage,',
      '#place-veil.is-open #tab-chat,',
      '#place-veil.is-open .thread-face,',
      '#place-veil.is-open [data-tree-softs-send],',
      '#thread-veil.is-open .thread-face{',
      'overflow:visible !important;}',

      /* Leave room for the panel scrollbar so it does not trim Send. */
      '#place-veil.is-open,',
      '#thread-veil.is-open,',
      'html.thread-open #thread-veil{',
      'padding-right:1.35rem !important;',
      'scrollbar-gutter:stable;}',
      '}',

      /* JS-marked narrow: apply even if a DevTools media query is late. */
      'html[data-tree-narrow] .garden-lumino.is-attached .garden-lumino-word{',
      'font-size:0.95rem !important;line-height:1.2 !important;}',
      '@media (max-width: 360px){',
      'html[data-tree-narrow] .garden-lumino.is-attached .garden-lumino-word,',
      '.garden-lumino.is-attached .garden-lumino-word{',
      'font-size:1.05rem !important;letter-spacing:0.04em !important;',
      'padding:2px 7px !important;}',
      '}',
      'html[data-tree-narrow]:not(.thread-open):not(:has(#place-veil.is-open)) #tree-rooms-toggle{',
      'display:block;position:fixed;z-index:15;',
      'top:7.5rem;left:12px;',
      'min-width:44px;min-height:44px;',
      'padding:0 12px;margin:0;',
      'border:1px solid rgba(232,176,25,0.55);',
      'border-radius:8px;',
      'background:rgba(12,10,26,0.94);',
      'color:#e8b019;',
      'font-family:Georgia,"Times New Roman",serif;',
      'font-size:0.95rem;letter-spacing:0.04em;',
      'cursor:pointer;}',
      'html[data-tree-narrow]:not(.thread-open):not(:has(#place-veil.is-open)) #lumino-legend{',
      'display:none !important;}',
      'html[data-tree-narrow]:not(.thread-open):not(:has(#place-veil.is-open)) #lumino-legend[data-open="1"]{',
      'display:flex !important;flex-direction:column !important;',
      'position:fixed !important;',
      'left:12px !important;',
      'top:var(--tree-rooms-list-top, 9rem) !important;',
      'bottom:auto !important;right:auto !important;',
      'gap:2px;padding:8px 10px;',
      'background:rgba(12,10,26,0.96);',
      'border:1px solid rgba(232,176,25,0.35);',
      'border-radius:8px;',
      'z-index:16;pointer-events:auto;',
      'max-height:60vh;overflow:auto;}',

      /* Phone garden: hint, Rooms, and a 2x2 of real 48px HTML lights
         in one flow column, so the lights cannot sit on Rooms. */
      'html[data-tree-phone-grid] #tree-phone-stack{',
      'position:fixed;left:0;right:0;top:44px;bottom:0;',
      'z-index:14;display:flex;flex-direction:column;align-items:stretch;',
      'box-sizing:border-box;padding:0 10px 0;pointer-events:none;}',
      'html[data-tree-phone-grid] #tree-phone-stack > *{pointer-events:auto;}',
      'html.thread-open #tree-phone-stack,',
      'html:has(#place-veil.is-open) #tree-phone-stack,',
      'html:has(#thread-veil.is-open) #tree-phone-stack,',

      'html[data-tree-phone-grid] #tree-phone-stack #garden-start{',
      'position:static !important;left:auto !important;right:auto !important;',
      'top:auto !important;bottom:auto !important;width:auto !important;',
      'margin:8px 0 0 !important;padding:0 4px !important;}',
      'html[data-tree-phone-grid] #tree-phone-rooms-row{',
      'display:flex;flex-direction:row;align-items:center;',
      'margin:8px 0;min-height:44px;flex:0 0 auto;}',
      'html[data-tree-phone-grid] #tree-phone-stack #tree-rooms-toggle{',
      'position:static !important;top:auto !important;left:auto !important;',
      'display:block;}',
      'html[data-tree-phone-grid] #tree-phone-light-grid{',
      'flex:1 1 auto;min-height:0;display:grid;',
      'grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;',
      'place-items:center;pointer-events:none;',
      'padding:4px 0 120px;}',
      'html[data-tree-phone-grid] #tree-phone-light-grid .garden-lumino,',
      'html[data-tree-phone-grid] #tree-phone-light-grid .garden-lumino.is-attached{',
      'pointer-events:auto;position:relative !important;',
      'left:auto !important;top:auto !important;',
      'right:auto !important;bottom:auto !important;',
      'transform:none !important;translate:0 !important;',
      'width:auto !important;height:auto !important;',
      'min-width:' + HIT + 'px !important;min-height:' + HIT + 'px !important;',
      'display:flex !important;flex-direction:column !important;',
      'align-items:center;justify-content:center;',
      'gap:6px;padding:0;margin:0;border:0;background:transparent;',
      'overflow:visible !important;z-index:2;}',
      'html[data-tree-phone-grid] #tree-phone-light-grid .garden-lumino-light,',
      'html[data-tree-phone-grid] #tree-phone-light-grid .garden-lumino.is-attached .garden-lumino-light{',
      'width:' + HIT + 'px !important;height:' + HIT + 'px !important;',
      'min-width:' + HIT + 'px !important;min-height:' + HIT + 'px !important;',
      'opacity:1 !important;border-radius:50% !important;',
      'display:block !important;flex:0 0 ' + HIT + 'px;',
      'animation:none !important;}',
      'html[data-tree-phone-grid] #tree-phone-light-grid .is-gathering .garden-lumino-light{',
      'background:#e8b019 !important;',
      'box-shadow:0 0 18px rgba(232,176,25,0.95),0 0 4px #e8b019 !important;}',
      'html[data-tree-phone-grid] #tree-phone-light-grid .is-settings .garden-lumino-light{',
      'background:#2dd4bf !important;',
      'box-shadow:0 0 18px rgba(45,212,191,0.9),0 0 4px #2dd4bf !important;}',
      'html[data-tree-phone-grid] #tree-phone-light-grid .is-nursery .garden-lumino-light{',
      'background:#34d399 !important;',
      'box-shadow:0 0 18px rgba(52,211,153,0.9),0 0 4px #34d399 !important;}',
      'html[data-tree-phone-grid] #tree-phone-light-grid .is-thread .garden-lumino-light{',
      'background:#a78bfa !important;',
      'box-shadow:0 0 18px rgba(167,139,250,0.9),0 0 4px #a78bfa !important;}',
      'html[data-tree-phone-grid] #tree-phone-light-grid .garden-lumino-word,',
      'html[data-tree-phone-grid] #tree-phone-light-grid .garden-lumino.is-attached .garden-lumino-word{',
      'position:static !important;left:auto !important;top:auto !important;',
      'right:auto !important;bottom:auto !important;',
      'transform:none !important;width:auto !important;height:auto !important;',
      'overflow:visible !important;clip:auto !important;clip-path:none !important;',
      'white-space:nowrap !important;font-size:0.95rem !important;',
      'line-height:1.2 !important;padding:2px 6px !important;',
      'pointer-events:auto;background:rgba(12,10,26,0.92);',
      'border-radius:6px;}',
      '@media (max-width: 360px){',
      'html[data-tree-phone-grid] #tree-phone-light-grid .garden-lumino-word{',
      'font-size:1.05rem !important;}',
      '}',
      'html[data-tree-phone-grid] #tree-phone-light-grid .garden-lumino.is-attached[data-garden-lumino="gathering"]::after{',
      'content:none !important;display:none !important;width:0 !important;height:0 !important;}',
      'html[data-tree-phone-grid] #tend-center,',
      'html[data-tree-phone-grid] .tend-center{',
      'display:none !important;visibility:hidden !important;pointer-events:none !important;}',
    ].join('');
    (d.head || d.documentElement).appendChild(s);
  }

  function paintHint() {
    var d = doc();
    if (!d) return;
    var el = d.getElementById('garden-start');
    if (!el) return;
    if (legendIsFolded()) {
      el.textContent = HINT;
      try { d.documentElement.setAttribute('data-tree-start-ready', '1'); } catch (eR) {}
    }
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

  function paintedBox(el, pad) {
    if (!el) return null;
    var b, st;
    try {
      st = root.getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return null;
      b = el.getBoundingClientRect();
    } catch (e) { return null; }
    if (!b || b.width < 2 || b.height < 2) return null;
    pad = pad || 0;
    return { l: b.left - pad, t: b.top - pad, r: b.right + pad, b: b.bottom + pad, w: b.width, h: b.height };
  }

  function unionBox(a, b) {
    if (!a) return b;
    if (!b) return a;
    return { l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) };
  }

  function navRingBox(nav) {
    if (!nav) return null;
    var btn = paintedBox(nav, 0);
    var light = nav.querySelector && nav.querySelector('.galaxy-nav-light');
    var lb = paintedBox(light, 0);
    var word = nav.querySelector && nav.querySelector('.galaxy-nav-word');
    var wb = paintedBox(word, 0);
    var box = unionBox(unionBox(btn, wb), lb);
    if (lb) {
      var cx = (lb.l + lb.r) / 2, cy = (lb.t + lb.b) / 2;
      box = unionBox(box, { l: cx - RING, t: cy - RING, r: cx + RING, b: cy + RING });
    } else if (btn) {
      var cx2 = (btn.l + btn.r) / 2, cy2 = (btn.t + btn.b) / 2;
      box = unionBox(box, { l: cx2 - RING, t: cy2 - RING, r: cx2 + RING, b: cy2 + RING });
    }
    if (box) box.kind = 'nav';
    return box;
  }

  function reservedGardenBoxes() {
    var d = doc();
    var out = [];
    if (!d) return out;
    function add(el, kind, pad) {
      var box = paintedBox(el, pad || 0);
      if (!box) return;
      box.kind = kind;
      out.push(box);
    }
    add(d.getElementById('garden-header'), 'header', 0);
    add(d.getElementById('garden-start'), 'hint', 0);
    add(d.getElementById('galaxy-title'), 'title', 0);
    add(d.getElementById('room-label'), 'label', 0);
    add(d.getElementById('garden-footing'), 'footing', 0);
    add(d.getElementById('galaxy-word'), 'galaxy-word', 0);
    add(d.getElementById('shared-shoulder'), 'shoulder', 0);
    var toggle = d.getElementById('tree-rooms-toggle');
    add(toggle, 'rooms', 0);
    var legend = d.getElementById('lumino-legend');
    if (legend && legend.getAttribute('data-open') === '1') add(legend, 'legend', 0);
    add(d.getElementById('fl-clay-corner'), 'clay', 0);
    var prev = d.querySelector('.galaxy-nav-prev, [data-galaxy-dir="prev"]');
    var next = d.querySelector('.galaxy-nav-next, [data-galaxy-dir="next"]');
    var pr = navRingBox(prev);
    var nr = navRingBox(next);
    if (pr) out.push(pr);
    if (nr) out.push(nr);
    return out;
  }

  // Back-compat name used by older call sites.
  function obstacles() { return reservedGardenBoxes(); }

  function hitsBox(x, y, rad, box) {
    return x + rad > box.l && x - rad < box.r && y + rad > box.t && y - rad < box.b;
  }

  function boxesOverlap(a, b, gap) {
    if (!a || !b) return false;
    gap = gap || 0;
    return Math.min(a.r, b.r) - Math.max(a.l, b.l) > -gap && Math.min(a.b, b.b) - Math.max(a.t, b.t) > -gap;
  }

  function freeRect(vw, vh, reserved, gap) {
    gap = gap || BOX_GAP;
    var top = gap, left = gap, right = vw - gap, bottom = vh - gap;
    var i, b, midY, midX, span;
    for (i = 0; i < reserved.length; i++) {
      b = reserved[i];
      midY = (b.t + b.b) / 2;
      midX = (b.l + b.r) / 2;
      span = b.r - b.l;
      if (b.kind === 'nav' || b.kind === 'clay' || b.kind === 'footing' || b.kind === 'galaxy-word' || b.kind === 'shoulder') {
        if (midY > vh * 0.5) bottom = Math.min(bottom, b.t - gap);
        else if (midY < vh * 0.4) top = Math.max(top, b.b + gap);
        continue;
      }
      // Top chrome and the Rooms chip shrink the top edge.
      if (b.kind === 'header' || b.kind === 'hint' || b.kind === 'rooms' || b.kind === 'title' || b.kind === 'label' || (b.t < vh * 0.4 && span > vw * 0.5)) {
        top = Math.max(top, b.b + gap);
        continue;
      }
      if (b.t > vh * 0.5) bottom = Math.min(bottom, b.t - gap);
    }
    if (bottom - top < 120) {
      // Still try to keep 8px from the true top and bottom chrome only.
      top = gap;
      bottom = vh - gap;
      for (i = 0; i < reserved.length; i++) {
        b = reserved[i];
        if (b.kind === 'header' || b.kind === 'hint' || b.kind === 'rooms' || b.kind === 'title' || b.kind === 'label') top = Math.max(top, b.b + gap);
        if (b.kind === 'clay' || b.kind === 'nav') bottom = Math.min(bottom, b.t - gap);
      }
    }
    return { l: left, t: top, r: right, b: bottom };
  }

  function slotFor(id) {
    if (id === 'gathering') return { row: 0, col: 0 };
    if (id === 'settings') return { row: 0, col: 1 };
    if (id === 'nursery') return { row: 1, col: 0 };
    if (id === 'thread') return { row: 1, col: 1 };
    return { row: 0, col: 0 };
  }

  function wordWidth(id) {
    var d = doc();
    var el = d && d.querySelector('[data-garden-lumino="' + id + '"] .garden-lumino-word');
    var b = paintedBox(el, 0);
    if (b && b.w >= 8) return b.w;
    if (id === 'gathering') return 110;
    if (id === 'settings') return 64;
    if (id === 'nursery') return 64;
    return 40;
  }

  // Fit projected bead centers into the free garden rectangle as a 2x2 grid
  // (Gathering / Settings on top, Nursery / Chat below), 8px from every
  // reserved box. Used for both the HTML door anchors and the 3D lights.
  function fitProjected(points, vw, vh) {
    /* v0.10: no JS packing of 3D or HTML beads on phones. */
    return points;
    if (!points || !points.length) return points;
    if (!isNarrow()) return points;
    try { placeRoomsToggle(); } catch (eFit) {}
    var reserved = reservedGardenBoxes();
    var free = freeRect(vw, vh, reserved, BOX_GAP);
    // Never fall back to the raw camera projection: a tight free
    // rectangle still gets a packed 2x2, so later camera settles
    // cannot drop the Gathering bead onto the Rooms chip.
    if (free.r - free.l < 64) { free.l = BOX_GAP; free.r = vw - BOX_GAP; }
    if (free.b - free.t < 64) {
      var minTop = BOX_GAP, maxBot = vh - BOX_GAP, ri, rb;
      for (ri = 0; ri < reserved.length; ri++) {
        rb = reserved[ri];
        if (rb.kind === 'header' || rb.kind === 'hint' || rb.kind === 'rooms') minTop = Math.max(minTop, rb.b + BOX_GAP);
        if (rb.kind === 'clay' || rb.kind === 'nav') maxBot = Math.min(maxBot, rb.t - BOX_GAP);
      }
      free.t = minTop; free.b = Math.max(minTop + 64, maxBot);
    }
    var gap = BOX_GAP;
    var cellW = (free.r - free.l - gap) / 2;
    var cellH = (free.b - free.t - gap) / 2;
    var pts = points.filter(function (p) { return p && typeof p.x === 'number'; });
    var i, p, slot, id, ww, boxW, boxH, cellL, cellT, cx, cy, tap;
    tap = Math.max(TAP, HIT);
    var floor = roomsFloor();
    if (floor) free.t = Math.max(free.t, floor);
    if (free.b - free.t < 64) free.b = Math.max(free.b, free.t + 64);
    cellW = (free.r - free.l - gap) / 2;
    cellH = (free.b - free.t - gap) / 2;
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      id = p.id || (p.name && DOOR_BY_NAME[p.name]) || '';
      slot = slotFor(id);
      ww = wordWidth(id);
      boxW = Math.max(tap, ww);
      boxH = tap + 4 + 18;
      cellL = free.l + slot.col * (cellW + gap);
      cellT = free.t + slot.row * (cellH + gap);
      cx = cellL + cellW / 2;
      cy = cellT + Math.max(tap / 2, (cellH - boxH) / 2 + tap / 2);
      cx = Math.min(cellL + cellW - boxW / 2, Math.max(cellL + boxW / 2, cx));
      cy = Math.min(cellT + cellH - (boxH - tap / 2), Math.max(cellT + tap / 2, cy));
      p.x = cx;
      p.y = cy;
    }
    pushTopRowBelowRooms(pts, vh);
    pinDoors(pts);
    return points;
  }

  function pinDoors(points) {
    var d = doc();
    if (!d || !points) return;
    var i, p, id, el;
    for (i = 0; i < points.length; i++) {
      p = points[i];
      if (!p || typeof p.x !== 'number') continue;
      id = p.id || (p.name && DOOR_BY_NAME[p.name]) || '';
      if (!id) continue;
      el = d.querySelector('[data-garden-lumino="' + id + '"]');
      if (!el) continue;
      el.style.left = Math.round(p.x) + 'px';
      el.style.top = Math.round(p.y) + 'px';
    }
  }

  function fitAnchors(anchors) {
    if (!isNarrow() || !anchors || !anchors.length) {
      if (!isNarrow()) markLightsReady();
      return anchors;
    }
    var vs = viewSize();
    var vw = vs.w;
    var vh = vs.h;
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
    /* v0.10: phone lights are an HTML grid; do not wrap projection. */
    return;
    var FG = root.FractalGarden;
    if (!FG || typeof FG.getLuminoAnchors !== 'function') return;
    if (FG.getLuminoAnchors.__treePhoneFit) { _wrapped = true; return; }
    var orig = FG.getLuminoAnchors.bind(FG);
    var wrapped = function () {
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
    wrapped.__treePhoneFit = true;
    FG.getLuminoAnchors = wrapped;
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
    /* v0.10: do not steer the camera FOV on phones. */
    return;
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
    /* v0.10: hide the 3D room beads (and their labels) on phones
       instead of reprojecting them. The CSS grid is the tap target. */
    if (!isNarrow() || !scene) return fn();
    var hidden = [];
    try {
      scene.traverse(function (obj) {
        if (!isAgent(obj)) return;
        hidden.push({ obj: obj, vis: obj.visible });
        obj.visible = false;
      });
    } catch (eH) { return fn(); }
    try { return fn(); }
    finally {
      var i;
      for (i = 0; i < hidden.length; i++) {
        try { hidden[i].obj.visible = hidden[i].vis; } catch (eR) {}
      }
    }
  }
  function withFittedAgents_removed(scene, camera, renderer, fn) {
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
      saved.push({
        obj: obj,
        x: obj.position.x, y: obj.position.y, z: obj.position.z,
        sx: obj.scale.x, sy: obj.scale.y, sz: obj.scale.z
      });
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
    var vsFit = viewSize();
    fitProjected(pts, vsFit.w || rect.width, vsFit.h || rect.height);
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
      // Grow the drawn 3D bead on phones so it is closer to the 44px
      // tap target, when the fitted cell can hold it.
      try {
        var bump = DRAWN / Math.max(BEAD, 1);
        if (bump > 1) p.obj.scale.set(saved[i].sx * bump, saved[i].sy * bump, saved[i].sz * bump);
      } catch (eSc) {}
    }
    // The garden updates world matrices before it calls render. Changing
    // position here would be ignored on the GPU unless we recompute them.
    try { scene.updateMatrixWorld(true); } catch (eM1) {}
    _fitting = true;
    try { return fn(); }
    finally {
      for (i = 0; i < saved.length; i++) {
        saved[i].obj.position.set(saved[i].x, saved[i].y, saved[i].z);
        try { saved[i].obj.scale.set(saved[i].sx, saved[i].sy, saved[i].sz); } catch (eSr) {}
      }
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
      _hintWatch = root.setInterval(function () {
        try { markNarrow(); } catch (eN) {}
        try { paintHint(); } catch (eH) {}
        try { hookRender(); } catch (eR) {}
        placeRoomsToggle();
        try { ensurePhoneGrid(); } catch (eG) {}
        placeWaitHint();
      }, 400);
    }
  }

  function placeClayBetweenRings() {
    var d = doc();
    if (!d || !isNarrow()) return;
    var clay = d.getElementById('fl-clay-corner');
    if (!clay) return;
    clay.style.left = '50%';
    clay.style.right = 'auto';
    clay.style.transform = 'translateX(-50%)';
    clay.style.bottom = '16px';
    var pr = navRingBox(d.querySelector('.galaxy-nav-prev, [data-galaxy-dir="prev"]'));
    var nr = navRingBox(d.querySelector('.galaxy-nav-next, [data-galaxy-dir="next"]'));
    var cb = paintedBox(clay, 0);
    if (!cb) return;
    if ((pr && boxesOverlap(cb, pr, BOX_GAP)) || (nr && boxesOverlap(cb, nr, BOX_GAP))) {
      var topRing = Math.min(pr ? pr.t : 1e9, nr ? nr.t : 1e9);
      var vh = d.documentElement.clientHeight || 0;
      clay.style.bottom = Math.max(16, Math.round(vh - (topRing - BOX_GAP))) + 'px';
    }
  }

  function placeRoomsToggle() {
    var d = doc();
    if (!d) return;
    var list = d.getElementById('lumino-legend');
    var btn = d.getElementById('tree-rooms-toggle');
    if (!isNarrow()) {
      if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
      if (list) {
        list.removeAttribute('data-tree-rooms-toggle');
        list.removeAttribute('data-open');
        list.removeAttribute('hidden');
      }
      return;
    }
    if (!list) return;
    if (!btn) {
      btn = d.createElement('button');
      btn.type = 'button';
      btn.id = 'tree-rooms-toggle';
      btn.className = 'tree-rooms-toggle';
      btn.textContent = 'Rooms';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', 'lumino-legend');
      list.parentNode.insertBefore(btn, list);
      function closeRoomsList() {
        list.removeAttribute('data-open');
        btn.setAttribute('aria-expanded', 'false');
      }
      function openRoomsList() {
        list.setAttribute('data-open', '1');
        btn.setAttribute('aria-expanded', 'true');
        ensureRoomsCloser();
        placeOpenList();
      }
      function ensureRoomsCloser() {
        var closer = list.querySelector('#tree-rooms-close');
        if (closer) return closer;
        closer = d.createElement('button');
        closer.type = 'button';
        closer.id = 'tree-rooms-close';
        closer.textContent = 'Close';
        closer.setAttribute('aria-label', 'Close Rooms');
        list.insertBefore(closer, list.firstChild);
        closer.addEventListener('click', function (ev) {
          if (ev && ev.stopPropagation) ev.stopPropagation();
          closeRoomsList();
        });
        return closer;
      }
      function placeOpenList() {
        var br = btn.getBoundingClientRect();
        var top = Math.round(br.bottom + BOX_GAP) + 'px';
        var left = Math.round(br.left) + 'px';
        list.style.setProperty('top', top, 'important');
        list.style.setProperty('left', left, 'important');
        list.style.setProperty('--tree-rooms-list-top', top);
      }
      btn.addEventListener('click', function (ev) {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        if (list.getAttribute('data-open') === '1') closeRoomsList();
        else openRoomsList();
      });
      d.addEventListener('pointerdown', function (ev) {
        if (list.getAttribute('data-open') !== '1') return;
        var t = ev && ev.target;
        if (btn.contains(t) || list.contains(t)) return;
        closeRoomsList();
      });
    }
    list.setAttribute('data-tree-rooms-toggle', VERSION);
    // Sit just below the hint (or the header if the hint is hidden).
    var hint = d.getElementById('garden-start');
    var header = d.getElementById('garden-header');
    var hb = null;
    if (hint) {
      try {
        var hr = hint.getBoundingClientRect();
        if (hr && hr.width >= 2 && hr.height >= 2) hb = { l: hr.left, t: hr.top, r: hr.right, b: hr.bottom };
      } catch (eH) {}
    }
    if (!hb) hb = paintedBox(header, 0);
    if (d.getElementById('tree-phone-stack')) {
      btn.style.removeProperty('top');
      btn.style.removeProperty('left');
    } else {
      var top = hb ? Math.round(hb.b + BOX_GAP) : 120;
      btn.style.top = top + 'px';
    }
    if (list.getAttribute('data-open') === '1') {
      var br2 = btn.getBoundingClientRect();
      var top2 = Math.round(br2.bottom + BOX_GAP) + 'px';
      list.style.setProperty('top', top2, 'important');
      list.style.setProperty('left', Math.round(br2.left) + 'px', 'important');
      list.style.setProperty('--tree-rooms-list-top', top2);
    }
    placeClayBetweenRings();
  }


  var _homes = null;
  function rememberHome(el) {
    if (!el || !_homes) return;
    if (_homes[el.id || el.getAttribute('data-garden-lumino') || '']) return;
    _homes[el.id || el.getAttribute('data-garden-lumino') || ''] = {
      parent: el.parentNode,
      next: el.nextSibling
    };
  }
  function sendHome(el) {
    if (!el || !_homes) return;
    var key = el.id || el.getAttribute('data-garden-lumino') || '';
    var home = _homes[key];
    if (!home || !home.parent) return;
    if (home.next && home.next.parentNode === home.parent) home.parent.insertBefore(el, home.next);
    else home.parent.appendChild(el);
  }

  function teardownPhoneGrid() {
    var d = doc();
    if (!d) return;
    try { d.documentElement.removeAttribute('data-tree-phone-grid'); } catch (e0) {}
    var hint = d.getElementById('garden-start');
    var btn = d.getElementById('tree-rooms-toggle');
    var ids = ['gathering', 'settings', 'nursery', 'thread'];
    var i, el;
    if (hint) sendHome(hint);
    if (btn) sendHome(btn);
    for (i = 0; i < ids.length; i++) {
      el = d.querySelector('[data-garden-lumino="' + ids[i] + '"]');
      if (el) sendHome(el);
    }
    var stack = d.getElementById('tree-phone-stack');
    if (stack && stack.parentNode) stack.parentNode.removeChild(stack);
  }

  function ensurePhoneGrid() {
    var d = doc();
    if (!d || !d.body) return;
    markNarrow();
    if (!isNarrow()) {
      teardownPhoneGrid();
      return;
    }
    var galaxy = '';
    try { galaxy = d.documentElement.getAttribute('data-garden-galaxy') || ''; } catch (eG) {}
    if (galaxy && galaxy !== 'garden') {
      teardownPhoneGrid();
      return;
    }
    if (!_homes) _homes = {};
    var header = d.getElementById('garden-header');
    var stack = d.getElementById('tree-phone-stack');
    if (!stack) {
      stack = d.createElement('div');
      stack.id = 'tree-phone-stack';
      if (header && header.parentNode) header.parentNode.insertBefore(stack, header.nextSibling);
      else d.body.insertBefore(stack, d.body.firstChild);
    }
    var hint = d.getElementById('garden-start');
    if (hint) {
      rememberHome(hint);
      if (hint.parentNode !== stack) stack.appendChild(hint);
    }
    var roomsRow = d.getElementById('tree-phone-rooms-row');
    if (!roomsRow) {
      roomsRow = d.createElement('div');
      roomsRow.id = 'tree-phone-rooms-row';
    }
    if (roomsRow.parentNode !== stack) stack.appendChild(roomsRow);
    var btn = d.getElementById('tree-rooms-toggle');
    if (btn) {
      rememberHome(btn);
      if (btn.parentNode !== roomsRow) roomsRow.appendChild(btn);
      btn.style.removeProperty('top');
      btn.style.removeProperty('left');
    }
    var grid = d.getElementById('tree-phone-light-grid');
    if (!grid) {
      grid = d.createElement('div');
      grid.id = 'tree-phone-light-grid';
    }
    if (grid.parentNode !== stack) stack.appendChild(grid);
    var ids = ['gathering', 'settings', 'nursery', 'thread'];
    var i, el;
    for (i = 0; i < ids.length; i++) {
      el = d.querySelector('[data-garden-lumino="' + ids[i] + '"]');
      if (!el) continue;
      rememberHome(el);
      try {
        el.style.removeProperty('left');
        el.style.removeProperty('top');
        el.style.removeProperty('transform');
      } catch (eS) {}
      if (el.parentNode !== grid) grid.appendChild(el);
    }
    try { d.documentElement.setAttribute('data-tree-phone-grid', '1'); } catch (eA) {}
  }

  function start() {
    addStyle();
    markNarrow();
    paintHint();
    hookRender();
    placeRoomsToggle();
    ensurePhoneGrid();
    watchRooms();
    keepNurseryTextInView();
    placeWaitHint();
    if (!_readyTimer && root.setTimeout) {
      _readyTimer = root.setTimeout(markLightsReady, 800);
    }
    watchViewport();
  }

  var _settleOnce = false;
  function refitNow() {
    try { markNarrow(); } catch (e0) {}
    try { paintHint(); } catch (eH) {}
    try { placeRoomsToggle(); } catch (e1) {}
    try { ensurePhoneGrid(); } catch (eG) {}
    try { paintHint(); } catch (eH2) {}
  }

  function scheduleSettledFits() {
    if (_settleOnce || !root.setTimeout) return;
    _settleOnce = true;
    var times = [500, 2000, 5000, 10000];
    var i;
    for (i = 0; i < times.length; i++) {
      root.setTimeout(refitNow, times[i]);
    }
  }

  var _resizeHooked = false;
  function watchViewport() {
    if (_resizeHooked || !root.addEventListener) return;
    _resizeHooked = true;
    var timer = 0;
    function onChange() {
      if (timer) root.clearTimeout(timer);
      timer = root.setTimeout(function () {
        refitNow();
      }, 60);
    }
    root.addEventListener('resize', onChange);
    root.addEventListener('orientationchange', onChange);
    try {
      if (root.visualViewport && root.visualViewport.addEventListener) {
        root.visualViewport.addEventListener('resize', onChange);
      }
    } catch (eV) {}
  }

  var api = {
    VERSION: VERSION,
    HINT: HINT,
    NARROW: NARROW,
    MIN_GAP: MIN_GAP,
    HIT: HIT,
    fitAnchors: fitAnchors,
    fitProjected: fitProjected,
    reservedGardenBoxes: reservedGardenBoxes,
    placeRoomsToggle: placeRoomsToggle,
    ensurePhoneGrid: ensurePhoneGrid,
    refitNow: refitNow,
    BOX_GAP: BOX_GAP,
    TAP: TAP,
    start: start
  };
  root.TreePhonePolish136 = api;

  addStyle();
  hookRender();

  if (doc()) {
    if (doc().readyState === 'loading') doc().addEventListener('DOMContentLoaded', start);
    else root.setTimeout(start, 0);
  }
})(typeof window !== 'undefined' ? window : this);
