# Catalyst Hack demo script

**Goal:** show five inspectable observations and a clean control in about 90 seconds. Position NudgeKavach as a local evidence assistant for interface choices.

## Before presenting

1. From the repository root, run `npm start` with Node.js 22 or later.
2. Open `http://127.0.0.1:4173/` in Chrome.
3. At `chrome://extensions`, enable Developer mode and load the `extension/` folder unpacked. Reload the extension after source changes, then reload the demo.
4. Keep the store tab in the foreground. Leave cookie choices visible until their finding has been demonstrated.
5. Have `http://127.0.0.1:4173/?mode=clean` ready as a second tab, or open it when needed.

The HTML guide is at `http://127.0.0.1:4173/guide.html`. The server prints its URL when it starts. If you select another `PORT`, use the same port in every demo URL. No account, AI key or internet connection is needed for the runtime demonstration once Chrome and Node are available.

## Presentation

| Time   | Action                                                                        | Explain                                                                                                                                    |
| ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 0–15s  | Reload the pattern store and open the green NudgeKavach launcher              | “We show the observation behind each warning. Everything is analyzed locally.”                                                             |
| 15–30s | Inspect the first three cards                                                 | “This plan was first seen checked; Accept is geometrically larger than Reject; the decline uses negative personal wording.”                |
| 30–45s | Use **Locate on page**, then **Continue to checkout**                         | “The ₹149 platform fee was absent from the first visible baseline and has now appeared.”                                                   |
| 45–60s | Show the countdown card and timeline                                          | “This timer counted down and then increased. NudgeProof records the sampled transition instead of assuming that every timer is deceptive.” |
| 60–75s | Export JSON                                                                   | “The report contains observations, explanations and timestamps. It stays local unless we choose to share it.”                              |
| 75–90s | Open or reload the clean comparison; select the plan and continue to checkout | “Equal choices, neutral wording and upfront disclosure stay clean. A user-selected plan is not treated as a pre-selected default.”         |

The pattern timer restarts after approximately 13 seconds, so its finding may already exist by the time you discuss it. Exact sampled timer values and timestamps can vary. The clean timer runs for two minutes and ends without a restart.

## Expected observations

| Pattern store step                                                       | Expected total                         |
| ------------------------------------------------------------------------ | -------------------------------------- |
| Fresh page, before checkout or timer restart                             | 3: pre-selection, prominence, shaming  |
| Checkout reveals platform fee                                            | 4, or 5 if the timer has already reset |
| First observed countdown restart and checkout complete                   | 5 distinct finding types               |
| Clean comparison, including manually selecting the plan and checking out | 0                                      |

The pattern store's displayed total begins at ₹2,898 with the ₹399 plan selected, then becomes ₹3,047 when its ₹149 platform fee appears. The clean store begins at ₹2,648 with the fee already included and the plan unchecked; choosing the plan raises it to ₹3,047. No real order is placed.

## Explain NudgeProof honestly

- “First seen checked” does not prove a user never chose the option before monitoring.
- A timer extension can be legitimate. The reset is observed; deceptive intent remains an interpretation.
- A late-visible fee can be a recalculation. The tool shows the disclosure sequence it observed.
- Zero findings means no covered pattern was observed in this session, not that the entire site is safe.
- “Observed behavior” and “Heuristic” are evidence categories, not confidence percentages.

## Recovery during a live demo

| Symptom                                 | Recovery                                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| No launcher                             | Verify the extension is enabled, then reload the local demo. On another regular website, use the toolbar's **Scan this page** action. |
| Fewer than five findings                | Continue to checkout, keep the tab foregrounded and wait for the timer restart. Reload for a fresh baseline if monitoring began late. |
| A finding remains after fixing a choice | Expected: findings are session history. Reload for a new baseline.                                                                    |
| No new findings while paused            | Select **Resume**; changes during the pause were not observed. Reload if you need a clean baseline.                                   |
| Timer counts vary                       | Normal sampling behavior. Show the recorded transition and its timestamp rather than promising an exact sample.                       |
| Port already in use                     | Stop the other local demo process or choose a different `PORT` and open its printed URL.                                              |
| Chrome internal page cannot be scanned  | Open a regular HTTP/HTTPS page. Protected Chrome pages are outside extension access.                                                  |

Close with the next step: improve coverage through more representative positive and negative fixtures while keeping the evidence inspectable and local.
