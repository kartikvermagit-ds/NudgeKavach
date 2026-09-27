'use strict';

const scanButton = document.querySelector('#scan');
const scanLabel = document.querySelector('#scan-label');
const status = document.querySelector('#status');
const stateTitle = document.querySelector('#state-title');

function setState(state, title, message) {
  document.body.dataset.state = state;
  stateTitle.textContent = title;
  status.textContent = message;
}

scanButton.addEventListener('click', async () => {
  if (scanButton.disabled) return;
  scanButton.disabled = true;
  scanButton.setAttribute('aria-busy', 'true');
  scanLabel.textContent = 'Opening audit…';
  setState(
    'scanning',
    'Starting local audit',
    'Connecting to this page. No page data is uploaded.',
  );
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:/.test(tab.url || '')) {
      setState(
        'unsupported',
        'Unsupported page',
        'Open a regular HTTP/HTTPS page first. Chrome internal pages cannot be scanned.',
      );
      return;
    }
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['rules.js', 'content.js'],
    });
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'NK_OPEN' });
    if (!result?.ok)
      throw new Error('The page did not confirm activation. Reload it and try again.');
    const report = await chrome.tabs.sendMessage(tab.id, { type: 'NK_REPORT' });
    if (report?.monitoring === false) {
      setState(
        'paused',
        'Monitoring paused',
        'Your audit panel is open. Select Resume in the panel to continue collecting observations.',
      );
    } else {
      setState(
        'active',
        'Monitoring active',
        `Monitoring started. ${result.count} observations. Open the on-page panel for NudgeProof.`,
      );
    }
  } catch (error) {
    setState(
      'error',
      'Permission / activation error',
      `Could not scan: ${error.message || 'Chrome could not activate the audit on this page.'}`,
    );
  } finally {
    scanButton.disabled = false;
    scanButton.removeAttribute('aria-busy');
    scanLabel.textContent = 'Scan this page';
  }
});
