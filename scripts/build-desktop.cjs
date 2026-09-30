'use strict';
// Package only the desktop shell and shared report assets, never the repository or private reports.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '..');

(async () => {
  const { packager } = await import('@electron/packager');
  const desktopPackage = JSON.parse(
    await fs.readFile(path.join(root, 'desktop/package.json'), 'utf8'),
  );
  const stage = await fs.mkdtemp(path.join(os.tmpdir(), 'nudgekavach-package-'));
  try {
    await fs.mkdir(path.join(stage, 'desktop'));
    for (const name of await fs.readdir(path.join(root, 'desktop'))) {
      if (!/\.(?:cjs|js|html|css)$/.test(name)) continue;
      await fs.copyFile(path.join(root, 'desktop', name), path.join(stage, 'desktop', name));
    }
    await fs.mkdir(path.join(stage, 'extension'));
    for (const name of ['report.js', 'logo.png'])
      await fs.copyFile(path.join(root, 'extension', name), path.join(stage, 'extension', name));
    await fs.writeFile(
      path.join(stage, 'package.json'),
      JSON.stringify(
        {
          name: 'nudgekavach-desktop',
          productName: 'NudgeKavach Desktop',
          version: desktopPackage.version,
          description: 'Local NudgeProof audit workspace',
          main: 'desktop/main.cjs',
          author: 'NudgeKavach',
        },
        null,
        2,
      ),
    );
    const output = await packager({
      dir: stage,
      out: path.join(root, 'dist'),
      name: 'NudgeKavach Desktop',
      platform: 'win32',
      arch: 'x64',
      electronVersion: desktopPackage.devDependencies.electron,
      asar: true,
      prune: false,
      overwrite: true,
      appVersion: desktopPackage.version,
      win32metadata: {
        CompanyName: 'NudgeKavach',
        FileDescription: 'NudgeKavach Audit Workspace',
        ProductName: 'NudgeKavach Desktop',
      },
    });
    console.log('Windows portable development build: ' + output.join(', '));
    console.log('Unsigned build; no installer or auto-update service is configured.');
  } finally {
    if (
      path.dirname(stage) !== os.tmpdir() ||
      !path.basename(stage).startsWith('nudgekavach-package-')
    )
      throw new Error('Unexpected staging path');
    await fs.rm(stage, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
