# NudgeKavach Desktop

**Audit Workspace · Evidence before judgement.**

The browser observes. This Windows companion reviews the same NudgeProof JSON reports through explicit local file import. No account, live browser bridge, analytics, cloud service or AI key is required. The connection badge deliberately says **Browser Extension Not Connected**.

## Run and build

Requires Node.js 22.12+ and Windows for the Windows executable. From the repository root:

```sh
npm run desktop:install
npm run desktop:dev
```

Install the repository's build dependencies and create a portable Windows application:

```sh
npm ci
npm run desktop:build
```

The root build script bundles this directory with the shared `extension/report.js` model and `extension/logo.png` asset. Keep the complete output folder together when distributing the executable. Build outputs are ignored by Git. This is a development build without signing, an installer, auto-updates or store publication. See the root README for the build output location and tested scope.

The installation step downloads the pinned Electron runtime. After setup, the packaged workspace and local audit workflow need no internet connection. `npm ci --prefix desktop` alone installs the npm wrapper; Electron 44 may otherwise download its binary at the first launch.

Electron was selected because this repository already uses Node and browser-native UI, while the available Windows environment does not include the Rust/C++ toolchain needed for a Tauri build. The extension remains independent and does not load Electron or desktop dependencies.

## Import, review and compare

1. Use Chrome or Edge to run a NudgeKavach audit, then export its NudgeProof JSON.
2. Choose **Import Audit Report** and select that file. Only valid NudgeKavach reports are accepted, up to 1 MB per file.
3. **Audit Sessions** presents source information, findings, Choice Journey and an Evidence Inspector. IDs, evidence categories, observations, timestamps and cautious interpretations come from the report.
4. **Evidence Library** searches session/finding IDs, page and pattern names and filters by evidence category.
5. **Compare audits** lets you assign two different imported reports to Pattern Mode and Clean Control. Assignment is explicit because the browser strips URL queries, including fixture mode. Differences describe the two reports; they are not statistical validation.
6. **Reports** shows a readable report, exports the same JSON data and copies a textual summary. There is no PDF export.

No reports or manufactured statistics are preloaded. Overview counts are based on imported sessions that started on the current local date. Evidence events means retained timeline events; behavioral changes counts retained observed countdown jumps. Privacy counts optional marketing or newsletter choices first observed selected, not inferred tracking or consent effects. Desktop export counts record successful exports made from this workspace, not browser exports. Up to 500 recent export timestamps are retained.

Reimporting an identical snapshot leaves it unchanged. A different snapshot with the same session ID requires a native confirmation before replacing the saved copy; cancel keeps the existing evidence. Export the earlier snapshot first to retain both as files. Importing a separately reloaded browser session creates a new entry. The report's original export timestamp is preserved on desktop re-export.

## Local storage and removal

Imported reports persist in `audit-library.json` under Electron's user-data directory, normally `%APPDATA%/NudgeKavach Desktop` on Windows. The exact path appears in **Settings**. Only chosen reports and local export timestamps are saved. Evidence snippets can contain sensitive page content; the library is local plain JSON, not encrypted storage.

The library is bounded to 40 reports and 20 MB. The app refuses additional imports at the limit rather than silently dropping evidence. **Clear local library…** requires an explicit confirmation and removes the stored copies and export counts; it leaves original files and previously exported copies intact. If a saved library is invalid, it remains untouched until the user clears it or repairs/restores it outside the app.

## Security boundaries

- The renderer is sandboxed, with context isolation enabled, Node integration disabled and web security enabled.
- A custom `nk-workspace` protocol serves only five packaged resources from a fixed allowlist. The app blocks network requests, new windows, navigation, webviews and browser permission requests.
- The content security policy permits only bundled scripts/styles/images; remote connections and frames are disabled.
- The preload exposes only load, import, export, copy-summary and clear-library methods. Each IPC request must come from the app's main frame and exact workspace URL. No renderer-supplied filesystem paths, shell calls or general IPC channel are exposed.
- Native dialogs select import/export paths. Imports are size-limited, parsed and validated through the same shared NudgeProof schema. Imported text is rendered through `textContent`, never HTML.
- Reports are editable files, not signed forensic attestations. Imported data is reviewed as supplied and does not prove designer intent.

The implementation follows Electron's [security guidance](https://www.electronjs.org/docs/latest/tutorial/security) and uses its [context bridge](https://www.electronjs.org/docs/latest/api/context-bridge) for the narrow interface. Production distribution still needs signing, dependency maintenance and broader security/accessibility review.

For isolated automated tests, an unpackaged launch can set `NUDGEKAVACH_USER_DATA` to a temporary directory. Packaged builds ignore that override. Never test by clearing a real user's report library.

## Deliberately future

Live extension connection, automatic synchronization, PDF export, Protect Mode, accounts and developer CI integrations are not implemented. The companion does not scan pages or change the browser detector engine. Zero findings is not a guarantee that a page is safe or fair.
