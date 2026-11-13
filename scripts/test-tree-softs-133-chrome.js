#!/usr/bin/env node
// Hypha softs overlap check after PR 133: 1280x800, 390x844, and 390x520.
// Also captures 1280x800 and phone-width screenshots. Does not load quiet-room.js.
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var { spawn } = require('child_process');

var ROOT = path.join(__dirname, '..', 'docs');
var SHOTS = process.env.SHOTS_DIR || '/workspace/research/review-tree-pr134-holdfix/shots';
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


async function homeChecks(cdp, width, height) {
  return cdp.eval(`(function () {
    function r(el) { if (!el) return null; var b = el.getBoundingClientRect(); return { l:b.left, t:b.top, r:b.right, b:b.bottom, w:b.width, h:b.height, vis: b.width>=2 && b.height>=2 }; }
    function hit(a, b) {
      if (!a || !b || !a.vis || !b.vis) return false;
      return Math.min(a.r, b.r) - Math.max(a.l, b.l) > 2 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 2;
    }
    function painted(el) {
      if (!el) return false;
      var st = window.getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
      var b = el.getBoundingClientRect();
      return b.width >= 2 && b.height >= 2 && b.bottom > 0 && b.top < (window.innerHeight || 0);
    }
    var card = document.querySelector('.tree-door-veil[data-tree-door-calm] .tree-door');
    var stay = document.querySelector('[data-tree-door-stay] button, [data-tree-door-stay] .tree-door-soft');
    var notNow = stay || Array.prototype.find.call(document.querySelectorAll('.tree-door button'), function (b) { return /not now/i.test(b.textContent || ''); });
    var legend = document.getElementById('lumino-legend');
    var start = document.getElementById('garden-start');
    var clay = document.getElementById('fl-clay-corner');
    var nursery = document.querySelector('[data-garden-lumino="nursery"]');
    var dock = document.getElementById('fl-clay-dock');
    var c = r(card), lg = r(legend), st = r(start), cl = r(clay), n = r(nursery), nn = r(notNow);
    var vw = window.innerWidth || 0;
    var leftMargin = c ? Math.round(c.l * 10) / 10 : null;
    var rightMargin = c ? Math.round((vw - c.r) * 10) / 10 : null;
    return {
      hasCard: !!card,
      notNowVisible: painted(notNow),
      notNowBox: nn,
      cardBox: c,
      clayBox: cl,
      nurseryBox: n,
      leftMargin: leftMargin,
      rightMargin: rightMargin,
      marginDelta: (leftMargin != null && rightMargin != null) ? Math.abs(leftMargin - rightMargin) : null,
      coversLegend: hit(c, lg),
      coversNursery: hit(c, n),
      coversClay: hit(c, cl),
      startCoversLegend: hit(st, lg) && painted(start),
      clayCoversStart: hit(cl, st) && painted(start) && painted(clay),
      dockAskVisible: painted(dock)
    };
  })()`);
}

async function gatheringChecks(cdp) {
  return cdp.eval(`(function () {
    function r(el) { if (!el) return null; var b = el.getBoundingClientRect(); return { l:b.left, t:b.top, r:b.right, b:b.bottom, w:b.width, h:b.height, vis: b.width>=2 && b.height>=2 }; }
    function hit(a, b) {
      if (!a || !b || !a.vis || !b.vis) return false;
      return Math.min(a.r, b.r) - Math.max(a.l, b.l) > 2 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 2;
    }
    function painted(el) {
      if (!el) return false;
      var st = window.getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
      var b = el.getBoundingClientRect();
      return b.width >= 2 && b.height >= 2 && b.bottom > 0 && b.top < (window.innerHeight || 0);
    }
    var chat = document.getElementById('room-chat');
    var nav = document.querySelector('#garden-header nav') || document.querySelector('#garden-header');
    var hint = document.getElementById('tree-thread-wait-hint');
    var send = document.querySelector('#room-chat .thread-send, #sendBtn');
    var input = document.querySelector('#room-chat .thread-input, #chatInput');
    var cr = r(chat), nr = r(nav), hr = r(hint);
    var hs = hint ? window.getComputedStyle(hint) : null;
    return {
      dockOverlapsNav: hit(cr, nr),
      hintVisible: painted(hint),
      hintText: hint ? String(hint.textContent || '') : '',
      hintBox: hr,
      hintStyle: hs ? {d:hs.display,v:hs.visibility,o:hs.opacity,pos:hs.position,h:hs.height,ov:hs.overflow,parent:(hint.parentNode && hint.parentNode.id) || (hint.parentNode && hint.parentNode.className) || ''} : null,
      sendBox: r(send),
      sendVisible: painted(send),
      inputVisible: painted(input),
      chatBox: cr,
      chatOverflow: chat ? window.getComputedStyle(chat).overflow : null,
      closeBox: (function () { var el = document.getElementById('place-veil-close'); return r(el); })(),
      checkerBox: (function () {
        var el = document.querySelector('#flgs-checker, .flgs-card, #flg-speak, [data-flgs-checker]');
        if (!el) {
          var nodes = document.querySelectorAll('#fl-gathering-layer .flgs-card, #core-gathering h2, #place-veil-line');
          el = nodes.length ? nodes[nodes.length - 1] : null;
        }
        return r(el);
      })(),
      closeAfterChecker: (function () {
        var close = document.getElementById('place-veil-close');
        var checker = document.querySelector('#flgs-checker, #flg-speak, .flgs-card');
        if (!close) return false;
        var title = document.querySelector('#place-veil.is-core #place-veil-line, #place-veil.is-core h2, #fl-gathering-layer h2');
        var cb = close.getBoundingClientRect();
        if (checker) {
          var kb = checker.getBoundingClientRect();
          if (kb.height >= 2 && cb.top + 2 >= kb.bottom) return true;
        }
        if (title) {
          var tb = title.getBoundingClientRect();
          if (tb.height >= 2 && cb.top + 2 >= tb.bottom) return true;
        }
        return false;
      })()
    };
  })()`);
}


async function clickNotNow(cdp) {
  await cdp.eval(`(function () {
    var btn = document.querySelector('[data-tree-door-stay] button, [data-tree-door-stay] .tree-door-soft');
    if (!btn) {
      btn = Array.prototype.find.call(document.querySelectorAll('.tree-door button'), function (b) {
        return /not now/i.test(b.textContent || '');
      });
    }
    if (btn) btn.click();
    return !!btn;
  })()`);
  await sleep(400);
}

async function afterNotNowChecks(cdp) {
  return cdp.eval(`(function () {
    function r(el) { if (!el) return null; var b = el.getBoundingClientRect(); return { l:b.left, t:b.top, r:b.right, b:b.bottom, w:b.width, h:b.height, vis: b.width>=2 && b.height>=2 }; }
    function hit(a, b) {
      if (!a || !b || !a.vis || !b.vis) return false;
      return Math.min(a.r, b.r) - Math.max(a.l, b.l) > 2 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 2;
    }
    function painted(el) {
      if (!el) return false;
      var st = window.getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
      var b = el.getBoundingClientRect();
      return b.width >= 2 && b.height >= 2 && b.bottom > 0 && b.top < (window.innerHeight || 0);
    }
    var start = document.getElementById('garden-start');
    var research = document.querySelector('.galaxy-nav [data-galaxy-prev-word], .galaxy-nav-word, .galaxy-nav');
    var lights = document.querySelectorAll('.garden-lumino');
    var legend = document.getElementById('lumino-legend');
    var header = document.getElementById('garden-header');
    var st = r(start);
    var hits = [];
    if (painted(start) && research && hit(st, r(research))) hits.push('Research');
    if (painted(start) && legend && hit(st, r(legend))) hits.push('legend');
    if (painted(start) && header && hit(st, r(header))) hits.push('header');
    for (var i = 0; i < lights.length; i++) {
      if (hit(st, r(lights[i]))) hits.push((lights[i].getAttribute('data-garden-lumino') || lights[i].getAttribute('aria-label') || 'light'));
    }
    return {
      startVisible: painted(start),
      startBox: st,
      startHits: hits,
      startCoversLabels: hits.length > 0
    };
  })()`);
}

function assertHome(errors, label, h, phone) {
  if (h.coversLegend) errors.push('card covers the left legend at ' + label);
  if (h.coversNursery) errors.push('card covers the Nursery light at ' + label);
  if (h.coversClay) errors.push('card covers the clay-corner button at ' + label);
  if (h.startCoversLegend) errors.push('Start here overprints the legend at ' + label);
  if (h.clayCoversStart) errors.push('clay-corner overlaps the Start here line at ' + label);
  if (!h.notNowVisible) errors.push('Not now is not visible at ' + label);
  if (h.dockAskVisible) errors.push('shape-light dock ask is visible while the first-run card is showing at ' + label);
  if (phone && h.marginDelta != null && h.marginDelta > 8) {
    errors.push('card is not centered at ' + label + ' (left ' + h.leftMargin + 'px, right ' + h.rightMargin + 'px)');
  }
}

async function run() {
  var errors = [];
  var report = { shots: [], checks: {}, errors: errors };
  fs.mkdirSync(SHOTS, { recursive: true });
  var httpd = await serve(ROOT);
  var base = 'http://127.0.0.1:' + httpd.port;
  log('serving', base);
  var debugPort = 18791;
  var chrome = launchChrome(debugPort);
  var cdp;
  try {
    await waitFor(async function () {
      try { return await getJson('http://127.0.0.1:' + debugPort + '/json/version'); } catch (e) { return null; }
    }, 15000);
    cdp = await firstPageCdp(debugPort);

    // 1280 home
    await setView(cdp, 1280, 800, false);
    await goto(cdp, base + '/index.html');
    await waitFor(async function () {
      return cdp.eval(`!!document.querySelector('.tree-door-veil[data-tree-door-calm] .tree-door')`);
    }, 8000);
    await sleep(400);
    report.shots.push(await shot(cdp, '01-home-1280x800.png'));
    var h1280 = await homeChecks(cdp, 1280, 800);
    report.checks.home1280 = h1280;
    log('home 1280', JSON.stringify(h1280));
    assertHome(errors, "1280x800", h1280, false);

    // 1280 Gathering after scroll
    await openGathering(cdp);
    await askKindly(cdp);
    await sleep(80);
    await cdp.eval(`(function () {
      var el = document.getElementById('flgs-ask');
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', inline: 'nearest' });
      var veil = document.getElementById('place-veil');
      if (veil) veil.scrollTop = Math.max(0, (veil.scrollHeight || 0) / 2);
      return true;
    })()`);
    await sleep(300);
    report.shots.push(await shot(cdp, '02-gathering-scroll-1280x800.png'));
    var g1280 = await gatheringChecks(cdp);
    report.checks.gathering1280 = g1280;
    log('gathering 1280', JSON.stringify(g1280));
    if (g1280.dockOverlapsNav) errors.push('chat dock overlaps Chat/galaxies nav at 1280x800 when scrolled');

    // 390x844 home + gathering
    await setView(cdp, 390, 844, true);
    await goto(cdp, base + '/index.html');
    await waitFor(async function () {
      return cdp.eval(`!!document.querySelector('.tree-door-veil[data-tree-door-calm] .tree-door')`);
    }, 8000);
    await sleep(400);
    report.shots.push(await shot(cdp, '03-home-390x844.png'));
    var h844 = await homeChecks(cdp, 390, 844);
    report.checks.home390x844 = h844;
    log('home 390x844', JSON.stringify(h844));
    assertHome(errors, "390x844", h844, true);

    await openGathering(cdp);
    await waitFor(async function () {
      return cdp.eval(`!!(document.querySelector('#room-chat .thread-input, #room-chat #chatInput, #room-chat [data-thread-input]') && document.getElementById('room-chat') && !document.getElementById('room-chat').hidden)`);
    }, 8000);
    await cdp.eval(`(function () {
      var chat = document.getElementById('room-chat');
      if (chat && chat.scrollIntoView) chat.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return true;
    })()`);
    await sleep(400);
    report.shots.push(await shot(cdp, '04-gathering-dock-390x844.png'));
    var g844 = await gatheringChecks(cdp);
    report.checks.gathering390x844 = g844;
    log('gathering 390x844', JSON.stringify(g844));
    if (!g844.hintVisible) errors.push('phone send-strip waiting hint is hidden at 390x844');
    if (!g844.sendVisible || !g844.inputVisible) errors.push('phone send strip is missing Send or the box at 390x844');
    if (g844.closeAfterChecker === false) errors.push('"the garden" is not after the Checker / title at 390x844');

    // 390x520 home — Not now must stay visible
    await setView(cdp, 390, 520, true);
    await goto(cdp, base + '/index.html');
    await waitFor(async function () {
      return cdp.eval(`!!document.querySelector('.tree-door-veil[data-tree-door-calm] .tree-door')`);
    }, 8000);
    await sleep(400);
    report.shots.push(await shot(cdp, '05-home-390x520.png'));
    var h520 = await homeChecks(cdp, 390, 520);
    report.checks.home390x520 = h520;
    log('home 390x520', JSON.stringify(h520));
    assertHome(errors, "390x520", h520, true);

    // 390x522 — Hypha's short height: Not now, then Start here after dismiss
    await setView(cdp, 390, 522, true);
    await goto(cdp, base + '/index.html');
    await waitFor(async function () {
      return cdp.eval(`!!document.querySelector('.tree-door-veil[data-tree-door-calm] .tree-door')`);
    }, 8000);
    await sleep(400);
    report.shots.push(await shot(cdp, '06-home-390x522.png'));
    var h522 = await homeChecks(cdp, 390, 522);
    report.checks.home390x522 = h522;
    log('home 390x522', JSON.stringify(h522));
    assertHome(errors, "390x522", h522, true);

    await clickNotNow(cdp);
    await sleep(500);
    report.shots.push(await shot(cdp, '07-home-390x522-after-notnow.png'));
    var after = await afterNotNowChecks(cdp);
    report.checks.afterNotNow390x522 = after;
    log('after Not now 390x522', JSON.stringify(after));
    if (!after.startVisible) errors.push('Start here is not visible after Not now at 390x522');
    if (after.startCoversLabels) errors.push('Start here overlaps planets or the Research label after Not now: ' + after.startHits.join(', '));

    // 390x522 Gathering: “the garden” after the Checker (same visit, card already dismissed)
    await openGathering(cdp);
    await sleep(500);
    await cdp.eval(`(function () {
      var veil = document.getElementById('place-veil');
      if (veil) veil.scrollTop = 0;
      return true;
    })()`);
    await sleep(200);
    report.shots.push(await shot(cdp, '08-gathering-top-390x522.png'));
    var g522 = await gatheringChecks(cdp);
    report.checks.gathering390x522 = g522;
    log('gathering 390x522', JSON.stringify(g522));
    if (!g522.closeAfterChecker) errors.push('"the garden" is not after the Checker / title at 390x522');
  } catch (e) {
    errors.push(String(e && e.stack || e));
  }

  try { if (cdp) cdp.close(); } catch (e) {}
  try { chrome.child.kill('SIGKILL'); } catch (e) {}
  httpd.server.close();

  var out = '/tmp/tree-softs-133-chrome-report.json';
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  log('report', out);
  if (errors.length) {
    console.error('FAIL ' + errors.join(' | '));
    process.exit(1);
  }
  log('PASS softs overlap tests at 1280x800, 390x844, and 390x520');
}

run().catch(function (e) {
  console.error(e);
  process.exit(1);
});
