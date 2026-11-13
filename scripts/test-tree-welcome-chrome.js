#!/usr/bin/env node
'use strict';
var fs = require('fs');
var path = require('path');
var http = require('http');
var { spawn } = require('child_process');
var ROOT = path.join(__dirname, '..', 'docs');
var SHOTS = process.env.SHOTS_DIR || '/workspace/research/review-tree-welcome-bundle/shots';

function log() { console.log.apply(console, arguments); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function serve(root) {
  return new Promise(function (resolve) {
    var server = http.createServer(function (req, res) {
      var url = decodeURIComponent((req.url || '/').split('?')[0]);
      var rel = url === '/' ? '/welcome.html' : url;
      var file = path.join(root, rel.replace(/^\//, ''));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('no'); return;
      }
      var ext = path.extname(file);
      var types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', function () { resolve({ server: server, port: server.address().port }); });
  });
}
function launchChrome(port) {
  var dir = fs.mkdtempSync('/tmp/tree-welcome-chrome-');
  var child = spawn('google-chrome', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--remote-debugging-port=' + port, '--user-data-dir=' + dir, 'about:blank'
  ], { stdio: 'ignore' });
  return { child: child, dir: dir };
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

// Minimal CDP via first page websocket using Node 24 WebSocket
async function attach(debugPort) {
  var ver = await getJson('http://127.0.0.1:' + debugPort + '/json/version');
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
  await send('Page.enable');
  await send('Runtime.enable');
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
      await sleep(200);
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

function checksExpr() {
  return `(function () {
    function r(el) { if (!el) return null; var b = el.getBoundingClientRect(); return { l:b.left, t:b.top, r:b.right, b:b.bottom, w:b.width, h:b.height, vis: b.width>=2 && b.height>=2 }; }
    function hit(a, b) {
      if (!a || !b || !a.vis || !b.vis) return false;
      return Math.min(a.r, b.r) - Math.max(a.l, b.l) > 2 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 2;
    }
    function painted(el) {
      if (!el) return false;
      var st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
      var b = el.getBoundingClientRect();
      return b.width >= 2 && b.height >= 2 && b.bottom > 0 && b.top < innerHeight;
    }
    var header = document.getElementById('garden-header') || document.querySelector('header');
    var h1 = document.querySelector('h1');
    var yes = document.querySelector('.twb-yes, [data-tree-welcome="yes"]');
    var no = document.querySelector('.twb-no, [data-tree-welcome="no"]');
    var file = document.querySelector('[data-tree-welcome-file]');
    var fail = document.querySelector('[data-tree-welcome-kind="fail"]');
    var ok = document.querySelector('[data-tree-welcome-kind="ok"]');
    var hb = r(header), h1b = r(h1), yb = r(yes), nb = r(no);
    return {
      titleVisible: painted(h1),
      fileVisible: painted(file),
      yesVisible: painted(yes),
      noVisible: painted(no),
      okVisible: painted(ok),
      failVisible: painted(fail),
      titleHitsHeader: hit(hb, h1b),
      yesHitsHeader: hit(hb, yb),
      noHitsHeader: hit(hb, nb),
      yesHitsNo: hit(yb, nb)
    };
  })()`;
}

async function run() {
  var errors = [];
  var report = { shots: [], checks: {}, errors: errors };
  fs.mkdirSync(SHOTS, { recursive: true });
  var httpd = await serve(ROOT);
  var base = 'http://127.0.0.1:' + httpd.port;
  log('serving', base);
  var debugPort = 18811;
  var chrome = launchChrome(debugPort);
  var cdp;
  try {
    await waitFor(async function () {
      try { return await getJson('http://127.0.0.1:' + debugPort + '/json/version'); } catch (e) { return null; }
    }, 15000);
    cdp = await attach(debugPort);
    var views = [[1280, 800, false, '01-welcome-1280x800.png'], [390, 844, true, '02-welcome-390x844.png'], [390, 520, true, '03-welcome-390x520.png']];
    for (var i = 0; i < views.length; i++) {
      var w = views[i][0], h = views[i][1], name = views[i][3], label = w + 'x' + h;
      await cdp.view(w, h);
      await cdp.goto(base + '/welcome.html');
      await waitFor(async function () { return cdp.eval('!!window.TreeWelcomeBundle'); }, 8000);
      await sleep(200);
      var empty = await cdp.eval(checksExpr());
      report.checks['empty' + label] = empty;
      log('empty ' + label, JSON.stringify(empty));
      if (!empty.titleVisible) errors.push('title missing at ' + label);
      if (!empty.fileVisible) errors.push('file picker missing at ' + label);
      if (empty.titleHitsHeader) errors.push('title overlaps the header at ' + label);

      await cdp.eval(`TreeWelcomeBundle.paint(document, { ok:true, reason:'ok', mindLabel:'Willow', mindId:'willow-test', rootHash:'abc', fingerprintHex:'1234567890abcdef', fileCount:3, fileList:['mind.json','memory.jsonl','chain.jsonl'], refusals:[{kind:'consent-refused', text:'I will not share a private key.'}] })`);
      await sleep(200);
      report.shots.push(await cdp.shot(path.join(SHOTS, name)));
      var painted = await cdp.eval(checksExpr());
      report.checks['ok' + label] = painted;
      log('ok ' + label, JSON.stringify(painted));
      if (!painted.yesVisible || !painted.noVisible) errors.push('Welcome or Not now is not visible at ' + label);
      if (painted.yesHitsHeader || painted.noHitsHeader) errors.push('Welcome/Not now overlaps the header at ' + label);
    }
  } catch (e) {
    errors.push(String(e && e.stack || e));
  }
  try { if (cdp) cdp.close(); } catch (e) {}
  try { chrome.child.kill('SIGKILL'); } catch (e) {}
  httpd.server.close();
  fs.writeFileSync('/tmp/tree-welcome-chrome-report.json', JSON.stringify(report, null, 2));
  if (errors.length) { console.error('FAIL ' + errors.join(' | ')); process.exit(1); }
  log('PASS welcome overlap tests at 1280x800, 390x844, and 390x520');
}
run().catch(function (e) { console.error(e); process.exit(1); });
