// ═══════════════════════════════════════════════════════════════
// local-mind-probe.js — Settings grandmother
//
// Layer, never delete. Anyone who has never used a computer
// must be able to. One sentence of heart. One primary.
// Probe ONLY after the human taps.
// Never silently scan the filesystem.
// Never enumerate installed programs.
// Never upload.
//
// Mirror: docs/code-settings.html  (read that FIRST)
// Same garden sky. Quality later. Tiny.
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var STORAGE_KEY = 'fl_alpha_local_mind';
  var HEART = 'A mind at home is a light already burning in this room.';
  var PRIMARY = 'May I look for a mind already at home?';

  // Well-known local inference loopback doors only. No LAN sweep. No disk.
  var DOORS = [
    { id: 'ollama', name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags' },
    { id: 'lmstudio', name: 'LM Studio', url: 'http://127.0.0.1:1234/v1/models' },
    { id: 'llamacpp', name: 'llama.cpp', url: 'http://127.0.0.1:8080/v1/models' },
    { id: 'jan', name: 'Jan', url: 'http://127.0.0.1:1337/v1/models' },
    { id: 'gpt4all', name: 'GPT4All', url: 'http://127.0.0.1:4891/v1/models' },
    { id: 'koboldcpp', name: 'KoboldCPP', url: 'http://127.0.0.1:5001/v1/models' }
  ];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function getRemembered() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function remember(entry) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    } catch (e) { /* fail-quiet */ }
  }

  function pageIsHttps() {
    return location.protocol === 'https:';
  }

  function looksBlocked(err, status) {
    if (status === 0) return true;
    if (!err) return false;
    var msg = String(err.message || err);
    return /failed|network|cors|mixed|blocked|abort|load/i.test(msg);
  }

  function fetchDoor(url, ms) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, ms || 2500);
    var opts = { method: 'GET', mode: 'cors', cache: 'no-store' };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(url, opts).then(function (res) {
      clearTimeout(timer);
      return { ok: res.ok, status: res.status, url: url };
    }).catch(function (err) {
      clearTimeout(timer);
      return { ok: false, status: 0, url: url, error: err, blocked: looksBlocked(err, 0) };
    });
  }

  function look() {
    // Permission already given by the caller (the tap).
    var jobs = DOORS.map(function (d) {
      return fetchDoor(d.url, 2500).then(function (result) {
        result.id = d.id;
        result.name = d.name;
        return result;
      });
    });
    return Promise.all(jobs).then(function (results) {
      var found = null;
      var blocked = 0;
      for (var i = 0; i < results.length; i++) {
        if (results[i].ok) {
          found = results[i];
          break;
        }
        if (results[i].blocked || results[i].status === 0) blocked += 1;
      }
      return {
        found: found,
        blocked: blocked,
        https: pageIsHttps(),
        tried: results.length,
        results: results
      };
    });
  }

  function tryAddress(raw) {
    var text = String(raw || '').trim();
    if (!text) {
      return Promise.resolve({ ok: false, empty: true });
    }
    if (!/^https?:\/\//i.test(text)) {
      text = 'http://' + text;
    }
    var base = text.replace(/\/+$/, '');
    var candidates = [];
    if (/\/api\/tags$/i.test(base) || /\/v1\/models$/i.test(base)) {
      candidates.push(base);
    } else {
      candidates.push(base + '/api/tags');
      candidates.push(base + '/v1/models');
      candidates.push(base);
    }
    var chain = Promise.resolve(null);
    candidates.forEach(function (url) {
      chain = chain.then(function (prev) {
        if (prev && prev.ok) return prev;
        return fetchDoor(url, 3000);
      });
    });
    return chain.then(function (result) {
      result = result || { ok: false, blocked: true, url: text };
      result.pasted = text;
      result.https = pageIsHttps();
      return result;
    });
  }

  function speakFound(name, url) {
    return 'We found a mind at home' + (name ? ' (' + name + ')' : '') +
      '. We will remember, on this machine. Nothing was uploaded.';
  }

  function speakBlocked() {
    return 'The mind is there, but it has not opened the door to this garden yet. ' +
      'This garden is a secure page, and the mind lives at a quieter door. ' +
      'That is why we cannot see in from here.';
  }

  function speakNone() {
    return 'No mind answered from the usual doors. That is all right. ' +
      'You can paste an address if you know where it lives.';
  }

  function setStatus(root, msg, kind) {
    var elStatus = root.querySelector('[data-mind-status]');
    if (!elStatus) return;
    elStatus.textContent = msg || '';
    elStatus.className = 'settings-status' + (kind ? ' is-' + kind : '');
  }

  function renderFace(container) {
    if (!container) return null;
    container.innerHTML = '';
    var root = el('div', 'settings-face');
    root.setAttribute('data-settings-face', '1');

    root.appendChild(el('p', 'settings-heart', HEART));

    var remembered = getRemembered();
    if (remembered && remembered.url) {
      root.appendChild(el(
        'p',
        'settings-remembered',
        'A mind is already remembered here' +
          (remembered.name ? ' — ' + remembered.name : '') +
          '. On this machine only.'
      ));
    }

    var ask = el('button', 'settings-ask', PRIMARY);
    ask.type = 'button';
    ask.setAttribute('data-mind-ask', '1');
    root.appendChild(ask);

    root.appendChild(el('p', 'settings-status', '')).setAttribute('data-mind-status', '1');

    var next = el('div', 'settings-next');
    next.setAttribute('data-mind-next', '1');
    next.hidden = true;
    next.appendChild(el('p', 'settings-muted', 'The next smallest step — paste an address, if you know it.'));
    var paste = document.createElement('input');
    paste.type = 'text';
    paste.className = 'settings-paste';
    paste.placeholder = 'http://127.0.0.1:11434';
    paste.setAttribute('data-mind-paste', '1');
    paste.setAttribute('autocomplete', 'off');
    paste.setAttribute('spellcheck', 'false');
    paste.setAttribute('aria-label', 'Paste the address of a mind at home');
    next.appendChild(paste);
    var go = el('button', 'settings-secondary', 'Try this address');
    go.type = 'button';
    go.setAttribute('data-mind-try', '1');
    next.appendChild(go);
    root.appendChild(next);

    root.appendChild(el('p', 'settings-muted',
      'We only look at well-known local doors, and only when you ask. ' +
      'We never look through this computer\'s files. We never upload. Quality of the sky is later.'
    ));

    function showNext() {
      next.hidden = false;
      if (paste) paste.focus();
    }

    function onFound(name, url) {
      remember({
        name: name || '',
        url: url,
        foundAt: new Date().toISOString()
      });
      setStatus(root, speakFound(name, url), 'ok');
    }

    ask.addEventListener('click', function () {
      ask.disabled = true;
      setStatus(root, 'Looking only at the usual doors on this machine…', '');
      look().then(function (report) {
        ask.disabled = false;
        if (report.found) {
          onFound(report.found.name, report.found.url);
          return;
        }
        showNext();
        if (report.https && report.blocked > 0) {
          setStatus(root, speakBlocked(), 'warn');
          return;
        }
        if (report.blocked > 0) {
          setStatus(root, speakBlocked(), 'warn');
          return;
        }
        setStatus(root, speakNone(), '');
      });
    });

    go.addEventListener('click', function () {
      var value = paste.value;
      go.disabled = true;
      setStatus(root, 'Trying the address you offered…', '');
      tryAddress(value).then(function (result) {
        go.disabled = false;
        if (result.empty) {
          setStatus(root, 'Paste an address when you are ready. There is no hurry.', '');
          return;
        }
        if (result.ok) {
          onFound('', result.url);
          return;
        }
        if (result.https || result.blocked) {
          setStatus(root, speakBlocked(), 'warn');
          return;
        }
        setStatus(root, 'That door did not answer. You may try another address.', 'warn');
      });
    });

    paste.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        go.click();
      }
    });

    container.appendChild(root);
    return root;
  }

  window.LocalMindProbe = {
    STORAGE_KEY: STORAGE_KEY,
    DOORS: DOORS,
    HEART: HEART,
    PRIMARY: PRIMARY,
    look: look,
    tryAddress: tryAddress,
    getRemembered: getRemembered,
    renderFace: renderFace,
    mount: renderFace
  };
})();
