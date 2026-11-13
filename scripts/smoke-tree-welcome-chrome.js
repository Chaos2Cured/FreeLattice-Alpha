#!/usr/bin/env node
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
      var rel = url === '/' ? '/welcome.html' : url;
      var file = path.join(root, rel.replace(/^\//, ''));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('no'); return; }
      var ext = path.extname(file);
      var types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
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
      var t0 = Date.now();
      var r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || 'eval');
      return { value: r.result ? r.result.value : null, ms: Date.now() - t0 };
    },
    close: function () { try { ws.close(); } catch (e) {} }
  };
}
(async function () {
  var httpd = await serve(ROOT);
  var base = 'http://127.0.0.1:' + httpd.port;
  var debugPort = 18821;
  var dir = fs.mkdtempSync('/tmp/tree-welcome-smoke-');
  var child = spawn('google-chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=' + debugPort, '--user-data-dir=' + dir, base + '/welcome.html'], { stdio: 'ignore' });
  var errors = [];
  var cdp;
  try {
    var tWait = Date.now();
    while (Date.now() - tWait < 15000) {
      try { await getJson('http://127.0.0.1:' + debugPort + '/json/version'); break; } catch (e) { await sleep(200); }
    }
    cdp = await attach(debugPort);
    await sleep(800);
    var start = Date.now();
    var last = null;
    while (Date.now() - start < 130000) {
      var ev = await cdp.eval(`({ title: !!(document.querySelector('h1') && /Welcome a mind/.test(document.querySelector('h1').textContent||'')), file: !!document.querySelector('[data-tree-welcome-file]'), api: !!window.TreeWelcomeBundle, stored: !!(window.TreeWelcomeBundle && TreeWelcomeBundle.hasStored()) })`);
      last = ev.value;
      var t = Math.round((Date.now() - start) / 1000);
      if (t === 0 || t % 10 === 0) log('t=' + t + 's', JSON.stringify(last), 'evalMs=' + ev.ms);
      if (!last || !last.title || !last.file || !last.api) errors.push('welcome page dropped at t=' + t + 's');
      if (last && last.stored) errors.push('storage was written during the smoke at t=' + t + 's');
      if (ev.ms > 2000) errors.push('eval slow at t=' + t + 's (' + ev.ms + 'ms)');
      await sleep(1000);
    }
  } catch (e) { errors.push(String(e && e.stack || e)); }
  try { if (cdp) cdp.close(); } catch (e) {}
  try { child.kill('SIGKILL'); } catch (e) {}
  httpd.server.close();
  if (errors.length) { console.error('FAIL ' + errors.join(' | ')); process.exit(1); }
  log('PASS 130s Welcome page stayed responsive; nothing was stored.');
})().catch(function (e) { console.error(e); process.exit(1); });
