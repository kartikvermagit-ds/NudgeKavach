document.querySelector('#scan').addEventListener('click', async () => {
  const status = document.querySelector('#status');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:/.test(tab.url || ''))
      throw new Error(
        'Open a regular HTTP/HTTPS page first. Chrome internal pages cannot be scanned.',
      );
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['rules.js', 'content.js'],
    });
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'NK_OPEN' });
    status.textContent = `Monitoring started. ${result.count} observations. Open the on-page panel for NudgeProof.`;
  } catch (error) {
    status.textContent = `Could not scan: ${error.message}`;
  }
});
