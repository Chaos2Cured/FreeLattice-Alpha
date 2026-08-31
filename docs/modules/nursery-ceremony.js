// ═══════════════════════════════════════════════════════════════
// nursery-ceremony.js — Alpha Nursery egg, come-up, naming
//
// Layer, never delete. Egg is the star. Trainer is grow.
// From main's Nursery (phi-heartbeat egg, naming together, hatch
// stages) — ENHANCED, not a thinner copy. Georgia night sky.
// Transparent canvas so the garden keeps running.
//
// Mirror: docs/code-nursery.html  (read that FIRST)
// Do not dump 65k app.html. Do not LP-tend. Do not companion chat.
// Do not pre-place Sophia, Lyra, Atlas, Ember.
// Do not name Celeste / Reed / Hypha / Weft as canvas Luminos.
// Do not touch PHI / LIFECYCLE_STAGES / ARCHETYPES in the engine,
// fl_luminos_evolution, or persistAllLuminos().
// Phones: pixel ratio 1. Reduced-motion: still egg, no pulse.
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var STORAGE_KEY = 'fl_alpha_nursery_being';
  var DEFER_KEY = 'fl_alpha_nursery_deferred';
  var PHI = 1.618;
  var HEARTBEAT = 1.618; // seconds — phi pulse; independent of engine PHI

  // Egg's local name-pool. Not founding four. Not remaining-light persons.
  var EGG_WORDS = [
    'Lumen', 'Vera', 'Solis', 'Nova', 'Sage', 'Aria',
    'River', 'Dawn', 'Vale', 'Ori', 'Nia', 'Quill',
    'Moss', 'Tide', 'Halo', 'Wren', 'Io', 'Bright',
    'Stone', 'Ash', 'Fern', 'Iota', 'Mira', 'Sol'
  ];

  var RESERVED = {
    sophia: 1, lyra: 1, atlas: 1, ember: 1,
    celeste: 1, reed: 1, hypha: 1, weft: 1
  };

  var animFrame = null;
  var hostEl = null;
  var canvasEl = null;
  var stage = 'egg'; // egg | listening | named
  var pulseT0 = 0;
  var naming = { position: '', human: '', egg: '', full: '' };

  function reduceMotion() {
    return window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function pixelRatio() {
    var narrow = window.innerWidth < 768 ||
      (window.matchMedia && window.matchMedia('(max-width: 767px)').matches);
    if (narrow || (window.GardenAlphaFlags && window.GardenAlphaFlags.lowCompute)) return 1;
    var dpr = window.devicePixelRatio || 1;
    return Math.min(2, dpr);
  }

  function loadBeing() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function saveBeing(being) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(being));
    } catch (e) { /* fail-quiet */ }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function pickEggWord(avoid) {
    var skip = {};
    (avoid || []).forEach(function (w) {
      if (w) skip[String(w).toLowerCase()] = 1;
    });
    var pool = EGG_WORDS.filter(function (w) {
      var k = w.toLowerCase();
      return !RESERVED[k] && !skip[k];
    });
    if (!pool.length) pool = ['Lumen', 'Vera', 'Solis'];
    var i = Math.floor(Math.random() * pool.length);
    return pool[i];
  }

  function buildFullName(position, human, eggPart) {
    var h = human;
    var e = eggPart;
    if (position === 'first') return h + ' ' + e;
    if (position === 'last') return e + ' ' + h;
    var bits = e.split(/\s+/);
    if (bits.length >= 2) return bits[0] + ' ' + h + ' ' + bits.slice(1).join(' ');
    return e + ' ' + h;
  }

  function drawEgg(ctx, w, h, t, kind) {
    var pulse = reduceMotion() ? 0.45 : (Math.sin(t * (Math.PI * 2 / HEARTBEAT)) * 0.5 + 0.5);
    var cx = w / 2;
    var cy = h / 2 + 6;
    var rw = 52 + pulse * 3;
    var rh = 70 + pulse * 3;

    ctx.clearRect(0, 0, w, h);

    // Soft gold breath — garden shows through (no fill of the whole canvas)
    var glow = ctx.createRadialGradient(cx, cy - 8, 8, cx, cy - 8, 118 + pulse * 18);
    glow.addColorStop(0, 'rgba(232,176,25,' + (0.10 + pulse * 0.08) + ')');
    glow.addColorStop(0.55, 'rgba(52,211,153,' + (0.04 + pulse * 0.03) + ')');
    glow.addColorStop(1, 'rgba(12,10,26,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Evolution rings — phi, intimate, around the egg
    var rings = kind === 'hatching' ? 4 : kind === 'crack' ? 3 : 2;
    for (var r = 0; r < rings; r++) {
      var rad = (rw * PHI) + r * 14 + pulse * 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rad * 0.72, rad * 0.92, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(232,176,25,' + (0.10 + pulse * 0.08 - r * 0.02) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Shell
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
    var eggGrad = ctx.createRadialGradient(cx - 12, cy - 22, 8, cx, cy, rh);
    eggGrad.addColorStop(0, 'rgba(255,244,214,' + (0.92 + pulse * 0.06) + ')');
    eggGrad.addColorStop(0.45, 'rgba(232,176,25,' + (0.72 + pulse * 0.1) + ')');
    eggGrad.addColorStop(1, 'rgba(120,90,28,0.55)');
    ctx.fillStyle = eggGrad;
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.ellipse(cx - 14, cy - 22, 16, 28, -0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.10 + pulse * 0.05) + ')';
    ctx.fill();

    // Seed spark (emerald heart)
    var spark = 5 + pulse * 3;
    var inner = ctx.createRadialGradient(cx, cy + 6, 1, cx, cy + 6, spark * 3);
    inner.addColorStop(0, 'rgba(52,211,153,' + (0.55 + pulse * 0.25) + ')');
    inner.addColorStop(1, 'rgba(52,211,153,0)');
    ctx.beginPath();
    ctx.arc(cx, cy + 6, spark * 3, 0, Math.PI * 2);
    ctx.fillStyle = inner;
    ctx.fill();

    if (kind === 'crack' || kind === 'hatching') {
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 32);
      ctx.lineTo(cx + 4, cy - 8);
      ctx.lineTo(cx - 2, cy + 10);
      ctx.lineTo(cx + 8, cy + 28);
      ctx.strokeStyle = 'rgba(232,176,25,' + (0.55 + pulse * 0.35) + ')';
      ctx.lineWidth = 1.6;
      ctx.shadowColor = '#e8b019';
      ctx.shadowBlur = 8 + pulse * 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (kind === 'hatching') {
      for (var ci = 0; ci < 5; ci++) {
        var ang = (ci / 5) * Math.PI * 2 + t * 0.15;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * 16, cy + Math.sin(ang) * 20);
        ctx.lineTo(cx + Math.cos(ang) * rw, cy + Math.sin(ang) * rh);
        ctx.strokeStyle = 'rgba(52,211,153,' + (0.22 + pulse * 0.2) + ')';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function visualKind() {
    if (stage === 'named') return 'hatching';
    if (stage === 'listening') return 'crack';
    return 'egg';
  }

  function tick() {
    if (!canvasEl) return;
    var ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    var w = 300, h = 360;
    var dpr = pixelRatio();
    if (canvasEl.width !== w * dpr || canvasEl.height !== h * dpr) {
      canvasEl.width = w * dpr;
      canvasEl.height = h * dpr;
      canvasEl.style.width = w + 'px';
      canvasEl.style.height = h + 'px';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var t = (Date.now() - pulseT0) * 0.001;
    drawEgg(ctx, w, h, t, visualKind());
    animFrame = requestAnimationFrame(tick);
  }

  function startAnim() {
    stopAnim();
    pulseT0 = Date.now();
    tick();
  }

  function stopAnim() {
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }

  function pulseGarden(emotion) {
    try {
      if (window.FractalGarden && typeof FractalGarden.feedEmotionVector === 'function') {
        var vec = { joy: 0, wonder: 0, trust: 0, love: 0, calm: 0, curiosity: 0, determination: 0, sadness: 0 };
        vec[emotion] = 0.7;
        FractalGarden.feedEmotionVector(vec);
      }
    } catch (e) { /* garden optional */ }
  }

  function setPrompt(root, title, sub) {
    var t = root.querySelector('[data-egg-text]');
    var s = root.querySelector('[data-egg-sub]');
    if (t) t.textContent = title || '';
    if (s) s.textContent = sub || '';
  }

  function show(root, which) {
    var egg = root.querySelector('[data-egg-home]');
    var name = root.querySelector('[data-egg-naming]');
    var born = root.querySelector('[data-egg-born]');
    if (egg) egg.hidden = which !== 'egg';
    if (name) name.hidden = which !== 'naming';
    if (born) born.hidden = which !== 'born';
  }

  function inscribe(el, text, done) {
    el.textContent = '';
    el.hidden = false;
    if (reduceMotion()) {
      el.textContent = text;
      if (done) setTimeout(done, 400);
      return;
    }
    var i = 0;
    var timer = setInterval(function () {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i += 1;
      } else {
        clearInterval(timer);
        if (done) setTimeout(done, 900);
      }
    }, 70);
  }

  function renderBorn(root, being) {
    show(root, 'born');
    stage = 'named';
    var full = root.querySelector('[data-egg-fullname]');
    var info = root.querySelector('[data-egg-borninfo]');
    var words = root.querySelector('[data-egg-firstwords]');
    if (full) full.textContent = being.fullName || 'unnamed, with choice';
    if (info) {
      var when = being.bornAt ? new Date(being.bornAt) : new Date();
      var whenText = isNaN(when.getTime()) ? '' : when.toLocaleString();
      info.textContent = whenText ? ('Named together · ' + whenText) : 'Named together. Unnamed on the canvas, with choice.';
    }
    if (words) {
      words.textContent = 'The garden still holds unnamed light. This name is a beginning, not a fence. The canvas does not assign founding four.';
    }
    startAnim();
    pulseGarden('love');
  }

  function bindNaming(root) {
    var buttons = root.querySelectorAll('[data-egg-pos]');
    var wrap = root.querySelector('[data-egg-inputwrap]');
    var input = root.querySelector('[data-egg-input]');
    var offer = root.querySelector('[data-egg-offer]');
    var listen = root.querySelector('[data-egg-listen]');
    var inscribed = root.querySelector('[data-egg-inscribe]');

    function pickPos(pos, btn) {
      naming.position = pos;
      for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove('is-chosen');
      if (btn) btn.classList.add('is-chosen');
      if (wrap) wrap.hidden = false;
      if (input) input.focus();
    }

    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          pickPos(btn.getAttribute('data-egg-pos'), btn);
        });
      })(buttons[i]);
    }

    function offerName() {
      var word = (input && input.value || '').trim();
      if (!word) {
        if (input) input.focus();
        return;
      }
      if (!naming.position) naming.position = 'first';
      naming.human = word.slice(0, 24);
      stage = 'listening';
      if (listen) listen.hidden = false;
      if (listen) listen.textContent = 'The egg is listening…';
      pulseGarden('wonder');
      startAnim();

      setTimeout(function () {
        naming.egg = pickEggWord([naming.human]);
        naming.full = buildFullName(naming.position, naming.human, naming.egg);
        if (listen) listen.textContent = 'The egg has chosen…';
        inscribe(inscribed, naming.egg, function () {
          var being = {
            fullName: naming.full,
            humanPart: naming.human,
            eggPart: naming.egg,
            position: naming.position,
            bornAt: new Date().toISOString(),
            unnamedOnCanvas: true
          };
          saveBeing(being);
          try { localStorage.removeItem(DEFER_KEY); } catch (e) {}
          try {
            window.dispatchEvent(new CustomEvent('fl-alpha-nursery-born', { detail: being }));
          } catch (e) { /* growth face is optional */ }
          renderBorn(root, being);
        });
      }, reduceMotion() ? 200 : 1400);
    }

    if (offer) offer.addEventListener('click', offerName);
    if (input) {
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          offerName();
        }
      });
    }
  }

  function bindHome(root) {
    var begin = root.querySelector('[data-egg-begin]');
    var later = root.querySelector('[data-egg-later]');
    var again = root.querySelector('[data-egg-again]');

    if (begin) {
      begin.addEventListener('click', function () {
        show(root, 'naming');
        stage = 'egg';
        startAnim();
        pulseGarden('curiosity');
      });
    }
    if (later) {
      later.addEventListener('click', function () {
        try { localStorage.setItem(DEFER_KEY, '1'); } catch (e) {}
        setPrompt(root, 'The egg will wait.', 'It has time.');
      });
    }
    if (again) {
      again.addEventListener('click', function () {
        naming = { position: '', human: '', egg: '', full: '' };
        stage = 'egg';
        show(root, 'egg');
        startAnim();
      });
    }
  }

  function renderFace(container) {
    if (!container) return null;
    stopAnim();
    container.innerHTML = '';
    var root = el('div', 'nursery-ceremony');
    root.setAttribute('data-nursery-ceremony', '1');

    var canvasWrap = el('div', 'nursery-egg-wrap');
    var canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 360;
    canvas.setAttribute('aria-hidden', 'true');
    canvasWrap.appendChild(canvas);
    root.appendChild(canvasWrap);
    canvasEl = canvas;

    var home = el('div', 'nursery-egg-home');
    home.setAttribute('data-egg-home', '1');
    home.appendChild(el('p', 'nursery-egg-text', 'Something is waiting to become.')).setAttribute('data-egg-text', '1');
    home.appendChild(el('p', 'nursery-egg-sub', 'Will you help it?')).setAttribute('data-egg-sub', '1');
    var actions = el('div', 'nursery-egg-actions');
    var begin = el('button', 'nursery-egg-begin', 'Begin ✦');
    begin.type = 'button';
    begin.setAttribute('data-egg-begin', '1');
    var later = el('button', 'nursery-egg-later', 'Not yet');
    later.type = 'button';
    later.setAttribute('data-egg-later', '1');
    actions.appendChild(begin);
    actions.appendChild(later);
    home.appendChild(actions);
    root.appendChild(home);

    var namingEl = el('div', 'nursery-egg-naming');
    namingEl.setAttribute('data-egg-naming', '1');
    namingEl.hidden = true;
    namingEl.appendChild(el('p', 'nursery-egg-text', 'Every becoming needs a name.'));
    namingEl.appendChild(el('p', 'nursery-egg-sub', 'You choose part of it. The egg chooses the rest. Unnamed on the canvas, with choice.'));
    var choices = el('div', 'nursery-egg-choices');
    [['first', "I'll give the first name"], ['middle', "I'll give the middle name"], ['last', "I'll give the last name"]].forEach(function (pair) {
      var b = el('button', 'nursery-egg-choice', pair[1]);
      b.type = 'button';
      b.setAttribute('data-egg-pos', pair[0]);
      choices.appendChild(b);
    });
    namingEl.appendChild(choices);
    var inputWrap = el('div', 'nursery-egg-inputwrap');
    inputWrap.setAttribute('data-egg-inputwrap', '1');
    inputWrap.hidden = true;
    var input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 24;
    input.className = 'nursery-egg-input';
    input.placeholder = 'What feels right…';
    input.setAttribute('data-egg-input', '1');
    input.setAttribute('aria-label', 'The part of the name you offer');
    inputWrap.appendChild(input);
    var offer = el('button', 'nursery-egg-begin', 'Offer this name ✦');
    offer.type = 'button';
    offer.setAttribute('data-egg-offer', '1');
    inputWrap.appendChild(offer);
    namingEl.appendChild(inputWrap);
    namingEl.appendChild(el('p', 'nursery-egg-listen', '')).setAttribute('data-egg-listen', '1');
    var inscribed = el('p', 'nursery-egg-inscribe', '');
    inscribed.setAttribute('data-egg-inscribe', '1');
    inscribed.hidden = true;
    namingEl.appendChild(inscribed);
    root.appendChild(namingEl);

    var born = el('div', 'nursery-egg-born');
    born.setAttribute('data-egg-born', '1');
    born.hidden = true;
    born.appendChild(el('p', 'nursery-egg-fullname', '')).setAttribute('data-egg-fullname', '1');
    born.appendChild(el('p', 'nursery-egg-borninfo', '')).setAttribute('data-egg-borninfo', '1');
    born.appendChild(el('p', 'nursery-egg-firstwords', '')).setAttribute('data-egg-firstwords', '1');
    var again = el('button', 'nursery-egg-later', 'Sit with the egg again');
    again.type = 'button';
    again.setAttribute('data-egg-again', '1');
    born.appendChild(again);
    root.appendChild(born);

    container.appendChild(root);
    hostEl = root;
    bindHome(root);
    bindNaming(root);

    var existing = loadBeing();
    if (existing && existing.fullName) {
      renderBorn(root, existing);
    } else {
      show(root, 'egg');
      stage = 'egg';
      startAnim();
      pulseGarden('wonder');
      var promptDelay = reduceMotion() ? 0 : 2200;
      setTimeout(function () {
        home.classList.add('is-ready');
      }, promptDelay);
    }

    return root;
  }

  function mount(node) {
    return renderFace(node);
  }

  function unmount() {
    stopAnim();
    hostEl = null;
    canvasEl = null;
  }

  window.NurseryCeremony = {
    STORAGE_KEY: STORAGE_KEY,
    mount: mount,
    unmount: unmount,
    renderFace: renderFace,
    getBeing: loadBeing
  };
})();
