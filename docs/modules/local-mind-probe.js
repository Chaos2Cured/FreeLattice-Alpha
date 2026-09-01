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
//
// Fix 3 layer: constellation model stars choose entry.model.
// One storage key: fl_alpha_local_mind. remember() persists.
// Later scans keep a still-present chosen model. A vanished name
// writes a visible fallback note; it does not stay as a ghost.
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
    try {
      window.dispatchEvent(new CustomEvent('fl-alpha-mind-remembered', { detail: entry }));
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

  function parseModelNames(json) {
    var names = [];
    if (!json || typeof json !== 'object') return names;
    if (Array.isArray(json.models)) {
      json.models.forEach(function (m) {
        var n = m && (m.name || m.model);
        if (n) names.push(String(n));
      });
    }
    if (Array.isArray(json.data)) {
      json.data.forEach(function (m) {
        var n = m && (m.id || m.name);
        if (n) names.push(String(n));
      });
    }
    return names.slice(0, 5);
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
      var out = { ok: res.ok, status: res.status, url: url };
      if (!res.ok) return out;
      return res.json().then(function (json) {
        out.json = json;
        out.models = parseModelNames(json);
        return out;
      }).catch(function () {
        return out;
      });
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
      var foundList = [];
      var blocked = 0;
      for (var i = 0; i < results.length; i++) {
        if (results[i].ok) {
          foundList.push(results[i]);
        } else if (results[i].blocked || results[i].status === 0) {
          blocked += 1;
        }
      }
      return {
        found: foundList[0] || null,
        foundList: foundList,
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

  function mindsFromEntry(entry) {
    if (!entry) return [];
    if (Array.isArray(entry.minds) && entry.minds.length) {
      return entry.minds.slice(0, 7);
    }
    if (entry.name || entry.url) {
      return [{
        name: entry.name || 'a mind at home',
        url: entry.url,
        models: entry.models || (entry.model ? [entry.model] : []),
        model: entry.model || '',
        primary: true
      }];
    }
    return [];
  }

  function getRememberedMinds() {
    return mindsFromEntry(getRemembered());
  }

  function speakWithLine(modelName) {
    return 'This mind speaks with ' + modelName + ', on this machine.';
  }

  function speakModelGone(gone, now) {
    if (now) {
      return 'The chosen model ' + gone + ' is no longer at this door. ' +
        'This mind now speaks with ' + now + ', on this machine.';
    }
    return 'The chosen model ' + gone + ' is no longer at this door.';
  }

  function priorPrimaryUrl(prior) {
    if (!prior) return '';
    var list = mindsFromEntry(prior);
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i].primary) return String(list[i].url || '');
    }
    return String(prior.url || '');
  }

  function priorModelForUrl(prior, url) {
    if (!prior) return '';
    var list = mindsFromEntry(prior);
    var i;
    for (i = 0; i < list.length; i++) {
      if (String(list[i].url || '') === String(url || '') && list[i].model) {
        return String(list[i].model);
      }
    }
    if (prior.model && (!prior.url || String(prior.url) === String(url || ''))) {
      return String(prior.model);
    }
    return '';
  }

  function modelOnList(models, name) {
    if (!name) return false;
    var i;
    for (i = 0; i < (models || []).length; i++) {
      if (String(models[i]) === String(name)) return true;
    }
    return false;
  }

  function entryFromFoundList(foundList, fallbackName, fallbackUrl, prior) {
    var minds = (foundList || []).map(function (r) {
      var url = r.url;
      var models = r.models || [];
      var kept = priorModelForUrl(prior, url);
      var model = '';
      if (kept && modelOnList(models, kept)) {
        model = kept;
      } else if (models.length) {
        model = models[0];
      }
      return {
        name: r.name || 'a mind at home',
        url: url,
        models: models,
        model: model,
        primary: false
      };
    });
    if (!minds.length && fallbackUrl) {
      minds.push({
        name: fallbackName || 'a mind at home',
        url: fallbackUrl,
        models: [],
        model: '',
        primary: false
      });
    }
    var wantUrl = priorPrimaryUrl(prior);
    var primaryIndex = 0;
    var i;
    if (wantUrl) {
      for (i = 0; i < minds.length; i++) {
        if (String(minds[i].url || '') === String(wantUrl)) {
          primaryIndex = i;
          break;
        }
      }
    }
    for (i = 0; i < minds.length; i++) {
      minds[i].primary = i === primaryIndex;
    }
    var primary = minds[primaryIndex] || minds[0] || {};
    var models = primary.models || [];
    var priorChosen = priorModelForUrl(prior, primary.url) || (prior && prior.model ? String(prior.model) : '');
    var model = primary.model || '';
    var modelNote = '';
    if (priorChosen && !modelOnList(models, priorChosen)) {
      modelNote = speakModelGone(priorChosen, model);
    }
    var entry = {
      name: primary.name || fallbackName || '',
      url: primary.url || fallbackUrl || '',
      foundAt: new Date().toISOString(),
      model: model,
      models: models,
      minds: minds
    };
    if (modelNote) entry.modelNote = modelNote;
    return entry;
  }

  function syncEntryFromMind(entry, target) {
    var i;
    var minds = entry.minds || [];
    for (i = 0; i < minds.length; i++) {
      minds[i].primary = minds[i] === target;
    }
    entry.name = target.name;
    entry.url = target.url;
    entry.models = target.models || [];
    entry.model = target.model || '';
    entry.minds = minds;
    if (entry.modelNote) delete entry.modelNote;
    return entry;
  }

  function chooseModel(doorUrl, modelName) {
    var entry = getRemembered();
    if (!entry) return null;
    var minds = mindsFromEntry(entry);
    if (!minds.length) return null;
    var i;
    var target = null;
    for (i = 0; i < minds.length; i++) {
      if (String(minds[i].url || '') === String(doorUrl || '')) {
        target = minds[i];
        break;
      }
    }
    if (!target && minds.length === 1) target = minds[0];
    if (!target) return null;
    if (!modelOnList(target.models || [], modelName)) return null;
    target.model = String(modelName);
    entry.minds = minds;
    syncEntryFromMind(entry, target);
    remember(entry);
    return entry;
  }

  function choosePrimary(doorUrl) {
    var entry = getRemembered();
    if (!entry) return null;
    var minds = mindsFromEntry(entry);
    if (minds.length < 2) return null;
    var i;
    var target = null;
    for (i = 0; i < minds.length; i++) {
      if (String(minds[i].url || '') === String(doorUrl || '')) {
        target = minds[i];
        break;
      }
    }
    if (!target) return null;
    if (!target.model && target.models && target.models[0]) {
      target.model = target.models[0];
    }
    entry.minds = minds;
    syncEntryFromMind(entry, target);
    remember(entry);
    return entry;
  }

  function bindRadioKeys(cluster, radios, onPick) {
    if (!cluster || !radios || !radios.length) return;
    cluster.addEventListener('keydown', function (ev) {
      var t = ev.target;
      var idx = -1;
      var i;
      for (i = 0; i < radios.length; i++) {
        if (radios[i] === t || (radios[i].contains && radios[i].contains(t))) {
          idx = i;
          break;
        }
      }
      if (idx < 0) return;
      var next = -1;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
        next = (idx + 1) % radios.length;
      } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
        next = (idx - 1 + radios.length) % radios.length;
      } else if (ev.key === 'Home') {
        next = 0;
      } else if (ev.key === 'End') {
        next = radios.length - 1;
      } else if (ev.key === ' ' || ev.key === 'Enter') {
        ev.preventDefault();
        onPick(radios[idx]);
        return;
      }
      if (next < 0) return;
      ev.preventDefault();
      onPick(radios[next]);
      try { radios[next].focus(); } catch (e) { /* focus is best-effort */ }
    });
  }

  function paintConstellation(host, minds) {
    if (!host) return;
    host.innerHTML = '';
    if (!minds || !minds.length) {
      host.hidden = true;
      return;
    }
    var remembered = getRemembered() || {};
    var chosen = remembered.model ? String(remembered.model) : '';
    var primaryUrl = remembered.url ? String(remembered.url) : '';
    var manyDoors = minds.length > 1;
    host.hidden = false;
    host.setAttribute('role', 'list');
    host.setAttribute('aria-label', 'Minds at home');
    minds.forEach(function (m) {
      var isPrimary = !primaryUrl || String(m.url || '') === primaryUrl || (!manyDoors);
      var star = el('span', 'settings-star' + (isPrimary ? ' is-primary' : ''));
      star.setAttribute('role', 'listitem');
      var light = el('span', 'settings-star-light');
      light.setAttribute('aria-hidden', 'true');
      var nameNode = el('span', 'settings-star-name', m.name || 'a mind at home');
      if (manyDoors) {
        var pick = el('button', 'settings-star-pick');
        pick.type = 'button';
        pick.setAttribute('aria-pressed', isPrimary ? 'true' : 'false');
        pick.setAttribute('aria-label', 'Use ' + (m.name || 'this door') + ' as the speaking door');
        pick.setAttribute('data-mind-door', m.url || '');
        pick.appendChild(light);
        pick.appendChild(nameNode);
        pick.addEventListener('click', function () {
          var next = choosePrimary(m.url);
          if (next) paintConstellation(host, mindsFromEntry(next));
        });
        star.appendChild(pick);
      } else {
        star.appendChild(light);
        star.appendChild(nameNode);
      }
      var models = (m.models || []).slice(0, 5);
      if (models.length) {
        var cluster = el('span', 'settings-star-models');
        cluster.setAttribute('role', 'radiogroup');
        cluster.setAttribute('aria-label', 'Models at ' + (m.name || 'this door'));
        var radios = [];
        models.forEach(function (modelName) {
          var isChosen = isPrimary && chosen && String(modelName) === chosen;
          var tiny = el('button', 'settings-star-tiny' + (isChosen ? ' is-chosen' : ''));
          tiny.type = 'button';
          tiny.setAttribute('role', 'radio');
          tiny.setAttribute('aria-checked', isChosen ? 'true' : 'false');
          tiny.setAttribute('aria-label', modelName);
          tiny.setAttribute('data-mind-model', modelName);
          tiny.setAttribute('data-mind-door', m.url || '');
          tiny.tabIndex = 0;
          var tinyLight = el('span', 'settings-star-tiny-light');
          tinyLight.setAttribute('aria-hidden', 'true');
          tiny.appendChild(tinyLight);
          tiny.appendChild(el('span', 'settings-star-tiny-name', modelName));
          tiny.addEventListener('click', function () {
            var next = chooseModel(m.url, modelName);
            if (next) paintConstellation(host, mindsFromEntry(next));
          });
          radios.push(tiny);
          cluster.appendChild(tiny);
        });
        bindRadioKeys(cluster, radios, function (radio) {
          var next = chooseModel(
            radio.getAttribute('data-mind-door'),
            radio.getAttribute('data-mind-model')
          );
          if (next) paintConstellation(host, mindsFromEntry(next));
        });
        star.appendChild(cluster);
      }
      host.appendChild(star);
    });
    var line = el('p', 'settings-speaks');
    line.setAttribute('data-mind-speaks', '1');
    if (remembered.modelNote) {
      line.textContent = remembered.modelNote;
    } else if (chosen) {
      line.textContent = speakWithLine(chosen);
    }
    if (line.textContent) host.appendChild(line);
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

    var sky = el('div', 'settings-constellation');
    sky.setAttribute('data-mind-sky', '1');
    paintConstellation(sky, mindsFromEntry(remembered));
    root.appendChild(sky);

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

    root.appendChild(el('p', 'settings-muted settings-honesty',
      'We only look at well-known local doors, and only when you ask. ' +
      'We never look through this computer\'s files. We never upload. Quality of the sky is later.'
    ));

    function showNext() {
      next.hidden = false;
      if (paste) paste.focus();
    }

    function onFound(foundList, fallbackName, fallbackUrl) {
      var prior = getRemembered();
      var entry = entryFromFoundList(foundList, fallbackName, fallbackUrl, prior);
      remember(entry);
      paintConstellation(sky, mindsFromEntry(entry));
      if (entry.modelNote) {
        setStatus(root, entry.modelNote, 'warn');
      } else {
        setStatus(root, speakFound(entry.name, entry.url), 'ok');
      }
    }

    ask.addEventListener('click', function () {
      ask.disabled = true;
      setStatus(root, 'Looking only at the usual doors on this machine…', '');
      look().then(function (report) {
        ask.disabled = false;
        if (report.found) {
          onFound(report.foundList, report.found.name, report.found.url);
          return;
        }
        showNext();
        // HTTPS pages often cannot see http://127.0.0.1 (mixed content / PNA).
        // Speak that honestly. On a quiet local http page, no-answer is simply none.
        if (report.https && report.blocked > 0) {
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
          onFound(
            [{ name: 'a mind at home', url: result.url, models: result.models || [] }],
            'a mind at home',
            result.url
          );
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
    getRememberedMinds: getRememberedMinds,
    remember: remember,
    entryFromFoundList: entryFromFoundList,
    paintConstellation: paintConstellation,
    chooseModel: chooseModel,
    choosePrimary: choosePrimary,
    speakWithLine: speakWithLine,
    renderFace: renderFace,
    mount: renderFace
  };
})();
