# MVP verification

Verified on Windows with Node.js 22.23.2, Playwright 1.62.1 and Chrome for Testing 151.0.7922.34.

## Passed

- All 10 Node tests: 5 rule groups and 5 server groups, covering positive matches, negative controls, static-root boundaries, redirects, unsupported methods and malformed paths.
- JavaScript syntax checks across extension, demo, server and tests.
- Actual Manifest V3 extension loaded automatically on the local demo in its isolated execution world.
- Exactly 3 initial pattern-store findings; exactly 5 after checkout and an observed timer reset.
- Every finding includes evidence, explanation and an evidence category.
- Timer reset appears in the timestamped timeline.
- Real JSON download from the panel contains all 5 findings and excludes URL query strings.
- Pause and resume toggle monitoring correctly.
- Clean comparison has zero findings, including after the user selects an optional plan and proceeds to checkout.
- Dynamically inserted checked optional choice is detected; hidden fee text stays unflagged.
- Popup loads under extension CSP and handles an unsupported active page.
- Popup executes actual Chrome scripting and messaging APIs against the local demo; repeated injection preserves the existing scanner without duplicates.
- No observed page JavaScript errors.
- Desktop and mobile store rendering inspected; 390px mobile viewport has no horizontal overflow.

## Test scope

The UI refresh additionally checks that evidence categories and complete interpretation text remain unchanged in cards; findings and pattern counts match the report; timeline timestamps are chronological; highlights toggle; numbered markers and Locate work; scan updates retain keyboard focus; and closing returns focus to the launcher. Copy payload and manual fallback are tested with clipboard I/O substituted, so automated tests do not overwrite the user's clipboard. Desktop/mobile screenshots cover the audit panel, empty state, storefront, guide and popup. At 390px the store/guide do not overflow horizontally and the panel leaves page context visible.

The automated popup check opens the popup as an extension tab and substitutes active-tab selection to point at the monitored demo tab. The browser still executes the real scripting and messaging APIs using explicit local-host access. An actual toolbar click granting `activeTab` on an unrelated live website remains a manual smoke check; it was not automated. Chrome Web Store installation/publication was not performed.

The curated [demo screenshot](assets/demo-preview.png) shows the loaded extension. The [example report](../tests/fixtures/sample-nudgeproof.json) contains actual observations from the original automated demo run, not fabricated findings. New runs write `test-results/demo-preview.png` and `test-results/nudgeproof.json`, which are ignored by Git; curated assets are not overwritten. Integration tests use an OS-assigned free local port to avoid connecting to an unrelated stale server.

This validates the controlled MVP, not universal dark-pattern detection. Known extraction limits and heuristic caveats are documented in [README.md](../README.md).
