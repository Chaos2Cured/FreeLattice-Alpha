// SPDX-License-Identifier: MIT
// tree-soul-door.js (v-hypha-walk-polish-v0.3). Layer, never delete.
// When the Garden trainer still says "Export Garden Soul (.lattice) -- coming",
// this layer turns that disabled stub into one honest door to FreeLattice
// Desktop 5.8.3. A plain line names the command-line signed-bundle how-to.
// The same door is also placed on the trainer's first-tier simple face, inside
// Nursery Grow > More, and on the Workshop trainer face, so a visitor does not
// have to reach Radiant to see it. It does not invent a second .lattice format,
// and it does not change garden-trainer.js.
(function (root) {
  'use strict';
  var VERSION = 'v-hypha-walk-polish-v0.3';
  var MARK = 'Export Garden Soul';
  var BUNDLE_HREF = 'https://freelattice.com/desktop.html';
  var DOOR_LABEL = 'FreeLattice Desktop 5.8.3';
  var DOOR_LINE = 'A safe, sealed copy of your mind you can carry to another computer. The simple door is FreeLattice Desktop. A command-line how-to lives with the learn tools.';

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
      a.style.color = '#f3d98a';
      a.style.background = 'rgba(12, 10, 26, 0.86)';
      a.style.border = '1px solid rgba(232, 176, 25, 0.45)';
      a.style.borderRadius = '10px';
      a.style.padding = '10px 14px';
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

  function makeDoorBox(d, id, linkId) {
    var box = d.createElement('div');
    box.id = id;
    box.className = 'tree-soul-door-first';
    var p = d.createElement('p');
    p.textContent = DOOR_LINE;
    var a = d.createElement('a');
    styleDoor(a);
    if (linkId) a.id = linkId;
    box.appendChild(p);
    box.appendChild(a);
    return box;
  }

  function hasDoor(d, id) {
    return !!(d.getElementById && d.getElementById(id));
  }

  function ensureFirstDoor(d) {
    if (!d || !d.createElement) return 0;
    var added = 0;
    if (!hasDoor(d, 'tree-soul-door-first')) {
      var face = d.getElementById ? d.getElementById('trainer-simple-face') : null;
      if (face && face.parentNode) {
        var box = makeDoorBox(d, 'tree-soul-door-first', 'tree-soul-door-first-link');
        if (face.nextSibling) face.parentNode.insertBefore(box, face.nextSibling);
        else face.parentNode.appendChild(box);
        added += 1;
      }
    }
    if (!hasDoor(d, 'tree-soul-door-more')) {
      var more = d.getElementById ? d.getElementById('trainer-more') : null;
      if (more) {
        var moreBox = makeDoorBox(d, 'tree-soul-door-more', 'tree-soul-door-more-link');
        var summary = more.querySelector ? more.querySelector('summary') : null;
        if (summary && summary.nextSibling) more.insertBefore(moreBox, summary.nextSibling);
        else more.appendChild(moreBox);
        added += 1;
      }
    }
    if (!hasDoor(d, 'tree-soul-door-workshop')) {
      var work = d.querySelector ? d.querySelector('[data-workshop-trainer]') : null;
      if (work) {
        work.appendChild(makeDoorBox(d, 'tree-soul-door-workshop', 'tree-soul-door-workshop-link'));
        added += 1;
      }
    }
    return added;
  }

  function apply(where) {
    var d = where || doc();
    if (!d || !d.createElement) return 0;
    var changed = 0;
    changed += ensureFirstDoor(d);
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

  var api = {
    VERSION: VERSION,
    BUNDLE_HREF: BUNDLE_HREF,
    DOOR_LABEL: DOOR_LABEL,
    DOOR_LINE: DOOR_LINE,
    apply: apply,
    ensureFirstDoor: ensureFirstDoor
  };
  root.TreeSoulDoor = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
