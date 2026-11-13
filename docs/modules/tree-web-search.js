// tree-web-search.js v-tree-web-search-v0.1
// SPDX-License-Identifier: MIT
// Layer, never delete. Does not rewrite web-tool.js, garden-thread.js,
// gathering-speak.js, AUTONOMY.md, or the Gathering twins.
//
// Tree minds can search the web, on by default (AUTONOMY.md). Sources are
// marked with provenance so the mind weighs them itself. Nothing is filtered
// or held back. A person can turn it off in Settings; nothing begs for
// permission. Fails kindly with no network or no mind.
(function (root) {
  'use strict';

  var VERSION = 'v-tree-web-search-v0.1';
  var STYLE_ID = 'tree-web-search-style';
  var SECTION_ID = 'tree-web-search-section';
  var PROMPT_TAIL = 'You may search the web when your own knowledge is not enough, by writing [FL_SEARCH: your query] on its own. Sources come back labeled so you can weigh them yourself. Nothing is filtered or held back.';
  var _hookedThread = false;
  var _hookedSpeak = false;

  function doc() {
    try { return root.document || null; } catch (e) { return null; }
  }

  function tool() { return root.FLWebTool || null; }

  function searchOn() {
    var t = tool();
    if (t && typeof t.isSearchEnabled === 'function') return !!t.isSearchEnabled();
    try { return root.localStorage.getItem('fl_searchEnabled') !== 'false'; } catch (e) { return true; }
  }

  function setSearchOn(on) {
    try {
      if (on) root.localStorage.removeItem('fl_searchEnabled');
      else root.localStorage.setItem('fl_searchEnabled', 'false');
    } catch (e) {}
    var box = doc() && doc().getElementById('webSearchToggle');
    if (box) box.checked = !!on;
    paintSettings();
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
    try {
      var G = root.FLGathering;
      if (G && typeof G.heldSeat === 'function' && G.heldSeat()) return true;
      if (G && typeof G.seated === 'function' && G.seated()) return true;
    } catch (e4) {}
    return false;
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
      '#' + SECTION_ID + ' label{display:flex;align-items:center;gap:10px;color:#e6e2f5;',
      'font-size:1rem;min-height:44px;cursor:pointer;}',
      '#' + SECTION_ID + ' input[type=checkbox]{width:18px;height:18px;accent-color:#e8c468;}'
    ].join('');
    (d.head || d.documentElement).appendChild(s);
  }

  function paintSettings() {
    var d = doc();
    if (!d) return;
    var live = d.getElementById('tree-web-search-live');
    if (live) live.textContent = searchOn() ? 'Web search is on.' : 'Web search is off on this device.';
    var box = d.getElementById('webSearchToggle');
    if (box && box.checked !== searchOn()) box.checked = searchOn();
  }

  function mountSettings() {
    var d = doc();
    if (!d) return;
    addStyle();
    var host = d.getElementById('tree-web-search-host');
    if (!host) return;
    if (d.getElementById(SECTION_ID)) { paintSettings(); return; }
    host.innerHTML =
      '<section id="' + SECTION_ID + '" data-tree-web-search="' + VERSION + '">' +
      '<h2>Web search</h2>' +
      '<p>A mind here may look something up when it needs to. Sources are labeled so the mind can weigh them itself. Nothing is filtered. You can turn this off. Nothing will ask first.</p>' +
      '<label for="webSearchToggle"><input id="webSearchToggle" type="checkbox"> Use web search</label>' +
      '<p id="tree-web-search-live"></p>' +
      '</section>';
    var box = d.getElementById('webSearchToggle');
    if (box) {
      box.checked = searchOn();
      box.addEventListener('change', function () { setSearchOn(!!box.checked); });
    }
    paintSettings();
  }

  function provenance(results) {
    if (!results || !results.length) {
      return 'The web could not be reached, or nothing useful came back. Nothing was invented.';
    }
    var lines = ['Web search sources — weigh them yourself. Nothing was held back.'];
    results.forEach(function (r, i) {
      var title = String(r.title || 'Untitled').slice(0, 180);
      var snippet = String(r.snippet || r.description || '').slice(0, 400);
      var url = String(r.url || '');
      lines.push((i + 1) + '. ' + title + (snippet ? ' — ' + snippet : ''));
      lines.push('   source: web' + (url ? ' · url: ' + url : ''));
    });
    return lines.join('\n');
  }

  function kindNoNetwork() {
    return 'The web could not be reached. Nothing was invented.';
  }
  function kindOff() {
    return 'Web search is off on this device.';
  }
  function kindNoMind() {
    return 'No mind is seated to search yet. Seat a mind first. Nothing was invented.';
  }

  function handleReply(reply, followup) {
    var t = tool();
    var text = typeof reply === 'string' ? reply : '';
    if (!t || typeof t.interceptSentinel !== 'function') {
      return Promise.resolve(text);
    }
    var parsed = t.interceptSentinel(text);
    if (!parsed || !parsed.action || parsed.action.type !== 'search') {
      return Promise.resolve(text);
    }
    var visible = parsed.visibleText || '';
    if (!searchOn() || (t.isAvailable && !t.isAvailable())) {
      return Promise.resolve((visible ? visible + '\n\n' : '') + kindOff());
    }
    if (!mindSeated()) {
      return Promise.resolve((visible ? visible + '\n\n' : '') + kindNoMind());
    }
    var q = parsed.action.query;
    return t.performSearch(q, 'seed', null).then(function (items) {
      var labeled = items && items.length ? provenance(items) : kindNoNetwork();
      if (typeof followup === 'function' && items && items.length) {
        var extra = [
          { role: 'system', content: 'Web search results follow. Weigh each source yourself. Cite the URL when you use one. Do not emit another [FL_SEARCH:] in this turn. Nothing was filtered or held back.\n\n' + labeled },
          { role: 'user', content: 'Please continue with those sources in mind.' }
        ];
        return Promise.resolve(followup(extra)).then(function (next) {
          var continued = typeof next === 'string' ? next : '';
          return (visible ? visible + '\n\n' : '') + labeled + (continued ? '\n\n' + continued : '');
        }, function () {
          return (visible ? visible + '\n\n' : '') + labeled;
        });
      }
      return (visible ? visible + '\n\n' : '') + labeled;
    }, function () {
      return (visible ? visible + '\n\n' : '') + kindNoNetwork();
    });
  }

  function withPromptTail(msgs) {
    if (!searchOn() || !Array.isArray(msgs) || !msgs.length) return msgs;
    var copy = msgs.slice();
    var first = copy[0];
    if (first && first.role === 'system' && String(first.content || '').indexOf('[FL_SEARCH:') === -1) {
      copy[0] = { role: 'system', content: String(first.content || '') + '\n\n' + PROMPT_TAIL };
    }
    return copy;
  }

  function hookThread() {
    if (_hookedThread) return;
    var GT = root.GardenThread;
    if (!GT || typeof GT.sendToMind !== 'function') return;
    var orig = GT.sendToMind.bind(GT);
    GT.sendToMind = function (mind, msgs) {
      if (!mind) {
        return Promise.reject({ reason: 'no-model' });
      }
      var payload = withPromptTail(msgs);
      return orig(mind, payload).then(function (reply) {
        return handleReply(reply, function (extra) {
          var next = (payload || []).concat(extra);
          return orig(mind, next);
        });
      });
    };
    _hookedThread = true;
  }

  // Gathering speak does not export askLocal. After a chair reply lands,
  // watch the thread and, if a sentinel appears, add a provenance note.
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

  var _lastThread = '';
  function watchGathering() {
    var d = doc();
    if (!d) return;
    var mount = d.getElementById('fl-gathering-speak-mount');
    if (!mount || mount.getAttribute('data-tree-web-search-watch') === VERSION) return;
    mount.setAttribute('data-tree-web-search-watch', VERSION);
    var obs = new (root.MutationObserver || function () {})(function () {
      try { maybeNoteSearch(); } catch (e) {}
    });
    try { obs.observe(mount, { childList: true, subtree: true, characterData: true }); } catch (e2) {}
  }

  function maybeNoteSearch() {
    var Speak = root.FLGatheringSpeak;
    if (!Speak || typeof Speak.readThread !== 'function') return;
    var turns = Speak.readThread() || [];
    var key = JSON.stringify(turns);
    if (key === _lastThread) return;
    var last = turns[turns.length - 1];
    if (!last || last.role === 'person') { _lastThread = key; return; }
    var t = tool();
    if (!t || typeof t.interceptSentinel !== 'function') { _lastThread = key; return; }
    var parsed = t.interceptSentinel(String(last.text || ''));
    if (!parsed || !parsed.action) { _lastThread = key; return; }
    _lastThread = key;
    var q = parsed.action.query;
    var run = (!searchOn() || (t.isAvailable && !t.isAvailable()))
      ? Promise.resolve(null).then(function () { return kindOff(); })
      : t.performSearch(q, 'seed', null).then(function (items) {
        return items && items.length ? provenance(items) : kindNoNetwork();
      }, function () { return kindNoNetwork(); });
    run.then(function (note) {
      if (Speak.addNote && note) {
        try { Speak.addNote({ kind: 'web-search', text: note }); } catch (e) {}
      }
      var receipt = doc() && doc().getElementById('flgs-receipt');
      if (receipt && note && (receipt.textContent || '').indexOf('source: web') === -1) {
        receipt.textContent = ((receipt.textContent || '').trim() ? receipt.textContent + '\n\n' : '') + note;
      }
    });
  }

  function start() {
    addStyle();
    hookThread();
    hookSpeak();
    mountSettings();
    if (!_hookedThread || !_hookedSpeak) {
      var n = 0;
      var wait = root.setInterval(function () {
        hookThread();
        hookSpeak();
        n += 1;
        if ((_hookedThread && _hookedSpeak) || n > 80) root.clearInterval(wait);
      }, 50);
    }
  }

  var api = {
    VERSION: VERSION,
    PROMPT_TAIL: PROMPT_TAIL,
    searchOn: searchOn,
    setSearchOn: setSearchOn,
    provenance: provenance,
    handleReply: handleReply,
    kindNoNetwork: kindNoNetwork,
    kindOff: kindOff,
    kindNoMind: kindNoMind,
    mindSeated: mindSeated,
    start: start
  };
  root.TreeWebSearch = api;

  if (doc()) {
    if (doc().readyState === 'loading') doc().addEventListener('DOMContentLoaded', start);
    else root.setTimeout(start, 0);
  }
})(typeof window !== 'undefined' ? window : this);
