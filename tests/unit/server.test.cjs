const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createServer } = require('../../backend/server.cjs');
let server, origin;
before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});
test('frontend is served at root with correct types and a read-only health route', async () => {
  const page = await fetch(origin);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(await page.text(), /Field One/);
  const css = await fetch(origin + '/store.css');
  assert.match(css.headers.get('content-type'), /text\/css/);
  const health = await fetch(origin + '/health');
  assert.equal((await health.json()).status, 'ok');
});
test('legacy demo URLs redirect without losing the clean-mode query', async () => {
  const response = await fetch(origin + '/demo/?mode=clean', { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/?mode=clean');
});
test('server does not expose backend, extension, environment or repository files', async () => {
  for (const route of [
    '/backend/server.cjs',
    '/extension/content.js',
    '/.env',
    '/.git/config',
    '/package.json',
    '/%2e%2e%2fextension/content.js',
  ]) {
    const response = await fetch(origin + route);
    assert.ok([403, 404].includes(response.status), `${route} should be unavailable`);
  }
});
test('malformed paths fail safely and unsupported requests cannot write', async () => {
  const malformed = await fetch(origin + '/%ZZ');
  assert.equal(malformed.status, 400);
  const write = await fetch(origin, { method: 'POST', body: 'test' });
  assert.equal(write.status, 405);
  assert.equal(write.headers.get('allow'), 'GET, HEAD');
  const head = await fetch(origin, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal(head.headers.get('x-content-type-options'), 'nosniff');
});
test('encoded backslashes cannot escape the static root', async () => {
  const status = await new Promise((resolve, reject) => {
    http
      .get(origin + '/..%5cextension%5ccontent.js', (response) => {
        response.resume();
        resolve(response.statusCode);
      })
      .on('error', reject);
  });
  assert.equal(status, 400);
});
