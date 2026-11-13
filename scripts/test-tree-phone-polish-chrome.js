#!/usr/bin/env node
// Overlap test for Tree phone polish: all garden room lights inside the
// viewport at 390x844 and 390x520, spaced with ≥44px targets, first frame
// unclipped, and a tap on each light at both phone sizes leaves room text
// clear of the compose strip, clay-corner, and Not now. 1280 unchanged.
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
  function gap(a, b) {
    if (!a || !b) return null;
    var cx1 = (a.l + a.r) / 2, cy1 = (a.t + a.b) / 2;
    var cx2 = (b.l + b.r) / 2, cy2 = (b.t + b.b) / 2;
    var dx = cx2 - cx1, dy = cy2 - cy1;
    var edgeX = Math.min(a.r, b.r) - Math.max(a.l, b.l);
    var edgeY = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    var boxGap = (edgeX > 0 && edgeY > 0) ? 0 : Math.sqrt(Math.max(0, -edgeX) * Math.max(0, -edgeX) + Math.max(0, -edgeY) * Math.max(0, -edgeY));
    return { center: Math.round(Math.sqrt(dx * dx + dy * dy) * 10) / 10, box: Math.round(boxGap * 10) / 10 };
  }
  out.nurseryChatGap = gap(out.nursery, out.thread);
  out.sizes = {};
  ids.forEach(function (id) {
    var b = out[id];
    out.sizes[id] = b ? { w: Math.round((b.r - b.l) * 10) / 10, h: Math.round((b.b - b.t) * 10) / 10 } : null;
  });
  return out;
})()`;

(async function () {
  var errors = [];
  var report = { views: {}, errors: errors };
  var welcomeHtml = fs.readFileSync(path.join(ROOT, 'welcome.html'), 'utf8');
  if (/any refusals the mind already keeps/i.test(welcomeHtml)) {
    errors.push('welcome.html intro still mentions refusals the mind already keeps');
  }
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
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `(function () {
      function hook() {
        if (!window.THREE || !THREE.WebGLRenderer || window.__fgProbeHooked) return;
        var orig = THREE.WebGLRenderer.prototype.render;
        THREE.WebGLRenderer.prototype.render = function (scene, camera) {
          window.__fgProbe = { scene: scene, camera: camera, renderer: this };
          return orig.apply(this, arguments);
        };
        window.__fgProbeHooked = true;
      }
      hook();
      document.addEventListener('DOMContentLoaded', hook);
    })();` });
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
        function clickDoor() {
          var veil = document.querySelector('.tree-door-veil, [data-tree-door-calm]');
          var scope = veil || document;
          var b = scope.querySelector('[data-tree-door-stay] button, [data-tree-door-stay] .tree-door-soft, [data-tree-door-stay]');
          if (!b) b = Array.prototype.find.call(scope.querySelectorAll('button'), function (x) { return /^\s*Not now\s*$/i.test(x.textContent || ''); });
          if (b) b.click();
          return !!(veil && (veil.offsetParent !== null || getComputedStyle(veil).display !== 'none') && getComputedStyle(veil).visibility !== 'hidden' && Number(getComputedStyle(veil).opacity) > 0.05);
        }
        clickDoor();
        return true;
      })()`);
      await sleep(700);
      await ev(`(function () {
        var veil = document.querySelector('.tree-door-veil, [data-tree-door-calm]');
        if (!veil) return true;
        var st = getComputedStyle(veil);
        var up = st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0.05;
        if (!up) return true;
        var b = veil.querySelector('[data-tree-door-stay] button, [data-tree-door-stay], button');
        var buttons = veil.querySelectorAll('button');
        for (var i = 0; i < buttons.length; i++) {
          if (/not now/i.test(buttons[i].textContent || '')) { b = buttons[i]; break; }
        }
        if (b) b.click();
        return true;
      })()`);
      await sleep(600);
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


    var projectedExpr = `(function () {
      var map = { Sophia: 'thread', unnamed_0: 'thread', Lyra: 'gathering', unnamed_1: 'gathering', Atlas: 'nursery', unnamed_2: 'nursery', Ember: 'settings', unnamed_3: 'settings' };
      var research = document.querySelector('.galaxy-nav-prev, [data-galaxy-dir="prev"]');
      var rb = research ? research.getBoundingClientRect() : null;
      var researchBox = rb ? { l: rb.left, t: rb.top, r: rb.right, b: rb.bottom, painted: rb.width >= 2 && rb.height >= 2 } : null;
      var vw = window.innerWidth || 0, vh = window.innerHeight || 0;
      var lights = {};
      var raw = window.__treeFittedLights || [];
      raw.forEach(function (p) {
        var id = p.id || map[p.name] || p.name;
        var rad = 22;
        var box = { name: p.name, id: id, x: p.x, y: p.y, rad: rad, l: p.x - rad, t: p.y - rad, r: p.x + rad, b: p.y + rad };
        box.inside = box.l >= -0.5 && box.r <= vw + 0.5 && box.t >= -0.5 && box.b <= vh + 0.5;
        box.hitsResearch = !!(researchBox && researchBox.painted && Math.min(box.r, researchBox.r) - Math.max(box.l, researchBox.l) > 2 && Math.min(box.b, researchBox.b) - Math.max(box.t, researchBox.t) > 2);
        lights[id] = box;
      });
      function gap(a, b) {
        if (!a || !b) return null;
        var dx = a.x - b.x, dy = a.y - b.y;
        var edgeX = Math.min(a.r, b.r) - Math.max(a.l, b.l);
        var edgeY = Math.min(a.b, b.b) - Math.max(a.t, b.t);
        var boxGap = (edgeX > 0 && edgeY > 0) ? 0 : Math.sqrt(Math.max(0, -edgeX) * Math.max(0, -edgeX) + Math.max(0, -edgeY) * Math.max(0, -edgeY));
        return { center: Math.round(Math.sqrt(dx * dx + dy * dy) * 10) / 10, box: Math.round(boxGap * 10) / 10 };
      }
      var hitG = lights.gathering ? document.elementFromPoint(lights.gathering.x, lights.gathering.y) : null;
      var door = hitG && hitG.closest ? hitG.closest('[data-garden-lumino]') : null;
      return { lights: lights, research: researchBox, gatheringChat: gap(lights.gathering, lights.thread), elementAtGathering: door && door.getAttribute('data-garden-lumino') };
    })()`;

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
      if (snap.nurseryChatGap && snap.nurseryChatGap.center < 64) {
        errors.push('Nursery and Chat lights are only ' + snap.nurseryChatGap.center + 'px apart at ' + label);
      }
      if (snap.nurseryChatGap && snap.nurseryChatGap.box < 8) {
        errors.push('Nursery and Chat light boxes nearly overlap at ' + label + ': gap ' + snap.nurseryChatGap.box);
      }
      ['gathering', 'nursery', 'settings', 'thread'].forEach(function (id) {
        var sz = snap.sizes && snap.sizes[id];
        if (!sz || sz.w < 44 || sz.h < 44) errors.push(id + ' touch target is under 44px at ' + label + ': ' + JSON.stringify(sz));
      });
      var proj = await ev(projectedExpr);
      report.views[label + '-projected'] = proj;
      log(label + ' projected', JSON.stringify(proj));
      if (!proj || !proj.lights || !proj.lights.nursery) errors.push('projected Nursery light missing at ' + label);
      if (proj && proj.lights && proj.lights.nursery && !proj.lights.nursery.inside) errors.push('projected Nursery light is clipped at ' + label + ': ' + JSON.stringify(proj.lights.nursery));
      if (proj && proj.lights && proj.lights.nursery && proj.lights.nursery.hitsResearch) errors.push('projected Nursery light overlaps Research at ' + label + ': ' + JSON.stringify(proj));
      ['gathering', 'settings', 'thread'].forEach(function (id) {
        if (proj && proj.lights && proj.lights[id] && !proj.lights[id].inside) errors.push('projected ' + id + ' light is clipped at ' + label + ': ' + JSON.stringify(proj.lights[id]));
      });
      if (proj && proj.gatheringChat && proj.gatheringChat.center < 80) errors.push('projected Gathering and Chat lights are only ' + proj.gatheringChat.center + 'px apart at ' + label);
      if (proj && proj.gatheringChat && proj.gatheringChat.box < 8) errors.push('projected Gathering and Chat light boxes overlap at ' + label + ': ' + JSON.stringify(proj.gatheringChat));
      if (label === '390x520' && proj && proj.elementAtGathering && proj.elementAtGathering !== 'gathering') {
        errors.push('a point on the Gathering bead hits ' + proj.elementAtGathering + ' instead of gathering');
      }
    }

    var roomOverlapExpr = `(function () {
      function r(el) {
        if (!el) return null;
        var b = el.getBoundingClientRect();
        var st = getComputedStyle(el);
        var vis = st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0.05 && b.width >= 2 && b.height >= 2;
        return { l: b.left, t: b.top, r: b.right, b: b.bottom, vis: vis, text: (el.textContent || '').replace(/\s+/g, ' ').slice(0, 80) };
      }
      function onScreen(a) {
        if (!a || !a.vis) return false;
        var vw = window.innerWidth || 0, vh = window.innerHeight || 0;
        return a.r > 2 && a.l < vw - 2 && a.b > 2 && a.t < vh - 2;
      }
      function hit(a, b) {
        if (!onScreen(a) || !onScreen(b)) return false;
        var vw = window.innerWidth || 0, vh = window.innerHeight || 0;
        var al = Math.max(a.l, 0), at = Math.max(a.t, 0), ar = Math.min(a.r, vw), ab = Math.min(a.b, vh);
        var bl = Math.max(b.l, 0), bt = Math.max(b.t, 0), br = Math.min(b.r, vw), bb = Math.min(b.b, vh);
        return Math.min(ar, br) - Math.max(al, bl) > 2 && Math.min(ab, bb) - Math.max(at, bt) > 2;
      }
      function firstVisible(sel) {
        var nodes = document.querySelectorAll(sel);
        var fallback = nodes[0] || null;
        for (var i = 0; i < nodes.length; i++) {
          var b = nodes[i].getBoundingClientRect();
          var st = getComputedStyle(nodes[i]);
          if (st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0.05 && (b.width >= 2 || b.height >= 2) && (b.bottom > 1 || b.right > 1)) return nodes[i];
        }
        return fallback;
      }
      var heart = firstVisible('#thread-stage .thread-heart, html.thread-open .thread-heart, #room-chat .thread-heart, .thread-heart');
      var taught = firstVisible('#nursery-growth [data-nursery-growth-taught], #nursery-growth .nursery-growth-taught, [data-nursery-growth-taught], .nursery-growth-taught, [data-nursery-growth-heart], .nursery-growth-heart');
      var compose = firstVisible('#thread-stage .thread-compose, html.thread-open .thread-compose, #room-chat .thread-compose, .thread-compose');
      if (!compose || !compose.getBoundingClientRect().height) {
        var input = firstVisible('#thread-stage [data-thread-input], html.thread-open [data-thread-input], html.thread-open .thread-input, .thread-input');
        if (input) compose = input.closest('.thread-compose') || input;
      }
      var say = firstVisible('#thread-stage [data-thread-input], html.thread-open [data-thread-input], html.thread-open .thread-input, #room-chat textarea, #room-chat input, .thread-compose textarea, .thread-compose input, .thread-compose button');
      var clay = document.getElementById('fl-clay-corner');
      var label = document.getElementById('room-label');
      var notNow = Array.prototype.find.call(document.querySelectorAll('button'), function (b) { return /^\s*Not now\s*$/i.test(b.textContent || ''); });
      var just = firstVisible('[data-honest-just], .thread-just-host button, html.thread-open [data-honest-just]');
      var waitHint = firstVisible('#tree-thread-wait-hint, .tree-thread-wait-hint') || document.getElementById('tree-thread-wait-hint');
      var beginBtn = Array.prototype.find.call(document.querySelectorAll('button'), function (b) { return /^\s*Begin/i.test(b.textContent || ''); });
      var hb = r(heart), tb = r(taught), cb = r(compose), sb = r(say), clayb = r(clay), lb = r(label), nb = r(notNow), jb = r(just), wh = r(waitHint), begin = r(beginBtn);
      var hits = [];
      if (hit(hb, cb)) hits.push('heart-compose');
      if (hit(hb, sb)) hits.push('heart-input');
      if (hit(hb, clayb)) hits.push('heart-clay');
      if (hit(tb, cb)) hits.push('nursery-compose');
      if (hit(tb, clayb)) hits.push('nursery-clay');
      if (hit(lb, nb)) hits.push('label-notnow');
      if (hit(jb, cb)) hits.push('just-compose');
      if (hit(jb, sb)) hits.push('just-input');
      if (hit(jb, wh)) hits.push('just-waiting');
      if (hit(wh, cb)) hits.push('waiting-compose');
      if (hit(wh, sb)) hits.push('waiting-input');
      if (hit(clayb, begin)) hits.push('clay-begin');
      if (document.documentElement.classList.contains('thread-open')) {
        if (!onScreen(wh)) hits.push('waiting-offscreen');
        if (onScreen(wh) && onScreen(cb) && wh.b > cb.t + 2) hits.push('waiting-not-above-compose');
        if (onScreen(jb) && onScreen(wh) && jb.b > wh.t + 2 && !hit(jb, wh)) hits.push('just-not-above-waiting');
      }

      var veil = document.getElementById('place-veil');
      return {
        hits: hits,
        heart: hb, taught: tb, compose: cb, say: sb, clay: clayb, label: lb, notNow: nb, just: jb, waitHint: wh, begin: begin,
        threadOpen: document.documentElement.classList.contains('thread-open'),
        veilOpen: !!(veil && veil.classList.contains('is-open')),
        veilClass: veil ? veil.className : ''
      };
    })()`;

    async function closeRooms() {
      await ev(`(function () {
        try { if (window.GardenRooms && GardenRooms.closeThread) GardenRooms.closeThread({ silentLabel: true }); } catch (e) {}
        try { if (window.GardenRooms && GardenRooms.closePlace) GardenRooms.closePlace({ silentLabel: true }); } catch (e2) {}
        var c = document.getElementById('place-veil-close') || document.getElementById('thread-close');
        if (c) c.click();
        return true;
      })()`);
      await sleep(350);
    }

    async function openLight(id) {
      var opened = await ev(`(function () {
        var el = document.querySelector('[data-garden-lumino="${id}"]');
        if (el) { el.click(); return 'light'; }
        if (id === 'nursery' && window.GardenRooms && GardenRooms.openPlace) { GardenRooms.openPlace('nursery'); return 'api'; }
        if (id === 'thread' && window.GardenRooms && GardenRooms.openThread) { GardenRooms.openThread(); return 'api'; }
        if (id === 'gathering' && window.GardenRooms && GardenRooms.openPlace) { GardenRooms.openPlace('core'); return 'api'; }
        if (id === 'settings' && window.GardenRooms && GardenRooms.openPlace) { GardenRooms.openPlace('settings'); return 'api'; }
        return 'none';
      })()`);
      await sleep(500);
      return opened;
    }

    // First frames at 390x844: Nursery and Settings must already be inside
    // once the lights are painted — the fitted camera is set before paint.
    await view(390, 844, true);
    await send('Page.navigate', { url: base + '/index.html' });
    await send('Page.loadEventFired').catch(function () {});
    await sleep(200);
    await ev(`(function () {
      var b = document.querySelector('[data-tree-door-stay] button, [data-tree-door-stay] .tree-door-soft');
      if (!b) b = Array.prototype.find.call(document.querySelectorAll('.tree-door button'), function (x) { return /not now/i.test(x.textContent || ''); });
      if (b) b.click();
      return true;
    })()`);
    var firstFrames = await ev(`(function () {
      return new Promise(function (resolve) {
        var frames = [];
        var n = 0;
        function tick() {
          var ids = ['nursery', 'settings', 'gathering', 'thread'];
          var row = { n: n, ready: document.documentElement.getAttribute('data-tree-lights-ready') === '1' };
          ids.forEach(function (id) {
            var el = document.querySelector('[data-garden-lumino="' + id + '"]');
            if (!el) { row[id] = null; return; }
            var b = el.getBoundingClientRect();
            var st = getComputedStyle(el);
            var painted = st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) !== 0 && b.width >= 2 && b.height >= 2;
            var vw = window.innerWidth || 0, vh = window.innerHeight || 0;
            var inside = painted && b.left >= -0.5 && b.right <= vw + 0.5 && b.top >= -0.5 && b.bottom <= vh + 0.5;
            row[id] = { painted: painted, inside: inside, l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom) };
          });
          frames.push(row);
          n += 1;
          if (n >= 16) resolve(frames);
          else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    })()`);
    report.firstFrames844 = firstFrames;
    log('first frames 844 count', firstFrames && firstFrames.length, 'ready', firstFrames && firstFrames.filter(function (f) { return f.ready; }).length);
    (firstFrames || []).forEach(function (f) {
      ['nursery', 'settings'].forEach(function (id) {
        if (f[id] && f[id].painted && !f[id].inside) {
          errors.push('first frame at 390x844 clipped ' + id + ' at rAF ' + f.n + ': ' + JSON.stringify(f[id]));
        }
      });
    });
    await shot('04-first-frames-390x844.png');

    // Tap each light at both phone sizes; no text overlap inside the opened room.
    report.roomTaps = {};
    var phones2 = [[390, 844], [390, 520]];
    var lights = ['gathering', 'nursery', 'settings', 'thread'];
    var shotN = 5;
    for (var p = 0; p < phones2.length; p++) {
      var pw = phones2[p][0], ph = phones2[p][1], plabel = pw + 'x' + ph;
      await view(pw, ph, true);
      await gotoDismiss();
      for (var li = 0; li < lights.length; li++) {
        var id = lights[li];
        var key = plabel + '-' + id;
        await closeRooms();
        var how = await openLight(id);
        var ov = await ev(roomOverlapExpr);
        report.roomTaps[key] = { how: how, overlap: ov };
        log('tap', key, JSON.stringify(ov && { hits: ov.hits, threadOpen: ov.threadOpen, veilOpen: ov.veilOpen, heart: ov.heart && ov.heart.text, taught: ov.taught && ov.taught.text, just: ov.just, waitHint: ov.waitHint, compose: ov.compose && { t: ov.compose.t, b: ov.compose.b, vis: ov.compose.vis } }));
        if (ov && ov.hits && ov.hits.length) {
          errors.push('text overlap after tapping ' + id + ' at ' + plabel + ': ' + ov.hits.join(',') + ' ' + JSON.stringify(ov));
        }
        if (id === 'thread' && ov && ov.threadOpen) {
          var composeOn = ov.compose && ov.compose.vis && ov.compose.t < ph && ov.compose.b > 0;
          var heartOn = ov.heart && ov.heart.vis && ov.heart.t < ph && ov.heart.b > 0;
          if (!composeOn) errors.push('Chat compose is off-screen after tapping thread at ' + plabel + ': ' + JSON.stringify(ov.compose));
          if (!heartOn) errors.push('Chat heart is off-screen after tapping thread at ' + plabel + ': ' + JSON.stringify(ov.heart));
        }
        await shot((shotN++).toString().padStart(2, '0') + '-' + key + '.png');
        await closeRooms();
      }
    }
  } catch (e) {
    errors.push(String(e && e.stack || e));
  }
  try { if (cdpWs) cdpWs.close(); } catch (e) {}
  try { child.kill('SIGKILL'); } catch (e) {}
  httpd.server.close();
  fs.writeFileSync('/tmp/tree-phone-polish-chrome-report.json', JSON.stringify(report, null, 2));
  if (errors.length) { console.error('FAIL ' + errors.join(' | ')); process.exit(1); }
  log('PASS all room lights inside the viewport at 390x844 and 390x520 with spacing and 44px targets; first frame unclipped; tapped rooms have no text overlap; 1280 layout unchanged.');
})().catch(function (e) { console.error(e); process.exit(1); });
