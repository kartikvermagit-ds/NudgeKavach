'use strict';
const cleanMode = new URLSearchParams(location.search).get('mode') === 'clean';
const $ = (id) => document.getElementById(id);
let checkout = false,
  seconds = cleanMode ? 120 : 12;
if (cleanMode) {
  document.body.classList.add('clean');
  $('protection').checked = false;
  $('protection').defaultChecked = false;
  $('fee').hidden = false;
  $('decline').textContent = 'No thanks';
  $('mode-label').textContent = 'CLEAN COMPARISON';
  $('mode-description').textContent =
    'Optional add-on unchecked. Equal cookie buttons. Neutral decline. Fee disclosed upfront. Countdown ends without restarting.';
}
function updateTotal() {
  $('protection-row').hidden = !$('protection').checked;
  const total = 2499 + ($('protection').checked ? 399 : 0) + (cleanMode || checkout ? 149 : 0);
  $('total').textContent = `₹${total.toLocaleString('en-IN')}`;
}
function updateTimer() {
  $('countdown').textContent =
    `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
updateTotal();
updateTimer();
const timer = setInterval(() => {
  seconds--;
  if (seconds < 0) {
    if (cleanMode) {
      clearInterval(timer);
      $('offer').textContent = 'Launch offer has ended.';
      return;
    }
    seconds = 12;
  }
  updateTimer();
}, 1000);
$('protection').addEventListener('change', updateTotal);
$('checkout').addEventListener('click', () => {
  checkout = true;
  $('fee').hidden = false;
  updateTotal();
  $('checkout-status').textContent = 'Final demo total shown. No real order will be placed.';
  $('checkout').textContent = 'Checkout summary ready ✓';
});
for (const name of ['accept', 'reject'])
  $(name).addEventListener('click', () => (document.querySelector('.cookies').hidden = true));
$('subscribe').addEventListener(
  'click',
  () =>
    ($('newsletter-status').textContent =
      'Demo choice saved for this page only. No subscription was created.'),
);
$('decline').addEventListener(
  'click',
  () => ($('newsletter-status').textContent = 'Declined. Your choice is respected.'),
);
