#!/usr/bin/env node
// raw.githack-style load of the phone polish layer: path prefix, githack
// content-types, no clean root. Mobile metrics (mobile:true, dpr 3, touch).
// Asserts zero console errors, "or Rooms" hint when the legend is folded,
// and the top bead row sits below the live Rooms getBoundingClientRect.
// 1280 is unchanged. Does not load quiet-room or run smoke.js.
'use strict';
var fs = require('fs');
var path = require('path');
var http = require('http');
var { spawn } = require('child_process');

var ROOT = path.join(__dirname, '..', 'docs');
var PREFIX = '/Chaos2Cured/FreeLattice-Alpha/hold7/docs';
var SHOTS = process.env.SHOTS_DIR || '/tmp/tree-phone-polish-shots-v09-githack';

function log() { console.log.apply(console, arguments); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function serveGithack(root) {
  return new Promise(function (resolve) {
    var server = http.createServer(function (req, res) {
      var url = decodeURIComponent((req.url || '/').split('?')[0]);
      var types = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.json': 'application/json; charset=utf-8',
        '.ico': 'image/x-icon'
      };
      if (url === PREFIX || url === PREFIX + '/') url = PREFIX + '/index.html';
      if (url.indexOf(PREFIX + '/') !== 0) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end('no');
        return;
      }
      var rel = url.slice(PREFIX.length);
      var file = path.join(root, rel.replace(/^\//, ''));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end('no');
        return;
      }
      var ext = path.extname(file);
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', function () {
      resolve({ server: server, port: server.address().port });
    });
  });
}

function getJson(url) {
  return new Promise(function (resolve, reject) {
    http.get(url, function (res) {
      var d = ''; res.on('data', function (c) { d += c; });
      res.on('end', function () { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function waitFor(fn, ms) {
  var t0 = Date.now();
  return (async function poll() {
    var v = await fn();
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error('timeout ' + ms + 'ms');
    await sleep(150);
    return poll();
  })();
}

var measureExpr = `(function () {
  function box(el) {
    if (!el) return null;
    var b = el.getBoundingClientRect();
    return { l: +b.left.toFixed(2), t: +b.top.toFixed(2), r: +b.right.toFixed(2), b: +b.bottom.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) };
  }
  var hint = document.getElementById('garden-start');
  var rooms = document.getElementById('tree-rooms-toggle');
  var gathering = document.querySelector('[data-garden-lumino="gathering"]');
  var settings = document.querySelector('[data-garden-lumino="settings"]');
  var nursery = document.querySelector('[data-garden-lumino="nursery"]');
  var thread = document.querySelector('[data-garden-lumino="thread"]');
  var just = document.querySelector('.thread-just-host, [data-honest-just], [data-thread-just-host]');
  var gb = box(gathering);
  var rb = box(rooms);
  var overlap = false;
  var gap = null;
  if (gb && rb) {
    overlap = Math.min(gb.r, rb.r) > Math.max(gb.l, rb.l) && Math.min(gb.b, rb.b) > Math.max(gb.t, rb.t);
    gap = +(gb.t - rb.b).toFixed(2);
  }
  var word = gathering && gathering.querySelector('.garden-lumino-word');
  var ws = word ? getComputedStyle(word) : null;
  return {
    layer: !!(window.TreePhonePolish136),
    version: window.TreePhonePolish136 && window.TreePhonePolish136.VERSION,
    hint: hint ? (hint.textContent || '').trim() : '',
    vw: window.innerWidth || 0,
    vh: window.innerHeight || 0,
    narrow: document.documentElement.getAttribute('data-tree-narrow'),
    rooms: rb,
    gathering: gb,
    settings: box(settings),
    nursery: box(nursery),
    thread: box(thread),
    overlapRoomsGathering: overlap,
    gapRoomsToGathering: gap,
    wordFont: ws ? ws.fontSize : '',
    just: just ? { text: (just.textContent || '').trim(), w: just.getBoundingClientRect().width, h: just.getBoundingClientRect().height, wrap: getComputedStyle(just).whiteSpace } : null,
    wrapped: !!(window.FractalGarden && FractalGarden.getLuminoAnchors && FractalGarden.getLuminoAnchors.__treePhoneFit),
    fitCalls: window.__treeFitCalls || 0,
    doorUp: !!(function () {
      var card = document.querySelector('.tree-door-veil .tree-door');
      if (card) {
        var st = getComputedStyle(card);
        var r = card.getBoundingClientRect();
        if (st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0.05 && r.width > 2 && r.height > 2) return true;
      }
      var text = (document.body && document.body.innerText) || '';
      return /Let's wake a mind/i.test(text) && /Not now/i.test(text);
    })()
  };
})()`;

(async function () {
  var errors = [];
  var consoleErrors = [];
  var failedRequests = [];
  var report = { views: {}, errors: errors, consoleErrors: consoleErrors, failedRequests: failedRequests };
  fs.mkdirSync(SHOTS, { recursive: true });

  var httpd = await serveGithack(ROOT);
  var origin = 'http://127.0.0.1:' + httpd.port;
  var pageUrl = origin + PREFIX + '/index.html';
  var debugPort = 18871;
  var dir = fs.mkdtempSync('/tmp/tree-phone-polish-githack-');
  var child = spawn('google-chrome', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--user-agent=Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    '--remote-debugging-port=' + debugPort, '--user-data-dir=' + dir, 'about:blank'
  ], { stdio: 'ignore' });
  var cdpWs;
  try {
    await waitFor(async function () {
      try { return await getJson('http://127.0.0.1:' + debugPort + '/json/version'); } catch (e) { return null; }
    }, 15000);
    var list = await getJson('http://127.0.0.1:' + debugPort + '/json/list');
    var page = list.find(function (t) { return t.type === 'page'; }) || list[0];
    var ws = new WebSocket(page.webSocketDebuggerUrl);
    cdpWs = ws;
    await new Promise(function (res, rej) { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    var next = 1, pending = {};
    ws.addEventListener('message', function (ev) {
      var msg = JSON.parse(ev.data);
      if (msg.id && pending[msg.id]) { pending[msg.id](msg); delete pending[msg.id]; }
      var method = msg.method;
      var p = msg.params || {};
      if (method === 'Runtime.consoleAPICalled' && p.type === 'error') {
        var text = (p.args || []).map(function (a) { return a.value || a.description || ''; }).join(' ');
        consoleErrors.push({ via: 'consoleAPI', text: text, url: (p.stackTrace && p.stackTrace.callFrames && p.stackTrace.callFrames[0] && p.stackTrace.callFrames[0].url) || '' });
      }
      if (method === 'Runtime.exceptionThrown') {
        var ex = (p.exceptionDetails && (p.exceptionDetails.exception && p.exceptionDetails.exception.description)) || (p.exceptionDetails && p.exceptionDetails.text) || 'exception';
        consoleErrors.push({ via: 'exception', text: ex });
      }
      if (method === 'Log.entryAdded' && p.entry && p.entry.level === 'error') {
        consoleErrors.push({ via: 'log', text: p.entry.text || '', url: p.entry.url || '' });
      }
      if (method === 'Network.loadingFailed') {
        failedRequests.push({ url: p.requestId, error: p.errorText, canceled: !!p.canceled });
      }
      if (method === 'Network.responseReceived' && p.response && p.response.status >= 400) {
        failedRequests.push({ url: p.response.url, status: p.response.status });
      }
    });
    var requestIds = {};
    // Track request URLs for loadingFailed
    var origHandler = null;
    function send(method, params) {
      var id = next++;
      return new Promise(function (resolve, reject) {
        pending[id] = function (msg) { if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error))); else resolve(msg.result); };
        ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
      });
    }
    // Patch message to also store requestId->url
    var prev = ws.onmessage;
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Network.enable');
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

    // Better failed-request URLs
    ws.addEventListener('message', function (ev) {
      var msg = JSON.parse(ev.data);
      if (msg.method === 'Network.requestWillBeSent' && msg.params && msg.params.request) {
        requestIds[msg.params.requestId] = msg.params.request.url;
      }
      if (msg.method === 'Network.loadingFailed' && msg.params) {
        var last = failedRequests[failedRequests.length - 1];
        if (last && last.url === msg.params.requestId) last.url = requestIds[msg.params.requestId] || last.url;
      }
    });

    async function ev(expr) {
      var r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || 'eval');
      return r.result ? r.result.value : null;
    }
    async function view(w, h, mobile, dpr) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: w,
        height: h,
        deviceScaleFactor: dpr || (mobile ? 3 : 1),
        mobile: !!mobile
      });
      if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    }
    async function doorUp() {
      return ev(`(function () {
        var card = document.querySelector('.tree-door-veil .tree-door, .tree-door-veil[data-tree-door-calm] .tree-door');
        if (card) {
          var st = getComputedStyle(card);
          var r = card.getBoundingClientRect();
          if (st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0.05 && r.width > 2 && r.height > 2) return true;
        }
        var text = (document.body && document.body.innerText) || '';
        return /Let's wake a mind/i.test(text) && /Not now/i.test(text);
      })()`);
    }
    async function clickNotNow() {
      return ev(`(function () {
        var buttons = document.querySelectorAll('button');
        var b = null;
        for (var i = 0; i < buttons.length; i++) {
          if (/^\s*Not now\s*$/i.test(buttons[i].textContent || '')) { b = buttons[i]; break; }
        }
        if (!b) {
          var veil = document.querySelector('.tree-door-veil');
          var scope = veil || document;
          b = scope.querySelector('[data-tree-door-stay] button, [data-tree-door-stay] .tree-door-soft, [data-tree-door-stay]');
        }
        if (b) { b.click(); return (b.textContent || '').trim(); }
        return '';
      })()`);
    }
    async function gotoDismiss() {
      consoleErrors.length = 0;
      failedRequests.length = 0;
      await send('Page.navigate', { url: pageUrl });
      await send('Page.loadEventFired').catch(function () {});
      var seen = false;
      var t0 = Date.now();
      while (Date.now() - t0 < 4500) {
        await sleep(200);
        if (await doorUp()) {
          seen = true;
          await clickNotNow();
          await sleep(300);
          if (!(await doorUp())) return;
        }
      }
      if (seen && (await doorUp())) throw new Error('first-run door still up after Not now');
    }
    async function shot(name) {
      var r = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SHOTS, name), Buffer.from(r.data, 'base64'));
      log('shot', name);
    }
    function recordFails(label) {
      var bad = failedRequests.filter(function (f) { return !f.canceled; });
      var cons = consoleErrors.slice();
      report[label + '_fails'] = { consoleErrors: cons.slice(), failedRequests: bad.slice() };
      cons.forEach(function (e) { errors.push(label + ' console error: ' + e.text + (e.url ? ' @ ' + e.url : '')); });
      bad.forEach(function (f) { errors.push(label + ' failed request: ' + (f.url || '') + ' ' + (f.status || f.error || '')); });
    }
    function assertGarden(label, m, phone) {
      if (!m) { errors.push(label + ' no metrics'); return; }
      report.views[label] = m;
      log(label, JSON.stringify({ v: m.version, hint: (m.hint || '').slice(0, 48), gap: m.gapRoomsToGathering, overlap: m.overlapRoomsGathering, wrapped: m.wrapped, narrow: m.narrow }));
      if (!m.layer) errors.push(label + ' polish layer missing');
      if (phone) {
        if (!m.version || m.version.indexOf('v0.9') === -1) errors.push(label + ' expected v0.9, got ' + m.version);
        if (!/or Rooms/i.test(m.hint || '')) errors.push(label + ' hint is not "or Rooms": ' + m.hint);
        if (!m.rooms) errors.push(label + ' Rooms toggle missing');
        if (m.overlapRoomsGathering) errors.push(label + ' Rooms overlaps Gathering: ' + JSON.stringify({ rooms: m.rooms, gathering: m.gathering }));
        if (m.rooms && m.gathering && m.gapRoomsToGathering < 8) errors.push(label + ' top bead row is only ' + m.gapRoomsToGathering + 'px below Rooms');
        if (!m.wrapped) errors.push(label + ' getLuminoAnchors was not wrapped');
        if (m.doorUp) errors.push(label + ' first-run door still covering the garden');
      }
    }

    // 1280 unchanged
    await view(1280, 800, false, 1);
    await gotoDismiss();
    await sleep(1500);
    var d1280 = await ev(measureExpr);
    assertGarden('1280x800', d1280, false);
    if (d1280) {
      if (!/legend/i.test(d1280.hint || '')) errors.push('hint bar does not mention the legend at 1280');
      if (/or Rooms/i.test(d1280.hint || '')) errors.push('1280 hint unexpectedly mentions Rooms');
      if (d1280.rooms) errors.push('Rooms toggle should not show at 1280');
      if (d1280.nursery && !(d1280.nursery.l < 400 && d1280.nursery.t > 400)) errors.push('1280 Nursery moved: ' + JSON.stringify(d1280.nursery));
      if (d1280.settings && !(d1280.settings.l > 800 && d1280.settings.t < 550)) errors.push('1280 Settings moved: ' + JSON.stringify(d1280.settings));
      if (d1280.gathering && !(d1280.gathering.l > 450 && d1280.gathering.l < 850 && d1280.gathering.t < 450)) errors.push('1280 Gathering moved: ' + JSON.stringify(d1280.gathering));
      if (d1280.thread && !(d1280.thread.l > 650)) errors.push('1280 Chat moved: ' + JSON.stringify(d1280.thread));
    }
    await shot('01-1280x800.png');
    recordFails('1280x800');

    var phoneViews = [
      { w: 390, h: 520, settles: [500, 2000, 5000, 10000] },
      { w: 360, h: 640, settles: [2000, 10000] },
      { w: 390, h: 844, settles: [2000] },
      { w: 390, h: 480, settles: [2000] },
      { w: 375, h: 560, settles: [2000] }
    ];

    var pi;
    for (pi = 0; pi < phoneViews.length; pi++) {
      var v = phoneViews[pi];
      var key = v.w + 'x' + v.h;
      await view(v.w, v.h, true, 3);
      await gotoDismiss();
      var t0 = Date.now();
      var si;
      for (si = 0; si < v.settles.length; si++) {
        var wait = v.settles[si] - (Date.now() - t0);
        if (wait > 0) await sleep(wait);
        var m = await ev(measureExpr);
        var label = key + '@' + v.settles[si] + 'ms';
        assertGarden(label, m, true);
        if (si === v.settles.length - 1) await shot('phone-' + key + '-after-wait.png');
      }
      recordFails(key);
    }

    // Tap the Gathering center at 390x520 — must open The Gathering, not Rooms.
    await view(390, 520, true, 3);
    await gotoDismiss();
    await sleep(2000);
    var before = await ev(measureExpr);
    if (before && before.gathering) {
      var cx = Math.round((before.gathering.l + before.gathering.r) / 2);
      var cy = Math.round((before.gathering.t + before.gathering.b) / 2);
      await ev(`(function () {
        var x = ${cx}, y = ${cy};
        var el = document.elementFromPoint(x, y);
        var evs = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
        evs.forEach(function (type) {
          el && el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window }));
        });
        return el && (el.id || el.getAttribute('data-garden-lumino') || el.className);
      })()`);
      await sleep(800);
      var opened = await ev(`(function () {
        var html = document.documentElement;
        var veil = document.getElementById('place-veil');
        return {
          gathering: html.classList.contains('garden-door-open') || !!(veil && veil.classList.contains('is-open') && (veil.classList.contains('is-core') || /Gathering/i.test((document.getElementById('room-label')||{}).textContent||'') || veil.getAttribute('data-place') === 'gathering' || (veil.className||'').indexOf('core') >= 0)),
          roomsOpen: !!(document.getElementById('lumino-legend') && document.getElementById('lumino-legend').getAttribute('data-open') === '1'),
          title: ((document.getElementById('room-label')||{}).textContent||'') + ' ' + (document.body.innerText||'').slice(0, 200)
        };
      })()`);
      report.views['520-tap-gathering'] = opened;
      log('520-tap-gathering', JSON.stringify(opened));
      if (opened && opened.roomsOpen && !opened.gathering) errors.push('center tap of Gathering opened Rooms at 390x520');
      await shot('phone-390x520-tap-gathering.png');
    }
    recordFails('520-tap');

    // Just me nowrap: open Chat at 360x640 if the control exists
    await view(360, 640, true, 3);
    await gotoDismiss();
    await sleep(1500);
    await ev(`(function () {
      var door = document.querySelector('[data-garden-lumino="thread"]');
      if (door) door.click();
      return true;
    })()`);
    await sleep(1000);
    var just = await ev(`(function () {
      var el = document.querySelector('.thread-just-host, [data-honest-just], [data-thread-just-host]');
      if (!el) return { present: false };
      var r = el.getBoundingClientRect();
      var cs = getComputedStyle(el);
      var rects = el.getClientRects();
      return { present: true, text: (el.textContent||'').trim().replace(/\s+/g,' '), w: r.width, h: r.height, wrap: cs.whiteSpace, fontSize: cs.fontSize, lineCount: rects.length };
    })()`);
    report.views['360-just-me'] = just;
    log('360-just-me', JSON.stringify(just));
    if (just && just.present) {
      if (just.wrap !== 'nowrap') errors.push('Just me white-space is ' + just.wrap + ', not nowrap');
      if ((just.lineCount || 0) > 1) errors.push('Just me is on ' + just.lineCount + ' lines');
      if (/\n/.test(just.text || '')) errors.push('Just me text contains a newline');
    }
    await shot('phone-360x640-chat-just-me.png');
    recordFails('360-chat');

    report.errors = errors;
    fs.writeFileSync('/tmp/tree-phone-polish-githack-report.json', JSON.stringify(report, null, 2));
    log('errors', errors.length ? errors : 'none');
    if (errors.length) process.exitCode = 1;
  } catch (e) {
    console.error(e);
    errors.push(String(e && e.stack || e));
    fs.writeFileSync('/tmp/tree-phone-polish-githack-report.json', JSON.stringify({ errors: errors, consoleErrors: consoleErrors, failedRequests: failedRequests }, null, 2));
    process.exitCode = 1;
  } finally {
    try { if (cdpWs) cdpWs.close(); } catch (e1) {}
    try { child.kill('SIGKILL'); } catch (e2) {}
    try { httpd.server.close(); } catch (e3) {}
  }
})();
