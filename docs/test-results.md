# Verification — v0.2

Verified locally on Windows with Node.js 22.23.2, Playwright 1.62.1, Chrome for Testing 151.0.7922.34, Microsoft Edge 154.0.4258.37 and Electron 44.4.5.

## Passed

- **20 unit tests**: detector rules, static-server boundaries, shared report validation/legacy migration/roundtrips, conservative multi-currency sums, local-library persistence and replacement/corruption safeguards.
- Formatting and JavaScript syntax/Manifest V3 entry checks across browser, web, server, desktop and tests.
- **Real MV3 package in Chromium and installed Edge**: exactly three initial controlled findings and five after checkout/countdown reset; Clean Control remains zero after user-selected add-on and checkout.
- Stable session/finding IDs, original evidence/interpretation, measured-opacity explanation, chronological linked journey, factual impact, details/copy fallback, source locating/markers, highlights, pause/resume and disabled Protect preview.
- Real browser JSON downloads for both Pattern and Clean sessions. Queries/fragments are omitted.
- Popup CSP, unsupported-page error, actual scripting/messaging and duplicate-injection guard.
- Desktop/mobile browser layouts, landing, setup page and jury guide; screenshots generated under ignored `test-results/`.
- **Real Windows Electron app**: initially empty; imports browser-produced reports; same IDs/observations/interpretations; forensic inspector; category/search; Journey; invalid/canceled import; confirmation before replacing a different snapshot; controlled comparison; JSON roundtrip and copied summary; local persistence; isolated renderer; 900px and 1920px layouts.
- **Unsigned portable Windows x64 build** produced and the packaged executable opened successfully in a separate temporary profile.

## Reproduce

```sh
npm ci
npm run desktop:install
npm run format:check
npm run check
npm test
npx playwright install chromium
npm run test:browser
npm run test:desktop
npm run desktop:build
```

For the installed Edge integration on Windows PowerShell, set `$env:NUDGE_BROWSER_CHANNEL = 'msedge'` before `npm run test:browser`. Remove that variable to return to bundled Chromium. Tests use temporary profiles and an OS-assigned server port. Desktop integration consumes the actual reports created by the browser test; run it after the browser check.

## Test boundaries

Regression checks also verify historical finding source URLs after same-document navigation and that a second desktop launch exits without creating a second library writer.

The automated popup test substitutes active-tab selection because its popup is opened as an extension tab. Actual scripting and messaging still run. A real Chrome toolbar click granting access on an unrelated live website and Chrome/Edge store installation/publication remain manual/unperformed checks. The same MV3 package is used for both browsers; automated Chrome-family verification uses Chrome for Testing, while Edge verification uses the installed browser.

Desktop tests substitute native file-dialog selections and clipboard I/O; the application performs real validation, persistence, rendering and file export. Tests do not overwrite the user's clipboard or real library. Local Electron testing required a normal Windows process environment: the restricted command sandbox could not load the sandboxed GPU runtime; running outside that shell restriction passed without weakening Electron's renderer sandbox.

Browser screenshots include compact/expanded findings, Journey, Pro preview, clean state, popup, store, landing, setup and jury console. Desktop screenshots include empty state, sessions, evidence library, comparison, report, error state and responsive layouts. Curated current views are linked in [README](../README.md); generated test artifacts are not production history.

The original [v0.1 report fixture](../tests/fixtures/sample-nudgeproof.json) is retained to test migration. New reports under `test-results/` contain actual controlled observations. No tests establish general web-wide precision/recall, designer intent, legal compliance, cryptographic authenticity or an independent accessibility/security certification. Desktop distribution remains unsigned, without an installer or automatic updates.
