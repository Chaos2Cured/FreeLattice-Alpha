// tree-hypha-softs-133.js v-tree-hypha-softs-133-v0.2
// SPDX-License-Identifier: MIT
// Layer, never delete. Does not rewrite tree-door.js, particle-clay.js,
// clay-corner.js, or garden-rooms.js.
// Hypha's four softs after PR 133, plus the HOLD fixes on PR 134:
// centered compact phone bottom sheet, Start here in the chrome, and
// “the garden” after the Checker.
(function (root) {
  'use strict';

  var VERSION = 'v-tree-hypha-softs-133-v0.2';
  var STYLE_ID = 'tree-hypha-softs-133-style';
  var STAY = 'data-tree-door-stay';
  var _obs = null;
  var _started = false;

  function doc() {
    try { return root.document || null; } catch (e) { return null; }
  }

  function cardOpen() {
    var d = doc();
    if (!d || !d.querySelector) return false;
    return !!d.querySelector('.tree-door-veil[data-tree-door-calm] .tree-door');
  }

  function addStyle() {
    var d = doc();
    if (!d) return;
    var s = d.getElementById(STYLE_ID);
    if (!s) {
      s = d.createElement('style');
      s.id = STYLE_ID;
      (d.head || d.documentElement).appendChild(s);
    }
    s.setAttribute('data-tree-hypha-softs', VERSION);
    s.textContent = [
      /* 1. Phone home: Start here lives in the chrome under the header, not over the planets. */
      '@media (max-width:799px){',
      '#garden-start{position:fixed !important;left:0 !important;right:0 !important;',
      'top:3.25rem !important;width:auto;max-width:none;text-align:center;z-index:14;',
      'margin:0;padding:0.3rem 0.8rem 0.4rem;background:rgba(10,8,22,0.92);',
      'box-sizing:border-box;font-size:0.88rem;line-height:1.35;border-radius:0;}',
      'html:not(:has(.tree-door-veil[data-tree-door-calm])) #lumino-legend{',
      'top:7.15rem !important;z-index:13;}',
      'html:not(:has(.tree-door-veil[data-tree-door-calm])) #galaxy-title{top:6.85rem !important;}',
      'html:not(:has(.tree-door-veil[data-tree-door-calm])) #room-label{top:8.35rem !important;}',
      'html:not(:has(.tree-door-veil[data-tree-door-calm])) #garden-footing{top:9.65rem !important;}',
      '#lumino-legend{z-index:13;}',
      '#fl-clay-corner{top:auto !important;bottom:4.75rem !important;right:8px !important;',
      'left:auto !important;z-index:30;}',
      '}',
      /* While the first-run card is up, the card is the start. Hide the overlapping hint. */
      'html:has(.tree-door-veil[data-tree-door-calm]) #garden-start{',
      'visibility:hidden !important;pointer-events:none !important;opacity:0 !important;',
      '}',
      /* After Not now, show Start here at once (do not wait for the 8s fade-in). */
      'html[data-tree-start-ready] #garden-start{',
      'opacity:0.92 !important;visibility:visible !important;animation:none !important;',
      '}',
      /* Pin the card title so a focused button cannot scroll it away on a short phone. */
      '.tree-door-veil[data-tree-door-calm] .tree-door-sheet-head{',
      'flex:0 0 auto;padding:0 0 0.2rem;background:rgba(14,12,30,0.98);}',
      /* Sticky "Not now" so it stays in view even at 522px tall. */
      '.tree-door-veil[data-tree-door-calm] .tree-door{',
      'display:flex;flex-direction:column;overflow:hidden;',
      'max-height:calc(100vh - 11.25rem);',
      '}',
      '.tree-door-veil[data-tree-door-calm] .tree-door-scroll{',
      'flex:1 1 auto;min-height:0;overflow-y:auto;',
      '}',
      '.tree-door-veil[data-tree-door-calm] [' + STAY + ']{',
      'flex:0 0 auto;position:relative;background:rgba(14,12,30,0.98);',
      'padding:0.4rem 0 0.15rem;margin-top:0.25rem;z-index:3;',
      '}',
      /* Centered compact bottom sheet. Keep left:50% + translateX(-50%); do not use left:auto/right:0. */
      '@media (max-width:799px){',
      '.tree-door-veil[data-tree-door-calm]{left:50% !important;right:auto !important;',
      'transform:translateX(-50%) !important;top:auto !important;bottom:0 !important;',
      'width:auto !important;max-width:calc(100vw - 2rem);padding:0 !important;}',
      '.tree-door-veil[data-tree-door-calm] .tree-door{',
      'width:min(22rem,calc(100vw - 2rem));margin:0 auto 1rem auto;',
      'max-height:min(20rem,calc(100vh - 16.5rem));box-sizing:border-box;',
      '}',
      'html:has(.tree-door-veil[data-tree-door-calm]) #fl-clay-corner{',
      'top:6.5rem !important;bottom:auto !important;right:8px !important;',
      'left:auto !important;z-index:30;}',
      '}',
      '@media (max-width:799px) and (max-height:560px){',
      '.tree-door-veil[data-tree-door-calm] .tree-door{',
      'margin:0 auto 0.5rem auto;max-height:calc(100vh - 16rem);',
      '}',
      '}',
      /* (d) “the garden” stays after the Checker, even on a short phone (overrides order:-1). */
      '@media (max-width:640px){',
      '#place-veil.is-core #place-veil-close{order:20 !important;position:static !important;',
      'top:auto !important;right:auto !important;left:auto !important;bottom:auto !important;',
      'transform:none !important;align-self:center !important;',
      'margin:0.85rem auto 2.75rem !important;}',
      '}',
      /* 2. Phone Gathering send strip: pin Say something, Send, and the waiting hint. */
      '@media (max-width:640px){',
      '#place-veil.is-core #room-chat{position:relative !important;display:flex !important;',
      'flex-direction:column !important;max-height:24rem !important;min-height:16rem;',
      'overflow:hidden !important;padding:8px 10px 7.5rem !important;',
      'box-sizing:border-box !important;}',
      '#place-veil.is-core #room-chat #room-chat-stage{',
      'flex:1 1 0% !important;min-height:0 !important;overflow:auto !important;',
      '}',
      '#place-veil.is-core #room-chat #fl-clay-dock{',
      'position:relative !important;max-height:5.5rem;overflow:auto;flex:0 1 auto;',
      '}',
      '#place-veil.is-core #room-chat [data-tree-softs-send]{',
      'position:absolute;left:8px;right:8px;bottom:8px;z-index:20;',
      'background:rgba(12,10,26,0.98);padding:10px 2px 2px;border-radius:0 0 10px 10px;',
      'box-shadow:0 -18px 18px 10px rgba(12,10,26,0.98);}',
      '#place-veil.is-core #room-chat [data-tree-softs-send] .thread-compose{',
      'position:relative !important;left:auto;right:auto;bottom:auto;margin:0;',
      'overflow:visible !important;}',
      '#place-veil.is-core #room-chat [data-tree-softs-send] #tree-thread-wait-hint,',
      '#place-veil.is-core #room-chat #tree-thread-wait-hint,',
      '#tree-thread-wait-hint{display:block !important;visibility:visible !important;',
      'position:relative !important;left:auto;right:auto;bottom:auto;margin-top:6px;',
      'max-width:none;padding:0 0 2px;}',
      '}',
      /* 3. 1280: pin the chat dock below the Chat / galaxies nav, even when the room scrolls. */
      '@media (min-width:641px){',
      '#place-veil.is-core.is-open #room-chat{',
      'position:fixed !important;top:5.15rem !important;right:1.1rem !important;',
      'bottom:auto !important;max-height:calc(100vh - 6.5rem) !important;',
      'z-index:1005;',
      '}',
      '}',
      /* 4. One ask: hide the "Let your mind shape light?" dock offer while the first-run card is up. */
      'html:has(.tree-door-veil[data-tree-door-calm]) #fl-clay-dock{',
      'display:none !important;',
      '}'
    ].join('');
  }

  function pinNotNow() {
    var d = doc();
    if (!d) return;
    var box = d.querySelector('.tree-door-veil[data-tree-door-calm] .tree-door');
    if (!box) return;
    if (box.querySelector('[' + STAY + ']')) return;
    var buttons = box.querySelectorAll('button');
    var soft = null;
    var i;
    for (i = 0; i < buttons.length; i++) {
      if (buttons[i].className && String(buttons[i].className).indexOf('tree-door-soft') !== -1) {
        soft = buttons[i];
      }
    }
    if (!soft) return;
    var quiet = null;
    var kids = box.children || [];
    for (i = 0; i < kids.length; i++) {
      if (kids[i].className && String(kids[i].className).indexOf('tree-door-quiet') !== -1) quiet = kids[i];
    }
    var headEl = null;
    for (i = 0; i < kids.length; i++) {
      if ((kids[i].tagName || '').toLowerCase() === 'h2' || (kids[i].className && String(kids[i].className).indexOf('tree-door-title') !== -1)) {
        headEl = kids[i];
      }
    }
    var scroll = d.createElement('div');
    scroll.className = 'tree-door-scroll';
    var head = d.createElement('div');
    head.className = 'tree-door-sheet-head';
    var foot = d.createElement('div');
    foot.setAttribute(STAY, VERSION);
    var move = [];
    for (i = 0; i < kids.length; i++) move.push(kids[i]);
    for (i = 0; i < move.length; i++) {
      if (move[i] === soft || move[i] === quiet || move[i] === headEl) continue;
      scroll.appendChild(move[i]);
    }
    if (headEl) head.appendChild(headEl);
    if (headEl) box.insertBefore(head, box.firstChild);
    if (scroll.children && scroll.children.length) {
      if (head.parentNode === box && head.nextSibling) box.insertBefore(scroll, head.nextSibling);
      else box.insertBefore(scroll, box.firstChild);
    }
    if (soft) foot.appendChild(soft);
    if (quiet) foot.appendChild(quiet);
    box.appendChild(foot);
  }

  function markStartReady() {
    var d = doc();
    if (!d || !d.documentElement) return;
    if (cardOpen()) {
      try { d.documentElement.setAttribute('data-tree-door-saw-calm', '1'); } catch (e) {}
      return;
    }
    var saw = false;
    try { saw = d.documentElement.getAttribute('data-tree-door-saw-calm') === '1'; } catch (e2) {}
    if (saw) {
      try { d.documentElement.setAttribute('data-tree-start-ready', '1'); } catch (e3) {}
    }
  }

  function placeStartHint() {
    var d = doc();
    if (!d) return;
    var start = d.getElementById('garden-start');
    if (!start || !start.style) return;
    try { start.style.removeProperty('top'); } catch (e) {}
  }

  function isPhone() {
    try { return !!(root.matchMedia && root.matchMedia('(max-width: 640px)').matches); } catch (e) { return false; }
  }

  function pinSendHint() {
    var d = doc();
    if (!d || !d.querySelector) return;
    var chat = d.querySelector('#place-veil.is-core #room-chat');
    var compose = chat && chat.querySelector ? chat.querySelector('.thread-compose') : null;
    var hint = d.getElementById ? d.getElementById('tree-thread-wait-hint') : null;
    var foot = chat && chat.querySelector ? chat.querySelector('[data-tree-softs-send]') : null;
    var host = chat && chat.querySelector ? (chat.querySelector('.thread-face.is-room') || chat.querySelector('#room-chat-stage')) : null;
    if (!isPhone()) {
      if (foot) {
        if (compose && compose.parentNode === foot && host && host.appendChild) host.appendChild(compose);
        if (hint && hint.parentNode === foot && host && host.appendChild) host.appendChild(hint);
        if (foot.parentNode && (!foot.children || !foot.children.length)) foot.parentNode.removeChild(foot);
      }
      return;
    }
    if (!chat || !compose) return;
    if (!foot) {
      foot = d.createElement('div');
      foot.setAttribute('data-tree-softs-send', VERSION);
      chat.appendChild(foot);
    }
    if (compose.parentNode !== foot) foot.appendChild(compose);
    if (hint && hint.parentNode !== foot) foot.appendChild(hint);
  }

  function sync() {
    addStyle();
    if (cardOpen()) pinNotNow();
    pinSendHint();
    markStartReady();
    placeStartHint();
  }

  function watch() {
    var d = doc();
    if (!d || typeof root.MutationObserver !== 'function' || _obs) return;
    _obs = new root.MutationObserver(function () { sync(); });
    try { _obs.observe(d.body || d.documentElement, { childList: true, subtree: true }); } catch (e) {}
  }

  function start() {
    if (_started) return;
    _started = true;
    addStyle();
    watch();
    try { if (root.addEventListener) root.addEventListener('resize', function () { sync(); }, { passive: true }); } catch (e) {}
    sync();
  }

  root.TreeHyphaSofts133 = {
    VERSION: VERSION,
    start: start,
    sync: sync,
    pinNotNow: pinNotNow,
    cardOpen: cardOpen
  };

  if (doc()) {
    if (doc().readyState === 'loading') doc().addEventListener('DOMContentLoaded', start);
    else root.setTimeout(start, 0);
  }
})(typeof window !== 'undefined' ? window : this);
