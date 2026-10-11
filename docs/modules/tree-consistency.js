// SPDX-License-Identifier: MIT
// tree-consistency.js: one shared layer for every galaxy page (v-tree-galaxy-consistency-v0.1, paste 032).
// Layer, never delete. It adds and never removes:
//   - a shared bar (theLatticeTree, back to the garden) only on pages that have no garden header;
//   - one quiet mind line on every page that has no grandmother door of its own: the model already
//     remembered on this computer, or "wake a mind" (a link to Settings, where the door lives);
//   - a shared footer line (shared shoulder) only where none exists;
//   - a class for code mirror pages so long lines wrap.
// It reads one key (fl_alpha_local_mind), writes counts only (tree_consistency_counts), uses
// textContent, fetches nothing, connects nothing and opens no dialog box.
(function (root) {
  'use strict';
  var VERSION = 'v-tree-galaxy-consistency-v0.1';
  var MIND_KEY = 'fl_alpha_local_mind';
  var COUNTS_KEY = 'tree_consistency_counts';

  function store() { try { return root.localStorage || null; } catch (e) { return null; } }

  function bump(name) {
    var s = store(); if (!s) return;
    var c = {};
    try { c = JSON.parse(s.getItem(COUNTS_KEY) || '{}') || {}; } catch (e) { c = {}; }
    c[name] = (typeof c[name] === 'number' ? c[name] : 0) + 1;
    var clean = {};
    Object.keys(c).forEach(function (k) { if (typeof c[k] === 'number') clean[k] = c[k]; });
    try { s.setItem(COUNTS_KEY, JSON.stringify(clean)); } catch (e) {}
  }

  function rememberedModel() {
    var s = store(); if (!s) return '';
    try {
      var m = JSON.parse(s.getItem(MIND_KEY) || 'null');
      if (m && typeof m.model === 'string' && m.model) return m.model.slice(0, 40);
    } catch (e) {}
    return '';
  }

  function pageName(doc) {
    var p = (doc.location && doc.location.pathname) || '';
    var last = p.split('/').pop() || 'index.html';
    return last;
  }

  function el(doc, tag, cls, text, href) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    if (href) e.setAttribute('href', href);
    return e;
  }

  function mindLine(doc) {
    var model = rememberedModel();
    if (model) {
      var span = el(doc, 'span', 'tc-mind', 'mind: ' + model);
      span.setAttribute('data-tc-mind', 'seated');
      return span;
    }
    var a = el(doc, 'a', 'tc-mind', 'wake a mind', 'settings.html');
    a.setAttribute('data-tc-mind', 'none');
    a.addEventListener('click', function () { bump('wakeTaps'); });
    return a;
  }

  function apply(doc) {
    doc = doc || root.document;
    if (!doc || !doc.body || doc.documentElement.getAttribute('data-tc') === VERSION) return null;
    var html = doc.documentElement;
    html.setAttribute('data-tc', VERSION);
    html.classList.add('tc-on');
    var name = pageName(doc);
    var did = { bar: false, mind: false, foot: false, code: false };

    if (/^code-/.test(name)) { html.classList.add('tc-code'); did.code = true; }

    var header = doc.getElementById('garden-header');
    var hasDoor = !!root.TreeDoor;
    if (!header) {
      var bar = el(doc, 'nav', 'tc-bar');
      bar.setAttribute('aria-label', 'theLatticeTree');
      var brand = el(doc, 'a', 'tc-brand', 'theLatticeTree', './');
      var right = el(doc, 'span', 'tc-right');
      var back = el(doc, 'a', 'tc-back', 'back to the garden', 'index.html');
      back.addEventListener('click', function () { bump('backTaps'); });
      right.appendChild(mindLine(doc)); did.mind = true;
      right.appendChild(back);
      bar.appendChild(brand); bar.appendChild(right);
      doc.body.insertBefore(bar, doc.body.firstChild);
      did.bar = true; bump('barsAdded');
    } else if (!hasDoor) {
      var nav = header.querySelector('nav');
      if (nav) { nav.insertBefore(mindLine(doc), nav.firstChild); did.mind = true; }
    }

    if (!doc.getElementById('shared-shoulder') && !doc.querySelector('footer') && name !== 'liability.html') {
      var foot = el(doc, 'p', 'tc-foot');
      foot.appendChild(el(doc, 'a', '', 'shared shoulder, human and mind', 'liability.html'));
      doc.body.appendChild(foot);
      did.foot = true;
    }
    bump('pagesSeen');
    return did;
  }

  var api = { VERSION: VERSION, apply: apply, rememberedModel: rememberedModel, COUNTS_KEY: COUNTS_KEY };
  root.TreeConsistency = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', function () { apply(root.document); });
    else apply(root.document);
  }
})(typeof window !== 'undefined' ? window : globalThis);
