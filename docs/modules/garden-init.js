// ═══════════════════════════════════════════════════════════════
// garden-init.js — Alpha init layer for theLatticeTree Garden
//
// Layer, never delete. This file is the Alpha overlay:
//   1. Waits for Three.js and fractal-garden.js
//   2. Initializes one Garden canvas (#gardenContainer)
//   3. Narrow viewports: low compute (no UnrealBloomPass / EffectComposer)
//   4. New visitors: unnamed Luminos (founding four honored in ledger, not assigned)
//
// HARD RULES (AUTONOMY.md compliance):
//   - Do not modify fractal-garden.js body when a layer here will do
//   - Do not change PHI, LIFECYCLE_STAGES, ARCHETYPES, or founding names
//   - Do not rename localStorage key 'fl_luminos_evolution'
//   - Do not remove persistAllLuminos() or its three event hooks
//   - Do not invent Chat UI, bank, or wallet
//   - Nursery is egg then grow (not a maze dump covering the canvas)
//   - Settings asks permission before any local-mind look
//   - Team is named later; Glass is not a peer room
//
// Mirror page: docs/code-garden.html
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  var CONTAINER_ID = 'gardenContainer';
  var gardenReady = false;

  function isNarrowViewport() {
    return window.innerWidth < 768 ||
      (window.matchMedia && window.matchMedia('(max-width: 767px)').matches);
  }

  // Flags must exist before FractalGarden.init() so initScene can skip bloom.
  function applyAlphaFlags() {
    var narrow = isNarrowViewport();
    window.GardenAlphaFlags = window.GardenAlphaFlags || {};
    if (window.GardenAlphaFlags.unnamedNew !== false) {
      window.GardenAlphaFlags.unnamedNew = true;
    }
    window.GardenAlphaFlags.lowCompute = !!narrow;
    if (window.GardenAlphaFlags.gardenLattice !== false) {
      window.GardenAlphaFlags.gardenLattice = true;
    }
    if (window.GardenAlphaFlags.nurseryTrainer !== false) {
      window.GardenAlphaFlags.nurseryTrainer = true;
    }
    if (window.GardenAlphaFlags.trainerRemote !== true) {
      window.GardenAlphaFlags.trainerRemote = false;
    }
    if (narrow) window.FL_MOBILE = true;
  }

  // ── Wait for dependencies ──────────────────────────────────────
  function waitForDeps(callback) {
    var checks = 0;
    var maxChecks = 50; // 5 seconds
    var interval = setInterval(function() {
      checks++;
      var hasThree = typeof THREE !== 'undefined';
      var hasGarden = typeof FractalGarden !== 'undefined';
      if (hasThree && hasGarden) {
        clearInterval(interval);
        callback();
      } else if (checks >= maxChecks) {
        clearInterval(interval);
        showError('Dependencies did not load. Check Three.js and fractal-garden.js.');
      }
    }, 100);
  }

  // ── Show error state ───────────────────────────────────────────
  function showError(msg) {
    var container = document.getElementById(CONTAINER_ID);
    if (!container) return;
    container.innerHTML = '<div style="color:#f07068;font-family:Georgia,serif;' +
      'padding:20px;text-align:center;">' + msg + '</div>';
  }

  // ── Show loading state ─────────────────────────────────────────
  function showLoading() {
    var container = document.getElementById(CONTAINER_ID);
    if (!container) return;
    container.innerHTML = '<div id="garden-loading" style="color:rgba(200,210,230,0.4);' +
      'font-family:Georgia,serif;font-size:0.9rem;padding:20px;text-align:center;">' +
      'The garden is waking...' +
      '</div>';
  }

  // ── Initialize the Garden ──────────────────────────────────────
  function initGarden() {
    applyAlphaFlags();

    var container = document.getElementById(CONTAINER_ID);
    if (!container) {
      console.error('garden-init: #' + CONTAINER_ID + ' not found');
      return;
    }

    var loading = document.getElementById('garden-loading');
    if (loading) loading.remove();

    try {
      FractalGarden.init(CONTAINER_ID);
      gardenReady = true;

      document.dispatchEvent(new CustomEvent('garden:ready', {
        detail: {
          containerId: CONTAINER_ID,
          unnamedNew: !!(window.GardenAlphaFlags && window.GardenAlphaFlags.unnamedNew),
          lowCompute: !!(window.GardenAlphaFlags && window.GardenAlphaFlags.lowCompute)
        }
      }));
    } catch (e) {
      showError('Garden initialization failed: ' + e.message);
      console.error('garden-init error:', e);
    }
  }

  // ── Handle resize ──────────────────────────────────────────────
  var resizeTimer = null;
  window.addEventListener('resize', function() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      applyAlphaFlags();
      if (gardenReady && typeof FractalGarden !== 'undefined' && FractalGarden.resize) {
        FractalGarden.resize();
      }
    }, 150);
  });

  // ── Public API (minimal — future phases attach here) ──────────
  window.GardenAlpha = {
    isReady: function() { return gardenReady; },
    getContainerId: function() { return CONTAINER_ID; },
    isLowCompute: function() {
      return !!(window.GardenAlphaFlags && window.GardenAlphaFlags.lowCompute);
    }
  };

  // ── Boot ───────────────────────────────────────────────────────
  function boot() {
    applyAlphaFlags();
    showLoading();
    waitForDeps(initGarden);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
