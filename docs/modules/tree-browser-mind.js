// tree-browser-mind.js v-tree-no-install-mind-v0.1 (paste 028)
// SPDX-License-Identifier: MIT (our code). The engine it wakes is WebLLM
// (@mlc-ai/web-llm 0.2.85, Apache-2.0), kept on this site in docs/lib/web-llm/.
//
// A mind with no install. Someone with no Ollama (a school laptop, say) can talk
// to a small mind that runs inside this browser, on this device's graphics chip
// (WebGPU). Nothing is installed. The mind's files download once, only after a
// human tap that shows the size first, and are kept in this browser's own storage,
// so the next visit downloads nothing.
//
// Honest about the network:
//   - The engine code is vendored (same site, pinned 0.2.85, checked by sha256 at
//     apply time). No CDN is asked for code.
//   - The mind's files (weights) come once from huggingface.co, and its small engine
//     file (about 5 MB, WebGPU code) from raw.githubusercontent.com. That is WebLLM's
//     own prebuilt list. Questions and answers never leave this device.
//   - Without WebGPU nothing downloads; the card says so kindly and points to the
//     asking card and the Device Pool.
//
// Seated like a local mind: "Seat it in Chat" (a tap) remembers it through
// LocalMindProbe.remember with url 'inpage:webllm' and kind 'in-browser'. The old
// remembered mind is kept aside (tree_browser_mind_prior) and "Give the seat back"
// returns it. Chat (garden-thread.js) and the Device Pool (tree-pool.js) talk to it
// in the page through TreeBrowserMind.chat; they never fetch for it.
//
// Pool: while awake, its model can be lent to trusted kin through the same door
// (kin only, Pause wins, 2 at a time). Pause interrupts a running answer.
//
// Receipts are counts only (tree_browser_mind_counts). No words, no names.
// Words by textContent only. No dialog boxes. No em dash.
// Mirror: docs/code-settings.html (read that FIRST)
(function (root) {
  'use strict';

  var VERSION = 'v-tree-no-install-mind-v0.1';
  var LIB_VERSION = '0.2.85';
  var LIB_URL = 'lib/web-llm/web-llm-0.2.85.js';
  var INPAGE_URL = 'inpage:webllm';
  var KIND = 'in-browser';
  var NAME = 'in-browser mind';
  var STATE_KEY = 'tree_browser_mind';            // { model, kept: true } after a finished download (no words)
  var PRIOR_KEY = 'tree_browser_mind_prior';      // the remembered mind this one stepped in front of
  var COUNTS_KEY = 'tree_browser_mind_counts';    // numbers only
  var MAX_TOKENS = 1024;

  // WebLLM 0.2.85 prebuilt ids. mb = download (weights, from Hugging Face, measured
  // 2026-10-09), gpu = graphics memory WebLLM says it needs. f32 twins are used when the
  // chip has no shader-f16; same download size, a little more graphics memory.
  var MODELS = [
    { id: 'SmolLM2-360M-Instruct-q4f16_1-MLC', f32: 'SmolLM2-360M-Instruct-q4f32_1-MLC', mb: 210, gpu: 380, gpu32: 580,
      license: 'Apache-2.0', note: 'the smallest; quick, simple answers' },
    { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', f32: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC', mb: 290, gpu: 950, gpu32: 1060,
      license: 'Apache-2.0', note: 'small and kind; a good first mind' },
    { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', f32: 'Llama-3.2-1B-Instruct-q4f32_1-MLC', mb: 710, gpu: 880, gpu32: 1130,
      license: 'Llama 3.2 Community License', note: 'not an open source license; it has its own use rules' },
    { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', f32: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC', mb: 880, gpu: 1630, gpu32: 1890,
      license: 'Apache-2.0', note: 'the biggest here; better answers, needs more memory' }
  ];
  // Not offered on purpose: the 3B size of the same family carries a research-only license.

  var WHERE = 'Where the files come from: the engine code is kept on this site (WebLLM ' + LIB_VERSION + ', Apache-2.0). ' +
    'The mind\'s files come once from huggingface.co, and its small engine file (about 5 MB) from raw.githubusercontent.com. ' +
    'They are kept in this browser, so the next visit downloads nothing. Your questions and its answers never leave this device.';
  var NO_GPU = 'This browser cannot run a mind inside the page (it has no WebGPU here). That is all right, nothing was downloaded. ' +
    'You can still talk to a mind: in Trusted kin, make an asking card, then join a room in the Device Pool and use a trusted device\'s mind. ' +
    'Chrome or Edge on a laptop usually has WebGPU.';

  var _gpu = { checked: false, ok: false, f16: false, why: '' };
  var _lib = null;
  var _engine = null;
  var _model = '';          // the id that is awake
  var _state = 'idle';      // idle | checking | no-webgpu | downloading | ready | failed
  var _progress = { pct: 0, text: '' };
  var _chosen = '';
  var _host = null;
  var _queue = Promise.resolve();
  var _fail = '';

  function safeGet(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { root.localStorage.setItem(k, v); } catch (e) {} }
  function readJson(k, f) { try { var r = safeGet(k); return r ? JSON.parse(r) : f; } catch (e) { return f; } }
  function counts() { var c = readJson(COUNTS_KEY, {}); return (c && typeof c === 'object') ? c : {}; }
  function bump(field) { var c = counts(); c[field] = (Number(c[field]) || 0) + 1; safeSet(COUNTS_KEY, JSON.stringify(c)); }
  function emit(name) { try { root.dispatchEvent(new root.CustomEvent(name, { detail: { model: _model, state: _state } })); } catch (e) {} }

  function info(id) {
    for (var i = 0; i < MODELS.length; i++) if (MODELS[i].id === id || MODELS[i].f32 === id) return MODELS[i];
    return null;
  }
  function runId(m) { return _gpu.f16 ? m.id : m.f32; }
  function sizeLine(m) {
    var gpu = _gpu.checked && !_gpu.f16 ? m.gpu32 : m.gpu;
    return 'about ' + m.mb + ' MB to download once, needs about ' + (gpu / 1000).toFixed(1) + ' GB of graphics memory, ' + m.license;
  }
  function kept() { var s = readJson(STATE_KEY, null); return s && typeof s.model === 'string' ? s.model : ''; }

  // ---- WebGPU, checked without any download ----
  function hasWebGPU() { var n = root.navigator || {}; return !!(n.gpu && typeof n.gpu.requestAdapter === 'function'); }
  function checkGpu() {
    if (_gpu.checked) return Promise.resolve(_gpu);
    if (!hasWebGPU()) { _gpu = { checked: true, ok: false, f16: false, why: 'no-webgpu' }; return Promise.resolve(_gpu); }
    return Promise.resolve().then(function () { return root.navigator.gpu.requestAdapter(); }).then(function (a) {
      if (!a) { _gpu = { checked: true, ok: false, f16: false, why: 'no-adapter' }; return _gpu; }
      var f16 = false;
      try { f16 = !!(a.features && a.features.has && a.features.has('shader-f16')); } catch (e) { f16 = false; }
      _gpu = { checked: true, ok: true, f16: f16, why: '' };
      return _gpu;
    }, function () { _gpu = { checked: true, ok: false, f16: false, why: 'no-adapter' }; return _gpu; });
  }

  // ---- the engine (loaded only after a human tap) ----
  // A path with no ./ and no scheme is a bare specifier. import() then never asks this site for the file.
  function engineSpecifier() {
    try {
      if (root.document && root.document.baseURI) return new root.URL(LIB_URL, root.document.baseURI).href;
    } catch (e) {}
    return LIB_URL;
  }
  function loadLib() {
    if (_lib) return Promise.resolve(_lib);
    if (typeof root.TreeBrowserMindLoader === 'function') {         // tests, or a page that brings its own
      return Promise.resolve(root.TreeBrowserMindLoader(LIB_URL)).then(function (m) { _lib = m; return m; });
    }
    // before v-tree-no-install-mind-v0.1: return import(LIB_URL).then(function (m) { _lib = m; return m; });
    return import(engineSpecifier()).then(function (m) { _lib = m; return m; });
  }
  // human must be true: only a tap handler passes it. Nothing downloads on mount or on its own.
  function wake(modelId, human) {
    if (human !== true) return Promise.resolve({ ok: false, reason: 'needs-tap' });
    var m = info(modelId);
    if (!m) return Promise.resolve({ ok: false, reason: 'no-such-model' });
    if (_state === 'downloading') return Promise.resolve({ ok: false, reason: 'busy' });
    return checkGpu().then(function (g) {
      if (!g.ok) { _state = 'no-webgpu'; paint(); return { ok: false, reason: 'no-webgpu' }; }
      var id = runId(m);
      if (_engine && _model === id) { _state = 'ready'; paint(); return { ok: true, model: id }; }
      _state = 'downloading'; _fail = ''; _progress = { pct: 0, text: '' }; paint();
      return loadLib().then(function (lib) {
        if (!lib || typeof lib.CreateMLCEngine !== 'function') throw new Error('no-engine');
        var drop = _engine; _engine = null; _model = '';
        if (drop && typeof drop.unload === 'function') { try { drop.unload(); } catch (e) {} }
        return lib.CreateMLCEngine(id, { initProgressCallback: function (r) {
          _progress = { pct: Math.max(0, Math.min(100, Math.round(((r && r.progress) || 0) * 100))), text: String((r && r.text) || '').slice(0, 160) };
          paintProgress();
        } });
      }).then(function (engine) {
        _engine = engine; _model = id; _state = 'ready';
        safeSet(STATE_KEY, JSON.stringify({ model: id, kept: true }));
        bump('woke');
        paint(); emit('tree-browser-mind-changed');
        return { ok: true, model: id };
      }).catch(function (e) {
        _state = 'failed';
        _fail = /no-engine|import|module|fetch.*lib|Failed to fetch dynamically/i.test(String((e && e.message) || e)) ? 'engine' : 'download';
        bump('failed');
        paint();
        return { ok: false, reason: _fail === 'engine' ? 'engine-missing' : 'download-failed' };
      });
    });
  }
  function sleep() {
    var e = _engine; _engine = null; _model = ''; _state = 'idle';
    if (e && typeof e.unload === 'function') { try { e.unload(); } catch (x) {} }
    paint(); emit('tree-browser-mind-changed');
  }
  function removeFiles(modelId, human) {
    if (human !== true) return Promise.resolve({ ok: false, reason: 'needs-tap' });
    var id = modelId || kept();
    if (_model === id) sleep();
    return loadLib().then(function (lib) {
      if (lib && typeof lib.deleteModelAllInfoInCache === 'function') return lib.deleteModelAllInfoInCache(id);
    }).then(function () { safeSet(STATE_KEY, ''); paint(); return { ok: true }; }, function () { return { ok: false, reason: 'not-removed' }; });
  }

  function ready(model) { return !!(_engine && _model && (!model || model === _model)); }
  function awakeModel() { return ready() ? _model : ''; }
  function isEntry(m) { return !!(m && (m.kind === KIND || String(m.url || '').indexOf('inpage:') === 0)); }

  // One answer at a time (one graphics chip). messages: [{role, content}] (system allowed).
  function chat(model, messages, opts) {
    opts = opts || {};
    var want = String(model || '');
    var run = _queue.then(function () {
      if (!ready()) { var e1 = new Error('browser-mind-asleep'); e1.reason = 'browser-mind-asleep'; throw e1; }
      if (want && want !== _model) { var e2 = new Error('no-such-model'); e2.reason = 'no-such-model'; throw e2; }
      if (opts.signal && opts.signal.aborted) { var e3 = new Error('aborted'); e3.reason = 'aborted'; throw e3; }
      var list = (Array.isArray(messages) ? messages : []).filter(function (x) {
        return x && (x.role === 'system' || x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string';
      }).map(function (x) { return { role: x.role, content: x.content }; });
      var stop = function () { try { _engine && _engine.interruptGenerate && _engine.interruptGenerate(); } catch (e) {} };
      if (opts.signal && opts.signal.addEventListener) opts.signal.addEventListener('abort', stop);
      return Promise.resolve(_engine.chat.completions.create({ messages: list, stream: false, max_tokens: MAX_TOKENS })).then(function (r) {
        if (opts.signal && opts.signal.aborted) { var e4 = new Error('aborted'); e4.reason = 'aborted'; throw e4; }
        var text = (r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content) || '';
        if (!text) { var e5 = new Error('quiet'); e5.reason = 'quiet'; throw e5; }
        bump('answered');
        return String(text);
      });
    });
    _queue = run.then(function () {}, function () {});
    return run;
  }

  // ---- the seat (a tap) ----
  function seatEntry(id) { return { id: KIND, kind: KIND, name: NAME, url: INPAGE_URL, model: id, models: [id] }; }
  function seat(human) {
    if (human !== true) return { ok: false, reason: 'needs-tap' };
    if (!ready()) return { ok: false, reason: 'browser-mind-asleep' };
    var P = root.LocalMindProbe;
    if (!P || typeof P.remember !== 'function') return { ok: false, reason: 'no-probe' };
    var prior = P.getRemembered ? P.getRemembered() : null;
    if (prior && !isEntry(prior)) safeSet(PRIOR_KEY, JSON.stringify(prior));   // kept aside, never dropped
    var entry = seatEntry(_model);
    if (prior && isEntry(prior)) { entry.roster = prior.roster; entry.gatheringBinds = prior.gatheringBinds; entry.speakingChair = prior.speakingChair; }
    P.remember(entry);
    bump('seated');
    paint();
    return { ok: true };
  }
  function seated() { var P = root.LocalMindProbe; var m = P && P.getRemembered ? P.getRemembered() : null; return isEntry(m); }
  function giveBack(human) {
    if (human !== true) return { ok: false, reason: 'needs-tap' };
    var prior = readJson(PRIOR_KEY, null);
    var P = root.LocalMindProbe;
    if (!prior || !P || typeof P.remember !== 'function') return { ok: false, reason: 'no-prior' };
    P.remember(prior);
    paint();
    return { ok: true };
  }

  // ---- the face ----
  var CSS = [
    '.tree-bmind{max-width:40rem;margin:1rem auto 0;padding:1rem 1.1rem;background:rgba(12,10,26,0.78);border:1px solid rgba(124,196,255,0.34);border-radius:12px;color:rgba(226,232,240,0.94);font-family:Georgia,"Times New Roman",serif;font-size:1rem;line-height:1.55;text-align:left;box-sizing:border-box;overflow-wrap:anywhere;}',
    '.tree-bmind h3{margin:0 0 0.4rem;font-size:1.08rem;font-weight:600;color:rgba(160,212,255,0.98);}',
    '.tree-bmind p{margin:0.45rem 0;}',
    '.tree-bmind-quiet{color:rgba(200,210,230,0.86);font-size:0.95rem;}',
    '.tree-bmind-state{color:#fff;font-weight:600;}',
    '.tree-bmind button{min-height:44px;min-width:44px;margin:0.35rem 0.5rem 0.35rem 0;padding:10px 16px;border-radius:10px;border:1px solid rgba(124,196,255,0.5);background:rgba(124,196,255,0.12);color:#fff;font-family:inherit;font-size:1rem;cursor:pointer;text-align:left;max-width:100%;box-sizing:border-box;white-space:normal;}',
    '.tree-bmind button.tree-bmind-main{background:#a0d4ff;border-color:#a0d4ff;color:#0e0c1e;font-weight:600;}',
    '.tree-bmind button[aria-pressed="true"]{border-color:#fff;background:rgba(124,196,255,0.3);}',
    '.tree-bmind button:disabled{opacity:0.55;cursor:default;}',
    '.tree-bmind button:focus-visible{outline:2px solid rgba(160,212,255,0.95);outline-offset:2px;}',
    '.tree-bmind-bar{height:10px;border-radius:5px;background:rgba(255,255,255,0.12);overflow:hidden;margin:0.4rem 0;}',
    '.tree-bmind-bar span{display:block;height:100%;background:#a0d4ff;width:0;}',
    '@media (max-width:480px){.tree-bmind{padding:0.9rem 0.8rem;}.tree-bmind button{display:block;width:100%;margin:0.45rem 0;}}'
  ].join('\n');
  function addStyle() {
    var d = root.document;
    if (!d || d.getElementById('tree-bmind-style')) return;
    var s = d.createElement('style'); s.id = 'tree-bmind-style'; s.textContent = CSS; d.head.appendChild(s);
  }
  function el(tag, cls, text) { var n = root.document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function button(label, fn, cls) { var b = el('button', cls || '', label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function empty(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }

  var _bar = null, _barText = null;
  function paintProgress() {
    if (_bar) _bar.style.width = _progress.pct + '%';
    if (_barText) _barText.textContent = 'Downloading once, then kept in this browser: ' + _progress.pct + '%' + (_progress.text ? '. ' + _progress.text : '');
  }
  function stateLine() {
    if (_state === 'ready') return 'Awake: ' + _model + ', an in-browser mind. It runs on this device only.';
    if (_state === 'downloading') return 'Waking. Please keep this page open.';
    if (_state === 'no-webgpu') return 'No WebGPU in this browser, so no mind can run inside the page here.';
    if (_state === 'failed') return _fail === 'engine' ? 'The engine code is not on this site yet, so nothing was downloaded.' : 'The download did not finish. Nothing was seated. You can try again.';
    if (_state === 'checking') return 'Checking this browser (no download)...';
    var k = kept();
    return k ? 'Asleep. ' + k + ' is already kept in this browser, so waking it downloads nothing.' : 'Asleep. Nothing downloaded yet.';
  }
  function paint() {
    if (!_host) return;
    empty(_host);
    _bar = null; _barText = null;
    var card = el('section', 'tree-bmind');
    card.setAttribute('data-tree-browser-mind', VERSION);
    card.appendChild(el('h3', '', 'A mind with no install'));
    card.appendChild(el('p', '', 'A small mind can run inside this browser, on this device\'s own graphics chip. No app to install, no account.'));
    var st = el('p', 'tree-bmind-state', stateLine());
    st.setAttribute('data-state', _state);
    card.appendChild(st);
    if (_gpu.checked && !_gpu.ok) {
      _state = _state === 'ready' ? _state : 'no-webgpu';
      st.textContent = stateLine();
      st.setAttribute('data-state', _state);
      var kind = el('p', 'tree-bmind-quiet', NO_GPU);
      kind.setAttribute('data-no-webgpu', '1');
      card.appendChild(kind);
      _host.appendChild(card);
      return;
    }
    if (_state === 'downloading') {
      var bar = el('div', 'tree-bmind-bar'); _bar = el('span', ''); bar.appendChild(_bar); card.appendChild(bar);
      _barText = el('p', 'tree-bmind-quiet', ''); card.appendChild(_barText); paintProgress();
    } else if (_state === 'ready') {
      if (seated()) {
        card.appendChild(el('p', 'tree-bmind-quiet', 'Seated in Chat. Chat shows it as in-browser mind. If you tap Let this device help in the Device Pool, trusted kin can ask it too, and Pause still wins.'));
        if (readJson(PRIOR_KEY, null)) card.appendChild(button('Give the seat back to the mind before it', function () { giveBack(true); }));
      } else {
        card.appendChild(button('Seat it in Chat', function () { seat(true); }, 'tree-bmind-main'));
        card.appendChild(el('p', 'tree-bmind-quiet', 'Awake but not seated. The Device Pool can still lend it to trusted kin while you let this device help.'));
      }
      card.appendChild(button('Put it to sleep', function () { sleep(); }));
    } else {
      card.appendChild(el('p', 'tree-bmind-quiet', 'Choose a mind. Nothing downloads until you tap the download button, and its size is shown first.'));
      MODELS.forEach(function (m) {
        var b = button(m.id + ': ' + sizeLine(m) + ' (' + m.note + ')', function () { _chosen = m.id; paint(); });
        b.setAttribute('aria-pressed', _chosen === m.id ? 'true' : 'false');
        b.setAttribute('data-model', m.id);
        card.appendChild(b);
      });
      var c = info(_chosen);
      if (c) {
        var again = kept() === runId(c);
        var go = button(again ? 'Wake ' + c.id + ' (already kept here, nothing downloads)' : 'Download about ' + c.mb + ' MB and wake ' + c.id, function () {
          _state = 'checking'; paint();
          wake(c.id, true);
        }, 'tree-bmind-main');
        go.setAttribute('data-wake', c.id);
        card.appendChild(go);
      }
    }
    card.appendChild(el('p', 'tree-bmind-quiet', WHERE));
    if (kept() && _state !== 'downloading') card.appendChild(button('Remove its files from this browser', function () { removeFiles(kept(), true); }));
    _host.appendChild(card);
  }
  // Mounting downloads nothing. It only asks the browser whether WebGPU is here
  // (requestAdapter is local; no network).
  function mount(host) {
    if (!host || !root.document) return;
    _host = host;
    addStyle();
    paint();
    checkGpu().then(function () { paint(); });
  }

  root.TreeBrowserMind = {
    VERSION: VERSION,
    LIB_VERSION: LIB_VERSION,
    LIB_URL: LIB_URL,
    INPAGE_URL: INPAGE_URL,
    NAME: NAME,
    KIND: KIND,
    MODELS: MODELS,
    WHERE: WHERE,
    NO_GPU: NO_GPU,
    mount: mount,
    repaint: paint,
    hasWebGPU: hasWebGPU,
    checkGpu: checkGpu,
    wake: wake,
    sleep: sleep,
    removeFiles: removeFiles,
    ready: ready,
    awakeModel: awakeModel,
    isEntry: isEntry,
    chat: chat,
    seat: seat,
    seated: seated,
    giveBack: giveBack,
    state: function () { return _state; },
    counts: counts
  };
})(typeof window !== 'undefined' ? window : this);
