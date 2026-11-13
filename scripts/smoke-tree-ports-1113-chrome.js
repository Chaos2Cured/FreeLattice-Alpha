#!/usr/bin/env node
// Headless Chrome walk for the 13 November 2026 Tree ports (first-run calm + Gathering brick 3).
// Real time, 130s on home, Gathering, and Settings. No virtual-time budget (that would hide freezes).
// Does not load quiet-room.js. Does not change AUTONOMY.md.
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var { spawn } = require('child_process');
var { pathToFileURL } = require('url');

var ROOT = path.join(__dirname, '..', 'docs');
var WAIT_MS = 130000;
var SAMPLE_MS = 10000;
var CHROME = process.env.CHROME || 'google-chrome';

function log() { console.log.apply(console, arguments); }

function serve(root) {
  return new Promise(function (resolve) {
    var server = http.createServer(function (req, res) {
      var urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath === '/') urlPath = '/index.html';
      var file = path.join(root, urlPath);
      if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, function (err, data) {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        var ext = path.extname(file);
        var types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', function () {
      resolve({ server: server, port: server.address().port });
    });
  });
}

function getJson(url) {
  return new Promise(function (resolve, reject) {
    http.get(url, function (res) {
      var b = '';
      res.on('data', function (c) { b += c; });
      res.on('end', function () {
        try { resolve(JSON.parse(b)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function waitFor(fn, ms, step) {
  step = step || 200;
  var start = Date.now();
  return new Promise(function (resolve, reject) {
    (function tick() {
      Promise.resolve().then(fn).then(function (v) {
        if (v) return resolve(v);
        if (Date.now() - start > ms) return reject(new Error('timeout ' + ms + 'ms'));
        setTimeout(tick, step);
      }, reject);
    })();
  });
}

function Cdp(wsUrl) {
  this.ws = new WebSocket(wsUrl);
  this.id = 0;
  this.pending = new Map();
  var self = this;
  this.ready = new Promise(function (resolve, reject) {
    self.ws.addEventListener('open', resolve);
    self.ws.addEventListener('error', reject);
  });
  this.ws.addEventListener('message', function (ev) {
    var msg = JSON.parse(ev.data);
    if (msg.id && self.pending.has(msg.id)) {
      var p = self.pending.get(msg.id);
      self.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      else p.resolve(msg.result);
    }
  });
}
Cdp.prototype.send = function (method, params, timeoutMs) {
  var self = this;
  var id = ++this.id;
  var body = JSON.stringify({ id: id, method: method, params: params || {} });
  return new Promise(function (resolve, reject) {
    var t = setTimeout(function () {
      self.pending.delete(id);
      reject(new Error('CDP timeout ' + method));
    }, timeoutMs || 8000);
    self.pending.set(id, {
      resolve: function (v) { clearTimeout(t); resolve(v); },
      reject: function (e) { clearTimeout(t); reject(e); }
    });
    self.ws.send(body);
  });
};
Cdp.prototype.eval = function (expression, timeoutMs) {
  return this.send('Runtime.evaluate', {
    expression: expression,
    returnByValue: true,
    awaitPromise: true
  }, timeoutMs).then(function (res) {
    if (res.exceptionDetails) {
      var ex = res.exceptionDetails.exception || res.exceptionDetails;
      throw new Error(ex.description || ex.value || JSON.stringify(ex));
    }
    return res.result ? res.result.value : undefined;
  });
};
Cdp.prototype.close = function () { try { this.ws.close(); } catch (e) {} };

function launchChrome(port) {
  var dir = fs.mkdtempSync('/tmp/tree-ports-chrome-');
  var args = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--disable-features=Translate,BackForwardCache',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + dir,
    '--window-size=1280,800',
    'about:blank'
  ];
  var child = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  return { child: child, dir: dir };
}

async function firstPageCdp(debugPort) {
  var listed = await waitFor(async function () {
    try {
      var list = await getJson('http://127.0.0.1:' + debugPort + '/json/list');
      return (list || []).find(function (t) { return t.type === 'page' && t.webSocketDebuggerUrl; }) || null;
    } catch (e) { return null; }
  }, 10000);
  var cdp = new Cdp(listed.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Target.setDiscoverTargets', { discover: true });
  return cdp;
}

async function attachTab(debugPort, url, via) {
  var created = await via.send('Target.createTarget', { url: 'about:blank' });
  var targetId = created.targetId;
  var { browserContextId } = created;
  var listed = await waitFor(async function () {
    var list = await getJson('http://127.0.0.1:' + debugPort + '/json/list');
    return (list || []).find(function (t) { return t.id === targetId && t.webSocketDebuggerUrl; });
  }, 8000);
  // Prefer the exact new target id when Chrome exposes it
  var wsUrl = listed.webSocketDebuggerUrl;
  if (!wsUrl) {
    var info = await via.send('Target.attachToTarget', { targetId: targetId, flatten: true });
    throw new Error('no websocket for new target ' + targetId + ' ' + JSON.stringify(info));
  }
  var cdp = new Cdp(wsUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  return cdp;
}

async function goto(cdp, url) {
  await cdp.send('Page.navigate', { url: url });
  await cdp.send('Page.loadEventFired', {}, 20000).catch(function () {});
  await sleep(400);
}

function snapshotExpr() {
  return `(function () {
    var veil = document.querySelector('.tree-door-veil');
    var calm = veil && veil.getAttribute('data-tree-door-calm');
    var modal = veil && veil.getAttribute('aria-modal');
    var paused = document.body && document.body.innerText && /Checking paused/.test(document.body.innerText);
    var checkAgain = !!(document.querySelector('button') && Array.prototype.some.call(document.querySelectorAll('button'), function (b) { return /Check again/.test(b.textContent || ''); }));
    var mid = document.elementFromPoint(640, 360);
    var midVeil = !!(mid && mid.closest && mid.closest('.tree-door-veil') && mid.closest('.tree-door-veil').getAttribute('data-tree-door-calm') !== 'v-tree-door-first-run-calm-v0.2');
    var midBlocked = false;
    if (mid && mid.closest && mid.closest('.tree-door-veil')) {
      var v = mid.closest('.tree-door-veil');
      var st = window.getComputedStyle(v);
      midBlocked = st.pointerEvents !== 'none';
    }
    return {
      scrollY: window.scrollY || 0,
      title: document.title || '',
      ready: document.readyState,
      hasVeil: !!veil,
      calm: calm || '',
      ariaModal: modal || '',
      midBlocked: midBlocked,
      midVeilBlocking: midVeil,
      gatheringOpen: !!(document.getElementById('place-veil') && !document.getElementById('place-veil').hidden && document.getElementById('place-veil').classList.contains('is-core')),
      hasChairs: !!document.querySelector('#fl-gathering-mount [data-gathering]'),
      hasSpeak: !!document.querySelector('#fl-gathering-speak-mount [data-marker]'),
      receipt: (document.getElementById('flgs-receipt') && document.getElementById('flgs-receipt').textContent) || '',
      paused: !!paused,
      checkAgain: checkAgain,
      time: Date.now()
    };
  })()`;
}

async function sampleResponsive(cdp, label, start, results) {
  var t0 = Date.now();
  var snap = await cdp.eval(snapshotExpr(), 5000);
  var elapsed = Date.now() - t0;
  snap._evalMs = elapsed;
  snap._at = Date.now() - start;
  if (elapsed > 4000) throw new Error(label + ' froze: eval took ' + elapsed + 'ms at ' + snap._at + 'ms');
  results.push(snap);
  return snap;
}

async function run() {
  var report = { home: [], settings: [], gathering: [], chat: null, errors: [] };
  var httpd = await serve(ROOT);
  var base = 'http://127.0.0.1:' + httpd.port;
  log('serving', base);
  var debugPort = 18765;
  var chrome = launchChrome(debugPort);
  try {
    await waitFor(async function () {
      try { return await getJson('http://127.0.0.1:' + debugPort + '/json/version'); } catch (e) { return null; }
    }, 15000);
    log('chrome up');

    var via = await firstPageCdp(debugPort);
    var home = await attachTab(debugPort, 'about:blank', via);
    var gathering = await attachTab(debugPort, 'about:blank', via);
    var settings = await attachTab(debugPort, 'about:blank', via);

    await goto(home, base + '/index.html');
    await goto(gathering, base + '/index.html');
    await goto(settings, base + '/settings.html');

    // Load snapshots (scrollY on load)
    await sleep(600);
    var homeLoad = await sampleResponsive(home, 'home-load', Date.now(), []);
    var settingsLoad = await sampleResponsive(settings, 'settings-load', Date.now(), []);
    var gatheringLoad = await sampleResponsive(gathering, 'gathering-load', Date.now(), []);
    log('load scrollY home=' + homeLoad.scrollY + ' settings=' + settingsLoad.scrollY + ' gathering-tab=' + gatheringLoad.scrollY);
    if (homeLoad.scrollY !== 0) report.errors.push('home scrollY on load is ' + homeLoad.scrollY);
    if (settingsLoad.scrollY !== 0) report.errors.push('settings scrollY on load is ' + settingsLoad.scrollY);
    if (gatheringLoad.scrollY !== 0) report.errors.push('gathering tab scrollY on load is ' + gatheringLoad.scrollY);

    // Open the Gathering on that tab via the public GardenRooms door
    await waitFor(async function () {
      return gathering.eval('typeof GardenRooms !== "undefined" && typeof GardenRooms.openPlace === "function"');
    }, 15000);
    var opened = await gathering.eval(`(function () {
      try { GardenRooms.openPlace('core'); return 'openPlace'; }
      catch (e) { return 'err ' + e.message; }
    })()`);
    log('open Gathering:', opened);
    await waitFor(async function () {
      var s = await gathering.eval(snapshotExpr(), 5000);
      return (s.gatheringOpen && s.hasSpeak) ? s : null;
    }, 20000);
    log('Gathering opened and twins mounted');

    var chat = await gathering.eval(`(function () {
      var ask = document.getElementById('flgs-ask');
      var btn = document.getElementById('flgs-ask-btn');
      var receipt = document.getElementById('flgs-receipt');
      if (!ask || !btn) return { ok: false, reason: 'missing ask box' };
      ask.value = 'Hello, is anyone there?';
      ask.disabled = false;
      btn.disabled = false;
      btn.click();
      return {
        ok: true,
        receipt: (receipt && receipt.textContent) || '',
        who: (document.getElementById('flgs-who') && document.getElementById('flgs-who').textContent) || ''
      };
    })()`);
    report.chat = chat;
    log('Gathering chat:', JSON.stringify(chat));
    var kind = /no chair is speaking yet|seat a mind|find local minds|nothing was invented|no mind/i;
    if (!chat || !chat.ok || !kind.test(chat.receipt + ' ' + (chat.who || ''))) {
      report.errors.push('Gathering chat did not fail kindly: ' + JSON.stringify(chat));
    }

    var t0 = Date.now();
    report.home.push(Object.assign({ phase: 'start' }, await sampleResponsive(home, 'home', t0, [])));
    report.settings.push(Object.assign({ phase: 'start' }, await sampleResponsive(settings, 'settings', t0, [])));
    report.gathering.push(Object.assign({ phase: 'start' }, await sampleResponsive(gathering, 'gathering', t0, [])));

    while (Date.now() - t0 < WAIT_MS) {
      var next = Math.min(SAMPLE_MS, WAIT_MS - (Date.now() - t0));
      if (next < 200) break;
      await sleep(next);
      var hs = await sampleResponsive(home, 'home', t0, report.home);
      var ss = await sampleResponsive(settings, 'settings', t0, report.settings);
      var gs = await sampleResponsive(gathering, 'gathering', t0, report.gathering);
      if (hs.midBlocked) report.errors.push('home overlay blocked the center at ' + hs._at + 'ms');
      if (ss.hasVeil) report.errors.push('settings auto veil present at ' + ss._at + 'ms');
      if (gs.midBlocked && gs.gatheringOpen) report.errors.push('Gathering overlay blocked the room at ' + gs._at + 'ms');
      log('t=' + Math.round((Date.now() - t0) / 1000) + 's homeVeil=' + hs.hasVeil + ' calm=' + (!!hs.calm) + ' settingsVeil=' + ss.hasVeil + ' paused=' + ss.paused + ' gathering=' + gs.gatheringOpen + ' evalMs=' + hs._evalMs + '/' + ss._evalMs + '/' + gs._evalMs);
    }

    // Final checks
    var homeEnd = report.home[report.home.length - 1];
    var setEnd = report.settings[report.settings.length - 1];
    var gathEnd = report.gathering[report.gathering.length - 1];
    if (homeEnd && homeEnd.midBlocked) report.errors.push('home still blocked at end');
    if (setEnd && setEnd.hasVeil) report.errors.push('settings veil at end');
    if (gathEnd && !gathEnd.gatheringOpen) report.errors.push('Gathering closed during the walk');
    if (gathEnd && !gathEnd.hasSpeak) report.errors.push('Gathering speak mount missing at end');
    if (setEnd && setEnd._at >= 70000 && !setEnd.paused && !setEnd.checkAgain) {
      report.errors.push('Settings never showed Checking paused / Check again by the end');
    }

    home.close(); gathering.close(); settings.close();
  } catch (e) {
    report.errors.push(String(e && e.stack || e));
  }

  try { chrome.child.kill('SIGKILL'); } catch (e) {}
  httpd.server.close();

  var out = '/tmp/tree-ports-1113-chrome-report.json';
  try { fs.mkdirSync(path.dirname(out), { recursive: true }); } catch (e) {}
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  log('report', out);
  if (report.errors.length) {
    console.error('FAIL ' + report.errors.join(' | '));
    process.exit(1);
  }
  log('PASS 130s home, Gathering, and Settings stayed responsive; Gathering chat failed kindly; no blocking overlay.');
}

run().catch(function (e) {
  console.error(e);
  process.exit(1);
});
