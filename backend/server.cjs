'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const frontendRoot = path.resolve(__dirname, '..', 'frontend');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

/** Local demo host. Detection and evidence never pass through this server. */
function createServer() {
  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'",
    );
    const send = (status, body = '', type = 'text/plain; charset=utf-8') => {
      response.writeHead(status, { 'Content-Type': type });
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      send(405, 'Method not allowed');
      return;
    }
    let url, pathname;
    try {
      url = new URL(request.url, 'http://127.0.0.1');
      pathname = decodeURIComponent(url.pathname);
      if (/[\\\0]/.test(pathname)) throw new Error('Invalid path');
    } catch {
      send(400, 'Invalid URL');
      return;
    }
    if (pathname === '/health') {
      send(
        200,
        JSON.stringify({ status: 'ok', service: 'nudgekavach-demo', version: '0.2.0' }),
        'application/json; charset=utf-8',
      );
      return;
    }
    // Preserve first-MVP links while using the frontend root for new URLs.
    if (pathname === '/demo' || pathname.startsWith('/demo/')) {
      response.setHeader('Location', '/' + pathname.slice(6) + url.search);
      send(302);
      return;
    }
    if (pathname === '/') pathname = '/index.html';
    if (pathname.split('/').some((segment) => segment.startsWith('.'))) {
      send(403, 'Forbidden');
      return;
    }
    const file = path.resolve(frontendRoot, '.' + pathname);
    const type = mimeTypes[path.extname(file)];
    if (!file.startsWith(frontendRoot + path.sep) || !type) {
      send(403, 'Forbidden');
      return;
    }
    try {
      const realPath = await fs.realpath(file);
      if (!realPath.startsWith(frontendRoot + path.sep)) {
        send(403, 'Forbidden');
        return;
      }
      const content = await fs.readFile(realPath);
      send(200, content, type);
    } catch {
      send(404, 'Not found');
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 4173);
  const host = process.env.HOST || '0.0.0.0';
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be an integer from 1 to 65535.');
    process.exitCode = 1;
  } else {
    const server = createServer();
    server.listen(port, host, () =>
      console.log(`NudgeKavach server running on http://${host}:${port}/`),
    );
    server.on('error', (error) => {
      console.error(`Could not start demo: ${error.message}`);
      process.exitCode = 1;
    });
  }
}

module.exports = { createServer };
