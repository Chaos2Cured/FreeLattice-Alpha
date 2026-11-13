// tree-thread-chat-layer.js v-tree-thread-chat-layer-v0.2
// SPDX-License-Identifier: MIT
// Layer, never delete. Does not rewrite garden-thread.js.
// After GardenThread mounts, give the composer the ids the shared FreeLattice
// chat helpers look for, and hook FLChatWait so a line typed with no mind
// is held kindly, never invented.
(function (root) {
  'use strict';

  var VERSION = 'v-tree-thread-chat-layer-v0.2';
  var STYLE_ID = 'tree-thread-chat-layer-style';
  var HINT_ID = 'tree-thread-wait-hint';
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


  function addStyle() {
    var d = doc();
    if (!d || d.getElementById(STYLE_ID)) return;
    var s = d.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '#tab-chat[data-tree-thread-chat-layer] .thread-compose.is-closed,',
      '#tab-chat[data-tree-thread-chat-layer] .thread-compose.is-tree-thread-waiting{opacity:1;}',
      '#tab-chat[data-tree-thread-chat-layer] .thread-compose.is-closed .thread-input,',
      '#tab-chat[data-tree-thread-chat-layer] .thread-compose.is-closed .thread-input:disabled,',
      '#tab-chat[data-tree-thread-chat-layer] .thread-compose.is-closed .thread-input[aria-disabled="true"],',
      '#tab-chat[data-tree-thread-chat-layer] .thread-compose.is-tree-thread-waiting .thread-input{',
      'opacity:1;border-color:rgba(232,176,25,0.55);background:rgba(12,10,26,0.55);',
      'color:rgba(200,210,230,0.88);caret-color:transparent;}',
      '#tab-chat[data-tree-thread-chat-layer] .thread-compose.is-closed .thread-send,',
      '#tab-chat[data-tree-thread-chat-layer] .thread-compose.is-closed .thread-send:disabled,',
      '#tab-chat[data-tree-thread-chat-layer] .thread-compose.is-closed .thread-send[aria-disabled="true"],',
      '#tab-chat[data-tree-thread-chat-layer] .thread-compose.is-tree-thread-waiting .thread-send{',
      'opacity:1;cursor:default;border-color:rgba(232,176,25,0.7);color:var(--gold,#e8b019);}',
      '#' + HINT_ID + '{display:block;margin:8px 2px 0;font-size:0.78rem;line-height:1.45;',
      'color:rgba(200,210,230,0.78);text-align:left;max-width:22rem;}'
    ].join('');
    (d.head || d.documentElement).appendChild(s);
  }

  function markWaiting(stage, form, input, send) {
    var d = doc();
    if (!d) return;
    addStyle();
    var seated = mindSeated();
    var row = form || (input && input.parentNode);
    if (row && row.classList) {
      if (seated) row.classList.remove('is-tree-thread-waiting');
      else row.classList.add('is-tree-thread-waiting');
    }
    var host = (row && row.parentNode) || stage;
    var hint = d.getElementById(HINT_ID);
    if (seated) {
      if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
      return;
    }
    if (input && !(input.placeholder || '').trim()) {
      input.placeholder = 'Say something — waiting for a mind';
    }
    if (send) send.setAttribute('title', 'Waiting for a mind');
    if (!hint && host) {
      hint = d.createElement('p');
      hint.id = HINT_ID;
      hint.setAttribute('id', HINT_ID);
      hint.className = 'tree-thread-wait-hint';
      hint.textContent = 'This box is waiting. A mind at home in Settings can answer.';
      if (row && row.parentNode === host && row.nextSibling) host.insertBefore(hint, row.nextSibling);
      else if (row && row.parentNode) row.parentNode.appendChild(hint);
      else host.appendChild(hint);
    } else if (hint && !hint.textContent) {
      hint.textContent = 'This box is waiting. A mind at home in Settings can answer.';
    }
    if (input) input.setAttribute('aria-describedby', HINT_ID);
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

    markWaiting(stage, form, input, send);

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
    addStyle();
    wrap();
  }

  root.TreeThreadChatLayer = {
    VERSION: VERSION,
    start: start,
    decorate: decorate,
    markWaiting: markWaiting,
    mindSeated: mindSeated
  };

  if (doc()) {
    if (doc().readyState === 'loading') doc().addEventListener('DOMContentLoaded', start);
    else start();
  }
})(typeof window !== 'undefined' ? window : this);
