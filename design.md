# NudgeKavach design

NudgeKavach makes a questionable interface choice inspectable. A finding should answer **what was observed, what rule matched, and what remains uncertain** before asking the user to act.

Tagline: **See the Manipulation Before You Click.**

## Product surfaces

| Surface          | Purpose                                                                   | Implementation                          |
| ---------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| Field demo store | A controlled, fictional shopping journey with five deliberate patterns    | `frontend/`                             |
| Clean comparison | The same product and layout with neutral defaults and upfront disclosure  | `/?mode=clean`                          |
| Toolbar popup    | Start monitoring the current HTTP/HTTPS tab and explain activation errors | `extension/popup.*`                     |
| On-page panel    | Read findings, inspect evidence, locate sources and export a report       | `extension/content.js`                  |
| Presenter guide  | Explain a repeatable demonstration                                        | `/guide.html` and `docs/demo-script.md` |

The panel is part of the content script. It is not Chrome's native Side Panel API. It appears on the right of the inspected page and opens from the floating NudgeKavach launcher or the toolbar popup.

## Evidence card hierarchy

1. **Evidence category:** Observed state, Observed change, Observed behavior, or Heuristic.
2. **Finding title:** a cautious description such as “Suspicious countdown reset.”
3. **Plain-language summary:** a short description of the observation.
4. **NudgeProof:** the unchanged observed text, measurement or transition, followed by the rule that matched.
5. **Why it matters / Limitation:** the existing interpretation is separated at its first sentence; its meaning and cautious wording are preserved.
6. **Locate on page / Copy evidence:** numbered source markers match the card. Copy includes the evidence category, first-observed timestamp, observations, rule and complete interpretation.

The JSON field named `confidence` stores an evidence category. It is not a statistical confidence score. Do not turn these labels into percentages or claim that a heuristic proves deceptive intent.

## Visual language

The store uses cream, moss and forest green, generous whitespace, and an original headphone illustration drawn in CSS. Its fictional branding keeps the example recognizable without relying on external product images.

| Token or treatment           | Current value | Use                              |
| ---------------------------- | ------------- | -------------------------------- |
| Store background             | `#f5f5ed`     | Warm page canvas                 |
| Store text                   | `#172b22`     | Main copy                        |
| Product illustration surface | `#e0e7d7`     | Product image area               |
| Store primary action         | `#244733`     | Checkout and consent actions     |
| Urgency surface              | `#f3e2c7`     | Countdown context                |
| Panel background             | `#10221f`     | Auditor surface                  |
| Panel card background        | `#1b332d`     | Individual findings              |
| Panel text                   | `#eef6ef`     | Main evidence copy               |
| Lime accent                  | `#c7f36b`     | Launcher and evidence categories |
| Highlight border             | `#ed942f`     | Source-element outline           |
| Store keyboard focus         | `#367aa6`     | Visible focus outline            |

The store and auditor use locally available sans-serif fonts. No font download is required. Product content uses a two-column layout on wide screens and a single column below 750px. The desktop panel is at most 410px wide. Below 600px it becomes a bottom-aligned panel capped at 72% of the viewport height, leaving page context visible.

The live summary separates findings from unique pattern types and shows wall-clock session duration, including paused time. These counts do not imply severity, safety, prevalence or statistical confidence. The monitoring status remains independently visible.

## Interaction behavior

- Monitoring starts automatically on matching local pages. Other regular websites require a user-initiated toolbar scan.
- Opening or hiding the panel does not change monitoring. **Pause** stops scans; **Resume** continues with the existing session state.
- **Highlights** toggles overlay outlines. The overlays do not intercept pointer input or change the geometry being measured.
- Findings remain as session history even if a user corrects a choice or dismisses a banner. Reloading creates a new baseline.
- The timeline shows the latest 30 actual events in chronological order, with local clock timestamps, elapsed times and connecting lines. It does not synthesize unrecorded timer ticks. JSON export remains unchanged and contains up to 120 retained events.
- The empty state explains that delayed behaviors need observation time and that zero findings is not a safety guarantee.
- Copy uses the clipboard only on an explicit click. If clipboard access is unavailable, selectable text is provided for manual copying; no clipboard permission is requested.
- Source markers do not intercept clicks or change layout. Locate respects reduced-motion settings; a source no longer visible remains in history with its locate button disabled.
- Opening the panel focuses its close button; closing returns focus to the launcher. Escape closes it. Periodic updates retain card controls and do not move focus.
- Panel/card transitions last 180–240ms, and the launcher pulses once only when a new finding appears. Reduced-motion preferences disable these effects.
- The popup distinguishes ready, pending, active, paused, unsupported and activation-error states. A read-only status request avoids claiming that a paused session is monitoring.

## Accessibility and content rules

Use real buttons and labels for interactive controls. Keep evidence text readable and selectable. Retain card nodes during updates to avoid resetting keyboard focus. The store includes visible focus styling and status messages; the launcher exposes its expanded state.

Avoid verdicts such as “scam” or “illegal.” Prefer concrete language: “First observed checked,” “area 3.00×,” or “countdown increased from 0s to 12s.” Label the controlled demonstration clearly. Never imply that an order, subscription or tracking cookie was created by the demo.

The intentionally unequal consent buttons in the pattern store are a detector fixture. The clean comparison demonstrates equal sizing, a neutral refusal, an unchecked optional plan and an upfront fee. These fixtures are not design recommendations for production checkout.

## Known design gaps

The overlay can cover page content, and there is no user-positioned docking mode. Accessibility has not been independently audited. The scanner does not measure color contrast, keyboard order or semantic equivalence, so the prominence finding must continue to describe geometry only. Future visual work should preserve evidence readability, keyboard operation and the clean comparison as a control.
