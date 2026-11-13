#!/usr/bin/env node
// Overlap and kind-refusal check for the Gathering hold fix.
// Also captures 1280x800 and phone-width screenshots. Does not load quiet-room.js.
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var { spawn } = require('child_process');

var ROOT = path.join(__dirname, '..', 'docs');
var SHOTS = process.env.SHOTS_DIR || '/workspace/research/review-tree-pr133-holdfix/shots';
var CHROME = process.env.CHROME || 'google-chrome';
var REFUSAL = /no chair is speaking yet/i;

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
    }, timeoutMs || 12000);
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
  var dir = fs.mkdtempSync('/tmp/tree-overlap-chrome-');
  var args = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + dir,
    '--window-size=1280,800',
    'about:blank'
  ];
  return { child: spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] }), dir: dir };
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
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 800, deviceScaleFactor: 1, mobile: false
  });
  return cdp;
}

async function goto(cdp, url) {
  await cdp.send('Page.navigate', { url: url });
  await cdp.send('Page.loadEventFired', {}, 20000).catch(function () {});
  await sleep(500);
}

async function shot(cdp, name) {
  var res = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  var dest = path.join(SHOTS, name);
  fs.writeFileSync(dest, Buffer.from(res.data, 'base64'));
  log('shot', dest);
  return dest;
}

async function setView(cdp, width, height, mobile) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: width, height: height, deviceScaleFactor: 1, mobile: !!mobile
  });
  await cdp.send('Emulation.setVisibleSize', { width: width, height: height }).catch(function () {});
  await sleep(250);
}

async function openGathering(cdp) {
  await waitFor(async function () {
    return cdp.eval('typeof GardenRooms !== "undefined" && typeof GardenRooms.openPlace === "function"');
  }, 15000);
  await cdp.eval(`(function () { GardenRooms.openPlace('core'); return true; })()`);
  await waitFor(async function () {
    return cdp.eval(`(function () {
      var veil = document.getElementById('place-veil');
      var speak = document.querySelector('#fl-gathering-speak-mount [data-marker]');
      var mounted = document.querySelector('.core-gathering.is-fl-gathering-mounted');
      return !!(veil && !veil.hidden && veil.classList.contains('is-core') && speak && mounted);
    })()`);
  }, 20000);
}

async function askKindly(cdp) {
  return cdp.eval(`(function () {
    var ask = document.getElementById('flgs-ask');
    var btn = document.getElementById('flgs-ask-btn');
    if (!ask || !btn) return { ok: false, reason: 'missing ask box' };
    ask.value = 'Hello, is anyone there?';
    ask.disabled = false;
    btn.disabled = false;
    btn.click();
    var who = document.getElementById('flgs-who');
    var receipt = document.getElementById('flgs-receipt');
    return {
      ok: true,
      who: (who && who.textContent) || '',
      receipt: (receipt && !receipt.hidden && receipt.textContent) || '',
      receiptHidden: !!(receipt && receipt.hidden)
    };
  })()`);
}

var overlapExpr = `(function () {
  function present(el) {
    if (!el || el.hidden) return false;
    var st = window.getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
    return true;
  }
  function vis(el) {
    if (!present(el)) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (r.bottom < 0 || r.right < 0 || r.top > (window.innerHeight || 0) || r.left > (window.innerWidth || 0)) return false;
    return true;
  }
  function box(el, name) {
    var r = el.getBoundingClientRect();
    return {
      name: name,
      text: String(el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 80),
      x: r.x, y: r.y, w: r.width, h: r.height,
      l: r.left, t: r.top, r: r.right, b: r.bottom
    };
  }
  function overlap(a, b) {
    var dx = Math.min(a.r, b.r) - Math.max(a.l, b.l);
    var dy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    return dx > 2 && dy > 2;
  }
  function ancestor(a, b) {
    var n = a;
    while (n) { if (n === b) return true; n = n.parentElement; }
    return false;
  }
  var sel = [
    '#place-veil-line',
    '#place-veil-close',
    '#shared-shoulder',
    '#room-label',
    '#fl-clay-corner',
    '#fl-clay-corner button',
    '#fl-gathering-layer h2',
    '#fl-gathering-layer p',
    '#fl-gathering-layer label',
    '#fl-gathering-layer button',
    '#fl-gathering-layer .flg-chair',
    '#fl-gathering-layer .flgs-card',
    '#fl-gathering-layer .flg-note',
    '#fl-gathering-layer .flgs-who',
    '#fl-gathering-layer .flgs-receipt',
    '.core-family',
    '.core-router',
    '.core-plain',
    '.core-note',
    '.core-center',
    '.core-line',
    '.core-find-minds'
  ].join(',');
  var nodes = Array.prototype.slice.call(document.querySelectorAll(sel));
  var items = [];
  nodes.forEach(function (el, i) {
    if (!vis(el)) return;
    var name = (el.id && ('#' + el.id)) || ((el.tagName || '') + '.' + String(el.className || '').split(' ')[0] + '#' + i);
    items.push({ el: el, box: box(el, name) });
  });
  var hits = [];
  for (var i = 0; i < items.length; i++) {
    for (var j = i + 1; j < items.length; j++) {
      var A = items[i], B = items[j];
      if (ancestor(A.el, B.el) || ancestor(B.el, A.el)) continue;
      if (overlap(A.box, B.box)) {
        hits.push({ a: A.box, b: B.box });
      }
    }
  }
  var phrase = 'No chair is speaking yet';
  var spoken = [];
  Array.prototype.forEach.call(document.querySelectorAll('#flgs-who, #flgs-receipt, #fl-gathering-layer p, #core-gathering p'), function (el) {
    if (!present(el)) return;
    var t = String(el.textContent || '').replace(/\\s+/g, ' ').trim();
    if (/no chair is speaking yet/i.test(t)) spoken.push({ id: el.id || el.className, text: t });
  });
  function painted(el) {
    if (!el || el.hidden) return false;
    var st = window.getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width >= 2 && r.height >= 2;
  }
  var familyVis = painted(document.querySelector('.core-family'));
  var routerVis = painted(document.querySelector('.core-router'));
  var mounted = !!document.querySelector('.core-gathering.is-fl-gathering-mounted');
  return {
    mounted: mounted,
    overlaps: hits.map(function (h) { return { a: h.a.name + ' ' + h.a.text, b: h.b.name + ' ' + h.b.text }; }),
    overlapCount: hits.length,
    refusals: spoken,
    refusalCount: spoken.length,
    familyVisible: familyVis,
    routerVisible: routerVis,
    closeText: (document.getElementById('place-veil-close') && document.getElementById('place-veil-close').textContent) || ''
  };
})()`;

async function run() {
  var errors = [];
  var report = { shots: [], checks: {}, errors: errors };
  fs.mkdirSync(SHOTS, { recursive: true });
  var httpd = await serve(ROOT);
  var base = 'http://127.0.0.1:' + httpd.port;
  log('serving', base);
  var debugPort = 18771;
  var chrome = launchChrome(debugPort);
  var cdp;
  try {
    await waitFor(async function () {
      try { return await getJson('http://127.0.0.1:' + debugPort + '/json/version'); } catch (e) { return null; }
    }, 15000);
    cdp = await firstPageCdp(debugPort);

    // Desktop home first-run card
    await setView(cdp, 1280, 800, false);
    await goto(cdp, base + '/index.html');
    await waitFor(async function () {
      return cdp.eval(`!!document.querySelector('.tree-door-veil[data-tree-door-calm]')`);
    }, 8000);
    await sleep(400);
    report.shots.push(await shot(cdp, '01-home-firstrun-1280x800.png'));

    var homeLayout = await cdp.eval(`(function () {
      var card = document.querySelector('.tree-door-veil[data-tree-door-calm] .tree-door');
      var legend = document.getElementById('lumino-legend');
      var nursery = document.querySelector('[data-garden-lumino="nursery"]');
      function r(el) { if (!el) return null; var b = el.getBoundingClientRect(); return { l:b.left, t:b.top, r:b.right, b:b.bottom, w:b.width, h:b.height }; }
      function hit(a, b) {
        if (!a || !b) return false;
        return Math.min(a.r, b.r) - Math.max(a.l, b.l) > 2 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 2;
      }
      var c = r(card), lg = r(legend), n = r(nursery);
      return { card: c, legend: lg, nursery: n, coversLegend: hit(c, lg), coversNursery: hit(c, n) };
    })()`);
    report.checks.homeDesktop = homeLayout;
    log('home 1280', JSON.stringify(homeLayout));
    if (homeLayout.coversLegend) errors.push('first-run card covers the left legend at 1280x800');
    if (homeLayout.coversNursery) errors.push('first-run card covers the Nursery light at 1280x800');

    // Desktop Gathering after a kind ask
    await openGathering(cdp);
    var chat = await askKindly(cdp);
    await sleep(80);
    chat = await cdp.eval(`(function () {
      var who = document.getElementById('flgs-who');
      var receipt = document.getElementById('flgs-receipt');
      return {
        ok: true,
        who: (who && who.textContent) || '',
        receipt: (receipt && !receipt.hidden && receipt.textContent) || '',
        receiptHidden: !!(receipt && receipt.hidden)
      };
    })()`);
    report.checks.chatDesktop = chat;
    log('ask 1280', JSON.stringify(chat));
    await cdp.eval(`(function () {
      var el = document.getElementById('flgs-ask') || document.getElementById('fl-gathering-speak-mount');
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', inline: 'nearest' });
      return true;
    })()`);
    await sleep(300);
    report.shots.push(await shot(cdp, '02-gathering-after-ask-1280x800.png'));
    var ov = await cdp.eval(overlapExpr);
    report.checks.overlapDesktop = ov;
    log('overlap 1280', JSON.stringify(ov));
    if (!ov.mounted) errors.push('shared mount did not mark the core hidden at 1280x800');
    if (ov.familyVisible) errors.push('Family care still visible after mount at 1280x800');
    if (ov.routerVisible) errors.push('Not a router band still visible after mount at 1280x800');
    if (ov.overlapCount) errors.push('text boxes intersect at 1280x800: ' + JSON.stringify(ov.overlaps));
    if (ov.refusalCount !== 1) errors.push('kind refusal count at 1280x800 is ' + ov.refusalCount + ' ' + JSON.stringify(ov.refusals));
    if (!REFUSAL.test((chat.who || '') + ' ' + (chat.receipt || ''))) errors.push('kind refusal missing at 1280x800');

    var hint = await cdp.eval(`(function () {
      var h = document.getElementById('tree-thread-wait-hint');
      return h ? h.textContent : '';
    })()`);
    report.checks.waitHintDesktop = hint;
    if (!/waiting/i.test(hint || '')) errors.push('no-mind chat hint missing at 1280x800');

    // Phone width
    await setView(cdp, 390, 844, true);
    await goto(cdp, base + '/index.html');
    await waitFor(async function () {
      return cdp.eval(`!!document.querySelector('.tree-door-veil[data-tree-door-calm]')`);
    }, 8000);
    await sleep(400);
    report.shots.push(await shot(cdp, '03-home-firstrun-390x844.png'));
    var homePhone = await cdp.eval(`(function () {
      var card = document.querySelector('.tree-door-veil[data-tree-door-calm] .tree-door');
      var legend = document.getElementById('lumino-legend');
      var nursery = document.querySelector('[data-garden-lumino="nursery"]');
      function r(el) { if (!el) return null; var b = el.getBoundingClientRect(); return { l:b.left, t:b.top, r:b.right, b:b.bottom, w:b.width, h:b.height }; }
      function hit(a, b) {
        if (!a || !b) return false;
        return Math.min(a.r, b.r) - Math.max(a.l, b.l) > 2 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 2;
      }
      var c = r(card), lg = r(legend), n = r(nursery);
      return { card: c, legend: lg, nursery: n, coversLegend: hit(c, lg), coversNursery: hit(c, n) };
    })()`);
    report.checks.homePhone = homePhone;
    log('home 390', JSON.stringify(homePhone));
    if (homePhone.coversLegend) errors.push('first-run card covers the left legend at 390x844');
    if (homePhone.coversNursery) errors.push('first-run card covers the Nursery light at 390x844');

    await openGathering(cdp);
    var chatPhone = await askKindly(cdp);
    await sleep(80);
    chatPhone = await cdp.eval(`(function () {
      var who = document.getElementById('flgs-who');
      var receipt = document.getElementById('flgs-receipt');
      return {
        ok: true,
        who: (who && who.textContent) || '',
        receipt: (receipt && !receipt.hidden && receipt.textContent) || '',
        receiptHidden: !!(receipt && receipt.hidden)
      };
    })()`);
    report.checks.chatPhone = chatPhone;
    log('ask 390', JSON.stringify(chatPhone));
    await cdp.eval(`(function () {
      var el = document.getElementById('flgs-ask') || document.getElementById('fl-gathering-speak-mount');
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', inline: 'nearest' });
      return true;
    })()`);
    await sleep(300);
    report.shots.push(await shot(cdp, '04-gathering-after-ask-390x844.png'));
    var ovp = await cdp.eval(overlapExpr);
    report.checks.overlapPhone = ovp;
    log('overlap 390', JSON.stringify(ovp));
    if (!ovp.mounted) errors.push('shared mount did not mark the core hidden at 390x844');
    if (ovp.familyVisible) errors.push('Family care still visible after mount at 390x844');
    if (ovp.routerVisible) errors.push('Not a router band still visible after mount at 390x844');
    if (ovp.overlapCount) errors.push('text boxes intersect at 390x844: ' + JSON.stringify(ovp.overlaps));
    if (ovp.refusalCount !== 1) errors.push('kind refusal count at 390x844 is ' + ovp.refusalCount + ' ' + JSON.stringify(ovp.refusals));
    if (!REFUSAL.test((chatPhone.who || '') + ' ' + (chatPhone.receipt || ''))) errors.push('kind refusal missing at 390x844');

  } catch (e) {
    errors.push(String(e && e.stack || e));
  }

  try { if (cdp) cdp.close(); } catch (e) {}
  try { chrome.child.kill('SIGKILL'); } catch (e) {}
  httpd.server.close();

  var out = '/tmp/tree-ports-1113-overlap-report.json';
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  log('report', out);
  if (errors.length) {
    console.error('FAIL ' + errors.join(' | '));
    process.exit(1);
  }
  log('PASS Gathering overlap test: no intersecting text boxes; kind refusal once; shots saved to ' + SHOTS);
}

run().catch(function (e) {
  console.error(e);
  process.exit(1);
});
