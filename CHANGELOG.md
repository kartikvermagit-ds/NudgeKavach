# Changelog

This file records user-visible changes. Version numbers describe the project; they do not imply that a Chrome Web Store release has been published.

## 0.2.0 — 2026-09-29

- Added an import-first Windows Audit Workspace: local sessions, evidence library, forensic inspector, controlled comparison, reports and JSON export.
- Added shared NudgeProof v2 validation, stable session/finding IDs, cautious before/after presentation and factual observed-charge summaries, with legacy report support.
- Added compact browser findings, Choice Journey, factual impact and a clearly disabled Protect Mode Pro preview.
- Unified popup, web product pages, lab navigation and a 12-step jury demonstration; replaced simulated authentication with an account-free setup flow.
- Retained all five deterministic detector families and recent ARIA/currency/opacity improvements; corrected opacity-triggered evidence to disclose the measured CSS values.
- Added desktop source/package instructions, Chrome/Edge setup, report/library tests and actual Electron import/export checks. Portable desktop builds remain unsigned and ignored by Git.

## Earlier UI/UX refresh

- Refined the Field storefront and guide with product hierarchy, demo ratings, shipping information and responsive layouts.
- Redesigned the launcher, audit panel, popup, evidence cards and numbered source markers using the existing forest/lime/amber palette.
- Added live session summary, copy-evidence action with manual fallback, chronological timeline presentation and explicit popup states.
- Improved keyboard focus, empty/paused states, selectable evidence and reduced-motion support.
- Preserved all five detector rules, cautious interpretations, exported report semantics, clean-mode controls and local-only analysis.

## 0.1.0 — 2026-09-26

### Added

- Chrome Manifest V3 extension with automatic local-demo monitoring and a toolbar scan for supported HTTP/HTTPS pages.
- Five deterministic detectors: optional pre-selection, choice prominence, suspicious countdown resets, late-visible fees and confirm-shaming.
- NudgeProof cards with observed evidence, cautious interpretations and source-element highlighting.
- Bounded manipulation timeline, pause/resume controls and local JSON export.
- Fictional Field shopping demo and a clean comparison, including a CSS headphone illustration.
- Unit checks and Playwright integration checks that load the actual unpacked extension.
- Setup, design, architecture, detector, demo, contribution and security documentation.
- Pinned development dependencies, consistent source formatting and GitHub Actions verification.

### Organized

- Demo assets under `frontend/` and the local static host under `backend/`.
- Unit and browser integration tests in separate folders, with committed example data under `tests/fixtures/`.
- Documentation assets under `docs/assets/` and generated browser outputs under ignored `test-results/`.
- Store available from `/`, with legacy `/demo` route redirects and a local health endpoint.

### Current limitations

- English phrase rules, top-level DOM only, and no cross-page or cross-reload correlation.
- Evidence is local session history; heuristics can produce false positives and missed detections.
- No AI service, business API, database, public production backend or Chrome Web Store release.
