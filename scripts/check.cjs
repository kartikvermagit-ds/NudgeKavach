'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
let count = 0;
function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) inspect(file);
    else if (/\.(c?js)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
      if (result.status !== 0) process.exit(result.status || 1);
      count++;
    }
  }
}
for (const directory of ['backend', 'extension', 'frontend', 'scripts', 'tests'])
  inspect(path.join(root, directory));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'extension/manifest.json')));
if (manifest.manifest_version !== 3) throw new Error('Expected a Manifest V3 extension');
for (const script of manifest.content_scripts.flatMap((entry) => entry.js)) {
  if (!fs.existsSync(path.join(root, 'extension', script)))
    throw new Error(`Missing extension script: ${script}`);
}
if (!fs.existsSync(path.join(root, 'extension', manifest.action.default_popup)))
  throw new Error('Missing extension popup');
console.log(`Checked ${count} JavaScript files and Manifest V3 entry points.`);
