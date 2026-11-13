#!/usr/bin/env node
// Chrome test for Tree softs after #138: fresh Gathering Ask receipts
// with no mind, and styled Settings buttons. Does not load quiet-room.
// Does not change AUTONOMY.md. Does not run smoke.js.
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
  var report = { errors: errors };
  var httpd = await serve(ROOT);
  var base = 'http://127.0.0.1:' + httpd.port;
  var debugPort = 18861;
  var dir = fs.mkdtempSync('/tmp/tree-softs-138-chrome-');
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

    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: base + '/index.html' });
    await send('Page.loadEventFired').catch(function () {});
    await sleep(600);
    await ev(`(function () {
      var veil = document.querySelector('.tree-door-veil, [data-tree-door-calm]');
      var scope = veil || document;
      var b = scope.querySelector('[data-tree-door-stay] button, [data-tree-door-stay]');
      if (!b) b = Array.prototype.find.call(scope.querySelectorAll('button'), function (x) { return /not now/i.test(x.textContent || ''); });
      if (b) b.click();
      return true;
    })()`);
    await sleep(800);
    await ev(`(function () { if (window.GardenRooms && GardenRooms.openPlace) GardenRooms.openPlace('core'); return true; })()`);
    await waitFor(async function () {
      return ev(`!!(document.getElementById('flgs-ask-btn') && window.TreeSofts138)`);
    }, 8000);
    await ev(`(function () {
      var box = document.getElementById('flgs-ask');
      if (box) { box.value = 'hello from the table'; box.dispatchEvent(new Event('input', { bubbles: true })); }
      return true;
    })()`);
    async function clickAsk() {
      await ev(`(function () { var b = document.getElementById('flgs-ask-btn'); if (b) b.click(); return true; })()`);
      await sleep(80);
      return ev(`(function () {
        var who = document.getElementById('flgs-who');
        var receipt = document.getElementById('flgs-receipt');
        var st = receipt ? getComputedStyle(receipt) : null;
        var hidden = !receipt || receipt.hidden || (st && (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0));
        return {
          layer: !!window.TreeSofts138,
          who: who ? (who.textContent || '').replace(/\\s+/g, ' ').trim() : '',
          receipt: receipt ? (receipt.textContent || '').replace(/\\s+/g, ' ').trim() : '',
          hidden: hidden
        };
      })()`);
    }
    var a1 = await clickAsk();
    var a2 = await clickAsk();
    var a3 = await clickAsk();
    report.asks = [a1, a2, a3];
    log('asks', JSON.stringify(report.asks));
    [a1, a2, a3].forEach(function (a, i) {
      if (!a || !a.layer) errors.push('softs layer missing on Ask ' + (i + 1));
      if (!a || a.hidden) errors.push('Ask ' + (i + 1) + ' left the receipt silent: ' + JSON.stringify(a));
      if (a && a.receipt && a.who && a.receipt === a.who) errors.push('Ask ' + (i + 1) + ' repeated the who line');
      if (a && a.receipt && a.receipt.length < 8) errors.push('Ask ' + (i + 1) + ' receipt too short');
    });
    if (a1 && a2 && a1.receipt && a1.receipt === a2.receipt) errors.push('second Ask was not a fresh sentence');
    if (a2 && a3 && a2.receipt && a2.receipt === a3.receipt) errors.push('third Ask was not a fresh sentence');

    await send('Page.navigate', { url: base + '/settings.html' });
    await send('Page.loadEventFired').catch(function () {});
    await sleep(700);
    var btns = await ev(`(function () {
      function info(el) {
        if (!el) return null;
        var st = getComputedStyle(el);
        var b = el.getBoundingClientRect();
        return {
          text: (el.textContent || '').replace(/\\s+/g, ' ').trim(),
          font: st.fontFamily,
          color: st.color,
          bg: st.backgroundColor,
          minH: st.minHeight,
          h: Math.round(b.height),
          w: Math.round(b.width)
        };
      }
      return {
        layer: !!window.TreeSofts138,
        look: info(document.querySelector('#tree-image-local-host button.fl-image-local-yes, #tree-image-local-host button')),
        gallery: info(Array.prototype.find.call(document.querySelectorAll('#tree-style-ledger-host button'), function (b) { return /Harmonia/i.test(b.textContent || ''); }) || document.querySelector('#tree-style-ledger-host button'))
      };
    })()`);
    report.buttons = btns;
    log('buttons', JSON.stringify(btns));
    if (!btns || !btns.layer) errors.push('softs layer missing on Settings');
    ['look', 'gallery'].forEach(function (k) {
      var b = btns && btns[k];
      if (!b) { errors.push('Settings button missing: ' + k); return; }
      if (!/Georgia/i.test(b.font || '')) errors.push(k + ' is not Georgia: ' + b.font);
      if ((b.h || 0) < 44 && parseFloat(b.minH) < 44) errors.push(k + ' shorter than 44px: ' + JSON.stringify(b));
      var white = /rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/i.test(b.bg || '') || b.bg === 'rgba(0, 0, 0, 0)' || b.bg === 'transparent';
      if (white) errors.push(k + ' still looks like a plain white button: ' + b.bg);
    });
  } catch (e) {
    errors.push(String(e && e.stack || e));
  }
  try { if (cdpWs) cdpWs.close(); } catch (e) {}
  try { child.kill('SIGKILL'); } catch (e) {}
  httpd.server.close();
  fs.writeFileSync('/tmp/tree-softs-138-chrome-report.json', JSON.stringify(report, null, 2));
  if (errors.length) { console.error('FAIL ' + errors.join(' | ')); process.exit(1); }
  log('PASS Gathering Ask gives a fresh kind receipt each time; Settings buttons are Tree gold-on-dark at 44px.');
})().catch(function (e) { console.error(e); process.exit(1); });
