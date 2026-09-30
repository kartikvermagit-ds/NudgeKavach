'use strict';

// Presenter-controlled rehearsal state only. No browser observations are inferred.
const steps = [...document.querySelectorAll('[data-step]')];
const count = document.querySelector('#progress-count');
const progress = document.querySelector('#demo-progress');
const status = document.querySelector('#progress-status');

function updateProgress() {
  const completed = steps.filter((step) => step.checked).length;
  for (const step of steps) step.closest('li').classList.toggle('completed', step.checked);
  count.textContent = `${completed} / ${steps.length}`;
  progress.value = completed;
  status.textContent =
    completed === steps.length
      ? 'Walkthrough checked off. Verify the results in your actual reports.'
      : completed === 0
        ? 'Ready when you are. Check each step yourself.'
        : `${completed} of ${steps.length} steps manually checked. Scan results are shown in the extension.`;
}

for (const step of steps) step.addEventListener('change', updateProgress);
document.querySelector('#reset-checklist').addEventListener('click', () => {
  for (const step of steps) step.checked = false;
  updateProgress();
});
updateProgress();
