# NudgeProof report contract

The authoritative shared implementation is [extension/report.js](../extension/report.js). Browser and desktop use the same validator, evidence categories, derived impact and summary. It performs no network requests or DOM scans.

## Version 2, additive to the original report

| Field         | Meaning                                                                                |
| ------------- | -------------------------------------------------------------------------------------- |
| product       | `NudgeKavach / NudgeProof`                                                             |
| version       | Producer version; independent of schema version                                        |
| schemaVersion | `2`; original exports without this field remain accepted                               |
| sessionId     | Browser-generated session identity, preserved by import/export                         |
| page          | HTTP/HTTPS origin and pathname; credentials rejected, queries/fragments removed        |
| started       | Original UTC monitoring-start timestamp                                                |
| exportedAt    | UTC report-snapshot time when captured; absent in older exports stays unknown          |
| monitoring    | Whether collection was active at the snapshot, not whether a desktop connection exists |
| findings      | At most 100 bounded observations                                                       |
| timeline      | At most 120 actual retained events                                                     |

Every finding retains `key`, `type`, `title`, `evidence`, `interpretation`, `confidence`, `firstSeen` and `elementPresent`. No live DOM references leave the browser.

Additive fields: `findingId` (01–100, unique within the session), `evidenceCategory`, `source`, `rule`, `before`, `after`, `limitation`. A desktop reference combines the session ID with the finding ID. Sorting cannot renumber findings. A later session may have its own #04; it is not the same observation.

The historical `confidence` category is preserved exactly. The shared display label for measured prominence is **MEASURED UI**, while a legacy export can still contain `confidence: "Heuristic"`. Measuring a UI does not prove deceptive intent.

## Observation provenance

New findings capture their source origin/path at first observation. A same-document route change updates the report's current page without rewriting historical finding sources. Legacy reports without per-finding source fall back to their exported page; earlier routes cannot be reconstructed. Query strings/fragments are removed from both fields.

Before/after fields are derived only from recognized original evidence strings: first observed checked, baseline-absent fee, sampled countdown increase and observed choice label. They do not imply that a screenshot or full DOM history was captured. When no earlier value exists, the field explicitly says so. Original evidence always remains available.

Timeline entries retain `at`, `elapsed`, `message`; new events can include `findingId`, `eventType`, `evidence`. A linked ID must refer to an existing finding. Legacy events are linked only if the title and original timestamp identify exactly one finding. Unlinked events remain unlinked. Normalization does not create events or invent checkout actions.

Legacy session IDs are deterministic from exported page/start time. They are migration identifiers, not cryptographic attestations. A legacy report without exportedAt stays without one; desktop import time is separate.

## Factual impact

- MONEY: extract one unambiguous amount from a captured optional-choice/fee label; group separately by currency. Bare `$` and `¥` remain symbols without an assumed country.
- Omit labels with multiple prices, ranges/recurrence wording, negative amounts or ambiguous decimal/group separators from exact sums.
- Count an identical label within the same detector type once. Different labels may still describe overlapping costs; the sum is **observed optional/late charge labels**, not a verified checkout total or savings.
- CHOICE: measured prominence and confirm-shaming findings.
- PRIVACY: pre-selected newsletter/promotional-email/marketing subscription labels only; consent geometry does not establish tracking.
- TIME PRESSURE: findings with observed countdown increases.
- Behavioral changes: retained `Countdown jumped` events, so the count can differ from unique timer findings and is bounded by timeline retention.

## Import validation and trust

The validator rejects unknown schemas/types, invalid timestamps or page schemes, duplicate IDs/keys, dangling timeline references, percentage categories, overlong strings and oversized arrays. It constructs a fresh allowlisted object and discards unknown keys. Captured text is displayed as text, never HTML.

Desktop additionally bounds input files at 1 MiB and the saved library at 40 sessions / 20 MiB. A valid report is still user-provided data; it is not signed, authenticated or tamper-proof. Paths and snippets may be sensitive. Review before sharing.

The [original controlled fixture](../tests/fixtures/sample-nudgeproof.json) exercises legacy migration. Browser integration generates fresh v2 exports and the Electron integration imports them, checking that IDs, evidence and interpretations survive a round trip.
