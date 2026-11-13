#!/usr/bin/env node
// Measure whether the Nursery light is on-screen and clear of the first-run
// sheet at 390px. Real painted/on-screen boxes only. Does not load quiet-room.
// Does not change AUTONOMY.md.
'use strict';
var fs = require('fs');
var path = require('path');
var http = require('http');
var { spawn } = require('child_process');
var ROOT = path.join(__dirname, '..', 'docs');
var OUT = process.env.NURSERY_REPORT || '/tmp/tree-nursery-390-measure.json';
var SHOTS = process.env.SHOTS_DIR || '/tmp/tree-nursery-390-shots';

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
async function attach(debugPort) {
  var list = await getJson('http://127.0.0.1:' + debugPort + '/json/list');
  var page = list.find(function (t) { return t.type === 'page'; }) || list[0];
  var ws = new WebSocket(page.webSocketDebuggerUrl);
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
  return {
    send: send,
    eval: async function (expr) {
      var r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || 'eval');
      return r.result ? r.result.value : null;
    },
    goto: async function (url) {
      await send('Page.navigate', { url: url });
      await send('Page.loadEventFired').catch(function () {});
      await sleep(300);
    },
    view: async function (w, h) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 800 });
    },
    shot: async function (dest) {
      var r = await send('Page.captureScreenshot', { format: 'png' });
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, Buffer.from(r.data, 'base64'));
      log('shot', dest);
      return dest;
    },
    close: function () { try { ws.close(); } catch (e) {} }
  };
}

var measureExpr = `(function () {
  function box(el) {
    if (!el) return null;
    var b = el.getBoundingClientRect();
    var st = getComputedStyle(el);
    var vw = window.innerWidth || 0, vh = window.innerHeight || 0;
    var ix = Math.max(0, Math.min(b.right, vw) - Math.max(b.left, 0));
    var iy = Math.max(0, Math.min(b.bottom, vh) - Math.max(b.top, 0));
    var onScreen = ix > 2 && iy > 2;
    var painted = st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) !== 0 && b.width >= 2 && b.height >= 2;
    return {
      l: Math.round(b.left * 10) / 10,
      t: Math.round(b.top * 10) / 10,
      r: Math.round(b.right * 10) / 10,
      b: Math.round(b.bottom * 10) / 10,
      w: Math.round(b.width * 10) / 10,
      h: Math.round(b.height * 10) / 10,
      display: st.display,
      visibility: st.visibility,
      opacity: st.opacity,
      painted: painted,
      onScreen: onScreen,
      visibleOnScreen: painted && onScreen,
      intersectW: Math.round(ix * 10) / 10,
      intersectH: Math.round(iy * 10) / 10
    };
  }
  function hit(a, b) {
    if (!a || !b || !a.painted || !b.painted) return false;
    return Math.min(a.r, b.r) - Math.max(a.l, b.l) > 2 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 2;
  }
  var card = document.querySelector('.tree-door-veil[data-tree-door-calm] .tree-door');
  var nursery = document.querySelector('[data-garden-lumino="nursery"]');
  var light = nursery && nursery.querySelector('.garden-lumino-light');
  var word = nursery && nursery.querySelector('.garden-lumino-word');
  var clay = document.getElementById('fl-clay-corner');
  var legend = document.getElementById('lumino-legend');
  var nb = box(nursery), lb = box(light), wb = box(word), cb = box(card), clb = box(clay), lgb = box(legend);
  var mid = null;
  if (nb && nb.visibleOnScreen) {
    mid = document.elementFromPoint((nb.l + nb.r) / 2, (nb.t + nb.b) / 2);
  } else if (nb) {
    mid = 'off-canvas; not sampled';
  }
  return {
    viewport: { w: window.innerWidth || 0, h: window.innerHeight || 0 },
    hasCard: !!card,
    card: cb,
    nursery: nb,
    nurseryLight: lb,
    nurseryWord: wb,
    clay: clb,
    legend: lgb,
    sheetCoversNurseryBox: hit(cb, nb),
    sheetCoversNurseryLight: hit(cb, lb),
    sheetCoversNurseryWord: hit(cb, wb),
    nurseryVisibleOnScreen: !!(nb && nb.visibleOnScreen),
    lightVisibleOnScreen: !!(lb && lb.visibleOnScreen),
    wordVisibleOnScreen: !!(wb && wb.visibleOnScreen),
    midTarget: mid && mid !== 'off-canvas; not sampled' ? ((mid.id && ('#' + mid.id)) || mid.getAttribute && (mid.getAttribute('data-garden-lumino') || mid.className) || mid.tagName) : mid
  };
})()`;

(async function () {
  var report = { views: {}, verdicts: [], errors: [] };
  var httpd = await serve(ROOT);
  var base = 'http://127.0.0.1:' + httpd.port;
  var debugPort = 18831;
  var dir = fs.mkdtempSync('/tmp/tree-nursery-measure-');
  var child = spawn('google-chrome', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--remote-debugging-port=' + debugPort, '--user-data-dir=' + dir, 'about:blank'
  ], { stdio: 'ignore' });
  var cdp;
  try {
    await waitFor(async function () {
      try { return await getJson('http://127.0.0.1:' + debugPort + '/json/version'); } catch (e) { return null; }
    }, 15000);
    cdp = await attach(debugPort);
    var views = [[390, 844, '390x844'], [390, 522, '390x522'], [1280, 800, '1280x800']];
    for (var i = 0; i < views.length; i++) {
      var w = views[i][0], h = views[i][1], label = views[i][2];
      await cdp.view(w, h);
      await cdp.goto(base + '/index.html');
      await waitFor(async function () {
        return cdp.eval('!!document.querySelector(".tree-door-veil[data-tree-door-calm] .tree-door")');
      }, 8000);
      await sleep(400);
      var m = await cdp.eval(measureExpr);
      report.views[label] = m;
      log(label, JSON.stringify(m));
      if (label === '390x844') {
        await cdp.shot(path.join(SHOTS, 'home-390x844-sheet.png'));
      }
      var onScreen = m.lightVisibleOnScreen || m.nurseryVisibleOnScreen;
      var covered = m.sheetCoversNurseryLight || m.sheetCoversNurseryBox;
      var verdict;
      if (!m.hasCard) verdict = label + ': first-run sheet was not open.';
      else if (onScreen && !covered) verdict = label + ': the Nursery light is on-screen and clear of the open sheet.';
      else if (onScreen && covered) verdict = label + ': the Nursery light is on-screen but the open sheet covers it.';
      else if (!onScreen && !covered) verdict = label + ': the Nursery light is off-canvas (not visually on-screen). Its box does not geometrically overlap the sheet, so clear-while-open is not visually confirmed.';
      else verdict = label + ': the Nursery light is off-canvas and its box overlaps the sheet geometrically.';
      report.verdicts.push(verdict);
      log('verdict', verdict);
    }
  } catch (e) {
    report.errors.push(String(e && e.stack || e));
  }
  try { if (cdp) cdp.close(); } catch (e) {}
  try { child.kill('SIGKILL'); } catch (e) {}
  httpd.server.close();
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  log('report', OUT);
  if (report.errors.length) {
    console.error('FAIL ' + report.errors.join(' | '));
    process.exit(1);
  }
  log('MEASURE DONE');
})().catch(function (e) { console.error(e); process.exit(1); });
