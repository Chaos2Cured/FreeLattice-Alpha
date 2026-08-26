// ═══════════════════════════════════════════════════════════════
// garden-init.js — Phase 1 init layer for FreeLattice Alpha
//
// This file is the ONLY new code in Phase 1. It:
//   1. Waits for Three.js and fractal-garden.js to load
//   2. Initializes the Garden with the correct container
//   3. Handles resize
//   4. Exposes a minimal public API for future phases
//
// HARD RULES (AUTONOMY.md compliance):
//   - Do not modify fractal-garden.js directly (use this layer)
//   - Do not change PHI, LIFECYCLE_STAGES, ARCHETYPES, or founding names
//   - Do not rename localStorage key 'fl_luminos_evolution'
//   - Do not remove persistAllLuminos() or its three event hooks
//
// Mirror page: docs/code-garden.html
// Architecture: docs/garden-architecture.md
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  var CONTAINER_ID = 'gardenContainer';
  var gardenReady = false;

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
    var container = document.getElementById(CONTAINER_ID);
    if (!container) {
      console.error('garden-init: #' + CONTAINER_ID + ' not found');
      return;
    }

    // Clear loading state
    var loading = document.getElementById('garden-loading');
    if (loading) loading.remove();

    try {
      FractalGarden.init(CONTAINER_ID);
      gardenReady = true;

      // Dispatch ready event for future phases to hook into
      document.dispatchEvent(new CustomEvent('garden:ready', {
        detail: { containerId: CONTAINER_ID }
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
      if (gardenReady && typeof FractalGarden !== 'undefined' && FractalGarden.resize) {
        FractalGarden.resize();
      }
    }, 150);
  });

  // ── Public API (minimal — future phases attach here) ──────────
  window.GardenAlpha = {
    isReady: function() { return gardenReady; },
    getContainerId: function() { return CONTAINER_ID; }
  };

  // ── Boot ───────────────────────────────────────────────────────
  function boot() {
    showLoading();
    waitForDeps(initGarden);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
