// tree-gathering-mount.js v-tree-gathering-brick3-v0.1
// SPDX-License-Identifier: MIT
// Layer, never delete. Does not change fl-gathering.js or gathering-speak.js.
// When the Gathering room opens, mount the shared byte-identical twins into
// hosts on that page. The older chair ring stays in garden-rooms.js, and is
// tucked away so grandma sees one set of chairs.
(function (root) {
  'use strict';

  var VERSION = 'v-tree-gathering-brick3-v0.1';
  var STYLE_ID = 'tree-gathering-mount-style';
  var LAYER_ID = 'fl-gathering-layer';
  var CHAIRS_ID = 'fl-gathering-mount';
  var SPEAK_ID = 'fl-gathering-speak-mount';
  var _obs = null;
  var _painting = false;

  function doc() {
    try { return root.document || null; } catch (e) { return null; }
  }

  function gatheringOpen() {
    var d = doc();
    if (!d || !d.getElementById) return false;
    var veil = d.getElementById('place-veil');
    if (veil && !veil.hidden && veil.classList && veil.classList.contains('is-open') && veil.classList.contains('is-core')) {
      return true;
    }
    var g = d.getElementById('core-gathering');
    if (g && !g.hidden) return true;
    return false;
  }

  function addStyle() {
    var d = doc();
    if (!d || d.getElementById(STYLE_ID)) return;
    var s = d.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.core-gathering.is-fl-gathering-mounted > .core-chairs,',
      '.core-gathering.is-fl-gathering-mounted > .core-find-minds,',
      '.core-gathering.is-fl-gathering-mounted > .core-bind-picker,',
      '.core-gathering.is-fl-gathering-mounted > .core-line { display: none; }',
      '#' + LAYER_ID + '{margin:0 0 1.2rem;max-width:42rem;}',
      '#' + CHAIRS_ID + ', #' + SPEAK_ID + '{min-width:0;}'
    ].join('');
    (d.head || d.documentElement).appendChild(s);
  }

  function ensureHosts(wrap) {
    var d = doc();
    if (!wrap || !d) return null;
    var layer = d.getElementById(LAYER_ID);
    if (layer && layer.parentNode === wrap) return layer;
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    layer = d.createElement('div');
    layer.id = LAYER_ID;
    layer.setAttribute('data-tree-gathering-mount', VERSION);
    var chairs = d.createElement('div');
    chairs.id = CHAIRS_ID;
    var speak = d.createElement('div');
    speak.id = SPEAK_ID;
    layer.appendChild(chairs);
    layer.appendChild(speak);
    var caption = wrap.querySelector('[data-core-router-plain], .core-center');
    if (caption && caption.parentNode === wrap) {
      if (caption.nextSibling) wrap.insertBefore(layer, caption.nextSibling);
      else wrap.appendChild(layer);
    } else if (wrap.firstChild) wrap.insertBefore(layer, wrap.firstChild);
    else wrap.appendChild(layer);
    return layer;
  }

  function sync() {
    if (_painting) return;
    _painting = true;
    if (_obs) {
      try { _obs.disconnect(); } catch (e) {}
    }
    try {
      var d = doc();
      if (!d) return;
      addStyle();
      if (!gatheringOpen()) return;
      if (!root.FLGathering || typeof root.FLGathering.mount !== 'function') return;
      if (!root.FLGatheringSpeak || typeof root.FLGatheringSpeak.mount !== 'function') return;
      var host = d.getElementById('core-gathering');
      if (!host) return;
      var wrap = host.querySelector('.core-gathering') || host;
      var layer = ensureHosts(wrap);
      if (!layer) return;
      wrap.classList.add('is-fl-gathering-mounted');
      var chairs = d.getElementById(CHAIRS_ID);
      var speak = d.getElementById(SPEAK_ID);
      if (chairs && !chairs.querySelector('[data-gathering]')) {
        root.FLGathering.mount(chairs);
      }
      if (speak && !speak.querySelector('[data-marker]')) {
        root.FLGatheringSpeak.mount(speak);
      }
    } finally {
      _painting = false;
      watch();
    }
  }

  function watch() {
    var d = doc();
    if (!d || typeof root.MutationObserver !== 'function') return;
    if (!_obs) {
      _obs = new root.MutationObserver(function () {
        if (_painting) return;
        sync();
      });
    }
    try { _obs.disconnect(); } catch (e) {}
    function observe(node, opts) {
      if (!node) return;
      try { _obs.observe(node, opts); } catch (e) {}
    }
    observe(d.getElementById('place-veil'), { attributes: true, attributeFilter: ['class', 'hidden'] });
    var g = d.getElementById('core-gathering');
    observe(g, { attributes: true, attributeFilter: ['hidden', 'class'], childList: true });
    if (d.body && !g) observe(d.body, { childList: true, subtree: false });
  }

  function start() {
    addStyle();
    watch();
    sync();
  }

  root.TreeGatheringMount = {
    VERSION: VERSION,
    start: start,
    sync: sync,
    gatheringOpen: gatheringOpen
  };

  if (doc()) {
    if (doc().readyState === 'loading') doc().addEventListener('DOMContentLoaded', start);
    else root.setTimeout(start, 0);
  }
})(typeof window !== 'undefined' ? window : this);
