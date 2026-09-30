# Roadmap

This is a proposed direction, not a delivery commitment. The working MVP remains local, deterministic and focused on five controlled patterns.

## Current scope

Chrome/Edge Manifest V3 extension, on-page panel, highlighting, versioned NudgeProof export, a bounded Choice Journey, five local detector families, a controlled store/clean comparison, jury console and an import-first Windows Audit Workspace. The backend only hosts the demo. Desktop persists explicitly imported reports locally; there is no remote database or classifier.

## Protect Mode — future / Pro preview

The current preview does not modify pages. Proposed actions include removing optional preselection, normalizing consent prominence, neutralizing shaming copy and reviewing optional charges. Each needs a reversible preview, reliable context and safeguards against changing a user's intended choice. No release date or paid service is promised.

Native messaging/local bridge, signed Windows installation/updates, PDF reports, cloud sync and developer CI prevention are future work. The present manual export/import handoff is fully supported; adding a live bridge must not introduce silent browsing collection.

## Next: stronger evidence and fewer false positives

| Improvement                            | Why it matters                                                  | Acceptance signal                                                            |
| -------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| More paired positive/negative fixtures | Broaden rules without silently breaking reasonable interfaces   | Every new rule has representative trigger and control cases                  |
| Explicit baseline reset                | Separate observations across SPA routes or user-chosen sessions | Prior and new sessions cannot be mistaken for one another                    |
| Better consent-group matching          | Avoid pairing unrelated controls in complex pages               | Nested banners and unrelated buttons are covered by tests                    |
| Fee amount and context history         | Distinguish new disclosure from a changed amount                | Evidence states the exact observed transition and uncertainty                |
| Timer replacement handling             | Many pages recreate their countdown nodes                       | Correlation rules are documented and tested without merging unrelated timers |
| Evolve the shared v2 schema            | Preserve original observations as supported detectors grow      | Legacy roundtrips and stable IDs remain covered                              |

## Then: coverage and interface quality

- Add Hindi and other language fixtures with explicit rule ownership and negative cases. Do not assume English thresholds transfer unchanged.
- Support selected custom checkbox/consent widgets through narrow adapters.
- Evaluate iframe and shadow-DOM coverage without expanding permissions by default.
- Measure scan cost on large and frequently changing pages, then reduce unnecessary work while preserving observations.
- Audit keyboard and screen-reader behavior, focus visibility, panel placement and narrow-screen readability.
- Add contrast and other visual measures only when they can be presented separately from geometry and supported by meaningful controls.

## Optional: AI for ambiguous copy

An AI classifier could help triage language that does not match transparent phrase rules. It should remain optional and should never invent a DOM event, fee transition or timer reset.

Before adding it, define explicit user consent, the minimum text payload, redaction, retention, timeout behavior, cost controls and an evaluation set. Keep the deterministic demo fully operational when the service is disabled or unavailable. Label model interpretations separately from local observations.

## Before wider distribution

Choose and document the project license. Review extension permissions, dependency licensing, privacy disclosures, store packaging and update behavior. Test target Chrome/Edge releases and representative sites, measuring false positives and missed cases. A public service needs a separate hosting and security design; the static demo host is not a report service.

No performance, accuracy, accessibility or security certification is claimed by the MVP.
