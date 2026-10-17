/**
 * GASC Idappadi Smart Sports Management System
 * Full Glassmorphism & Crystal-Clear Touch Engine
 * Version 1.4 Ultra Glass Edition - 100% Blur-Free Razor Sharp
 */

(function () {
  'use strict';

  // 1. Subtle, Non-Blurring Button Click Feedback
  function createTouchRipple(e, target) {
    if (!target) return;

    // Only apply ripple to explicit button elements
    const existingRipples = target.getElementsByClassName('glass-touch-ripple');
    if (existingRipples.length > 2) {
      existingRipples[0].remove();
    }

    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'glass-touch-ripple';

    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : rect.left + rect.width / 2);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : rect.top + rect.height / 2);

    const size = Math.max(rect.width, rect.height) * 1.2;
    const x = clientX - rect.left - size / 2;
    const y = clientY - rect.top - size / 2;

    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    const computedStyle = window.getComputedStyle(target);
    if (computedStyle.position === 'static') {
      target.style.position = 'relative';
    }

    target.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 450);
  }

  // Pointerdown feedback only on actual action buttons (NO cards, NO text inputs, NO list items)
  document.addEventListener('pointerdown', function (e) {
    const target = e.target.closest('.btn, .btn-sports-primary, .btn-sports-accent, .btn-glass');
    if (target) {
      createTouchRipple(e, target);
    }
  }, { passive: true });

  // 2. 3D Tilt is permanently removed to prevent Chromium subpixel font rasterization blur
  function initGlassTilt() {
    // 100% razor sharp: no perspective or 3D transform that causes text blur
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlassTilt);
  } else {
    initGlassTilt();
  }

  window.initGlassTilt = initGlassTilt;
})();
