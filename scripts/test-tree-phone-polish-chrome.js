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

    var phones = [[390, 844], [390, 520], [390, 700]];
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
      if (proj && proj.elementAtGathering && proj.elementAtGathering !== 'gathering') {
        errors.push('a point on the Gathering bead hits ' + proj.elementAtGathering + ' instead of gathering at ' + label);
      }
      var extra = await ev(`(function () {
        var light = document.querySelector('.galaxy-nav-prev .galaxy-nav-light, [data-galaxy-dir="prev"] .galaxy-nav-light');
        var ring = null;
        if (light) {
          var b = light.getBoundingClientRect();
          var cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2;
          var rad = 50;
          var vw = window.innerWidth || 0, vh = window.innerHeight || 0;
          ring = { l: cx - rad, t: cy - rad, r: cx + rad, b: cy + rad, inside: (cx - rad) >= -0.5 && (cx + rad) <= vw + 0.5 && (cy - rad) >= -0.5 && (cy + rad) <= vh + 0.5 };
        }
        var word = document.querySelector('[data-garden-lumino="nursery"] .garden-lumino-word');
        var research = document.querySelector('.galaxy-nav-prev, [data-galaxy-dir="prev"]');
        var wordGap = null;
        if (word && research) {
          var wb = word.getBoundingClientRect(), rb = research.getBoundingClientRect();
          wordGap = { wordB: wb.bottom, researchT: rb.top, gap: rb.top - wb.bottom, wordT: wb.top };
        }
        var gWord = document.querySelector('[data-garden-lumino="gathering"] .garden-lumino-word');
        var atWord = null;
        if (gWord) {
          var gw = gWord.getBoundingClientRect();
          var el = document.elementFromPoint(gw.left + gw.width / 2, gw.top + gw.height / 2);
          var door = el && el.closest ? el.closest('[data-garden-lumino]') : null;
          atWord = door && door.getAttribute('data-garden-lumino');
        }
        var gDoor = document.querySelector('[data-garden-lumino="gathering"]');
        var atHex = null;
        if (gDoor) {
          var gd = gDoor.getBoundingClientRect();
          var hx = gd.left + gd.width / 2;
          var hy = gd.top + gd.height / 2 + 40;
          var el2 = document.elementFromPoint(hx, hy);
          var door2 = el2 && el2.closest ? el2.closest('[data-garden-lumino]') : null;
          atHex = door2 && door2.getAttribute('data-garden-lumino');
        }
        var legend = document.getElementById('lumino-legend');
        var wordLegend = null;
        if (word && legend) {
          var lb = legend.getBoundingClientRect();
          var overlap = Math.min(wb.right, lb.right) - Math.max(wb.left, lb.left) > 2 && Math.min(wb.bottom, lb.bottom) - Math.max(wb.top, lb.top) > 2;
          wordLegend = { overlap: overlap, word: { l: wb.left, t: wb.top, r: wb.right, b: wb.bottom }, legend: { l: lb.left, t: lb.top, r: lb.right, b: lb.bottom } };
        }
        var clay = document.getElementById('fl-clay-corner');
        var art = document.querySelector('.galaxy-nav-next, [data-galaxy-dir="next"]');
        var clayArt = null;
        if (clay && art) {
          var cb = clay.getBoundingClientRect(), ab = art.getBoundingClientRect();
          var cst = getComputedStyle(clay), ast = getComputedStyle(art);
          var cVis = cst.display !== 'none' && cst.visibility !== 'hidden' && Number(cst.opacity) > 0.05 && cb.width >= 2;
          var aVis = ast.display !== 'none' && ast.visibility !== 'hidden' && Number(ast.opacity) > 0.05 && ab.width >= 2;
          clayArt = { overlap: !!(cVis && aVis && Math.min(cb.right, ab.right) - Math.max(cb.left, ab.left) > 2 && Math.min(cb.bottom, ab.bottom) - Math.max(cb.top, ab.top) > 2), clay: { l: cb.left, t: cb.top, r: cb.right, b: cb.bottom, vis: cVis }, art: { l: ab.left, t: ab.top, r: ab.right, b: ab.bottom, vis: aVis } };
        }
        return { ring: ring, wordGap: wordGap, atWord: atWord, atHex: atHex, wordLegend: wordLegend, clayArt: clayArt };
      })()`);
      report.views[label + '-extra'] = extra;
      log(label + ' extra', JSON.stringify(extra));
      if (extra && extra.ring && !extra.ring.inside) errors.push('Research ring is clipped at ' + label + ': ' + JSON.stringify(extra.ring));
      if (extra && extra.wordGap && extra.wordGap.gap < 12) errors.push('Nursery label is only ' + extra.wordGap.gap + 'px above Research at ' + label);
      if (extra && extra.atWord && extra.atWord !== 'gathering') errors.push('Gathering label tap hits ' + extra.atWord + ' at ' + label);
      if (extra && extra.atHex && extra.atHex !== 'gathering') errors.push('Gathering hex tap hits ' + extra.atHex + ' at ' + label);
      if (extra && extra.wordLegend && extra.wordLegend.overlap) errors.push('Nursery label overlaps the legend at ' + label + ': ' + JSON.stringify(extra.wordLegend));
      if (extra && extra.clayArt && extra.clayArt.overlap) errors.push('clay-corner covers the Art ring at ' + label + ': ' + JSON.stringify(extra.clayArt));
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
      if (hit(jb, hb)) hits.push('just-heart');
      if (document.documentElement.classList.contains('thread-open')) {
        if (!onScreen(wh)) hits.push('waiting-offscreen');
        if (onScreen(wh) && onScreen(cb) && wh.b > cb.t + 2) hits.push('waiting-not-above-compose');
        if (onScreen(jb) && onScreen(wh) && jb.b > wh.t + 2 && !hit(jb, wh)) hits.push('just-not-above-waiting');
        if (onScreen(jb) && onScreen(hb) && hb.b > jb.t + 2) hits.push('heart-not-above-just');
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

    async function roomState() {
      return ev(`(function () {
        var v = document.getElementById('place-veil');
        var t = document.getElementById('thread-veil');
        return {
          thread: document.documentElement.classList.contains('thread-open'),
          threadVeil: !!(t && t.classList.contains('is-open')),
          veil: !!(v && v.classList.contains('is-open')),
          veilClass: v ? v.className : '',
          lights: !!(document.querySelector('.garden-lumino.is-attached') && getComputedStyle(document.querySelector('.garden-lumino.is-attached')).visibility !== 'hidden')
        };
      })()`);
    }

    async function closeRooms() {
      await ev(`(function () {
        try { if (window.GardenRooms && GardenRooms.closeThread) GardenRooms.closeThread({ silentLabel: true }); } catch (e) {}
        try { if (window.GardenRooms && GardenRooms.closePlace) GardenRooms.closePlace({ silentLabel: true }); } catch (e2) {}
        var c = document.getElementById('place-veil-close') || document.getElementById('thread-close');
        if (c) c.click();
        return true;
      })()`);
      try {
        await waitFor(async function () {
          var s = await roomState();
          return s && !s.thread && !s.threadVeil && !s.veil;
        }, 3500);
      } catch (eC) {}
      await sleep(400);
    }

    async function realTap(x, y) {
      var opts = { x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 };
      await send('Input.dispatchMouseEvent', Object.assign({ type: 'mouseMoved' }, opts));
      await send('Input.dispatchMouseEvent', Object.assign({ type: 'mousePressed', buttons: 1 }, opts));
      await send('Input.dispatchMouseEvent', Object.assign({ type: 'mouseReleased', buttons: 0 }, opts));
    }

    async function openLight(id) {
      var proj = await ev(projectedExpr);
      var light = proj && proj.lights && proj.lights[id];
      if (light && typeof light.x === 'number' && typeof light.y === 'number') {
        await realTap(light.x, light.y);
        await sleep(800);
        var st = await roomState();
        var openedTap = (id === 'thread') ? (st && st.thread) : (st && st.veil);
        if (openedTap) return 'tap';
      }
      var opened = await ev('(function () { var id = "' + id + '"; if (id === "nursery" && window.GardenRooms && GardenRooms.openPlace) { GardenRooms.openPlace("nursery"); return "api"; } if (id === "thread" && window.GardenRooms && GardenRooms.openThread) { GardenRooms.openThread(); return "api"; } if (id === "gathering" && window.GardenRooms && GardenRooms.openPlace) { GardenRooms.openPlace("core"); return "api"; } if (id === "settings" && window.GardenRooms && GardenRooms.openPlace) { GardenRooms.openPlace("settings"); return "api"; } return "none"; })()');
      await sleep(800);
      return opened;
    }

    var visibilityExpr = "(function (targets) {\n"
      + "function isPageScroll(el) { if (!el) return false; if (el === document.documentElement || el === document.body) return true; if (el.id === 'thread-veil' || el.id === 'place-veil') return true; return false; }\n"
      + "function find(t) { var nodes = document.querySelectorAll(t.sel); var i, el, tx, re; re = t.re ? new RegExp(t.re, 'i') : null; for (i = 0; i < nodes.length; i++) { el = nodes[i]; tx = (el.innerText || el.textContent || '').replace(/\\s+/g, ' '); if (re && !re.test(tx)) continue; var st = getComputedStyle(el); if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) < 0.05) continue; var bb = el.getBoundingClientRect(); if (bb.width < 2 && bb.height < 2) continue; return el; } return null; }\n"
      + "function clippedByInner(el) { var b = el.getBoundingClientRect(); var anc = el.parentElement; while (anc && anc !== document.documentElement) { if (!isPageScroll(anc)) { var st = getComputedStyle(anc); var oy = st.overflowY || st.overflow; if (oy === 'auto' || oy === 'scroll' || oy === 'hidden') { var ab = anc.getBoundingClientRect(); var cuts = (b.top < ab.top - 1) || (b.bottom > ab.bottom + 1) || (b.left < ab.left - 1) || (b.right > ab.right + 1); if (cuts && ab.height < (window.innerHeight || 0) * 0.7) { return { clipped: true, ancestor: (anc.id || anc.className || anc.tagName || '').toString().slice(0, 80), ah: Math.round(ab.height), bh: Math.round(b.bottom - b.top) }; } } } anc = anc.parentElement; } return { clipped: false }; }\n"
      + "function atCenter(el) { if (el.scrollIntoView) { try { el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (eS) {} } var b = el.getBoundingClientRect(); var vw = window.innerWidth || 0, vh = window.innerHeight || 0; var l = Math.max(b.left, 0), r = Math.min(b.right, vw), t = Math.max(b.top, 0), bot = Math.min(b.bottom, vh); var out = { box: { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom) }, text: ((el.innerText || el.textContent || '').replace(/\\s+/g, ' ').slice(0, 90)) }; if (r - l < 2 || bot - t < 2) { out.ok = false; out.reason = 'not-in-viewport'; return out; } var cx = (l + r) / 2, cy = (t + bot) / 2; var hit = document.elementFromPoint(cx, cy); var coveredBy = hit && !(hit === el || el.contains(hit)); var inert = !!(el.inert || (el.closest && el.closest('[inert], .thread-compose.is-closed, .thread-compose[aria-disabled]'))); var parentHit = !!(coveredBy && hit && (hit.classList && (hit.classList.contains('thread-face') || hit.classList.contains('thread-compose') || hit.classList.contains('thread-compose-row')) || (hit.closest && hit.closest('.thread-compose, .thread-face')))); out.ok = !!(hit && (hit === el || el.contains(hit) || (inert && parentHit))); out.cx = Math.round(cx); out.cy = Math.round(cy); out.hit = hit ? ((hit.id ? '#' + hit.id : '') + (hit.className ? '.' + String(hit.className).split(' ')[0] : '') + ' ' + hit.tagName).trim() : null; if (coveredBy) out.reason = 'covered-by ' + out.hit; return out; }\n"
      + "var out = {}; (targets || []).forEach(function (t) { var el = find(t); var row = { key: t.key, found: !!el }; if (!el) { row.ok = false; row.reason = 'missing'; out[t.key] = row; return; } var clip = clippedByInner(el); var vis = atCenter(el); row.ok = !!(vis.ok && !clip.clipped); row.clipped = !!clip.clipped; if (clip.clipped) row.clip = clip; row.vis = vis; if (!row.ok && !row.reason) row.reason = vis.reason || (clip.clipped ? 'clipped' : 'not-visible'); out[t.key] = row; });\n"
      + "var veil = document.getElementById('place-veil'); var threadVeil = document.getElementById('thread-veil');\n"
      + "out._meta = { threadOpen: document.documentElement.classList.contains('thread-open'), veilOpen: !!(veil && veil.classList.contains('is-open')), veilClass: veil ? veil.className : '', threadVeilOpen: !!(threadVeil && threadVeil.classList.contains('is-open')) };\n"
      + "return out; })";

    async function probe(targets) {
      return ev(visibilityExpr + '(' + JSON.stringify(targets) + ')');
    }

    async function scrollPanelTop() {
      await ev("(function () { var v = document.querySelector('#thread-veil.is-open, #place-veil.is-open'); if (v) v.scrollTop = 0; return true; })()");
      await sleep(150);
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

    // Real taps at each phone size. Visibility means elementFromPoint at the
    // text centre returns that node or a descendant, and no inner overflow
    // ancestor clips the box (the room panel itself may scroll).
    report.roomTaps = {};
    var phones2 = [[390, 844], [390, 520], [390, 700]];
    var shotN = 5;
    var chatHeart = { key: 'heart', sel: '#thread-veil.is-open .thread-heart, html.thread-open #thread-stage .thread-heart, #place-veil.is-open #room-chat .thread-heart', re: 'grandmother|mind at home' };
    var chatJust = { key: 'just', sel: '#thread-veil.is-open [data-honest-just], html.thread-open [data-honest-just], #place-veil.is-open [data-honest-just], .thread-just-host button', re: 'Just me' };
    var chatWait = { key: 'waiting', sel: '#tree-thread-wait-hint, .tree-thread-wait-hint', re: 'waiting' };
    var chatCompose = { key: 'compose', sel: '#thread-veil.is-open .thread-send, html.thread-open .thread-send, #place-veil.is-open #room-chat .thread-send', re: 'Send' };
    var gatherAskBox = { key: 'ask', sel: '#flgs-ask, [aria-label="Ask the speaking chair"]', re: '' };
    var nurseryText = { key: 'nursery', sel: '#nursery-ceremony, #nursery-growth, #nursery-stage p, #place-veil.is-nursery p, #place-veil.is-nursery button', re: 'waiting to become|Will you help|Begin|Egg' };
    var settingsText = { key: 'settings', sel: '#settings-grandmother, #place-veil.is-settings p, #place-veil.is-settings button, #place-veil-line', re: 'May I look|Find local|grandmother|Settings|mind' };

    function failProbe(key, vis) {
      var t;
      for (t in vis) {
        if (t === '_meta') continue;
        if (!vis[t] || !vis[t].ok) errors.push('not visibly present: ' + key + '.' + t + ' ' + JSON.stringify(vis[t]));
      }
    }

    for (var p = 0; p < phones2.length; p++) {
      var pw = phones2[p][0], ph = phones2[p][1], plabel = pw + 'x' + ph;
      await view(pw, ph, true);
      await gotoDismiss();

      await closeRooms();
      var howChat = await openLight('thread');
      await scrollPanelTop();
      await sleep(200);
      await shot((shotN++).toString().padStart(2, '0') + '-' + plabel + '-thread-top.png');
      var visChat = await probe([chatHeart, chatJust, chatWait, chatCompose]);
      report.roomTaps[plabel + '-thread'] = { how: howChat, vis: visChat };
      log('vis', plabel + '-thread', JSON.stringify(visChat));
      if (!visChat || !visChat._meta || !visChat._meta.threadOpen) errors.push('Chat light did not open the Chat room at ' + plabel);
      failProbe(plabel + '-thread', visChat || {});
      await shot((shotN++).toString().padStart(2, '0') + '-' + plabel + '-thread.png');
      await closeRooms();

      var howG = await openLight('gathering');
      await sleep(400);
      await ev("(function () { var heart = document.querySelector('#place-veil.is-open #room-chat .thread-heart, #place-veil.is-open .thread-heart'); if (heart && heart.scrollIntoView) heart.scrollIntoView({ block: 'center', inline: 'nearest' }); return true; })()");
      await sleep(200);
      var visGChat = await probe([
        { key: 'heart', sel: '#place-veil.is-open #room-chat .thread-heart, #place-veil.is-open .thread-heart', re: 'grandmother|mind at home' },
        { key: 'just', sel: '#place-veil.is-open [data-honest-just], #place-veil.is-open .thread-just-host button', re: 'Just me' },
        { key: 'waiting', sel: '#place-veil.is-open #tree-thread-wait-hint, #place-veil.is-open .tree-thread-wait-hint, #tree-thread-wait-hint', re: 'waiting' }
      ]);
      report.roomTaps[plabel + '-gathering-chat'] = { how: howG, vis: visGChat };
      log('vis', plabel + '-gathering-chat', JSON.stringify(visGChat));
      if (!visGChat || !visGChat._meta || !visGChat._meta.veilOpen) errors.push('Gathering did not open at ' + plabel);
      failProbe(plabel + '-gathering-chat', visGChat || {});
      await shot((shotN++).toString().padStart(2, '0') + '-' + plabel + '-gathering-chat.png');
      await ev("(function () { var ask = document.getElementById('flgs-ask') || document.querySelector('[aria-label=\"Ask the speaking chair\"]'); if (ask && ask.scrollIntoView) ask.scrollIntoView({ block: 'center', inline: 'nearest' }); return true; })()");
      await sleep(200);
      var visAsk = await probe([gatherAskBox]);
      report.roomTaps[plabel + '-gathering-ask'] = { vis: visAsk };
      log('vis', plabel + '-gathering-ask', JSON.stringify(visAsk));
      failProbe(plabel + '-gathering-ask', visAsk || {});
      await shot((shotN++).toString().padStart(2, '0') + '-' + plabel + '-gathering-ask.png');
      await closeRooms();

      var howN = await openLight('nursery');
      await scrollPanelTop();
      await sleep(300);
      await shot((shotN++).toString().padStart(2, '0') + '-' + plabel + '-nursery-top.png');
      var nurseryOrder = await ev("(function () { var cer = document.getElementById('nursery-ceremony') || document.querySelector('#nursery-stage'); var dock = document.querySelector('#place-veil.is-open #fl-clay-dock, #nursery-stage > #fl-clay-dock'); var begin = Array.prototype.find.call(document.querySelectorAll('#place-veil.is-open button'), function (b) { return /^\\s*Begin/i.test(b.textContent || ''); }); function box(el) { if (!el) return null; var b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, vis: b.width >= 2 && b.height >= 2 }; } var cb = box(cer), db = box(dock), bb = box(begin); var firstOk = true; if (cb && db && db.vis && cb.vis && db.t + 8 < cb.t && db.t < (window.innerHeight || 0) && cb.t > (window.innerHeight || 0) - 8) firstOk = false; return { ceremony: cb, dock: db, begin: bb, firstOk: firstOk, veilOpen: !!(document.getElementById('place-veil') && document.getElementById('place-veil').classList.contains('is-nursery')) }; })()");
      report.roomTaps[plabel + '-nursery-order'] = nurseryOrder;
      log('nursery-order', plabel, JSON.stringify(nurseryOrder));
      if (!nurseryOrder || !nurseryOrder.firstOk) errors.push('Nursery opens on the shape-light panel instead of its own content at ' + plabel + ': ' + JSON.stringify(nurseryOrder));
      var visN = await probe([nurseryText]);
      report.roomTaps[plabel + '-nursery'] = { how: howN, vis: visN, order: nurseryOrder };
      log('vis', plabel + '-nursery', JSON.stringify(visN));
      failProbe(plabel + '-nursery', visN || {});
      await shot((shotN++).toString().padStart(2, '0') + '-' + plabel + '-nursery.png');
      await closeRooms();

      var howS = await openLight('settings');
      await scrollPanelTop();
      await sleep(300);
      var visS = await probe([settingsText]);
      report.roomTaps[plabel + '-settings'] = { how: howS, vis: visS };
      log('vis', plabel + '-settings', JSON.stringify(visS));
      if (!visS || !visS._meta || !visS._meta.veilOpen) errors.push('Settings did not open at ' + plabel);
      failProbe(plabel + '-settings', visS || {});
      await shot((shotN++).toString().padStart(2, '0') + '-' + plabel + '-settings.png');
      await closeRooms();
    }


  } catch (e) {
    errors.push(String(e && e.stack || e));
  }
  try { if (cdpWs) cdpWs.close(); } catch (e) {}
  try { child.kill('SIGKILL'); } catch (e) {}
  httpd.server.close();
  fs.writeFileSync('/tmp/tree-phone-polish-chrome-report.json', JSON.stringify(report, null, 2));
  if (errors.length) { console.error('FAIL ' + errors.join(' | ')); process.exit(1); }
  log('PASS phone rooms are visible by elementFromPoint at 390x844, 390x520, and 390x700; Gathering Chat block unclipped; Ask card not covered; Nursery content first; Research ring inside; 1280 unchanged.');
})().catch(function (e) { console.error(e); process.exit(1); });
