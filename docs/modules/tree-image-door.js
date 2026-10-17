// tree-image-door.js (MIT) v-tree-parity-v0.1
// A small image door. The safety check runs first and fails closed.
// A local look asks only this computer, and only after Yes.
// The token path is optional. A style card reads one public gallery.
(function (root) {
  'use strict';

  var VERSION = 'v-tree-parity-v0.1';
  var REST_LINE = 'Image making is resting: the safety check did not load.';
  var TOKEN_KEY = 'fl_tree_image_token';
  var ADDR_KEY = 'fl_tree_image_address';
  var GALLERY_BASE = 'https://freelattice.com/';
  var statusEl = null;

  function safetyReady() {
    try {
      if (!root.ImageSafety || typeof root.ImageSafety.assessImageRequest !== 'function') return false;
      root.ImageSafety.assessImageRequest('a red door');
      return true;
    } catch (e) { return false; }
  }
  function say(text) {
    if (statusEl) statusEl.textContent = text;
  }
  function el(tag, text) {
    var node = root.document.createElement(tag);
    if (text != null) node.textContent = text;
    return node;
  }
  function readStore(key) {
    try { return root.localStorage ? (root.localStorage.getItem(key) || '') : ''; }
    catch (e) { return ''; }
  }
  function writeStore(key, value) {
    try { if (root.localStorage) root.localStorage.setItem(key, value); } catch (e) {}
  }
  function resting() {
    say(REST_LINE);
    return false;
  }
  function mount(host) {
    if (!host || !root.document) return;
    if (host.getAttribute && host.getAttribute('data-tree-image-door') === '1') return;
    if (host.setAttribute) host.setAttribute('data-tree-image-door', '1');
    var doc = root.document;
    if (doc.getElementById && !doc.getElementById('flTreeImageDoorStyle')) {
      var st = doc.createElement('style');
      st.id = 'flTreeImageDoorStyle';
      st.textContent = '.fl-tree-image-door{max-width:100%;overflow-wrap:anywhere;box-sizing:border-box;margin:8px 0;}' +
        '.fl-tree-image-door button,.fl-tree-image-door input{min-height:44px;box-sizing:border-box;max-width:100%;}' +
        '.fl-tree-image-door button{min-width:44px;margin:6px 8px 6px 0;padding:10px 14px;}' +
        '.fl-tree-image-door input{display:block;width:100%;margin:6px 0;}';
      if (doc.head) doc.head.appendChild(st);
    }
    host.className = ((host.className || '') + ' fl-tree-image-door').trim();
    if (root.FLStyleLedger && typeof root.FLStyleLedger.setPageBase === 'function') {
      root.FLStyleLedger.setPageBase(GALLERY_BASE);
    }
    statusEl = el('p', safetyReady() ? 'Image making waits until you say Yes.' : REST_LINE);
    host.appendChild(statusEl);
    var localHost = doc.getElementById('tree-image-local-host');
    if (localHost && root.FLImageLocal && typeof root.FLImageLocal.mount === 'function') root.FLImageLocal.mount(localHost);
    var styleHost = doc.getElementById('tree-style-ledger-host');
    if (styleHost && root.FLStyleLedger && typeof root.FLStyleLedger.mount === 'function') root.FLStyleLedger.mount(styleHost);

    var wordsLabel = el('label', 'Image words');
    wordsLabel.setAttribute('for', 'tree-image-words');
    var words = el('input', '');
    words.id = 'tree-image-words';
    words.type = 'text';
    var tokenLabel = el('label', 'Image token');
    tokenLabel.setAttribute('for', 'tree-image-token');
    var token = el('input', '');
    token.id = 'tree-image-token';
    token.type = 'password';
    token.value = readStore(TOKEN_KEY);
    var addrLabel = el('label', 'Image service address');
    addrLabel.setAttribute('for', 'tree-image-address');
    var addr = el('input', '');
    addr.id = 'tree-image-address';
    addr.type = 'text';
    addr.value = readStore(ADDR_KEY);
    var keep = el('button', 'Keep the image token on this device');
    keep.type = 'button';
    keep.style.minHeight = '44px';
    keep.addEventListener('click', function () {
      writeStore(TOKEN_KEY, String(token.value || ''));
      writeStore(ADDR_KEY, String(addr.value || ''));
      say('The token stays on this device. Nothing was sent.');
    });
    var make = el('button', 'Make an image');
    make.type = 'button';
    make.style.minHeight = '44px';
    make.addEventListener('click', function () {
      if (!safetyReady()) return resting();
      var prompt = String(words.value || '').trim();
      if (!prompt) { say('Write a few image words first. Nothing was sent.'); return; }
      var local = root.FLImageLocal;
      if (!local) { say(REST_LINE); return; }
      var job = null;
      if (local.ready && local.ready() && typeof local.generate === 'function') job = local.generate(prompt);
      else if (token.value && addr.value && typeof local.hostedCall === 'function') job = local.hostedCall(root.fetch, String(addr.value), String(token.value), prompt);
      else { say('Say Yes to a local look, or keep a token and an address. Nothing was sent.'); return; }
      Promise.resolve(job).then(function (res) {
        if (!res || res.ok !== true) { say((res && (res.line || res.reason)) || 'No image was made.'); return; }
        if (typeof local.remember === 'function') {
          local.remember({ prompt: prompt, modelId: local.ready && local.ready() ? 'local-image' : 'token-image' }).then(function (rec) {
            say(rec && rec.caption ? rec.caption : 'The image kept both fingerprints.');
          });
        } else say('The image was made.');
      });
    });
    host.appendChild(wordsLabel);
    host.appendChild(words);
    host.appendChild(tokenLabel);
    host.appendChild(token);
    host.appendChild(addrLabel);
    host.appendChild(addr);
    host.appendChild(keep);
    host.appendChild(make);
  }
  function boot() {
    var doc = root.document;
    if (!doc || !doc.getElementById) return;
    var host = doc.getElementById('tree-image-door-host');
    if (host) mount(host);
  }

  var api = {
    VERSION: VERSION,
    REST_LINE: REST_LINE,
    safetyReady: safetyReady,
    mount: mount,
    boot: boot
  };
  root.FLTreeImage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.document) {
    if (root.document.readyState === 'loading' && root.document.addEventListener) {
      root.document.addEventListener('DOMContentLoaded', boot);
    } else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
