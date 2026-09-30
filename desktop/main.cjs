'use strict';

const { app, BrowserWindow, clipboard, dialog, ipcMain, protocol, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const Proof = require('../extension/report.js');
const { Library, parseReport, MAX_REPORT_BYTES } = require('./library.cjs');

const APP_URL = 'nk-workspace://app/desktop/index.html';
const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
const root = path.resolve(__dirname, '..');
const assets = new Map([
  ['/desktop/index.html', ['desktop/index.html', 'text/html; charset=utf-8']],
  ['/desktop/style.css', ['desktop/style.css', 'text/css; charset=utf-8']],
  ['/desktop/renderer.js', ['desktop/renderer.js', 'text/javascript; charset=utf-8']],
  ['/extension/report.js', ['extension/report.js', 'text/javascript; charset=utf-8']],
  ['/extension/logo.png', ['extension/logo.png', 'image/png']],
]);

app.setName('NudgeKavach Desktop');
if (!app.isPackaged && process.env.NUDGEKAVACH_USER_DATA) {
  app.setPath('userData', path.resolve(process.env.NUDGEKAVACH_USER_DATA));
}
protocol.registerSchemesAsPrivileged([
  { scheme: 'nk-workspace', privileges: { standard: true, secure: true, supportFetchAPI: false } },
]);
let window;
let library;
let busy = false;

function handle(name, action) {
  ipcMain.handle(name, async (event, ...args) => {
    if (
      !window ||
      event.sender !== window.webContents ||
      event.senderFrame !== window.webContents.mainFrame ||
      event.senderFrame.url !== APP_URL
    ) {
      return { ok: false, error: 'This action is available only inside the audit workspace.' };
    }
    if (busy) return { ok: false, error: 'Another file action is in progress. Please try again.' };
    busy = true;
    try {
      return { ok: true, ...(await action(...args)) };
    } catch (error) {
      return { ok: false, error: error.message || 'The file action could not be completed.' };
    } finally {
      busy = false;
    }
  });
}

// One writer per user-data library prevents stale independent windows losing imports.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  });
  app
    .whenReady()
    .then(async () => {
      library = new Library(app.getPath('userData'));
      await library.load();
      const localSession = session.fromPartition('nudgekavach-workspace');
      localSession.setPermissionRequestHandler((_contents, _permission, callback) =>
        callback(false),
      );
      localSession.setPermissionCheckHandler(() => false);
      localSession.webRequest.onBeforeRequest((details, callback) => {
        callback({ cancel: !details.url.startsWith('nk-workspace://app/') });
      });
      localSession.protocol.handle('nk-workspace', async (request) => {
        const url = new URL(request.url);
        const asset =
          url.host === 'app' && request.method === 'GET' && !url.search
            ? assets.get(url.pathname)
            : null;
        if (!asset) return new Response('Not found', { status: 404 });
        return new Response(await fs.readFile(path.join(root, asset[0])), {
          headers: {
            'Content-Type': asset[1],
            'Content-Security-Policy': CSP,
            'X-Content-Type-Options': 'nosniff',
          },
        });
      });
      window = new BrowserWindow({
        width: 1366,
        height: 860,
        minWidth: 900,
        minHeight: 640,
        title: 'NudgeKavach Desktop — Audit Workspace',
        backgroundColor: '#0C1816',
        icon: path.join(root, 'extension/logo.png'),
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
          preload: path.join(__dirname, 'preload.cjs'),
          session: localSession,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true,
          webviewTag: false,
          spellcheck: false,
        },
      });
      window.removeMenu();
      window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      window.webContents.on('will-navigate', (event) => event.preventDefault());
      window.webContents.on('will-attach-webview', (event) => event.preventDefault());
      window.webContents.on('will-prevent-unload', (event) => event.preventDefault());

      handle('workspace:load', async () => ({ state: library.snapshot() }));
      handle('workspace:import', async () => {
        const selection = await dialog.showOpenDialog(window, {
          title: 'Import a NudgeProof audit report',
          filters: [{ name: 'NudgeProof JSON report', extensions: ['json'] }],
          properties: ['openFile'],
        });
        if (selection.canceled || !selection.filePaths[0]) return { canceled: true };
        const file = selection.filePaths[0];
        const stat = await fs.stat(file);
        if (!stat.isFile() || stat.size > MAX_REPORT_BYTES)
          throw new Error('Choose a NudgeProof JSON file smaller than 1 MB.');
        const report = parseReport(await fs.readFile(file, 'utf8'));
        const existing = library
          .snapshot()
          .sessions.find((entry) => entry.report.sessionId === report.sessionId)?.report;
        let replace = false;
        if (existing && JSON.stringify(existing) !== JSON.stringify(report)) {
          const confirmation = await dialog.showMessageBox(window, {
            type: 'question',
            title: 'Replace this saved session snapshot?',
            message: 'A different snapshot of this audit session is already saved.',
            detail: `Session: ${report.sessionId}\nSaved: ${existing.findings.length} findings, ${existing.timeline.length} retained events.\nIncoming: ${report.findings.length} findings, ${report.timeline.length} retained events.\n\nReplacing discards the workspace's earlier snapshot. Export it first if you want to keep both files. Original report files are unchanged.`,
            buttons: ['Keep saved snapshot', 'Replace snapshot'],
            defaultId: 0,
            cancelId: 0,
            noLink: true,
          });
          if (confirmation.response !== 1) return { canceled: true };
          replace = true;
        }
        const result = await library.importReport(report, { replace });
        return result;
      });
      handle('workspace:export', async (sessionId) => {
        const report = library.get(sessionId);
        const selection = await dialog.showSaveDialog(window, {
          title: 'Export NudgeProof Report',
          defaultPath: `NudgeProof-${report.sessionId.replace(/[^a-z0-9_-]/gi, '_')}.json`,
          filters: [{ name: 'NudgeProof JSON report', extensions: ['json'] }],
        });
        if (selection.canceled || !selection.filePath) return { canceled: true };
        await fs.writeFile(selection.filePath, JSON.stringify(report, null, 2), {
          encoding: 'utf8',
          mode: 0o600,
        });
        let warning = '';
        try {
          await library.recordExport();
        } catch {
          warning = 'Report exported, but the local export counter could not be saved.';
        }
        return { state: library.snapshot(), warning };
      });
      handle('workspace:copy', async (sessionId) => {
        clipboard.writeText(Proof.summary(library.get(sessionId)));
        return {};
      });
      handle('workspace:clear', async () => {
        const confirmation = await dialog.showMessageBox(window, {
          type: 'warning',
          title: 'Clear local audit library?',
          message: 'Remove all imported sessions and export counts from this workspace?',
          detail:
            'This does not delete the original report files or any exported copies. Export reports you want to keep before continuing.',
          buttons: ['Keep reports', 'Clear local library'],
          defaultId: 0,
          cancelId: 0,
          noLink: true,
        });
        if (confirmation.response !== 1) return { canceled: true };
        return { state: await library.clear() };
      });

      window.once('ready-to-show', () => window.show());
      await window.loadURL(APP_URL);
    })
    .catch((error) => {
      dialog.showErrorBox('NudgeKavach could not open', error.message);
      app.quit();
    });
  app.on('window-all-closed', () => app.quit());
}
