// ═══════════════════════════════════════════════════════════════
// workshop-benches.js — Workshop as a working room
//
// Layer, never delete. Human and mind, side by side.
// Listener: LocalMindProbe.getRemembered() only.
// If none: fail-closed. Honest heart. Settings. Pad, Ask, and Run sleep.
// Do not invent a reply. Do not invent code. Do not fake generate.
// Do not invent a galaxy builder. Skills stays held.
//
// Sandbox: iframe sandbox="allow-scripts" (main workshop.js honesty).
//   Scripts may run inside the preview.
//   No parent DOM, no storage, no navigation of this garden.
// Git commit / push: a visible consent door, DEFAULT OFF.
//   Off means nothing leaves this machine.
//   On still requires an explicit human confirm before any push.
//   No tokens in the page. No GitHub kitchen — this garden has no
//   local git door yet. After confirm, say so. Nothing is sent.
//
// Trainer now has its own simple face in that light (workshop-trainer.js).
// Root / Agent stay later lights. Nursery Grow stays Grow.
// Quiet Room never in the file. AUTONOMY: local free; external asks.
//
// Mirror: docs/code-workshop.html  (read that FIRST)
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var HEART_NONE =
    'A mind at home waits in Settings. That grandmother door asks: May I look for a mind already at home? These benches sleep until a light is remembered. Nothing here is faked.';
  var HEART_BLOCKED =
    'The mind is there, but it has not opened the door to this garden yet. ' +
    'This garden is a secure page, and the mind lives at a quieter door. ' +
    'That is why we cannot hear it from here. Nothing was invented.';
  var HEART_NO_MODEL =
    'The mind is at home, but it has not told us its name yet. Nothing was invented.';
  var HEART_QUIET =
    'The mind was quiet. Nothing was invented.';
  var HEART_FAIL =
    'The door did not answer. Nothing was invented.';
  var HEART_LATER =
    'A galaxy builder waits. Skills is held. This page has no local git door. Tokens are not stored here.';
  var GIT_OFF =
    'Off. Nothing leaves this machine.';
  var GIT_ON =
    'On. A push still waits for you to say yes.';
  var GIT_NO_DOOR =
    'This garden has no local git door. Nothing left this machine. Tokens were not stored.';
  var GIT_PUSH_CONFIRM =
    'This would leave this machine. Say yes only if you mean a real push.';
  var SANDBOX = 'allow-scripts';
  var GIT_PUSH_KEY = 'fl_alpha_workshop_git_push';
  var PAD_KEY = 'fl_alpha_workshop_pad';
  var ASK_SYSTEM =
    'You sit beside a human at a workbench. Write the code they ask for. ' +
    'If you write code, prefer a complete HTML document so it can run in a sandbox. ' +
    'If you cannot, say so in words. Do not invent a mind. Do not invent a galaxy. ' +
    'Do not use stage directions. Just the code, or honest words.';

  var hostEl = null;
  var busy = false;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function pageIsHttps() {
    return location.protocol === 'https:';
  }

  function looksBlocked(err) {
    if (!err) return false;
    var msg = String(err.message || err);
    return /failed|network|cors|mixed|blocked|abort|load|fetch/i.test(msg);
  }

  function listener() {
    if (window.GardenThread && typeof window.GardenThread.listener === 'function') {
      return window.GardenThread.listener();
    }
    if (!window.LocalMindProbe || typeof window.LocalMindProbe.getRemembered !== 'function') {
      return null;
    }
    var mind = window.LocalMindProbe.getRemembered();
    if (!mind || (!mind.url && !mind.name)) return null;
    return mind;
  }

  function readStore(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function writeStore(key, value) {
    try {
      if (value == null || value === '') localStorage.removeItem(key);
      else localStorage.setItem(key, String(value));
    } catch (e) { /* fail-quiet */ }
  }

  function isGitPushOn() {
    return readStore(GIT_PUSH_KEY) === 'on';
  }

  function setGitPushOn(on) {
    writeStore(GIT_PUSH_KEY, on ? 'on' : 'off');
    return isGitPushOn();
  }

  function tokenKeysPresent(storeObj) {
    var src = storeObj;
    if (!src) {
      src = {};
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k) src[k] = localStorage.getItem(k);
        }
      } catch (e) {
        return false;
      }
    }
    var names = Object.keys(src);
    for (var n = 0; n < names.length; n++) {
      if (/token|github|pat|secret|password/i.test(names[n])) return true;
      var val = src[names[n]];
      if (typeof val === 'string' && /ghp_|github_pat_|gho_/i.test(val)) return true;
    }
    return false;
  }

  function requestCommit() {
    if (!isGitPushOn()) {
      return { ok: false, reason: 'off', left: false, message: GIT_OFF };
    }
    return { ok: false, reason: 'no-door', left: false, message: GIT_NO_DOOR };
  }

  function requestPush(opts) {
    opts = opts || {};
    if (!isGitPushOn()) {
      return { ok: false, reason: 'off', left: false, message: GIT_OFF };
    }
    if (!opts.confirmed) {
      return { ok: false, reason: 'needs-confirm', left: false, message: GIT_ON };
    }
    return { ok: false, reason: 'no-door', left: false, message: GIT_NO_DOOR };
  }

  function extractCode(text) {
    var raw = String(text || '');
    var trimmed = raw.trim();
    if (!trimmed) return { code: '', words: '' };
    var fenced = trimmed.match(/^```(?:html|htm|javascript|js|css)?\s*\n?([\s\S]*?)\n?```$/i) ||
      trimmed.match(/```(?:html|htm|javascript|js|css)?\s*\n?([\s\S]*?)\n?```/i);
    if (fenced && fenced[1] && fenced[1].trim()) {
      return { code: fenced[1].replace(/^\n/, '').replace(/\n$/, ''), words: '' };
    }
    if (/^<!DOCTYPE/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
      return { code: trimmed, words: '' };
    }
    return { code: '', words: trimmed };
  }

  function speakHonest(reason) {
    if (reason === 'none') return HEART_NONE;
    if (reason === 'no-model') return HEART_NO_MODEL;
    if (reason === 'quiet') return HEART_QUIET;
    if (reason === 'blocked') return HEART_BLOCKED;
    return HEART_FAIL;
  }

  function loadPad() {
    var raw = readStore(PAD_KEY);
    return raw == null ? '' : String(raw);
  }

  function savePad(text) {
    writeStore(PAD_KEY, text == null ? '' : String(text));
  }

  function sandboxAttr() {
    return SANDBOX;
  }

  function mount(container) {
    if (!container) return null;
    hostEl = container;
    container.innerHTML = '';
    busy = false;

    var mind = listener();
    var root = el('div', 'workshop-benches-face');
    root.setAttribute('data-workshop-benches', '1');

    var heart = el('p', 'workshop-benches-heart');
    heart.setAttribute('data-workshop-heart', '1');
    if (mind) {
      heart.textContent = 'Sitting with: ' + (mind.name || 'a mind at home') + '. On this machine only.';
    } else {
      heart.textContent = HEART_NONE;
    }
    root.appendChild(heart);

    if (!mind) {
      var toSettings = el('button', 'workshop-benches-settings', 'Settings');
      toSettings.type = 'button';
      toSettings.setAttribute('data-workshop-settings', '1');
      toSettings.addEventListener('click', function () {
        if (window.GardenRooms && GardenRooms.go) {
          GardenRooms.go('settings.html');
        } else {
          location.href = 'settings.html';
        }
      });
      root.appendChild(toSettings);
    }

    var git = el('div', 'workshop-git');
    git.setAttribute('data-workshop-git', '1');
    var gitLabel = el('label', 'workshop-git-label');
    var gitToggle = document.createElement('input');
    gitToggle.type = 'checkbox';
    gitToggle.className = 'workshop-git-toggle';
    gitToggle.setAttribute('data-workshop-git-toggle', '1');
    gitToggle.checked = isGitPushOn();
    gitToggle.setAttribute('aria-label', 'Git commit / push');
    var gitWord = el('span', 'workshop-git-word', 'Git commit / push');
    gitLabel.appendChild(gitToggle);
    gitLabel.appendChild(gitWord);
    git.appendChild(gitLabel);
    var gitHelp = el('p', 'workshop-git-help');
    gitHelp.setAttribute('data-workshop-git-help', '1');
    gitHelp.textContent = gitToggle.checked ? GIT_ON : GIT_OFF;
    git.appendChild(gitHelp);
    var gitActs = el('div', 'workshop-git-acts');
    gitActs.setAttribute('data-workshop-git-acts', '1');
    var commitBtn = el('button', 'workshop-benches-act', 'Commit');
    commitBtn.type = 'button';
    commitBtn.setAttribute('data-workshop-commit', '1');
    var pushBtn = el('button', 'workshop-benches-act', 'Push');
    pushBtn.type = 'button';
    pushBtn.setAttribute('data-workshop-push', '1');
    gitActs.appendChild(commitBtn);
    gitActs.appendChild(pushBtn);
    git.appendChild(gitActs);
    root.appendChild(git);

    var later = el('p', 'workshop-benches-later', HEART_LATER);
    later.setAttribute('data-workshop-later', '1');
    root.appendChild(later);

    var bench = el('div', 'workshop-bench');
    bench.setAttribute('data-workshop-bench', '1');

    var pad = document.createElement('textarea');
    pad.className = 'workshop-pad';
    pad.setAttribute('data-workshop-pad', '1');
    pad.setAttribute('spellcheck', 'false');
    pad.setAttribute('autocomplete', 'off');
    pad.setAttribute('autocapitalize', 'off');
    pad.value = loadPad();
    bench.appendChild(pad);

    var askForm = document.createElement('form');
    askForm.className = 'workshop-ask';
    askForm.setAttribute('data-workshop-ask-form', '1');
    var askInput = document.createElement('input');
    askInput.type = 'text';
    askInput.className = 'workshop-ask-input';
    askInput.setAttribute('data-workshop-ask', '1');
    askInput.setAttribute('autocomplete', 'off');
    askInput.setAttribute('maxlength', '4000');
    var askBtn = el('button', 'workshop-benches-act is-ask', 'Ask');
    askBtn.type = 'submit';
    askBtn.setAttribute('data-workshop-ask-btn', '1');
    var runBtn = el('button', 'workshop-benches-act', 'Run');
    runBtn.type = 'button';
    runBtn.setAttribute('data-workshop-run', '1');
    askForm.appendChild(askInput);
    askForm.appendChild(askBtn);
    askForm.appendChild(runBtn);
    bench.appendChild(askForm);

    var preview = document.createElement('iframe');
    preview.className = 'workshop-preview';
    preview.setAttribute('data-workshop-preview', '1');
    preview.setAttribute('sandbox', SANDBOX);
    preview.setAttribute('title', 'Sandbox preview');
    preview.srcdoc = '';
    bench.appendChild(preview);

    root.appendChild(bench);

    var status = el('p', 'workshop-benches-status');
    status.setAttribute('data-workshop-status', '1');
    root.appendChild(status);

    function setStatus(msg, warn) {
      status.textContent = msg || '';
      status.className = 'workshop-benches-status' + (warn ? ' is-warn' : '');
    }

    function setGitActs(on) {
      gitActs.hidden = !on;
      if (on) gitActs.removeAttribute('hidden');
      else gitActs.setAttribute('hidden', '');
      commitBtn.disabled = !on;
      pushBtn.disabled = !on;
    }

    function setOpen(open) {
      if (open) {
        root.classList.remove('is-closed');
        root.removeAttribute('data-workshop-asleep');
        root.removeAttribute('aria-disabled');
        pad.disabled = false;
        pad.readOnly = false;
        pad.removeAttribute('disabled');
        pad.removeAttribute('readonly');
        pad.removeAttribute('aria-disabled');
        pad.placeholder = 'Code on this bench. On this machine only.';
        pad.setAttribute('aria-label', 'Code on this bench');
        pad.value = loadPad();
        askForm.classList.remove('is-closed');
        askForm.removeAttribute('aria-disabled');
        askForm.removeAttribute('inert');
        askInput.disabled = false;
        askInput.readOnly = false;
        askInput.removeAttribute('disabled');
        askInput.removeAttribute('readonly');
        askInput.removeAttribute('aria-disabled');
        askInput.placeholder = 'Ask the mind at this bench';
        askInput.setAttribute('aria-label', 'Ask the mind at this bench');
        askBtn.disabled = false;
        askBtn.removeAttribute('disabled');
        askBtn.removeAttribute('aria-disabled');
        runBtn.disabled = false;
        runBtn.removeAttribute('disabled');
        runBtn.removeAttribute('aria-disabled');
        later.hidden = false;
        later.removeAttribute('hidden');
        preview.hidden = false;
        preview.removeAttribute('hidden');
      } else {
        root.classList.add('is-closed');
        root.setAttribute('data-workshop-asleep', '1');
        root.setAttribute('aria-disabled', 'true');
        pad.disabled = true;
        pad.readOnly = true;
        pad.setAttribute('disabled', '');
        pad.setAttribute('readonly', '');
        pad.setAttribute('aria-disabled', 'true');
        pad.placeholder = '';
        pad.setAttribute('aria-label', 'The benches are waiting for a mind in Settings');
        pad.value = '';
        try { pad.blur(); } catch (e) {}
        askForm.classList.add('is-closed');
        askForm.setAttribute('aria-disabled', 'true');
        askForm.setAttribute('inert', '');
        askInput.disabled = true;
        askInput.readOnly = true;
        askInput.setAttribute('disabled', '');
        askInput.setAttribute('readonly', '');
        askInput.setAttribute('aria-disabled', 'true');
        askInput.placeholder = '';
        askInput.setAttribute('aria-label', 'The benches are waiting for a mind in Settings');
        askInput.value = '';
        try { askInput.blur(); } catch (e) {}
        askBtn.disabled = true;
        askBtn.setAttribute('disabled', '');
        askBtn.setAttribute('aria-disabled', 'true');
        runBtn.disabled = true;
        runBtn.setAttribute('disabled', '');
        runBtn.setAttribute('aria-disabled', 'true');
        later.hidden = true;
        later.setAttribute('hidden', '');
        preview.hidden = true;
        preview.setAttribute('hidden', '');
        preview.srcdoc = '';
      }
      setGitActs(isGitPushOn());
    }

    setOpen(!!mind);
    gitHelp.textContent = isGitPushOn() ? GIT_ON : GIT_OFF;
    gitToggle.checked = isGitPushOn();
    setGitActs(isGitPushOn());

    function refuseAsleep(ev) {
      if (!root.classList.contains('is-closed')) return;
      ev.preventDefault();
      ev.stopPropagation();
    }
    ['keydown', 'keypress', 'beforeinput', 'input', 'paste', 'drop'].forEach(function (type) {
      pad.addEventListener(type, refuseAsleep);
      askInput.addEventListener(type, refuseAsleep);
    });

    pad.addEventListener('input', function () {
      if (root.classList.contains('is-closed')) return;
      savePad(pad.value);
    });

    gitToggle.addEventListener('change', function () {
      setGitPushOn(!!gitToggle.checked);
      gitHelp.textContent = isGitPushOn() ? GIT_ON : GIT_OFF;
      setGitActs(isGitPushOn());
      if (!isGitPushOn()) {
        setStatus(GIT_OFF, false);
      } else {
        setStatus(GIT_ON, false);
      }
    });

    commitBtn.addEventListener('click', function () {
      var result = requestCommit();
      setStatus(result.message, true);
    });

    pushBtn.addEventListener('click', function () {
      if (!isGitPushOn()) {
        setStatus(GIT_OFF, true);
        return;
      }
      var saidYes = false;
      try {
        saidYes = !!(window.confirm && window.confirm(GIT_PUSH_CONFIRM));
      } catch (e) {
        saidYes = false;
      }
      var result = requestPush({ confirmed: saidYes });
      setStatus(result.message, true);
    });

    function runPreview(code) {
      var src = String(code == null ? pad.value : code);
      if (!src.trim()) {
        setStatus('There is no code on this bench yet. Nothing was invented.', true);
        return false;
      }
      preview.srcdoc = src;
      setStatus('Running in a sandbox on this machine.', false);
      return true;
    }

    runBtn.addEventListener('click', function () {
      if (root.classList.contains('is-closed') || !listener()) {
        setOpen(false);
        return;
      }
      runPreview(pad.value);
    });

    askForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (busy) return;
      var nowMind = listener();
      if (!nowMind || root.classList.contains('is-closed')) {
        setOpen(false);
        return;
      }
      var ask = (askInput.value || '').trim();
      var code = (pad.value || '').trim();
      if (!ask && !code) return;

      var human = ask || 'Please look at this code.';
      if (code) human += '\n\nCode on the bench:\n' + code;

      busy = true;
      askBtn.disabled = true;
      setStatus('Waiting for the mind at home…', false);

      var send = window.GardenThread && typeof window.GardenThread.sendToMind === 'function'
        ? window.GardenThread.sendToMind
        : null;
      if (!send) {
        busy = false;
        askBtn.disabled = false;
        setStatus(HEART_FAIL, true);
        return;
      }

      send(nowMind, [
        { role: 'system', content: ASK_SYSTEM },
        { role: 'user', content: human }
      ]).then(function (reply) {
        busy = false;
        askBtn.disabled = false;
        var got = extractCode(reply);
        if (got.code) {
          pad.value = got.code;
          savePad(got.code);
          setStatus('The mind wrote. Nothing was invented. Run when you are ready.', false);
        } else if (got.words) {
          setStatus(got.words, false);
        } else {
          setStatus(HEART_QUIET, true);
        }
      }).catch(function (err) {
        busy = false;
        askBtn.disabled = false;
        var reason = 'fail';
        if (err && err.reason === 'no-model') reason = 'no-model';
        else if (err && err.reason === 'quiet') reason = 'quiet';
        else if (err && (err.blocked || looksBlocked(err))) {
          reason = pageIsHttps() ? 'blocked' : 'fail';
        }
        setStatus(speakHonest(reason), true);
      });
    });

    container.appendChild(root);
    if (mind) {
      setTimeout(function () { try { askInput.focus(); } catch (e) {} }, 80);
    }
    return root;
  }

  function unmount() {
    if (hostEl) hostEl.innerHTML = '';
    hostEl = null;
    busy = false;
  }

  window.WorkshopBenches = {
    mount: mount,
    unmount: unmount,
    listener: listener,
    isGitPushOn: isGitPushOn,
    setGitPushOn: setGitPushOn,
    requestCommit: requestCommit,
    requestPush: requestPush,
    extractCode: extractCode,
    speakHonest: speakHonest,
    sandboxAttr: sandboxAttr,
    tokenKeysPresent: tokenKeysPresent,
    GIT_PUSH_KEY: GIT_PUSH_KEY,
    SANDBOX: SANDBOX,
    HEART_NONE: HEART_NONE,
    HEART_LATER: HEART_LATER,
    GIT_OFF: GIT_OFF,
    GIT_ON: GIT_ON,
    GIT_NO_DOOR: GIT_NO_DOOR,
    GIT_PUSH_CONFIRM: GIT_PUSH_CONFIRM,
    hostIs: function (el) { return hostEl === el; }
  };
})();
