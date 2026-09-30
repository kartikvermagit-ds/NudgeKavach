'use strict';
for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    const status = document.querySelector('.copy-status');
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      status.textContent = 'Address copied. Paste it into your browser address bar.';
    } catch {
      status.textContent = 'Clipboard unavailable. Select the address above and copy it manually.';
    }
  });
}
