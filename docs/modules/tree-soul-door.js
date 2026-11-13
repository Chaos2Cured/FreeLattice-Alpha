// SPDX-License-Identifier: MIT
// tree-soul-door.js (v-hypha-walk-polish-v0.1). Layer, never delete.
// When the Garden trainer still says "Export Garden Soul (.lattice) -- coming",
// this layer turns that disabled stub into one honest door to FreeLattice's
// signed mind bundle. It does not invent a second .lattice format, and it
// does not change garden-trainer.js.
(function (root) {
  'use strict';
  var VERSION = 'v-hypha-walk-polish-v0.1';
  var MARK = 'Export Garden Soul';
  var BUNDLE_HREF = 'https://github.com/Chaos2Cured/FreeLattice/blob/main/tools/learn/README.md';
  var DOOR_LABEL = 'FreeLattice signed mind bundle';
  var DOOR_LINE = 'The portable copy is FreeLattice\'s signed mind bundle, not a second .lattice format. The how-to lives with the learn tools.';

  function doc() {
    try { return root.document || null; } catch (e) { return null; }
  }

  function isComingSoul(el) {
    if (!el) return false;
    var text = String(el.textContent || '');
    return text.indexOf(MARK) !== -1 && /coming/i.test(text);
  }

  function styleDoor(a) {
    a.className = (String(a.className || '') + ' trainer-btn secondary tree-soul-door').replace(/^\s+/, '');
    a.setAttribute('href', BUNDLE_HREF);
    a.setAttribute('rel', 'noopener noreferrer');
    a.setAttribute('target', '_blank');
    a.textContent = DOOR_LABEL;
    a.removeAttribute('disabled');
    try {
      a.style.opacity = '1';
      a.style.display = 'inline-flex';
      a.style.alignItems = 'center';
      a.style.justifyContent = 'center';
      a.style.minHeight = '44px';
      a.style.minWidth = '44px';
      a.style.boxSizing = 'border-box';
      a.style.textDecoration = 'none';
    } catch (e) {}
  }

  function honorParagraph(p) {
    if (!p) return false;
    var text = String(p.textContent || '');
    if (text.indexOf('.lattice') === -1 && text.indexOf('Garden soul') === -1 && text.indexOf('Garden Soul') === -1) return false;
    if (text === DOOR_LINE) return false;
    p.textContent = DOOR_LINE;
    return true;
  }

  function apply(where) {
    var d = where || doc();
    if (!d || !d.createElement) return 0;
    var changed = 0;
    var buttons = d.querySelectorAll ? d.querySelectorAll('button') : [];
    var i;
    for (i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (!isComingSoul(btn) || !btn.parentNode) continue;
      var a = d.createElement('a');
      styleDoor(a);
      var parent = btn.parentNode;
      parent.replaceChild(a, btn);
      changed += 1;
      if (parent && parent.getElementsByTagName) {
        var kids = parent.getElementsByTagName('p');
        var k;
        for (k = 0; k < kids.length; k++) honorParagraph(kids[k]);
      }
    }
    return changed;
  }

  function boot() {
    var d = doc();
    if (!d) return;
    apply(d);
    if (d.body && typeof root.MutationObserver === 'function') {
      var obs = new MutationObserver(function () { apply(d); });
      obs.observe(d.body, { childList: true, subtree: true });
    }
  }

  var api = { VERSION: VERSION, BUNDLE_HREF: BUNDLE_HREF, DOOR_LABEL: DOOR_LABEL, DOOR_LINE: DOOR_LINE, apply: apply };
  root.TreeSoulDoor = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
