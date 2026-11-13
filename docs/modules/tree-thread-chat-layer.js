// tree-thread-chat-layer.js v-tree-thread-chat-layer-v0.1
// SPDX-License-Identifier: MIT
// Layer, never delete. Does not rewrite garden-thread.js.
// After GardenThread mounts, give the composer the ids the shared FreeLattice
// chat helpers look for, and hook FLChatWait so a line typed with no mind
// is held kindly, never invented.
(function (root) {
  'use strict';

  var VERSION = 'v-tree-thread-chat-layer-v0.1';
  var _wrapped = false;

  function doc() {
    try { return root.document || null; } catch (e) { return null; }
  }

  function mindSeated() {
    try {
      var P = root.LocalMindProbe;
      if (P && typeof P.getRemembered === 'function' && P.getRemembered()) return true;
    } catch (e) {}
    try {
      var T = root.TreePool;
      if (T && T.chatRoute && T.chatRoute()) return true;
    } catch (e2) {}
    try {
      var B = root.TreeBrowserMind;
      if (B && B.awakeModel && B.awakeModel()) return true;
    } catch (e3) {}
    return false;
  }

  function decorate(stage) {
    var d = doc();
    if (!d || !stage) return;
    var form = stage.querySelector ? stage.querySelector('.thread-compose') : null;
    var input = stage.querySelector ? stage.querySelector('[data-thread-input], .thread-input') : null;
    var send = stage.querySelector ? stage.querySelector('.thread-send') : null;
    var list = stage.querySelector ? stage.querySelector('.thread-list, [data-thread-list]') : null;
    if (!form && !input) return;

    var tab = stage.id === 'tab-chat' ? stage : (stage.closest && stage.closest('#tab-chat'));
    if (!tab) {
      if (stage.getAttribute && stage.getAttribute('id') !== 'tab-chat') {
        if (!d.getElementById('tab-chat')) stage.setAttribute('id', 'tab-chat');
      }
      tab = stage;
    }
    tab.setAttribute('data-tree-thread-chat-layer', VERSION);

    var row = form || (input && input.parentNode);
    if (row && row.className && String(row.className).indexOf('chat-input-row') === -1) {
      row.className = String(row.className || '') + ' chat-input-row';
    } else if (row && !row.className) {
      row.className = 'chat-input-row';
    }
    if (input && !input.id) input.id = 'chatInput';
    if (send && !send.id) send.id = 'sendBtn';
    if (list && !list.id) list.id = 'chatMessages';

    if (root.FLChatBottom && typeof root.FLChatBottom.arrange === 'function') {
      try { root.FLChatBottom.arrange(); } catch (e) {}
    }
    if (root.FLChatAutonomy && typeof root.FLChatAutonomy.boot === 'function') {
      try { root.FLChatAutonomy.boot(); } catch (e2) {}
    }

    if (form && !form.getAttribute('data-tree-thread-chat-bound')) {
      form.setAttribute('data-tree-thread-chat-bound', VERSION);
      form.addEventListener('submit', function (ev) {
        if (mindSeated()) return;
        var text = input ? String(input.value || '').trim() : '';
        if (!text) return;
        if (ev && ev.preventDefault) ev.preventDefault();
        if (root.FLChatWait && typeof root.FLChatWait.hold === 'function') {
          root.FLChatWait.hold(text, {
            document: d,
            chat: list || stage,
            input: input,
            openConnect: function () {
              try { root.location.href = 'settings.html'; } catch (e3) {}
            }
          });
        }
      }, true);
    }
  }

  function wrap() {
    if (_wrapped) return;
    var GT = root.GardenThread;
    if (!GT || typeof GT.mount !== 'function') return;
    _wrapped = true;
    var orig = GT.mount;
    GT.mount = function (stage, opts) {
      var result = orig.apply(this, arguments);
      try { decorate(stage); } catch (e) {}
      return result;
    };
  }

  function start() {
    wrap();
  }

  root.TreeThreadChatLayer = {
    VERSION: VERSION,
    start: start,
    decorate: decorate,
    mindSeated: mindSeated
  };

  if (doc()) {
    if (doc().readyState === 'loading') doc().addEventListener('DOMContentLoaded', start);
    else start();
  }
})(typeof window !== 'undefined' ? window : this);
