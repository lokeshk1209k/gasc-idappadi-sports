/**
 * Touch effects disabled as requested.
 */
// Touch ripple and tilt effects permanently disabled.
(function() {
  function removeRipples() {
    const ripples = document.querySelectorAll('.glass-touch-ripple');
    ripples.forEach(r => r.remove());
  }
  document.addEventListener('pointerdown', removeRipples, { capture: true, passive: true });
  document.addEventListener('click', removeRipples, { capture: true, passive: true });
})();

