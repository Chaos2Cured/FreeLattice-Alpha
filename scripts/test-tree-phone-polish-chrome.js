#!/usr/bin/env node
// Overlap test for Tree phone polish: all garden room lights inside the
// viewport at 390x844 and 390x520, and the 1280 layout unchanged.
// Does not load quiet-room. Does not change AUTONOMY.md. Does not run smoke.js.
'use strict';
var fs = require('fs');
var path = require('path');
var http = require('http');
var { spawn } = require('child_process');
var ROOT = path.join(__dirname, '..', 'docs');
var SHOTS = process.env.SHOTS_DIR || '/tmp/tree-phone-polish-shots';

function log() { console.log.apply(console, arguments); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function serve(root) {
  return new Promise(function (resolve) {
    var server = http.createServer(function (req, res) {
      var url = decodeURIComponent((req.url || '/').split('?')[0]);
      var rel = url === '/' ? '/index.html' : url;
      var file = path.join(root, rel.replace(/^\//, ''));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('no'); return;
      }
      var ext = path.extname(file);
      var types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', function () { resolve({ server: server, port: server.address().port }); });
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
    var st = getComputedStyle(el);
    var vw = window.innerWidth || 0, vh = window.innerHeight || 0;
    var ix = Math.max(0, Math.min(b.right, vw) - Math.max(b.left, 0));
    var iy = Math.max(0, Math.min(b.bottom, vh) - Math.max(b.top, 0));
    var painted = st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) !== 0 && b.width >= 2 && b.height >= 2;
    var inside = painted && b.left >= -0.5 && b.right <= vw + 0.5 && b.top >= -0.5 && b.bottom <= vh + 0.5;
    return {
      id: el.getAttribute('data-garden-lumino'),
      l: Math.round(b.left * 10) / 10,
      t: Math.round(b.top * 10) / 10,
      r: Math.round(b.right * 10) / 10,
      b: Math.round(b.bottom * 10) / 10,
      painted: painted,
      inside: inside
    };
  }
  var ids = ['gathering', 'nursery', 'settings', 'thread'];
  var out = {
    vw: window.innerWidth || 0,
    vh: window.innerHeight || 0,
    hint: (document.getElementById('garden-start') && document.getElementById('garden-start').textContent) || '',
    layer: !!(window.TreePhonePolish136)
  };
  ids.forEach(function (id) { out[id] = box(document.querySelector('[data-garden-lumino="' + id + '"]')); });
  out.allInside = ids.every(function (id) { return out[id] && out[id].inside; });
  return out;
})()`;

(async function () {
  var errors = [];
  var report = { views: {}, errors: errors };
  var httpd = await serve(ROOT);
  var base = 'http://127.0.0.1:' + httpd.port;
  var debugPort = 18851;
  var dir = fs.mkdtempSync('/tmp/tree-phone-polish-chrome-');
  var child = spawn('google-chrome', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
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
    });
    function send(method, params) {
      var id = next++;
      return new Promise(function (resolve, reject) {
        pending[id] = function (msg) { if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error))); else resolve(msg.result); };
        ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
      });
    }
    await send('Page.enable'); await send('Runtime.enable');
    async function ev(expr) {
      var r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || 'eval');
      return r.result ? r.result.value : null;
    }
    async function view(w, h, mobile) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: mobile });
    }
    async function gotoDismiss() {
      await send('Page.navigate', { url: base + '/index.html' });
      await send('Page.loadEventFired').catch(function () {});
      await sleep(500);
      await ev(`(function () {
        var b = document.querySelector('[data-tree-door-stay] button, [data-tree-door-stay] .tree-door-soft');
        if (!b) b = Array.prototype.find.call(document.querySelectorAll('.tree-door button'), function (x) { return /not now/i.test(x.textContent || ''); });
        if (b) b.click();
        return true;
      })()`);
      await sleep(1200);
    }
    async function shot(name) {
      var r = await send('Page.captureScreenshot', { format: 'png' });
      fs.mkdirSync(SHOTS, { recursive: true });
      var dest = path.join(SHOTS, name);
      fs.writeFileSync(dest, Buffer.from(r.data, 'base64'));
      log('shot', dest);
    }

    // 1280 — layout must stay in the same quadrants as main before this layer
    await view(1280, 800, false);
    await gotoDismiss();
    var d1280 = await ev(measureExpr);
    report.views['1280x800'] = d1280;
    log('1280x800', JSON.stringify(d1280));
    if (!d1280.layer) errors.push('phone polish layer missing at 1280');
    if (!/legend/i.test(d1280.hint || '')) errors.push('hint bar does not mention the legend at 1280');
    if (!d1280.gathering || !d1280.gathering.inside) errors.push('Gathering light left the 1280 viewport');
    if (!d1280.nursery || !d1280.nursery.inside) errors.push('Nursery light left the 1280 viewport');
    if (!d1280.settings || !d1280.settings.inside) errors.push('Settings light left the 1280 viewport');
    if (!d1280.thread || !d1280.thread.inside) errors.push('Chat light left the 1280 viewport');
    // Unchanged layout: same quadrants as the 11695e9 baseline
    if (d1280.nursery && !(d1280.nursery.l < 400 && d1280.nursery.t > 400)) errors.push('1280 Nursery moved out of the lower-left quadrant: ' + JSON.stringify(d1280.nursery));
    if (d1280.settings && !(d1280.settings.l > 800 && d1280.settings.t < 550)) errors.push('1280 Settings moved out of the right quadrant: ' + JSON.stringify(d1280.settings));
    if (d1280.gathering && !(d1280.gathering.l > 450 && d1280.gathering.l < 850 && d1280.gathering.t < 450)) errors.push('1280 Gathering moved out of the upper-center: ' + JSON.stringify(d1280.gathering));
    if (d1280.thread && !(d1280.thread.l > 650)) errors.push('1280 Chat light moved out of the right-center: ' + JSON.stringify(d1280.thread));
    await shot('01-1280x800.png');

    var phones = [[390, 844], [390, 520]];
    for (var i = 0; i < phones.length; i++) {
      var w = phones[i][0], h = phones[i][1], label = w + 'x' + h;
      await view(w, h, true);
      await gotoDismiss();
      var snap = await ev(measureExpr);
      report.views[label] = snap;
      log(label, JSON.stringify(snap));
      if (!snap.layer) errors.push('phone polish layer missing at ' + label);
      if (!/legend/i.test(snap.hint || '')) errors.push('hint bar does not mention the legend at ' + label);
      ['gathering', 'nursery', 'settings', 'thread'].forEach(function (id) {
        if (!snap[id] || !snap[id].inside) errors.push(id + ' light is not inside the viewport at ' + label + ': ' + JSON.stringify(snap[id]));
      });
      await shot((i + 2).toString().padStart(2, '0') + '-' + label + '.png');
    }

    // Nursery open: the room label must not overlap clay Not now
    await view(390, 844, true);
    await gotoDismiss();
    await ev(`(function () {
      var row = document.querySelector('#lumino-legend [data-lumino-row="nursery"], #lumino-legend .lumino-legend-row');
      if (!row) {
        var rows = document.querySelectorAll('#lumino-legend .lumino-legend-row, #lumino-legend button, #lumino-legend [role="button"]');
        rows.forEach(function (el) { if (/nursery/i.test(el.textContent || '')) row = el; });
      }
      if (row) row.click();
      else if (window.GardenRooms && GardenRooms.openPlace) GardenRooms.openPlace('nursery');
      return true;
    })()`);
    await sleep(400);
    var overlap = await ev(`(function () {
      function r(el) { if (!el) return null; var b = el.getBoundingClientRect(); var st = getComputedStyle(el); var vis = st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0.05 && b.width >= 2 && b.height >= 2; return { l:b.left, t:b.top, r:b.right, b:b.bottom, vis: vis, text: (el.textContent||'').slice(0,60) }; }
      function hit(a, b) { if (!a || !b || !a.vis || !b.vis) return false; return Math.min(a.r, b.r) - Math.max(a.l, b.l) > 2 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 2; }
      var label = document.getElementById('room-label');
      var notNow = Array.prototype.find.call(document.querySelectorAll('button'), function (b) { return /^\\s*Not now\\s*$/i.test(b.textContent || ''); });
      var lb = r(label), nb = r(notNow);
      return { label: lb, notNow: nb, overlaps: hit(lb, nb), veilOpen: !!(document.getElementById('place-veil') && document.getElementById('place-veil').classList.contains('is-open')) };
    })()`);
    report.nurseryOpen = overlap;
    log('nursery open', JSON.stringify(overlap));
    if (overlap && overlap.overlaps) errors.push('you are in Nursery overlaps Not now while the room opens');
    await shot('04-nursery-open-390x844.png');
  } catch (e) {
    errors.push(String(e && e.stack || e));
  }
  try { if (cdpWs) cdpWs.close(); } catch (e) {}
  try { child.kill('SIGKILL'); } catch (e) {}
  httpd.server.close();
  fs.writeFileSync('/tmp/tree-phone-polish-chrome-report.json', JSON.stringify(report, null, 2));
  if (errors.length) { console.error('FAIL ' + errors.join(' | ')); process.exit(1); }
  log('PASS all room lights inside the viewport at 390x844 and 390x520; 1280 layout unchanged; Nursery label clear of Not now.');
})().catch(function (e) { console.error(e); process.exit(1); });
