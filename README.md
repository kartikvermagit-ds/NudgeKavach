# NudgeKavach

**See the Manipulation Before You Click.**

Evidence-first interface manipulation auditing for the browser and desktop.

**BROWSER · Observe → NUDGEPROOF · Explain → WINDOWS · Review → PROTECT MODE · Future: Neutralize**

Catalyst Hack 2026 · Cybersecurity & Digital Trust · v0.2

The browser catches covered signals while they happen. NudgeProof explains what was observed and what remains uncertain. The Windows Audit Workspace reviews the same evidence trail. **Evidence before judgement.**

## Run the demo

Requires Node.js 22.12+ and Chrome or Microsoft Edge.

```sh
git clone https://github.com/kartikvermagit-ds/NudgeKavach.git
cd NudgeKavach
npm start
```

Open **http://127.0.0.1:4173/** for the controlled store, **/landing.html** for the product overview, or **/guide.html** for the **90-SECOND LIVE AUDIT** jury console. **/?mode=clean** is the Clean Control.

On Windows, `start-demo.cmd` starts the server. The inherited server default binds to `0.0.0.0` for hosted demos; for access only from this computer, set `HOST=127.0.0.1`. `PORT` changes port 4173. PowerShell:

```powershell
$env:HOST = '127.0.0.1'
npm start
```

The demo server only serves files. It receives no scan reports and creates no real purchases, accounts or subscriptions. Running the web demo does not require installing npm packages.

## Install the browser extension

Use the **same extension/** folder in both browsers:

| Browser        | Installation                                                                      |
| -------------- | --------------------------------------------------------------------------------- |
| Chrome         | Open `chrome://extensions` → Developer mode → Load unpacked → select `extension/` |
| Microsoft Edge | Open `edge://extensions` → Developer mode → Load unpacked → select `extension/`   |

Reload the store after installation or after reloading the extension. Click its green launcher to open the on-page panel. Monitoring starts automatically on local HTTP pages. On another supported HTTP/HTTPS page, use the toolbar popup's **Scan this page** button. Browser-internal and protected pages cannot be scanned. Enterprise browser policy may disable sideloading.

The panel is an isolated on-page overlay, not a browser-native side panel. No additional detector implementation or permissions are needed for Edge. See Microsoft's [unpacked extension instructions](https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading).

## A repeatable live audit

1. Open Pattern Mode and start monitoring: expect three initial findings.
2. Use **Locate Evidence** to match a finding number to its orange source marker.
3. Select **Continue to checkout**: observe the late-visible fee.
4. Keep the tab visible for about 15 seconds: observe the countdown increase.
5. Open **JOURNEY**, inspect timestamps, and select **Export JSON** to save the NudgeProof report.
6. Import that JSON in the desktop workspace. The session ID, finding IDs and evidence stay the same.
7. Export a separate Clean Control session and select both reports for a **Controlled Comparison**.

Pattern and Clean Control deliberately share the storefront. A clean result means **no covered manipulation signals observed**, not a guarantee of safety or fairness. See [the jury walkthrough](docs/demo-script.md).

## Windows Audit Workspace

A real Electron companion, with no account, live browser bridge or cloud sync. Importing an exported report is an explicit handoff; the connection status correctly remains **Browser Extension Not Connected**.

```sh
npm ci
npm run desktop:install
npm run desktop:dev
```

Use **Import Audit Report** to select a browser-exported NudgeProof JSON. Review Overview, Audit Sessions, Evidence Library, Reports and Settings. The forensic view shows source, before/after where captured, timestamps, rule and limitation. Evidence search and category filters use the same IDs. The report view supports JSON export and Copy Summary.

The local library persists up to 40 imported sessions in Electron's user-data directory. Settings shows its actual location and offers a confirmed clear action. No production history is preloaded. Imported reports are not encrypted; review them before sharing. JSON import is capped at 1 MiB per file.

```sh
npm run desktop:build
```

On Windows this creates an **unsigned portable x64 build** under `dist/NudgeKavach Desktop-win32-x64/`. Run `NudgeKavach Desktop.exe` with the entire folder intact. Binaries are ignored by Git. This is a development build, not a signed installer or store release. See [desktop setup](desktop/README.md).

Electron was chosen because this environment lacks the Rust/C++ toolchain required by [Tauri on Windows](https://v2.tauri.app/start/prerequisites/). The extension remains vanilla JavaScript; desktop rendering follows Electron's [isolation and sandbox guidance](https://www.electronjs.org/docs/latest/tutorial/security).

## Evidence, not verdicts

| Detector                     | Local observation                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| Pre-selected optional choice | An optional checkbox was checked at first observation without observed interaction |
| Unequal choice prominence    | Accept/Reject area, font size or computed-opacity threshold matched                |
| Suspicious countdown reset   | A timer increased by more than 2 seconds after at least two descending samples     |
| Late-visible fee             | Monetary fee text appeared after the initial visible fee baseline                  |
| Possible confirm-shaming     | A choice label matched a narrow English phrase rule                                |

Evidence categories are **OBSERVED STATE**, **OBSERVED CHANGE**, **OBSERVED BEHAVIOR**, **MEASURED UI** and **HEURISTIC**. They are not confidence percentages. A reset may be a legitimate offer extension. A later fee may be a recalculation. Findings never establish designer intent.

The new shared [NudgeProof contract](docs/nudgeproof.md) adds stable session/finding IDs and structured presentation to the original report. Original evidence, interpretation, `confidence` category, first-seen time and timeline are retained. Legacy v0.1 exports remain importable.

The **IMPACT** summary groups unambiguous observed optional/late charge labels by currency. It does not claim savings or a verified checkout total. Choice, privacy-choice and time-pressure counts describe covered signals only.

## Browser controls

- **FINDINGS**: compact cards, expandable NudgeProof, Locate Evidence, Copy Evidence and View in Journey.
- **JOURNEY**: actual monitoring, baseline, finding, timer-reset and pause/resume events.
- **Pause / Resume**: controls collection; activity during a pause is unknown.
- **Highlights**: non-intercepting source outlines and matching finding numbers.
- **Hide panel**: keeps monitoring active. Reload starts a new session.
- **PROTECT**: clearly marked **Coming in Pro** preview; it does not change page choices.

The summary derives observations, unique pattern types, observed countdown jumps and wall-clock session duration from the session. Findings remain historical when a source is changed or removed. No event is fabricated for the jury script.

## Repository map

```text
frontend/                 Product site, controlled Field store, jury console, setup page
backend/server.cjs        Static demo host; no report ingestion
extension/                Self-contained Chrome / Edge MV3 package
  rules.js                Pure deterministic detector helpers
  report.js               Shared NudgeProof validation, IDs, impact and summary
  content.js              DOM observation, evidence, journey and panel
  popup.*                 User-triggered activation
desktop/                  Electron main/preload, local library and Audit Workspace UI
tests/unit/               Detector, server, report-contract and library tests
tests/integration/        Real MV3 and real Electron integration checks
tests/fixtures/           Clearly identified original controlled report
docs/                     Evidence model, demos, limitations and verification
scripts/                  Source checks and Windows packaging
design.md                 Shared visual and interaction language
architecture.md           Runtime/data boundaries and technical decisions
```

## Verify changes

```sh
npm ci
npm run desktop:install
npm run format
npm run check
npm test
npx playwright install chromium
npm run test:browser
npm run test:desktop
```

Browser integration loads the actual MV3 package in a temporary Chromium profile. Desktop integration launches Electron with an isolated temporary library, imports the browser's exported report, and checks review/export. Generated screenshots and reports are under ignored `test-results/`. Browser tests use a free local port. Unit tests need no browser.

See [verification scope](docs/test-results.md), [architecture](architecture.md), [design](design.md), [detectors](docs/detectors.md), [security](SECURITY.md) and [contributing](CONTRIBUTING.md).

## Scope and future work

Current screenshots: [browser NudgeProof](docs/assets/browser-audit.jpg), [Windows workspace](docs/assets/windows-workspace.jpg), [controlled comparison](docs/assets/controlled-comparison.jpg), [jury console](docs/assets/jury-console.jpg), [product overview](docs/assets/product-overview.jpg). These show controlled demo observations, not real browsing history.

The scanner handles the top-level DOM, native and basic ARIA checkboxes, English phrases, supported currency text on leaf elements and textual countdowns. It does not inspect iframes, shadow DOM, images/canvas, earlier visits or cross-page checkouts. Geometry and direct computed opacity do not measure overall contrast or accessibility.

Page analysis runs locally. There is no runtime AI, analytics, telemetry, page upload, browser-history collection, cloud sync or account requirement. User-triggered exports omit URL queries/fragments but paths and snippets may contain sensitive data. Desktop stores only reports explicitly imported.

**Future / Pro:** Make This Page Fair, optional-preselection removal, consent normalization, neutral wording, native bridge, PDF export and developer CI prevention. These are not implemented controls. See [roadmap](docs/roadmap.md).

Project code is original. External repositories are conceptual inspiration only; no repository code was copied. Existing brand assets are retained from this repository. Third-party dependencies retain their own licenses. The team has not selected a project license; public visibility alone does not grant one.
