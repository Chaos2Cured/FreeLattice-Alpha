#!/usr/bin/env node
// Live-style 130s smoke for Tree web search on home, Gathering, Settings,
// and welcome.html. Real time. Does not load quiet-room. Does not run smoke.js.
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');
var { spawn } = require('child_process');
var ROOT = path.join(__dirname, '..', 'docs');
var WAIT_MS = 130000;
var SAMPLE_MS = 10000;
function log() { console.log.apply(console, arguments); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function serve(root) {
  return new Promise(function (resolve) {
    var server = http.createServer(function (req, res) {
      var url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (url === '/') url = '/index.html';
      var file = path.join(root, url.replace(/^\//, ''));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('no'); return; }
      var ext = path.extname(file);
      var types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
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
    if (Date.now() - t0 > ms) throw new Error('timeout');
    await sleep(200);
    return poll();
  })();
}
(async function () {
  var errors = [];
  var httpd = await serve(ROOT);
  var base = 'http://127.0.0.1:' + httpd.port;
  log('serve', base);
  var debugPort = 18871;
  var child = spawn('google-chrome', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--remote-debugging-port=' + debugPort, '--user-data-dir=' + fs.mkdtempSync('/tmp/tree-web-search-smoke-'),
    '--window-size=1280,800', 'about:blank'
  ], { stdio: 'ignore' });
  var sockets = [];
  try {
    await waitFor(async function () {
      try { return await getJson('http://127.0.0.1:' + debugPort + '/json/version'); } catch (e) { return null; }
    }, 15000);
    async function tab(url) {
      var list0 = await getJson('http://127.0.0.1:' + debugPort + '/json/list');
      var viaPage = list0.find(function (t) { return t.type === 'page' && t.webSocketDebuggerUrl; });
      var via = new WebSocket(viaPage.webSocketDebuggerUrl);
      await new Promise(function (res, rej) { via.addEventListener('open', res); via.addEventListener('error', rej); });
      var next = 1, pending = {};
      via.addEventListener('message', function (ev) {
        var msg = JSON.parse(ev.data);
        if (msg.id && pending[msg.id]) { pending[msg.id](msg); delete pending[msg.id]; }
      });
      function send(method, params, timeoutMs) {
        var id = next++;
        return new Promise(function (resolve, reject) {
          var t = setTimeout(function () { delete pending[id]; reject(new Error('CDP timeout ' + method)); }, timeoutMs || 8000);
          pending[id] = function (msg) {
            clearTimeout(t);
            if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            else resolve(msg.result);
          };
          via.send(JSON.stringify({ id: id, method: method, params: params || {} }));
        });
      }
      await send('Page.enable'); await send('Runtime.enable');
      var created = await send('Target.createTarget', { url: url });
      var listed = await waitFor(async function () {
        var list = await getJson('http://127.0.0.1:' + debugPort + '/json/list');
        return (list || []).find(function (t) { return t.id === created.targetId && t.webSocketDebuggerUrl; });
      }, 8000);
      via.close();
      var ws = new WebSocket(listed.webSocketDebuggerUrl);
      sockets.push(ws);
      await new Promise(function (res, rej) { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
      var n2 = 1, p2 = {};
      ws.addEventListener('message', function (ev) {
        var msg = JSON.parse(ev.data);
        if (msg.id && p2[msg.id]) { p2[msg.id](msg); delete p2[msg.id]; }
      });
      function send2(method, params, timeoutMs) {
        var id = n2++;
        return new Promise(function (resolve, reject) {
          var t = setTimeout(function () { delete p2[id]; reject(new Error('CDP timeout ' + method)); }, timeoutMs || 8000);
          p2[id] = function (msg) {
            clearTimeout(t);
            if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            else resolve(msg.result);
          };
          ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
        });
      }
      await send2('Page.enable'); await send2('Runtime.enable');
      await send2('Page.navigate', { url: url });
      await send2('Page.loadEventFired', {}, 20000).catch(function () {});
      await sleep(400);
      return {
        eval: async function (expr, timeoutMs) {
          var t0 = Date.now();
          var r = await send2('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, timeoutMs || 5000);
          if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || 'eval');
          return { value: r.result ? r.result.value : null, ms: Date.now() - t0 };
        }
      };
    }

    var home = await tab(base + '/index.html');
    var gathering = await tab(base + '/index.html');
    var settings = await tab(base + '/settings.html');
    var welcome = await tab(base + '/welcome.html');
    await sleep(600);

    await waitFor(async function () {
      var r = await gathering.eval('typeof GardenRooms !== "undefined" && typeof GardenRooms.openPlace === "function"');
      return r.value;
    }, 15000);
    await gathering.eval('GardenRooms.openPlace("core")');
    await waitFor(async function () {
      var r = await gathering.eval('!!(document.getElementById("place-veil") && document.getElementById("place-veil").classList.contains("is-core"))');
      return r.value;
    }, 20000);

    var setSnap = await settings.eval('({ api: !!window.TreeWebSearch, tool: !!window.FLWebTool, on: !!(window.TreeWebSearch && TreeWebSearch.searchOn()), card: !!document.getElementById("tree-web-search-section") })');
    log('settings', JSON.stringify(setSnap.value));
    if (!setSnap.value || !setSnap.value.api || !setSnap.value.tool || !setSnap.value.on || !setSnap.value.card) {
      errors.push('Settings web search card not ready: ' + JSON.stringify(setSnap.value));
    }
    var homeSnap = await home.eval('!!(window.TreeWebSearch && window.FLWebTool)');
    if (!homeSnap.value) errors.push('home missing web search layer');
    var wel = await welcome.eval('({ title: !!(document.querySelector("h1") && /Welcome a mind/.test(document.querySelector("h1").textContent||"")), stored: !!(window.TreeWelcomeBundle && TreeWelcomeBundle.hasStored()) })');
    if (!wel.value || !wel.value.title) errors.push('welcome page missing');
    if (wel.value && wel.value.stored) errors.push('welcome wrote storage during smoke');

    var t0 = Date.now();
    while (Date.now() - t0 < WAIT_MS) {
      var next = Math.min(SAMPLE_MS, WAIT_MS - (Date.now() - t0));
      if (next < 200) break;
      await sleep(next);
      var hs = await home.eval('({ ready: document.readyState, layer: !!(window.TreeWebSearch && window.FLWebTool) })');
      var ss = await settings.eval('({ ready: document.readyState, card: !!document.getElementById("tree-web-search-section"), on: !!(window.TreeWebSearch && TreeWebSearch.searchOn()), paused: /Checking paused/.test(document.body.innerText||"") })');
      var gs = await gathering.eval('({ open: !!(document.getElementById("place-veil") && document.getElementById("place-veil").classList.contains("is-core")) })');
      var ws = await welcome.eval('({ title: !!(document.querySelector("h1")), stored: !!(window.TreeWelcomeBundle && TreeWelcomeBundle.hasStored()) })');
      if (hs.ms > 4000 || ss.ms > 4000 || gs.ms > 4000 || ws.ms > 4000) errors.push('freeze evalMs ' + hs.ms + '/' + ss.ms + '/' + gs.ms + '/' + ws.ms);
      if (!hs.value || !hs.value.layer) errors.push('home layer dropped');
      if (!ss.value || !ss.value.card || !ss.value.on) errors.push('settings card dropped or turned off');
      if (!gs.value || !gs.value.open) errors.push('Gathering closed');
      if (ws.value && ws.value.stored) errors.push('welcome stored during the walk');
      log('t=' + Math.round((Date.now() - t0) / 1000) + 's evalMs=' + hs.ms + '/' + ss.ms + '/' + gs.ms + '/' + ws.ms + ' paused=' + !!(ss.value && ss.value.paused));
    }
  } catch (e) {
    errors.push(String(e && e.stack || e));
  }
  sockets.forEach(function (s) { try { s.close(); } catch (e) {} });
  try { child.kill('SIGKILL'); } catch (e) {}
  httpd.server.close();
  if (errors.length) { console.error('FAIL ' + errors.join(' | ')); process.exit(1); }
  log('PASS 130s web search smoke: home, Gathering, Settings, and welcome stayed responsive; search stayed on; welcome stored nothing.');
})().catch(function (e) { console.error(e); process.exit(1); });
