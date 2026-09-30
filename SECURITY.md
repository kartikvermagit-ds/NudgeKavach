# Security and privacy

NudgeKavach is a local evidence-collection MVP. It does not establish whether a merchant is safe, whether an interface is lawful, or whether an observed behavior was intentional.

## Current boundary

- Detection runs in the extension against the top-level page DOM. The extension does not upload observations or make external network requests.
- Scan state is kept in the current document's memory. Reloading clears it. Reports are downloaded only through the user's export action.
- Exported URLs omit query strings and fragments. Paths and evidence snippets can still contain personal or confidential information.
- The demo backend defaults to `0.0.0.0` for hosted-demo compatibility. Set `HOST=127.0.0.1` to restrict it to this computer. It only serves frontend files and is not a scan-report API.
- The demo accepts no payment details and creates no real order, subscription or tracking cookie.

## Extension permissions

| Permission or access                          | Reason                                                           |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `activeTab`                                   | Access the tab after the user activates the extension            |
| `scripting`                                   | Inject the local rule and content scripts for the requested scan |
| `http://localhost/*` and `http://127.0.0.1/*` | Start and reactivate monitoring automatically on local demos     |

The local host patterns cover matching local pages, not just this project's port. Pause or disable the extension when testing unrelated local applications containing sensitive content.

There is no persistent all-sites permission, storage permission, cookies permission, browsing-history permission or background service worker. Extension scripts are packaged locally. The extension page content-security policy allows scripts from the extension itself and disallows objects.

## Defensive implementation

Captured page text is inserted with `textContent`. The panel uses a closed shadow root for style separation and the highlight overlay does not intercept clicks. Reports exclude live DOM references. Findings, snippets and timeline history have bounded retention.

These choices do not make the page trustworthy. A website controls its own DOM, may change content between observations, and may obscure or remove extension UI. NudgeProof is a record of local observations rather than a tamper-proof forensic capture. The server and extension have not received an independent security audit.

## Handling reports

The desktop companion imports reports only through an explicit native file dialog. There is no live browser bridge or silent browsing collection. Reports are validated and stored as plain local JSON in the user-data directory shown in Settings (maximum 40 sessions / 20 MiB; 1 MiB per import). They are not encrypted. A corrupt library is preserved and reported. Clearing the library requires a separate confirmation and does not delete the original imported/exported files.

Electron runs a sandboxed, context-isolated renderer without Node integration. A custom protocol serves only allowlisted packaged assets; CSP and request handling prohibit network content. Native IPC validates the sender and exposes only named report actions, not arbitrary filesystem paths. Navigation, popups, webviews and permission requests are blocked. See [architecture](architecture.md).

Portable Windows builds are unsigned and have no automatic-update mechanism. Keep Electron and development dependencies current when maintaining the project. No signed installer, store release, independent audit or cryptographic evidence certification is claimed.

Review exported reports before sharing them. Remove sensitive text and identifying path segments. Use the fictional store when creating public screenshots, issues or test fixtures. Do not commit real browsing reports, credentials, session tokens or downloaded browser profiles.

## Reporting a vulnerability

Contact a repository maintainer privately with a minimal reproduction, affected version or commit, and the observed impact. If GitHub's private vulnerability reporting is enabled for this repository, use that channel. No dedicated security email or response-time commitment has been established.

Do not publish credentials, private browsing content or a working exploit in a public issue. Use fictional data and a local page to demonstrate the issue where possible. Maintainers should confirm the report, prepare a fix and regression check, and coordinate disclosure before publishing sensitive details.

## Future remote features

There is no AI backend in this release. Any later remote classifier or report service should be opt-in, state exactly what text leaves the browser, minimize and redact data, and keep deterministic detection available when the service fails. Credentials must remain outside extension packages and committed source files.
