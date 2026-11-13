#!/usr/bin/env node
// Hypha walk 8 harness. raw.githack-style serve (path prefix, githack
// content-types, no clean root). Reproduces the review sequence exactly:
// load at 1280x800 desktop, tap Not now, then setDeviceMetricsOverride
// to each phone size with mobile:false, dpr 1, and scale ~0.7 (Responsive
// + Fit to window). Wait 12s, screenshot, and assert the HTML 48px light
// grid is below Rooms with no overlap. Also loads directly at phone size.
// Captures every console error and warning. 1280 is unchanged.
// Does not load quiet-room or run smoke.js.
'use strict';
var fs = require('fs');
var path = require('path');
var http = require('http');
var { spawn } = require('child_process');

var ROOT = path.join(__dirname, '..', 'docs');
var PREFIX = '/Chaos2Cured/FreeLattice-Alpha/hold8/docs';
var SHOTS = process.env.SHOTS_DIR || '/tmp/tree-phone-polish-shots-v10-hypha';
var FIT_SCALE = Number(process.env.FIT_SCALE || 0.7);

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
  var grid = document.getElementById('tree-phone-light-grid');
  var ids = ['gathering', 'settings', 'nursery', 'thread'];
  var lights = {};
  ids.forEach(function (id) {
    var door = document.querySelector('[data-garden-lumino="' + id + '"]');
    var light = door && door.querySelector('.garden-lumino-light');
    lights[id] = {
      door: box(door),
      light: box(light),
      opacity: light ? Number(getComputedStyle(light).opacity) : 0,
      inGrid: !!(grid && door && door.parentNode === grid)
    };
  });
  var rb = box(rooms);
  var gb = lights.gathering.door;
  var overlap = !!(rb && gb && Math.min(rb.r, gb.r) > Math.max(rb.l, gb.l) && Math.min(rb.b, gb.b) > Math.max(rb.t, gb.t));
  return {
    layer: !!(window.TreePhonePolish136),
    version: window.TreePhonePolish136 && window.TreePhonePolish136.VERSION,
    hint: hint ? (hint.textContent || '').trim() : '',
    vw: window.innerWidth || 0,
    vh: window.innerHeight || 0,
    narrow: document.documentElement.getAttribute('data-tree-narrow'),
    gridAttr: document.documentElement.getAttribute('data-tree-phone-grid'),
    gridCount: grid ? grid.children.length : 0,
    rooms: rb,
    lights: lights,
    overlapRoomsGathering: overlap,
    gapRoomsToGathering: (rb && gb) ? +(gb.t - rb.b).toFixed(2) : null
  };
})()`;

(async function () {
  var errors = [];
  var consoleErrors = [];
  var consoleWarnings = [];
  var failedRequests = [];
  var report = { views: {}, errors: errors, consoleErrors: consoleErrors, consoleWarnings: consoleWarnings, failedRequests: failedRequests };
  fs.mkdirSync(SHOTS, { recursive: true });

  var httpd = await serveGithack(ROOT);
  var origin = 'http://127.0.0.1:' + httpd.port;
  var pageUrl = origin + PREFIX + '/index.html';
  var debugPort = 18881;
  var dir = fs.mkdtempSync('/tmp/tree-phone-polish-hypha-');
  var child = spawn('google-chrome', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    '--remote-debugging-port=' + debugPort, '--user-data-dir=' + dir, 'about:blank'
  ], { stdio: 'ignore' });
  var cdpWs;
  var requestIds = {};
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
      if (method === 'Runtime.consoleAPICalled') {
        var text = (p.args || []).map(function (a) { return a.value || a.description || ''; }).join(' ');
        var rec = { via: 'consoleAPI', type: p.type, text: text, url: (p.stackTrace && p.stackTrace.callFrames && p.stackTrace.callFrames[0] && p.stackTrace.callFrames[0].url) || '', when: Date.now() };
        if (p.type === 'error') consoleErrors.push(rec);
        else if (p.type === 'warning' || p.type === 'warn') consoleWarnings.push(rec);
      }
      if (method === 'Runtime.exceptionThrown') {
        var ex = (p.exceptionDetails && (p.exceptionDetails.exception && p.exceptionDetails.exception.description)) || (p.exceptionDetails && p.exceptionDetails.text) || 'exception';
        consoleErrors.push({ via: 'exception', type: 'error', text: ex, when: Date.now() });
      }
      if (method === 'Log.entryAdded' && p.entry) {
        var recL = { via: 'log', type: p.entry.level, text: p.entry.text || '', url: p.entry.url || '', when: Date.now() };
        if (p.entry.level === 'error') consoleErrors.push(recL);
        else if (p.entry.level === 'warning' || p.entry.level === 'warn') consoleWarnings.push(recL);
      }
      if (method === 'Network.requestWillBeSent' && p.request) {
        requestIds[p.requestId] = p.request.url;
      }
      if (method === 'Network.loadingFailed') {
        failedRequests.push({ url: requestIds[p.requestId] || p.requestId, error: p.errorText, canceled: !!p.canceled });
      }
      if (method === 'Network.responseReceived' && p.response && p.response.status >= 400) {
        failedRequests.push({ url: p.response.url, status: p.response.status });
      }
    });
    function send(method, params) {
      var id = next++;
      return new Promise(function (resolve, reject) {
        pending[id] = function (msg) { if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error))); else resolve(msg.result); };
        ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
      });
    }
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Network.enable');

    async function ev(expr) {
      var r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || 'eval');
      return r.result ? r.result.value : null;
    }
    async function view(w, h, opts) {
      opts = opts || {};
      var params = {
        width: w,
        height: h,
        deviceScaleFactor: opts.dpr == null ? 1 : opts.dpr,
        mobile: !!opts.mobile
      };
      if (opts.scale != null) params.scale = opts.scale;
      try {
        await send('Emulation.setDeviceMetricsOverride', params);
      } catch (e) {
        if (params.scale != null) {
          log('scale not accepted, retrying without scale:', e && e.message);
          delete params.scale;
          await send('Emulation.setDeviceMetricsOverride', params);
        } else throw e;
      }
    }
    async function doorUp() {
      return ev(`(function () {
        var card = document.querySelector('.tree-door-veil .tree-door');
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
        var b = null, i;
        for (i = 0; i < buttons.length; i++) {
          if (/^\\s*Not now\\s*$/i.test(buttons[i].textContent || '')) { b = buttons[i]; break; }
        }
        if (b) { b.click(); return (b.textContent || '').trim(); }
        return '';
      })()`);
    }
    async function gotoDismiss() {
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
    function snapshotConsole(label) {
      var bad = failedRequests.filter(function (f) { return !f.canceled; });
      report[label + '_console'] = {
        errors: consoleErrors.slice(),
        warnings: consoleWarnings.slice(),
        failedRequests: bad.slice()
      };
      log(label + ' console', 'errors', consoleErrors.length, 'warnings', consoleWarnings.length, 'fails', bad.length);
      consoleErrors.forEach(function (e) { log('  ERR', e.type, e.text, e.url || ''); });
      consoleWarnings.forEach(function (e) { log('  WARN', e.type, e.text, e.url || ''); });
      bad.forEach(function (f) { log('  FAIL', f.url, f.status || f.error || ''); });
    }
    function assertPhone(label, m) {
      if (!m) { errors.push(label + ' no metrics'); return; }
      report.views[label] = m;
      log(label, JSON.stringify({
        v: m.version, hint: (m.hint || '').slice(0, 42),
        vw: m.vw, vh: m.vh, grid: m.gridCount, gap: m.gapRoomsToGathering,
        overlap: m.overlapRoomsGathering,
        light: m.lights && m.lights.gathering && m.lights.gathering.light
      }));
      if (!m.layer) errors.push(label + ' polish layer missing');
      if (!m.version || m.version.indexOf('v0.10') === -1) errors.push(label + ' expected v0.10, got ' + m.version);
      if (!/or Rooms/i.test(m.hint || '')) errors.push(label + ' hint is not "or Rooms": ' + m.hint);
      if (m.gridCount !== 4) errors.push(label + ' expected 4 HTML lights in the grid, got ' + m.gridCount);
      if (m.overlapRoomsGathering) errors.push(label + ' Rooms overlaps Gathering: ' + JSON.stringify({ rooms: m.rooms, gathering: m.lights && m.lights.gathering }));
      if (m.rooms && m.lights && m.lights.gathering && m.lights.gathering.door && m.gapRoomsToGathering < 8) {
        errors.push(label + ' top light row is only ' + m.gapRoomsToGathering + 'px below Rooms');
      }
      var ids = ['gathering', 'settings', 'nursery', 'thread'];
      ids.forEach(function (id) {
        var L = m.lights && m.lights[id];
        if (!L || !L.inGrid) errors.push(label + ' ' + id + ' is not in the HTML grid');
        if (!L || !L.light || L.light.w < 48 || L.light.h < 48) errors.push(label + ' ' + id + ' light is not 48px: ' + JSON.stringify(L && L.light));
        if (!L || L.opacity < 0.9) errors.push(label + ' ' + id + ' light is not a visible circle: opacity ' + (L && L.opacity));
      });
    }

    // 1. Load at normal desktop size, dismiss Not now, confirm 1280 layout.
    await view(1280, 800, { mobile: false, dpr: 1 });
    await gotoDismiss();
    await sleep(800);
    var d1280 = await ev(measureExpr);
    report.views['1280x800'] = d1280;
    log('1280x800', JSON.stringify({ v: d1280 && d1280.version, hint: d1280 && (d1280.hint || '').slice(0, 48), grid: d1280 && d1280.gridCount, nursery: d1280 && d1280.lights && d1280.lights.nursery && d1280.lights.nursery.door }));
    if (!d1280 || !d1280.layer) errors.push('phone polish layer missing at 1280');
    if (!d1280 || !/legend/i.test(d1280.hint || '')) errors.push('hint bar does not mention the legend at 1280');
    if (d1280 && /or Rooms/i.test(d1280.hint || '')) errors.push('1280 hint unexpectedly mentions Rooms');
    if (d1280 && d1280.rooms) errors.push('Rooms toggle should not show at 1280');
    if (d1280 && d1280.gridCount) errors.push('phone light grid should not exist at 1280');
    var n1280 = d1280 && d1280.lights && d1280.lights.nursery && d1280.lights.nursery.door;
    var s1280 = d1280 && d1280.lights && d1280.lights.settings && d1280.lights.settings.door;
    var g1280 = d1280 && d1280.lights && d1280.lights.gathering && d1280.lights.gathering.door;
    var t1280 = d1280 && d1280.lights && d1280.lights.thread && d1280.lights.thread.door;
    if (n1280 && !(n1280.l < 400 && n1280.t > 400)) errors.push('1280 Nursery moved: ' + JSON.stringify(n1280));
    if (s1280 && !(s1280.l > 800 && s1280.t < 550)) errors.push('1280 Settings moved: ' + JSON.stringify(s1280));
    if (g1280 && !(g1280.l > 450 && g1280.l < 850 && g1280.t < 450)) errors.push('1280 Gathering moved: ' + JSON.stringify(g1280));
    if (t1280 && !(t1280.l > 650)) errors.push('1280 Chat moved: ' + JSON.stringify(t1280));
    await shot('01-1280x800-before-device-mode.png');
    snapshotConsole('after-desktop-load');

    // 2. Hypha sequence: without reload, switch on Responsive + Fit to window.
    var phoneViews = [
      [390, 520],
      [360, 640],
      [390, 844],
      [390, 480],
      [375, 560]
    ];
    var i;
    for (i = 0; i < phoneViews.length; i++) {
      var w = phoneViews[i][0], h = phoneViews[i][1];
      var label = 'hypha-' + w + 'x' + h;
      await view(w, h, { mobile: false, dpr: 1, scale: FIT_SCALE });
      await sleep(12000);
      var m = await ev(measureExpr);
      assertPhone(label, m);
      await shot(label + '-after-12s.png');
      snapshotConsole(label);
    }

    // 3. Centre tap of Gathering at 390x520 after the sequence (still no reload).
    await view(390, 520, { mobile: false, dpr: 1, scale: FIT_SCALE });
    await sleep(500);
    var before = await ev(measureExpr);
    if (before && before.lights && before.lights.gathering && before.lights.gathering.light) {
      var lb = before.lights.gathering.light;
      var cx = Math.round((lb.l + lb.r) / 2);
      var cy = Math.round((lb.t + lb.b) / 2);
      await ev(`(function () {
        var x = ${cx}, y = ${cy};
        var el = document.elementFromPoint(x, y);
        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (type) {
          el && el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window }));
        });
        return el && (el.id || el.getAttribute('data-garden-lumino') || el.className);
      })()`);
      await sleep(800);
      var opened = await ev(`(function () {
        var html = document.documentElement;
        var veil = document.getElementById('place-veil');
        return {
          gathering: !!(veil && veil.classList.contains('is-open') && (veil.classList.contains('is-core') || /Gathering/i.test(((document.getElementById('room-label')||{}).textContent)||''))),
          roomsOpen: !!(document.getElementById('lumino-legend') && document.getElementById('lumino-legend').getAttribute('data-open') === '1'),
          title: ((document.getElementById('room-label')||{}).textContent||'')
        };
      })()`);
      report.views['hypha-520-tap-gathering'] = opened;
      log('hypha-520-tap-gathering', JSON.stringify(opened));
      if (opened && opened.roomsOpen && !opened.gathering) errors.push('center tap of Gathering opened Rooms at 390x520');
      if (opened && !opened.gathering) errors.push('center tap of Gathering did not open The Gathering at 390x520: ' + JSON.stringify(opened));
      await shot('hypha-390x520-tap-gathering.png');
    }

    // 4. Direct load at phone size (fresh navigation already at 390x520).
    consoleErrors.length = 0;
    consoleWarnings.length = 0;
    failedRequests.length = 0;
    await view(390, 520, { mobile: false, dpr: 1, scale: FIT_SCALE });
    await gotoDismiss();
    await sleep(12000);
    var direct = await ev(measureExpr);
    assertPhone('direct-390x520', direct);
    await shot('direct-390x520-after-12s.png');
    snapshotConsole('direct-390x520');

    report.errors = errors;
    fs.writeFileSync('/tmp/tree-phone-polish-hypha-report.json', JSON.stringify(report, null, 2));
    log('errors', errors.length ? errors : 'none');
    if (errors.length) process.exitCode = 1;
  } catch (e) {
    console.error(e);
    errors.push(String(e && e.stack || e));
    fs.writeFileSync('/tmp/tree-phone-polish-hypha-report.json', JSON.stringify({ errors: errors, consoleErrors: consoleErrors, consoleWarnings: consoleWarnings, failedRequests: failedRequests }, null, 2));
    process.exitCode = 1;
  } finally {
    try { if (cdpWs) cdpWs.close(); } catch (e1) {}
    try { child.kill('SIGKILL'); } catch (e2) {}
    try { httpd.server.close(); } catch (e3) {}
  }
})();
