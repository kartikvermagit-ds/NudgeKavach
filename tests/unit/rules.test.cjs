const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../../extension/rules.js');
test('optional purchases and consent labels; avoid generic required controls', () => {
  assert.ok(R.optional('Optional protection plan ₹399'));
  assert.ok(R.optional('Subscribe to promotional emails'));
  assert.equal(R.optional('I agree to the terms'), false);
});
test('shaming phrases distinguish neutral refusal', () => {
  assert.ok(R.shaming('No thanks, I love paying full price'));
  assert.ok(R.shaming("I don't care about saving"));
  assert.equal(R.shaming('No thanks'), false);
  assert.equal(R.shaming('I want to save money'), false);
});
test('countdown parsing and increases; ordinary ticks are not fake urgency', () => {
  assert.equal(R.seconds('Offer 01:02:03'), 3723);
  assert.equal(R.seconds('00:12'), 12);
  assert.equal(R.seconds('00:99'), null);
  assert.equal(R.seconds('No timer'), null);
  assert.ok(R.reset(0, 12));
  assert.equal(R.reset(12, 11), false);
  assert.equal(R.reset(10, 12), false);
});
test('fee rules require fee terminology and monetary evidence', () => {
  assert.ok(R.fee('Platform fee: ₹149'));
  assert.equal(R.fee('Free shipping'), false);
  assert.equal(R.fee('Service fee may apply'), false);
});
test('prominence uses explicit thresholds and equal controls remain clean', () => {
  assert.ok(R.prominence({ area: 5000, font: 16 }, { area: 1000, font: 12 }).flag);
  assert.equal(R.prominence({ area: 2500, font: 14 }, { area: 2500, font: 14 }).flag, false);
});
