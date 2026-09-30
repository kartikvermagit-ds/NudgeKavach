# Catalyst Hack demo script

**Goal:** show five inspectable observations, carry the same NudgeProof report into Windows, and compare a clean control. Allow about 90 seconds with both apps ready and a clearly identified clean report prepared. Exporting both sessions live may take longer.

## Before presenting

1. From the repository root, run `npm start` with Node.js 22.12 or later. On Windows, `start-demo.cmd` also starts the demo.
2. In Chrome, open `chrome://extensions`; in Edge, open `edge://extensions`. Enable Developer mode and load the `extension/` folder unpacked. Reload the extension after source changes, then reload the store.
3. Open `http://127.0.0.1:4173/guide.html` for the **90-SECOND LIVE AUDIT** jury console. Its checklist is manually controlled; it has no live connection to the scanner and never confirms observations for you.
4. Open Pattern Mode at `http://127.0.0.1:4173/?mode=tricky` in another tab. Keep it in the foreground while observing the countdown. Leave cookie choices visible until demonstrated.
5. Prepare the Windows workspace: after `npm ci` and `npm run desktop:install`, run `npm run desktop:dev`. A portable build may also be opened using its executable. No account is needed.
6. For a brisk comparison, export a fresh Clean Control report from `http://127.0.0.1:4173/?mode=clean` beforehand and clearly identify it as the prepared clean session. Do not present it as a live event. Alternatively, allow extra time to export and import Clean Control during the presentation.

If you select another `PORT`, use the same port in every demo URL. Set `HOST=127.0.0.1` for a demo accessible only on your computer. No AI key or internet connection is needed at runtime once the browser, Node and desktop dependencies are available.

## The twelve-step running order

| Step | Action                                                           | Explain                                                                                                                     |
| ---- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 01   | Open a fresh Pattern Mode page                                   | “This is a controlled store, designed to make the observations repeatable.”                                                 |
| 02   | Open the green NudgeKavach launcher                              | “The browser observes locally. No page content is uploaded.”                                                                |
| 03   | Inspect the initial findings and expand Details                  | “The optional plan was first seen checked; choice prominence differs; a decline label matches a confirm-shaming rule.”      |
| 04   | Select **Locate Evidence**                                       | “The orange marker and this finding share an ID. Here is the source we inspected.”                                          |
| 05   | Select **Continue to checkout**                                  | “We continue monitoring the same page. No real order is placed.”                                                            |
| 06   | Inspect the late-visible fee                                     | “The ₹149 platform fee was absent from the visible baseline and appeared later. This records disclosure order, not intent.” |
| 07   | Inspect the countdown-reset finding                              | “After descending samples, the timer increased. A legitimate offer extension could also explain it.”                        |
| 08   | Open **JOURNEY**                                                 | “These are actual recorded events and timestamps, not a fabricated click replay.”                                           |
| 09   | Select **Export JSON**                                           | “The NudgeProof file carries the session, finding IDs, captured evidence and limitations.”                                  |
| 10   | Switch to Windows Audit Workspace                                | “This workspace reviews local reports. Browser Extension Not Connected is correct; there is no live bridge.”                |
| 11   | Select **Import Audit Report** and choose that file              | “The same ID, evidence and observation time survive the handoff. Import time is separate from observation time.”            |
| 12   | Import/select the clean report and use **Controlled Comparison** | “Pattern and Clean snapshots show the covered differences. Zero findings is not a guarantee of safety or fairness.”         |

Suggested pacing: steps 1–4 in 25 seconds, steps 5–8 in 30 seconds, and steps 9–12 in 35 seconds with the desktop and clean report ready. The jury-console progress indicates only steps you manually checked. **Reset checklist** resets those checks; **Reset Demo** in the store begins a new observed browser session.

The pattern timer restarts after approximately 13 seconds, so its finding may already exist by the time you discuss it. Exact sampled timer values, finding order and timestamps can vary. The clean timer runs for two minutes and ends without a restart. Present the evidence that was actually captured.

## Expected observations

| Pattern store step                                                    | Expected total                         |
| --------------------------------------------------------------------- | -------------------------------------- |
| Fresh page, before checkout or timer restart                          | 3: pre-selection, prominence, shaming  |
| Checkout reveals platform fee                                         | 4, or 5 if the timer has already reset |
| Observed countdown restart and checkout complete                      | 5 distinct finding types               |
| Clean Control, including manually selecting the plan and checking out | 0                                      |

The pattern store's displayed total begins at ₹2,898 with the ₹399 plan selected, then becomes ₹3,047 when its ₹149 platform fee appears. The clean store begins at ₹2,648 with the fee included and the plan unchecked; choosing the plan raises it to ₹3,047. No real order is placed.

The impact summary may show ₹548 in observed charge labels when the ₹399 optional plan and ₹149 late fee are both captured unambiguously. That is not money saved or a verified checkout total. Comparison counts come from the reports selected by the presenter; modes are explicitly assigned because exported URLs omit query strings.

## Explain NudgeProof honestly

- “First seen checked” does not prove a user never chose the option before monitoring.
- A timer extension can be legitimate. The reset is observed; deceptive intent remains uncertain.
- A late-visible fee can be a recalculation. The tool shows the disclosure sequence it observed.
- Zero findings means no covered manipulation signals were observed in this session. It does not certify the page as safe or fair.
- Observed State, Observed Change, Observed Behavior, Measured UI and Heuristic describe evidence categories. They are not confidence percentages.
- IDs are stable within a session. Different sessions can each have finding #04; the session ID distinguishes them.
- The workspace contains explicitly imported snapshots. It cannot locate evidence on a currently open browser page, prove an imported file is authentic, or infer unobserved activity.

## Recovery during a live demo

| Symptom                                  | Recovery                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| No launcher                              | Verify the extension is enabled, then reload the local demo. On another regular website, use the toolbar's **Scan this page** action.       |
| Fewer than five findings                 | Continue to checkout, keep the store foregrounded and wait for the timer restart. Reset Demo for a fresh baseline if monitoring began late. |
| A finding remains after fixing a choice  | Expected: findings are session history. Reset Demo for a new baseline.                                                                      |
| No new findings while paused             | Select **Resume**; changes during the pause were not observed. Reload if you need a fresh baseline.                                         |
| Timer samples vary                       | Normal sampling behavior. Show the recorded transition and its timestamp.                                                                   |
| Browser Extension Not Connected          | Expected in the desktop's import-only workflow. Export from the browser, then use **Import Audit Report**.                                  |
| Report import fails                      | Read the displayed validation error and choose a fresh browser-exported NudgeProof JSON, not an unrelated JSON file.                        |
| No clean report available                | Open Clean Control, export its session and import it; extend the demo instead of claiming an unobserved result.                             |
| Port already in use                      | Stop the other local demo process or choose a different `PORT` and open its printed URL.                                                    |
| Protected browser page cannot be scanned | Open a regular HTTP/HTTPS page. Browser-internal pages are outside extension access.                                                        |

Close on the explicitly disabled **MAKE THIS PAGE FAIR** preview: “Protect Mode is coming next. The current product detects, explains and reviews. Automatic page changes and Developer CI remain future work.”
