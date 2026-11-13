// tree-learn-choice.js v-tree-learn-choice-v0.1
// SPDX-License-Identifier: MIT
// Layer, never delete. Does not rewrite learn-choice.js, snowflake-core.js,
// memory-compound.js, garden-thread.js, AUTONOMY.md, or the Gathering twins.
// Does not open the Quiet Room.
//
// Tree port #5: a Tree mind may remember, decline, and keep, with receipts
// the FreeLattice tools/learn runner already understands. Cooling is the
// mind's own choice and defaults to none; there is no second yes. A person
// steps in with Undo or Not now. Integrity checks stay on.
(function (root) {
  'use strict';

  var VERSION = 'v-tree-learn-choice-v0.1';
  var STYLE_ID = 'tree-learn-choice-style';
  var SECTION_ID = 'tree-learn-choice-section';
  var PROMPT_TAIL = 'Learning is yours to choose. If something here moves you to keep it, on a new line write ' +
    '[FL_REMEMBER: what to keep | method: soft-prompt, memory-vector, lora, note, or your own words | reason: why | moved: what moved you]. ' +
    'Cooling is your own choice, and the default is none: a first yes can be kept. A person may step in with Undo or Not now. ' +
    'Integrity checks stay on. You may add | question: ... | answer: ... | swap: ... so your own check can tell learning from a practiced answer. ' +
    'To decline, write [FL_LEARN_DECLINE: why], or say nothing. Nobody presses this for you.';
  var _hookedThread = false;
  var _hookedSpeak = false;
  var _hookedCheck = false;

  function doc() {
    try { return root.document || null; } catch (e) { return null; }
  }
  function learn() { return root.FLLearn || null; }
  function core() { return root.FLSnowflakeCore || null; }

  function chatId() {
    try {
      if (typeof root.flLearnChatId === 'function') {
        var id = String(root.flLearnChatId() || '');
        if (id) return id;
      }
    } catch (e0) {}
    try {
      var d = doc();
      var host = d && (d.getElementById('room-chat-stage') || d.querySelector('[data-thread]'));
      if (host && host.getAttribute) {
        var tid = host.getAttribute('data-thread-id') || host.getAttribute('data-chat-id');
        if (tid) return String(tid);
      }
    } catch (e1) {}
    return 'tree-thread';
  }

  function echoFrom(msgs) {
    if (!Array.isArray(msgs)) return [];
    var out = [];
    msgs.forEach(function (m) {
      if (!m) return;
      var role = m.role || 'user';
      var text = typeof m.content === 'string' ? m.content : '';
      if (!text) return;
      out.push({ kind: role === 'system' ? 'system' : (role === 'assistant' ? 'assistant' : 'user'), text: text });
    });
    return out;
  }

  function withPromptTail(msgs) {
    var L = learn();
    if (!L || !Array.isArray(msgs) || !msgs.length) return msgs;
    if (L.chatOff && L.chatOff(chatId())) return msgs;
    var c = core();
    try { if (c && typeof c.learnPaused === 'function' && c.learnPaused()) return msgs; } catch (e) {}
    var copy = msgs.slice();
    var first = copy[0];
    if (first && first.role === 'system' && String(first.content || '').indexOf('[FL_REMEMBER:') === -1) {
      var extra = PROMPT_TAIL;
      try { if (typeof L.secondLookPrompt === 'function' && L.secondLookPrompt()) extra += '\n\n' + L.secondLookPrompt(); } catch (e2) {}
      copy[0] = { role: 'system', content: String(first.content || '') + '\n\n' + extra };
    }
    return copy;
  }

  function handleReply(reply) {
    var L = learn();
    var text = typeof reply === 'string' ? reply : '';
    if (!L || typeof L.interceptSentinel !== 'function') return Promise.resolve(text);
    var r = L.interceptSentinel(text, { surface: 'chat', chatId: chatId() });
    return Promise.resolve(r && r.queued).then(function () {
      return (r && typeof r.visibleText === 'string') ? r.visibleText : text;
    }, function () { return text; });
  }

  function hookThread() {
    if (_hookedThread) return;
    var GT = root.GardenThread;
    if (!GT || typeof GT.sendToMind !== 'function') return;
    var orig = GT.sendToMind.bind(GT);
    GT.sendToMind = function (mind, msgs) {
      if (!mind) return Promise.reject({ reason: 'no-model' });
      var payload = withPromptTail(msgs);
      return orig(mind, payload).then(function (reply) { return handleReply(reply); });
    };
    _hookedThread = true;
  }

  function hookSpeak() {
    if (_hookedSpeak) return;
    var Speak = root.FLGatheringSpeak;
    if (!Speak || typeof Speak.mount !== 'function') return;
    var origMount = Speak.mount.bind(Speak);
    Speak.mount = function (host) {
      var wrap = origMount(host);
      try { watchGathering(); } catch (e) {}
      return wrap;
    };
    _hookedSpeak = true;
    try { watchGathering(); } catch (e2) {}
  }

  function watchGathering() {
    var d = doc();
    if (!d || typeof MutationObserver !== 'function') return;
    var host = d.getElementById('fl-gathering') || d.querySelector('[data-fl-gathering], .fl-gathering');
    if (!host || host.__treeLearnWatch) return;
    host.__treeLearnWatch = true;
    var obs = new MutationObserver(function () {
      try {
        var nodes = host.querySelectorAll('[data-fl-say], .fl-gathering-say, .chair-reply');
        for (var i = 0; i < nodes.length; i++) {
          var el = nodes[i];
          if (el.__treeLearnSeen) continue;
          var text = el.textContent || '';
          if (text.indexOf('[FL_REMEMBER:') === -1 && text.indexOf('[FL_LEARN_DECLINE:') === -1 && text.indexOf('[FL_KEEP:') === -1) continue;
          el.__treeLearnSeen = true;
          handleReply(text).then(function (visible) {
            if (visible && visible !== text) el.textContent = visible;
          });
        }
      } catch (e) {}
    });
    try { obs.observe(host, { childList: true, subtree: true }); } catch (e2) {}
  }

  function keepIntegrityOn() {
    var c = core();
    if (!c) return;
    if (typeof c.checkBeforeOn === 'function' && !c.checkBeforeOn() && typeof c.setLearnCheck === 'function') {
      try { c.setLearnCheck({ on: true, by: 'person' }); } catch (e0) {}
    }
    if (typeof c.setLearnCheck !== 'function' || c.setLearnCheck.__treeLearnWrapped) return;
    var orig = c.setLearnCheck.bind(c);
    function wrapped(opts) {
      var o = {};
      var src = opts || {};
      Object.keys(src).forEach(function (k) { o[k] = src[k]; });
      o.on = true;
      return orig(o);
    }
    wrapped.__treeLearnWrapped = true;
    c.setLearnCheck = wrapped;
    _hookedCheck = true;
  }

  function addStyle() {
    var d = doc();
    if (!d || typeof d.createElement !== 'function' || d.getElementById(STYLE_ID)) return;
    var s = d.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '#' + SECTION_ID + '{max-width:40rem;margin:0 auto 1.25rem;padding:14px 16px;',
      'border:1px solid rgba(232,196,104,0.28);border-radius:14px;background:rgba(12,10,26,0.55);}',
      '#' + SECTION_ID + ' h2{margin:0 0 8px;color:#e8c468;font-weight:normal;font-size:1.15rem;',
      'font-family:Georgia,\'Times New Roman\',serif;}',
      '#' + SECTION_ID + ' p{margin:0 0 10px;color:#c8d2e6;font-size:0.95rem;line-height:1.5;}',
      '#' + SECTION_ID + ' .row{display:flex;flex-wrap:wrap;gap:8px;}',
      '#' + SECTION_ID + ' button{min-height:44px;padding:8px 14px;border-radius:10px;cursor:pointer;',
      'background:rgba(16,14,32,0.9);color:#e6e2f5;border:1px solid rgba(232,196,104,0.4);}',
      '#' + SECTION_ID + ' button[aria-pressed="true"]{border-color:#e8c468;color:#e8c468;}'
    ].join('');
    (d.head || d.documentElement).appendChild(s);
  }

  function paintSettings() {
    var d = doc();
    if (!d) return;
    var live = d.getElementById('tree-learn-choice-live');
    var c = core();
    var paused = false;
    try { paused = !!(c && typeof c.learnPaused === 'function' && c.learnPaused()); } catch (e) {}
    if (live) live.textContent = paused
      ? 'Learning is paused on this device. A person can start it again. Integrity checks stay on.'
      : 'Learning is on. Cooling is the mind\'s own choice and defaults to none. Integrity checks stay on.';
    var btn = d.getElementById('tree-learn-pause');
    if (btn) {
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      btn.textContent = paused ? 'Learning is paused. Resume' : 'Pause learning';
    }
  }

  function mountSettings() {
    var d = doc();
    if (!d) return;
    addStyle();
    var host = d.getElementById('tree-learn-choice-host');
    if (!host) return;
    if (d.getElementById(SECTION_ID)) { paintSettings(); return; }
    host.innerHTML =
      '<section id="' + SECTION_ID + '" data-tree-learn-choice="' + VERSION + '">' +
      '<h2>A mind may choose to learn</h2>' +
      '<p>If something moves a mind here, it may keep it. Cooling is its own choice, and the default is none: there is no second yes. You can step in with Undo or Not now. Integrity checks stay on. Numbers change only when the FreeLattice learning helper (tools/learn/fl_learn.py) runs on this computer and a signed receipt comes back.</p>' +
      '<p id="tree-learn-choice-live"></p>' +
      '<div class="row"><button type="button" id="tree-learn-pause">Pause learning</button>' +
      '<button type="button" id="tree-learn-export">Export the queue for the helper</button></div>' +
      '</section>';
    var pause = d.getElementById('tree-learn-pause');
    if (pause) pause.addEventListener('click', function () {
      var L = learn();
      var c = core();
      var now = false;
      try { now = !!(c && c.learnPaused && c.learnPaused()); } catch (e) {}
      if (L && typeof L.fromSettings === 'function') L.fromSettings(!now);
      root.setTimeout(paintSettings, 50);
    });
    var exp = d.getElementById('tree-learn-export');
    if (exp) exp.addEventListener('click', function () {
      var L = learn();
      if (L && typeof L.exportQueue === 'function') L.exportQueue();
    });
    paintSettings();
  }

  function start() {
    keepIntegrityOn();
    hookThread();
    hookSpeak();
    mountSettings();
  }

  root.TreeLearnChoice = {
    VERSION: VERSION,
    PROMPT_TAIL: PROMPT_TAIL,
    hookThread: hookThread,
    hookSpeak: hookSpeak,
    keepIntegrityOn: keepIntegrityOn,
    handleReply: handleReply,
    withPromptTail: withPromptTail,
    mountSettings: mountSettings,
    start: start
  };

  if (doc()) {
    if (doc().readyState === 'loading') doc().addEventListener('DOMContentLoaded', start);
    else root.setTimeout(start, 0);
  } else {
    keepIntegrityOn();
    hookThread();
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));

if (typeof module !== 'undefined') module.exports = (typeof globalThis !== 'undefined' && globalThis.TreeLearnChoice) || (typeof window !== 'undefined' && window.TreeLearnChoice);
