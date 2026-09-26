# Roadmap

This is a proposed direction, not a delivery commitment. The working MVP remains local, deterministic and focused on five controlled patterns.

## Current scope

Chrome Manifest V3 extension, on-page panel, highlighting, NudgeProof export, a bounded timeline, five local detectors, a fictional demo store and a clean comparison. The backend only hosts the local demo. There is no classifier service or database.

## Next: stronger evidence and fewer false positives

| Improvement                             | Why it matters                                                  | Acceptance signal                                                            |
| --------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| More paired positive/negative fixtures  | Broaden rules without silently breaking reasonable interfaces   | Every new rule has representative trigger and control cases                  |
| Explicit baseline reset                 | Separate observations across SPA routes or user-chosen sessions | Prior and new sessions cannot be mistaken for one another                    |
| Better consent-group matching           | Avoid pairing unrelated controls in complex pages               | Nested banners and unrelated buttons are covered by tests                    |
| Fee amount and context history          | Distinguish new disclosure from a changed amount                | Evidence states the exact observed transition and uncertainty                |
| Timer replacement handling              | Many pages recreate their countdown nodes                       | Correlation rules are documented and tested without merging unrelated timers |
| Report schema validation and versioning | Make exported evidence easier to consume reliably               | Fixtures validate against a documented schema                                |

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

Choose and document the project license. Review extension permissions, dependency licensing, privacy disclosures, store packaging and update behavior. Test with the target Chrome release and representative sites, and measure both false positives and missed cases. A public service would require its own hosting and security design; the loopback demo host is not that service.

No performance, accuracy, accessibility or security certification is claimed by the MVP.
