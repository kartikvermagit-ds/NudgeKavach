# Contributing to NudgeKavach

Keep each change easy to demonstrate and explain. Detection changes need observable evidence, a clear rule and a control case that should remain unflagged.

## Local setup

Use Node.js 22.12 or later and Chrome or Microsoft Edge for manual extension testing.

```sh
git clone https://github.com/kartikvermagit-ds/NudgeKavach.git
cd NudgeKavach
npm ci
npm start
```

Open `http://127.0.0.1:4173/`. In `chrome://extensions`, enable Developer mode, select **Load unpacked**, and choose `extension/`. Reload the demo after loading or reloading the extension.

The demo and unit tests have no runtime package dependency. Installing packages is needed for Playwright browser tests and the shared Prettier formatting tools.

## Where changes belong

| Change                                           | Location                                |
| ------------------------------------------------ | --------------------------------------- |
| Demo store markup, styles and behavior           | `frontend/`                             |
| Local host routes and static-file serving        | `backend/`                              |
| Pure detection rules                             | `extension/rules.js`                    |
| DOM extraction, observations, evidence and panel | `extension/content.js`                  |
| Toolbar interface                                | `extension/popup.*`                     |
| Unit coverage                                    | `tests/unit/`                           |
| Real extension integration coverage              | `tests/integration/`                    |
| Stable illustrative reports                      | `tests/fixtures/`                       |
| Explanations and presenter material              | `docs/`, `design.md`, `architecture.md` |

Avoid moving detection to the server for convenience. Local deterministic behavior is part of the MVP's privacy and reliability model. A future remote feature needs an explicit design, opt-in behavior and separate failure handling.

## Change workflow

1. Create a descriptive branch, such as `feat/timer-evidence` or `fix/fee-baseline`.
2. Make a focused change and update the relevant documentation.
3. For a detector change, include a positive example, a plausible negative example, and any time or baseline dependency.
4. Run the relevant checks below. Record which checks ran and any limitations in the pull request.
5. Review the diff for generated artifacts, private page text, secrets and unrelated changes before committing.
6. Submit a pull request explaining the trigger, resulting behavior and validation. Repository branch protection is not assumed.

## Validation

```sh
npm run format:check
npm run check
npm test
npx playwright install chromium
npm run test:browser
npm run desktop:install
npm run test:desktop
```

The browser tests select an available local port and load the unpacked extension. They write `test-results/demo-preview.png` and `test-results/nudgeproof.json`; these generated outputs are ignored by Git. Update committed fixtures or documentation images only intentionally. The GitHub Actions workflow runs the syntax checks, unit checks and browser checks on Node.js 22.

Before a presentation, also check the installed Chrome toolbar, all five findings, JSON export, keyboard operation and the clean comparison. See [the demo script](docs/demo-script.md). A browser test pass does not measure web-wide precision or recall.

## Code and evidence standards

Desktop source belongs in `desktop/`; the shared browser/desktop evidence contract belongs in `extension/report.js` so the MV3 folder stays independently installable. Preserve the original observation strings and IDs when changing presentation. See [NudgeProof schema and impact rules](docs/nudgeproof.md). Windows packaging uses `npm run desktop:build`; never commit `dist/`, user-data libraries or browser reports from real sites.

- Use plain JavaScript and browser/Node APIs already in the project unless a dependency has a concrete benefit.
- Keep thresholds and phrase rules transparent and testable. Keep DOM-specific behavior in the content script.
- Render page text as text, never executable HTML. Do not introduce runtime script downloads, telemetry or silent report uploads.
- Use cautious finding titles and preserve alternative explanations. A later-visible fee is not automatically unlawful; a reset is not proof of fraud.
- Use fictional data in fixtures. Scrub exported URLs and snippets before sharing a report or including it in a commit.
- Add meaningful regression coverage for behavior changes. Do not create tests that merely repeat implementation details.
- Preserve existing work and avoid force-pushing shared branches without coordination.

## Originality and licensing

The MVP code and CSS illustration were written for this project. External repositories may inform concepts, but copying their implementation requires a compatible license and retained attribution. Do not assume this repository has an open-source license until the team selects and adds one. Development dependencies retain their own licenses.

For vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of publishing sensitive reproduction details in an issue.
