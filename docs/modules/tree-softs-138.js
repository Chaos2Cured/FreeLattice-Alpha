// tree-softs-138.js v-tree-softs-138-v0.2
// SPDX-License-Identifier: MIT
// Layer, never delete. Does not rewrite gathering-speak.js, fl-gathering.js,
// tree-gathering-mount.js, image-local.js, style-ledger.js, AUTONOMY.md,
// or the Quiet Room.
//
// When someone Asks in the Gathering with no mind seated, or while
// offline, a fresh kind receipt is shown each time instead of silence.
// The two plain Settings buttons ("Look on this computer", "Yes, read
// Harmonia's public gallery") are dressed in the Tree's gold-on-dark.
(function (root) {
  'use strict';

  var VERSION = 'v-tree-softs-138-v0.2';
  var STYLE_ID = 'tree-softs-138-style';
  var NO_MIND = [
    'The chairs are empty just now. Seat a mind first, and this table will listen with you.',
    'No mind is seated yet. Find local minds is above, or Settings can help a mind come home.',
    'Nothing is speaking from a chair yet. When a mind is seated, ask again, and I will listen.',
    'An empty table cannot answer. Seat a mind at home, then ask — I will wait with you.'
  ];
  var OFFLINE = [
    'The line is quiet. When the network returns, ask again, and I will try with you.',
    'Nothing left this page. The network is not reachable just now. Ask again when it is.',
    'I could not reach a chair. The network may be away. Nothing was invented.'
  ];
  var LEAVE = /Write a short ask first|An ask keeps words|A turn was kept|^Paused\.|^Listening/;
  var _idx = { none: -1, offline: -1 };
  var _bound = false;

  function doc() {
    try { return root.document || null; } catch (e) { return null; }
  }

  function isOnline() {
    try {
      if (root.navigator && typeof root.navigator.onLine === 'boolean') return root.navigator.onLine;
    } catch (e) {}
    return true;
  }

  function nextLine(kind) {
    var list = kind === 'offline' ? OFFLINE : NO_MIND;
    _idx[kind] = (_idx[kind] + 1) % list.length;
    return list[_idx[kind]];
  }

  function addStyle() {
    var d = doc();
    if (!d || d.getElementById(STYLE_ID)) return;
    var s = d.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '#tree-image-local-host button.fl-image-local-yes,',
      '#tree-style-ledger-host button,',
      '.fl-tree-image-door button,',
      '#tree-image-door-host button{',
      'display:inline-flex;align-items:center;justify-content:center;',
      'min-height:44px;min-width:44px;margin:8px 8px 8px 0;padding:10px 16px;',
      'box-sizing:border-box;',
      "font-family:Georgia,'Times New Roman',serif;font-size:0.95rem;",
      'color:#e8b019;background:rgba(12,10,26,0.92);',
      'border:1px solid rgba(232,176,25,0.75);border-radius:12px;',
      'cursor:pointer;appearance:none;-webkit-appearance:none;}',
      '#tree-image-local-host button.fl-image-local-yes:hover,',
      '#tree-image-local-host button.fl-image-local-yes:focus-visible,',
      '#tree-style-ledger-host button:hover,',
      '#tree-style-ledger-host button:focus-visible,',
      '.fl-tree-image-door button:hover,',
      '.fl-tree-image-door button:focus-visible,',
      '#tree-image-door-host button:hover,',
      '#tree-image-door-host button:focus-visible{',
      'background:rgba(232,176,25,0.16);border-color:#e8b019;color:#f3d98a;',
      'outline:none;}'
    ].join('');
    (d.head || d.documentElement).appendChild(s);
  }

  function paintReceipt(line) {
    var d = doc();
    if (!d) return;
    var receipt = d.getElementById('flgs-receipt');
    if (!receipt) return;
    receipt.hidden = false;
    if (receipt.removeAttribute) receipt.removeAttribute('data-tree-gathering-deduped');
    receipt.textContent = line;
    if (receipt.setAttribute) receipt.setAttribute('data-tree-softs-138', VERSION);
  }

  function afterAsk() {
    var d = doc();
    if (!d) return;
    var who = d.getElementById('flgs-who');
    var receipt = d.getElementById('flgs-receipt');
    if (!receipt) return;
    var text = String(receipt.textContent || '').replace(/\s+/g, ' ').trim();
    var hidden = !!receipt.hidden;
    if (text && LEAVE.test(text) && !hidden) return;
    var whoText = who ? String(who.textContent || '').replace(/\s+/g, ' ').trim() : '';
    var ours = NO_MIND.indexOf(text) !== -1 || OFFLINE.indexOf(text) !== -1;
    var noMind = hidden || !text || ours ||
      /No chair is speaking yet/i.test(text) ||
      /no mind on this computer/i.test(text) ||
      (whoText && text === whoText);
    var failed = /did not answer/i.test(text) || /Nothing was invented/i.test(text);
    var offline = !isOnline() || failed;
    if (!offline && !noMind) return;
    if (ours && !isOnline()) offline = true;
    if (ours && OFFLINE.indexOf(text) !== -1) offline = true;
    var kind = offline ? 'offline' : 'none';
    var line = nextLine(kind);
    if (whoText && line === whoText) line = nextLine(kind);
    paintReceipt(line);
  }

  function isAskButton(el) {
    if (!el) return null;
    if (el.id === 'flgs-ask-btn') return el;
    if (el.closest) {
      var c = el.closest('#flgs-ask-btn');
      if (c) return c;
    }
    var p = el.parentNode;
    while (p && p !== (doc() && doc().documentElement)) {
      if (p.id === 'flgs-ask-btn') return p;
      p = p.parentNode;
    }
    return null;
  }

  function onAskClick(ev) {
    if (!isAskButton(ev && ev.target)) return;
    try { root.setTimeout(afterAsk, 30); } catch (e) { afterAsk(); }
  }

  function hookAsk() {
    var d = doc();
    if (!d) return;
    var btn = d.getElementById('flgs-ask-btn');
    if (btn && !(btn.getAttribute && btn.getAttribute('data-tree-softs-138-bound'))) {
      if (btn.setAttribute) btn.setAttribute('data-tree-softs-138-bound', VERSION);
      if (btn.addEventListener) btn.addEventListener('click', onAskClick, false);
    }
    if (_bound) return;
    if (d.addEventListener) d.addEventListener('click', onAskClick, false);
    if (d.documentElement && d.documentElement.setAttribute) {
      d.documentElement.setAttribute('data-tree-softs-138-delegated', VERSION);
    }
    if (typeof MutationObserver === 'function') {
      try {
        var obs = new MutationObserver(function () { hookAsk(); });
        if (d.body || d.documentElement) obs.observe(d.body || d.documentElement, { childList: true, subtree: true });
      } catch (e2) {}
    }
    _bound = true;
  }

  function start() {
    addStyle();
    hookAsk();
  }

  var api = {
    VERSION: VERSION,
    NO_MIND: NO_MIND,
    OFFLINE: OFFLINE,
    nextLine: nextLine,
    afterAsk: afterAsk,
    start: start
  };
  root.TreeSofts138 = api;

  if (doc()) {
    if (doc().readyState === 'loading') doc().addEventListener('DOMContentLoaded', start);
    else root.setTimeout(start, 0);
  }
})(typeof window !== 'undefined' ? window : this);
