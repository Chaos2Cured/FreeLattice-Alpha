#!/usr/bin/env node
// Softs after #137: at 390x520, Settings opens at the top, and the visible
// HTML room-light circle is 48 CSS pixels by computed size (not the door
// box). 1280 is unchanged. Does not load quiet-room. Does not run smoke.js.
'use strict';
var fs = require('fs');
var path = require('path');
var http = require('http');
var { spawn } = require('child_process');
var ROOT = path.join(__dirname, '..', 'docs');
var SHOTS = process.env.SHOTS_DIR || '/workspace/research/tree-phone-softs-137';

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
  var debugPort = 18921;
  var dir = fs.mkdtempSync('/tmp/tree-phone-softs-137-chrome-');
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
    async function view(w, h) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    }
    async function clickNotNow() {
      return ev(`(function () {
        var scopes = [];
        var door = document.querySelector('.tree-door, .tree-door-veil, [data-tree-door-calm]');
        if (door) scopes.push(door);
        scopes.push(document);
        for (var s = 0; s < scopes.length; s++) {
          var buttons = scopes[s].querySelectorAll('button, [data-tree-door-stay]');
          for (var i = 0; i < buttons.length; i++) {
            if (/not now/i.test(buttons[i].textContent || '') || buttons[i].getAttribute('data-tree-door-stay') != null) {
              (buttons[i].tagName === 'BUTTON' ? buttons[i] : (buttons[i].querySelector('button') || buttons[i])).click();
              return true;
            }
          }
        }
        return false;
      })()`);
    }
    async function gotoDismiss() {
      await send('Page.navigate', { url: base + '/index.html' });
      await send('Page.loadEventFired').catch(function () {});
      var t0 = Date.now();
      var seen = false;
      // The first-run door is delayed (~900ms). Do not treat a missing door as gone until it has had time to appear.
      while (Date.now() - t0 < 8000) {
        var up = await ev(`(function () {
          var el = document.querySelector('.tree-door-veil, .tree-door, [data-tree-door-calm]');
          if (!el) return 'missing';
          var st = getComputedStyle(el);
          var visible = st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0.05 && el.getBoundingClientRect().height > 2;
          return visible ? 'up' : 'gone';
        })()`);
        if (up === 'up') {
          seen = true;
          await clickNotNow();
          await sleep(400);
        } else if (up === 'gone' && seen) {
          break;
        } else if (up === 'missing' && (Date.now() - t0) > 2500 && !seen) {
          break;
        } else {
          await sleep(200);
        }
      }
      await clickNotNow();
      await sleep(400);
      var still = await ev(`(function () {
        var el = document.querySelector('.tree-door-veil');
        if (!el) return false;
        var st = getComputedStyle(el);
        return st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0.05;
      })()`);
      if (still) throw new Error('first-run door still up after Not now');
    }
    async function shot(name) {
      var r = await send('Page.captureScreenshot', { format: 'png' });
      fs.mkdirSync(SHOTS, { recursive: true });
      var dest = path.join(SHOTS, name);
      fs.writeFileSync(dest, Buffer.from(r.data, 'base64'));
      log('shot', dest);
      return dest;
    }

    // --- 390x520: computed 48px circle, then Settings at top ---
    await view(390, 520);
    await gotoDismiss();
    await sleep(1500);
    var lights = await ev(`(function () {
      var ids = ['gathering', 'nursery', 'settings', 'thread'];
      var out = { vw: window.innerWidth, vh: window.innerHeight, layer: !!(window.TreePhoneSofts137), polish: !!(window.TreePhonePolish136), version: (window.TreePhoneSofts137 && window.TreePhoneSofts137.VERSION) || '', grid: document.documentElement.hasAttribute('data-tree-phone-grid') };
      out.lights = ids.map(function (id) {
        var door = document.querySelector('[data-garden-lumino="' + id + '"]');
        var light = door && door.querySelector('.garden-lumino-light');
        var st = light && getComputedStyle(light);
        var box = door && door.getBoundingClientRect();
        return {
          id: id,
          computedW: st ? st.width : null,
          computedH: st ? st.height : null,
          clientW: light ? light.clientWidth : null,
          clientH: light ? light.clientHeight : null,
          usedW: light ? light.getBoundingClientRect().width : null,
          usedH: light ? light.getBoundingClientRect().height : null,
          boxW: box ? box.width : null,
          boxH: box ? box.height : null,
          padding: st ? st.padding : null,
          boxSizing: st ? st.boxSizing : null
        };
      });
      return out;
    })()`);
    report.lights520 = lights;
    log('lights520', JSON.stringify(lights, null, 2));
    if (!lights || !lights.layer) errors.push('TreePhoneSofts137 not loaded at 390x520');
    (lights.lights || []).forEach(function (L) {
      if (L.computedW !== '48px' || L.computedH !== '48px') errors.push(L.id + ' computed size is ' + L.computedW + 'x' + L.computedH + ', expected 48px (circle, not door box)');
      if (L.clientW !== 48 || L.clientH !== 48) errors.push(L.id + ' client size is ' + L.clientW + 'x' + L.clientH + ', expected 48');
    });
    report.shots = report.shots || {};
    report.shots.garden520 = await shot('520-garden-lights.png');

    var opened = await ev(`(function () {
      var b = document.querySelector('[data-garden-lumino="settings"]');
      if (b) b.click();
      return !!b;
    })()`);
    if (!opened) errors.push('could not click Settings light');
    await sleep(400);
    // Reproduce fl-connect.open: scroll the Connect host to the center.
    await ev(`(function () {
      var host = document.getElementById('fl-connect-mount-garden') || document.querySelector('.flc-wrap, [data-fl-connect]');
      if (host && host.scrollIntoView) host.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var clay = Array.prototype.find.call(document.querySelectorAll('p, div, label, h2, h3'), function (el) {
        return /Let your mind shape light/i.test(el.textContent || '') && (el.textContent || '').length < 80;
      });
      if (clay && clay.scrollIntoView) clay.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    })()`);
    await sleep(2200);
    var settings = await ev(`(function () {
      var veil = document.getElementById('place-veil');
      if (!veil) return { ok: false, reason: 'no veil' };
      var st = getComputedStyle(veil);
      var open = veil.classList.contains('is-open') && veil.classList.contains('is-settings');
      var vb = veil.getBoundingClientRect();
      var text = (veil.innerText || '').slice(0, 400);
      var first = null;
      var nodes = veil.querySelectorAll('h1, h2, h3, p, button, label, .title');
      for (var i = 0; i < nodes.length; i++) {
        var r = nodes[i].getBoundingClientRect();
        var cs = getComputedStyle(nodes[i]);
        if (cs.display === 'none' || cs.visibility === 'hidden' || r.height < 2) continue;
        first = { tag: nodes[i].tagName, text: (nodes[i].textContent || '').trim().slice(0, 80), top: Math.round(r.top * 10) / 10, veilTop: Math.round(vb.top * 10) / 10, gap: Math.round((r.top - vb.top) * 10) / 10 };
        break;
      }
      return {
        ok: open,
        scrollTop: veil.scrollTop,
        veilH: vb.height,
        first: first,
        textHead: text.replace(/\\s+/g, ' ').trim().slice(0, 180)
      };
    })()`);
    report.settings520 = settings;
    log('settings520', JSON.stringify(settings, null, 2));
    report.shots.settings520 = await shot('520-settings-top.png');
    if (!settings || !settings.ok) errors.push('Settings did not open at 390x520');
    if (settings && settings.scrollTop !== 0) errors.push('Settings scrollTop is ' + settings.scrollTop + ', expected 0');
    var head = (settings && settings.textHead) || '';
    if (!/Notebook/i.test(head)) errors.push('Notebook is not at the top of Settings (got: ' + head.slice(0, 80) + ')');
    if (/Let your mind shape light/i.test(head) && !/Notebook/i.test(head)) errors.push('Settings is mid-panel (clay offer visible, Notebook scrolled away)');

    // --- 1280 unchanged: no phone grid, Settings can still open ---
    await view(1280, 800);
    await gotoDismiss();
    await sleep(1500);
    var desk = await ev(`(function () {
      return {
        vw: window.innerWidth,
        grid: document.documentElement.hasAttribute('data-tree-phone-grid'),
        stack: !!(document.getElementById('tree-phone-stack') && document.getElementById('tree-phone-stack').parentNode),
        stackDisplay: (function () {
          var el = document.getElementById('tree-phone-stack');
          return el ? getComputedStyle(el).display : 'absent';
        })()
      };
    })()`);
    report.desk1280 = desk;
    log('desk1280', JSON.stringify(desk));
    report.shots.desk1280 = await shot('1280-garden.png');
    if (desk.vw !== 1280) errors.push('1280 viewport is ' + desk.vw);
    if (desk.grid) errors.push('phone grid still on at 1280');

    report.ok = errors.length === 0;
    fs.writeFileSync('/tmp/tree-phone-softs-137-report.json', JSON.stringify(report, null, 2));
    log(report.ok ? 'PASS' : 'FAIL', errors.length, 'errors');
    errors.forEach(function (e) { log(' -', e); });
    process.exitCode = report.ok ? 0 : 1;
  } catch (e) {
    console.error(e && e.stack || e);
    process.exitCode = 1;
  } finally {
    try { if (cdpWs) cdpWs.close(); } catch (e) {}
    try { child.kill('SIGKILL'); } catch (e) {}
    try { httpd.server.close(); } catch (e) {}
  }
})();
