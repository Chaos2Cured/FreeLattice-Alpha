// tree-gathering-mount.js v-tree-gathering-brick3-v0.2
// SPDX-License-Identifier: MIT
// Layer, never delete. Does not change fl-gathering.js or gathering-speak.js.
// When the Gathering room opens, mount the shared byte-identical twins into
// a spaced container on that page. Once that mount succeeds, the older
// garden-rooms.js render is hidden so grandma sees one set of chairs, one
// ask, and one Checker. If the mount fails, the older render stays.
(function (root) {
  'use strict';

  var VERSION = 'v-tree-gathering-brick3-v0.2';
  var STYLE_ID = 'tree-gathering-mount-style';
  var LAYER_ID = 'fl-gathering-layer';
  var CHAIRS_ID = 'fl-gathering-mount';
  var SPEAK_ID = 'fl-gathering-speak-mount';
  var _obs = null;
  var _refuseObs = null;
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
    if (!d) return;
    var s = d.getElementById(STYLE_ID);
    if (!s) {
      s = d.createElement('style');
      s.id = STYLE_ID;
      (d.head || d.documentElement).appendChild(s);
    }
    s.setAttribute('data-tree-gathering-mount', VERSION);
    s.textContent = [
      /* Hide the garden-rooms duplicate only after the shared mount is in place. */
      '.core-gathering.is-fl-gathering-mounted > :not(#' + LAYER_ID + '){display:none !important;}',
      /* Spaced, night-sky container so planets and the old band cannot walk through the letters. */
      '#' + LAYER_ID + '{',
      'position:relative;z-index:2;margin:0 auto;max-width:42rem;width:100%;',
      'padding:0.85rem 1rem 1.35rem;box-sizing:border-box;border-radius:18px;',
      'background:rgba(12,10,26,0.84);box-shadow:0 0 28px rgba(12,10,26,0.55);',
      '}',
      '#' + CHAIRS_ID + ', #' + SPEAK_ID + '{min-width:0;}',
      '#' + LAYER_ID + ' .flgs-card,#' + LAYER_ID + ' .flg-chair,#' + LAYER_ID + ' .flg-picker{',
      'background:rgba(12,10,26,0.9);',
      '}',
      /* The veil scrolls; “the garden” sits after the Checker, not on it. */
      '#place-veil.is-core:has(.is-fl-gathering-mounted){',
      'overflow-y:auto;justify-content:flex-start;padding-bottom:4.5rem;',
      '}',
      '#place-veil.is-core:has(.is-fl-gathering-mounted) #core-gathering{',
      'flex:0 0 auto;width:min(42rem,100%);overflow:visible;min-height:0;',
      '}',
      '#place-veil.is-core:has(.is-fl-gathering-mounted) #place-veil-close{',
      'position:static !important;left:auto !important;right:auto !important;top:auto !important;',
      'bottom:auto !important;transform:none !important;margin:0.85rem auto 3.5rem;display:block;',
      '}',
      '#place-veil.is-core:has(.is-fl-gathering-mounted){',
      'overflow-y:auto !important;padding-bottom:5.5rem;',
      '}',
      '#place-veil.is-core:has(.is-fl-gathering-mounted) #core-gathering{',
      'overflow:visible !important;',
      '}',
      '#place-veil.is-core:has(.is-fl-gathering-mounted) #shared-shoulder,',
      'html:has(#place-veil.is-core.is-open .is-fl-gathering-mounted) #shared-shoulder,',
      'html:has(#place-veil.is-core.is-open .is-fl-gathering-mounted) #fl-clay-corner,',
      'html:has(#place-veil.is-core.is-open .is-fl-gathering-mounted) #room-label{',
      'visibility:hidden !important;pointer-events:none !important;',
      '}'
    ].join('');
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

  function setMounted(wrap, ok) {
    if (!wrap || !wrap.classList) return;
    if (ok) wrap.classList.add('is-fl-gathering-mounted');
    else wrap.classList.remove('is-fl-gathering-mounted');
  }

  function sameWords(a, b) {
    return String(a || '').replace(/\s+/g, ' ').trim() === String(b || '').replace(/\s+/g, ' ').trim();
  }

  function dedupeRefusal() {
    var d = doc();
    if (!d || !d.getElementById) return false;
    var who = d.getElementById('flgs-who');
    var receipt = d.getElementById('flgs-receipt');
    if (!who || !receipt) return false;
    var a = who.textContent;
    var b = receipt.textContent;
    if (a && b && sameWords(a, b)) {
      receipt.setAttribute('data-tree-gathering-deduped', VERSION);
      receipt.hidden = true;
      receipt.textContent = '';
      return true;
    }
    if (receipt.getAttribute && receipt.getAttribute('data-tree-gathering-deduped') && b && who && !sameWords(a, b)) {
      receipt.removeAttribute('data-tree-gathering-deduped');
      receipt.hidden = false;
    }
    return false;
  }


  function hookAsk() {
    var d = doc();
    if (!d || !d.getElementById) return;
    var btn = d.getElementById('flgs-ask-btn');
    if (!btn || (btn.getAttribute && btn.getAttribute('data-tree-gathering-dedupe-bound'))) return;
    if (btn.setAttribute) btn.setAttribute('data-tree-gathering-dedupe-bound', VERSION);
    if (btn.addEventListener) {
      btn.addEventListener('click', function () {
        try { root.setTimeout(dedupeRefusal, 0); } catch (e) { dedupeRefusal(); }
      }, false);
    }
  }

  function watchRefusal() {
    var d = doc();
    if (!d || typeof root.MutationObserver !== 'function') return;
    var who = d.getElementById('flgs-who');
    var receipt = d.getElementById('flgs-receipt');
    if (!who && !receipt) return;
    if (_refuseObs) {
      try { _refuseObs.disconnect(); } catch (e) {}
    }
    _refuseObs = new root.MutationObserver(function () {
      dedupeRefusal();
    });
    try {
      if (who) _refuseObs.observe(who, { childList: true, characterData: true, subtree: true });
      if (receipt) _refuseObs.observe(receipt, { childList: true, characterData: true, subtree: true });
    } catch (e2) {}
    dedupeRefusal();
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
      var host = d.getElementById('core-gathering');
      if (!host) return;
      var wrap = host.querySelector('.core-gathering') || host;
      var canMount = root.FLGathering && typeof root.FLGathering.mount === 'function' &&
        root.FLGatheringSpeak && typeof root.FLGatheringSpeak.mount === 'function';
      if (!canMount) {
        setMounted(wrap, false);
        return;
      }
      var layer = ensureHosts(wrap);
      if (!layer) {
        setMounted(wrap, false);
        return;
      }
      var chairs = d.getElementById(CHAIRS_ID);
      var speak = d.getElementById(SPEAK_ID);
      try {
        if (chairs && !chairs.querySelector('[data-gathering]')) {
          root.FLGathering.mount(chairs);
        }
        if (speak && !speak.querySelector('[data-marker]')) {
          root.FLGatheringSpeak.mount(speak);
        }
      } catch (err) {
        setMounted(wrap, false);
        return;
      }
      var ok = !!(chairs && chairs.querySelector('[data-gathering]'));
      setMounted(wrap, ok);
      if (ok) {
        watchRefusal();
        hookAsk();
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
    gatheringOpen: gatheringOpen,
    dedupeRefusal: dedupeRefusal
  };

  if (doc()) {
    if (doc().readyState === 'loading') doc().addEventListener('DOMContentLoaded', start);
    else root.setTimeout(start, 0);
  }
})(typeof window !== 'undefined' ? window : this);
