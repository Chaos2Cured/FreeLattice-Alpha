// tree-points.js (MIT) v-tree-parity-v0.1
// A read-only points view. The first-digit hint only speaks when the list is long enough.
// This garden may not keep points yet. The hint never writes and never names anyone.
(function (root) {
  'use strict';

  var VERSION = 'v-tree-parity-v0.1';
  var QUIET = 'This garden does not keep points yet. The first-digit hint stays quiet.';
  var HAS = 'Points already on this garden. The hint stays quiet until there are enough values.';
  var hostEl = null;
  var noteEl = null;

  function el(tag, text) {
    var node = root.document.createElement(tag);
    if (text != null) node.textContent = text;
    return node;
  }
  function amountsFromLive() {
    var lp = root.LatticePoints;
    var rows = [];
    try {
      if (lp && typeof lp.getHistory === 'function') rows = lp.getHistory() || [];
      else if (lp && typeof lp.getData === 'function') {
        var data = lp.getData() || {};
        rows = data.history || data.amounts || [];
      }
    } catch (e) { rows = []; }
    var amounts = [];
    var i;
    for (i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (typeof row === 'number') amounts.push(row);
      else if (row && typeof row.points === 'number') amounts.push(row.points);
      else if (row && typeof row.amount === 'number') amounts.push(row.amount);
    }
    return amounts;
  }
  function paintAmounts(amounts, id) {
    if (!hostEl || !root.FLBenford || typeof root.FLBenford.paint !== 'function') return null;
    return root.FLBenford.paint(hostEl, amounts || [], id || 'fl-tree-points-hint');
  }
  function show(amounts) {
    var list = amounts || [];
    if (noteEl) {
      noteEl.textContent = list.length ? 'A list is on the points view. The hint only speaks when it has something to say.' : QUIET;
    }
    return paintAmounts(list, 'fl-tree-points-hint');
  }
  function mount(host) {
    if (!host || !root.document) return;
    if (host.getAttribute && host.getAttribute('data-tree-points') === '1') return;
    if (host.setAttribute) host.setAttribute('data-tree-points', '1');
    hostEl = host;
    var doc = root.document;
    if (doc.getElementById && !doc.getElementById('flTreePointsStyle')) {
      var st = doc.createElement('style');
      st.id = 'flTreePointsStyle';
      st.textContent = '.fl-tree-points{max-width:100%;overflow-wrap:anywhere;box-sizing:border-box;margin:8px 0;}' +
        '.fl-tree-points button{min-height:44px;min-width:44px;box-sizing:border-box;}';
      if (doc.head) doc.head.appendChild(st);
    }
    host.className = ((host.className || '') + ' fl-tree-points').trim();
    var amounts = amountsFromLive();
    noteEl = el('p', amounts.length ? HAS : QUIET);
    host.appendChild(noteEl);
    paintAmounts(amounts, 'fl-tree-points-hint');
  }
  function boot() {
    var doc = root.document;
    if (!doc || !doc.getElementById) return;
    var host = doc.getElementById('tree-points-host');
    if (host) mount(host);
  }

  var api = {
    VERSION: VERSION,
    QUIET: QUIET,
    amountsFromLive: amountsFromLive,
    show: show,
    mount: mount,
    boot: boot
  };
  root.FLTreePoints = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.document) {
    if (root.document.readyState === 'loading' && root.document.addEventListener) {
      root.document.addEventListener('DOMContentLoaded', boot);
    } else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
