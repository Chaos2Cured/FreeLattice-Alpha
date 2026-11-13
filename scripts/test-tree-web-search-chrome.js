#!/usr/bin/env node
// Overlap test for the Tree web search Settings card, and a short
// home/Gathering check that the layer is present. Does not load quiet-room.
// Does not run smoke.js.
'use strict';
var fs = require('fs');
var path = require('path');
var http = require('http');
var { spawn } = require('child_process');
var ROOT = path.join(__dirname, '..', 'docs');
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
(async function () {
  var errors = [];
  var httpd = await serve(ROOT);
  var base = 'http://127.0.0.1:' + httpd.port;
  var debugPort = 18861;
  var child = spawn('google-chrome', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--remote-debugging-port=' + debugPort, '--user-data-dir=' + fs.mkdtempSync('/tmp/tree-web-search-chrome-'), 'about:blank'
  ], { stdio: 'ignore' });
  var ws;
  try {
    await waitFor(async function () {
      try { return await getJson('http://127.0.0.1:' + debugPort + '/json/version'); } catch (e) { return null; }
    }, 15000);
    var list = await getJson('http://127.0.0.1:' + debugPort + '/json/list');
    var page = list.find(function (t) { return t.type === 'page'; }) || list[0];
    ws = new WebSocket(page.webSocketDebuggerUrl);
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
    async function goto(url) {
      await send('Page.navigate', { url: url });
      await send('Page.loadEventFired').catch(function () {});
      await sleep(500);
    }

    var views = [[1280, 800, false], [390, 844, true]];
    for (var i = 0; i < views.length; i++) {
      var w = views[i][0], h = views[i][1], mobile = views[i][2], label = w + 'x' + h;
      await view(w, h, mobile);
      await goto(base + '/settings.html');
      await waitFor(async function () { return ev('!!(window.TreeWebSearch && window.FLWebTool && document.getElementById("tree-web-search-section"))'); }, 8000);
      var snap = await ev(`(function () {
        function r(el) { if (!el) return null; var b = el.getBoundingClientRect(); var st = getComputedStyle(el); var vis = st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0 && b.width >= 2 && b.height >= 2; return { l:b.left, t:b.top, r:b.right, b:b.bottom, vis: vis }; }
        function hit(a, b) { if (!a || !b || !a.vis || !b.vis) return false; return Math.min(a.r, b.r) - Math.max(a.l, b.l) > 2 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 2; }
        var card = document.getElementById('tree-web-search-section');
        var shoulder = document.getElementById('shared-shoulder');
        var toggle = document.getElementById('webSearchToggle');
        var again = Array.prototype.find.call(document.querySelectorAll('button'), function (b) { return /Check again/i.test(b.textContent || ''); });
        var cb = r(card), sb = r(shoulder), tb = r(toggle), ab = r(again);
        return {
          hasCard: !!(card && cb && cb.vis),
          hasToggle: !!(toggle && tb && tb.vis),
          on: !!(window.TreeWebSearch && TreeWebSearch.searchOn()),
          api: !!(window.FLWebTool && window.TreeWebSearch),
          cardHitsShoulder: hit(cb, sb),
          cardHitsCheckAgain: hit(cb, ab),
          live: (document.getElementById('tree-web-search-live') && document.getElementById('tree-web-search-live').textContent) || ''
        };
      })()`);
      log('settings ' + label, JSON.stringify(snap));
      if (!snap.api) errors.push('APIs missing at settings ' + label);
      if (!snap.hasCard || !snap.hasToggle) errors.push('web search card or toggle missing at ' + label);
      if (!snap.on) errors.push('search is not on by default at ' + label);
      if (snap.cardHitsShoulder) errors.push('web search card overlaps the shared-shoulder footer at ' + label);
      if (snap.cardHitsCheckAgain) errors.push('web search card overlaps Check again at ' + label);
      if (!/Web search is on/i.test(snap.live || '')) errors.push('live line is not the quiet on-state at ' + label);
    }

    await view(1280, 800, false);
    await goto(base + '/index.html');
    await sleep(400);
    var home = await ev('!!(window.FLWebTool && window.TreeWebSearch && typeof TreeWebSearch.handleReply === "function")');
    log('home layer', home);
    if (!home) errors.push('web search layer missing on the garden home');
  } catch (e) {
    errors.push(String(e && e.stack || e));
  }
  try { if (ws) ws.close(); } catch (e) {}
  try { child.kill('SIGKILL'); } catch (e) {}
  httpd.server.close();
  if (errors.length) { console.error('FAIL ' + errors.join(' | ')); process.exit(1); }
  log('PASS web search Settings card is on by default and clear of the footer at 1280 and 390; layer present on home.');
})().catch(function (e) { console.error(e); process.exit(1); });
