# Detector reference

Every MVP detector uses local DOM observations and transparent rules. **A finding is a signal to inspect, not a verdict about intent.** Pure matching helpers live in `extension/rules.js`; element discovery, state and evidence generation live in `extension/content.js`.

## Shared observation rules

The scanner handles the top-level document only. It ignores its own panel, elements with hidden/aria-hidden ancestors, and elements whose checked CSS/layout conditions make them hidden or zero-sized. This visibility test does not detect all clipping, occlusion or off-screen positioning.

Text is whitespace-normalized and limited to 240 characters. Eligible changes are observed through DOM mutations and periodic scans. Findings are deduplicated by detector type and element identity, retained as session history, and bounded to 100 findings. Reload to start a new baseline.

## 1. Pre-selected optional choice

**Finding type:** `prechecked` · **Category:** `Observed state`

The first visible observation of a native checkbox or basic `[role="checkbox"]` element is eligible when all of these conditions hold:

- Its live `checked` property is true; a basic ARIA widget uses `aria-checked="true"` or a `checked` class.
- It is not marked `required`.
- Its label contains an optional-choice phrase: optional, add-on, protection plan, gift wrap, newsletter, promotional emails or shipping insurance.
- No trusted pointer or keyboard interaction with that control or its associated label has been observed since monitoring began.

Labels come from associated labels, `aria-label`, or parent text. The first observation is recorded only once per element.

**NudgeProof example:** “First observed checked: ‘Optional protection plan ₹399’. No user interaction with this control observed since monitoring began.”

**Control case:** the clean store starts unchecked. Selecting its plan during monitoring should not create this finding.

**Limits:** a saved preference or interaction before scanning may explain the state. Custom widgets without the covered role/state conventions remain unsupported. A programmatic check after an unchecked first observation is not covered by this first-observation rule.

## 2. Unequal choice prominence

**Finding type:** `prominence` · **Display category:** `MEASURED UI` (legacy `confidence: "Heuristic"` is preserved)

The scanner looks for visible buttons, links, role-buttons and button/submit inputs with narrowly matched Accept and Reject/Decline labels. It searches up to three nearby ancestor containers for the paired choice and stops before the document body.

It compares bounding-rectangle area, computed font size and the controls' own computed opacity:

```text
area ratio = Accept area / max(1, Reject area)
font ratio = Accept font size / max(1, Reject font size)
flag when area ratio >= 2.5 OR font ratio >= 1.5
  OR Reject opacity <= 0.5 AND Accept opacity >= 0.85
```

**NudgeProof:** the exact choice labels, both ratios, computed opacity values and the thresholds. An opacity-only match explicitly describes opacity rather than falsely claiming a size difference.

**Control case:** equally sized Accept/Reject buttons with equal font sizes in the clean comparison.

**Limits:** these measurements do not establish effective contrast, wording quality, accessibility, focus order or intent. Direct opacity excludes ancestor opacity. An unrelated nearby control can be paired in a complex layout. Localized labels and custom consent wording may be missed. The highlighted source is the Accept element; the evidence names its paired Reject choice.

## 3. Suspicious countdown reset

**Finding type:** `urgency` · **Category:** `Observed behavior`

Eligible leaf text elements contain an `MM:SS`, `HH:MM:SS`, or covered textual hours/minutes/seconds value (such as `12m 30s`) and nearby urgency wording. The scanner stores timer history by element identity.

It flags a value increase greater than two seconds only after observing at least two descending samples for that element. A single snapshot or an ordinary countdown is insufficient.

**NudgeProof example:** a transition from `0s` to `12s`, the number of descending samples, reset count and initial observed value. The exact preceding sample can vary with scheduling; evidence reports the sampled transition.

**Control case:** the clean store's two-minute timer ends without restarting. A plain clock without urgency context should not qualify.

**Limits:** legitimate offer extensions and new offers can increase a timer. The detector does not prove that a deal remained available, compare page reloads, or correlate a replaced timer element with its predecessor. Background throttling and rapid changes can cause missed samples. “Fake urgency” is a hypothesis supported by behavior, not a proven classification.

## 4. Late-visible fee

**Finding type:** `fees` · **Category:** `Observed change`

The first scan collects a baseline of visible matching fee strings. Later scans flag a matching fee string that was absent from that baseline. Matching requires both:

- English terminology from the rule's service/handling/processing/platform/booking/convenience/delivery/shipping/packaging/cancellation/regulatory list, followed by fee, charge or cost.
- A supported currency marker (`₹`, `$`, `€`, `£`, `¥`, `AED`, `CAD`, `AUD`, `USD`, `INR`, `GBP`, `EUR`, `Rs` or `Rs.`) followed by a number in the same leaf text element.

**NudgeProof example:** “Not visible in the initial fee baseline; now visible: ‘Platform fee: ₹149’,” plus elapsed time since monitoring began.

**Control case:** a fee visible during the first scan is part of the baseline and should remain unflagged when checkout is opened.

**Limits:** this detects late disclosure relative to a local observation baseline. It does not know contractual totals, item availability, location-dependent shipping or legal disclosure requirements. An amount change creates a different fee string and can trigger the rule. Currency and fee text split across child elements may be missed. Identical fee text already in the baseline is not treated as new merely because it appears elsewhere.

## 5. Possible confirm-shaming

**Finding type:** `shaming` · **Category:** `Heuristic`

The scanner checks visible choice labels for narrow English guilt or negative-self-description phrases. Examples covered by the current rule include “No thanks, I love paying full price,” “I don't care about saving,” and “I hate saving.”

**NudgeProof:** the observed label and an explanation that it matched a local guilt/negative-self-description phrase rule.

**Control case:** neutral “No thanks” and positive “I want to save money” labels should remain unflagged.

**Limits:** the rule does not understand sarcasm, quotations, full conversational context or every variant of manipulative language. It is not a general sentiment classifier. No text is sent to AI.

## Evidence and timeline interpretation

Evidence categories distinguish an observed state, change, behavior and a heuristic interpretation. The exported property is currently named `confidence`, but the values are not probabilities.

The timeline records monitor start, timer baselines, new findings, countdown jumps, pause/resume and same-document URL changes. It is a selective event log, not a recording of every DOM mutation. It retains and displays up to 120 events, oldest to newest. The report retains up to eight evidence snippets per finding. Shared report IDs link these observations across browser and desktop without adding events; see [NudgeProof](nudgeproof.md).

The five controlled findings and clean control establish a repeatable demonstration, not a benchmark of web-wide accuracy. Add representative positive and negative fixtures before broadening a detector's claim.
