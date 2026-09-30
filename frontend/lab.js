'use strict';
// Reset creates a fresh document, preserving the selected control fixture.
document.getElementById('reset-demo').addEventListener('click', () => location.reload());
const selectedMode =
  new URLSearchParams(location.search).get('mode') === 'clean' ? 'clean' : 'pattern';
document.querySelector(`[data-mode="${selectedMode}"]`).setAttribute('aria-current', 'page');
