# PDF test-suite repair — 2026-10-04

Starting point: branch fix/audit-safety-2026-10, commit be600edd13f1bcbabbc013a9a811b2879561f5eb. The imported page-count escaping fix remains unchanged.

## Failure classification

The reproduced baseline was 63 tests: 46 passed, 17 failed. No application implementation defect was demonstrated by these failures; this repair changes tests and documentation only. The generated HTML alias changes its build timestamp when rebuilt.

| Baseline failing test | Cause and retained coverage |
| --- | --- |
| standalone artifact has local-only CSP and formal app marker | Hard-coded v1.0.0 badge; now checks the generated badge against current app configuration, retaining CSP, app/Core markers and placeholder checks. |
| application source does not initiate runtime network APIs | Regex mistook the embedded CMap interface method named fetch for a network call. The shared guard excludes only that declaration token and still checks its body. |
| dependency metadata is template-compatible and locked | Assumed only pdf-lib; now checks both existing pdf-lib and PDF.js, exact versions, licenses, assets and matching lock entries. |
| generated dependency manifest records the locked tarball and embedded bytes | Expected the obsolete object-shaped manifest and single embeddedSha256 field. Now checks every dependency and asset in canonical schema v2, decompresses actual embedded bytes, and verifies sizes and hashes. |
| self-extract payload restores readable artifact byte-for-byte | Expected obsolete const b payload and sourceSha256 field. Reads the canonical payload script and nested source.sha256; still requires byte-for-byte restoration. |
| v0.5.0 previews intermediate node output locally without adding a renderer dependency | Assumed obsolete iframe preview and one dependency. Checks the current embedded PDF.js canvas path. |
| product copy explains reusable workflows in Japanese and English | Exact marketing sentences changed. Replaced with execution of actual Japanese/English translation resolution for reusable-workflow messages, without pinning prose. |
| tests/template-script-syntax.test.mjs | Overescaped regex made the test file itself unparsable. Corrected the regex; both source scripts are now parsed. |
| materializer writes page number, watermark, and bordered stamp into local PDF bytes | Unconfigured external pdftotext executable was missing. Loads actual output PDF and decodes its content streams using the existing library, checking all three painted text values and a closed, stroked stamp border. |
| v0.8.0 UX additions remain local and app-specific | Same fetch declaration false positive; shared guard retains Core-boundary check. |
| v0.8.1 large intermediate Preview reuses local Blob pages | Assumed old URL/iframe implementation. Checks bytes/canvas preview path, retaining local CSP/network guards. |
| v0.8.2 quick Recipe remains local and app-specific | Same fetch declaration false positive; shared guard retains Core-boundary check. |
| v0.8.4 Quick Recipe opens output preview and does not auto-download | Obsolete outputPreviewFrame ID; current outputPreviewCanvas is required, explicit-save and no-auto-download checks retained. |
| v0.8.4 remains local and app-level | Same fetch declaration false positive; shared guard retains Core-boundary check. |
| v0.9.0 keeps application confirmations in-app and runtime local | Same fetch declaration false positive; in-app confirmation and CSP checks retained. |
| v0.9.0 keeps Core and favicon pinned to the v0.8.4 release candidate baseline | Hard-coded v1.0.0 badge; now checks current configuration consistency, retaining Core compatibility and favicon presence. |
| stable release keeps the validated runtime trust model | Same fetch declaration false positive; release/package consistency, CSP and native-dialog restrictions retained. |

## Additional security coverage

The real generated embedded-asset loader and real CMap factory are executed together. Both bundled CMaps must match their known hashes. Unsupported resource kinds, unknown names, external URLs and traversal-like names must reject. Mutation checks inject fetch, window.fetch, XHR, WebSocket and sendBeacon calls both outside and inside the factory; all must be rejected by the source guard.

No dependency, source template, CSP, processing semantics or runtime network permission was changed. APP_SPEC now describes the existing PDF.js canvas preview and embedded-resource boundary accurately.

## Verification

- PowerShell syntax/encoding preflight: passed for all 10 scripts.
- Canonical scripts/check-repository.ps1: passed, including both generated variants, embedded-asset validation and self-extract byte restoration.
- npm test after canonical rebuild: 65 passed, 0 failed, 0 skipped.
- git diff --check: passed.
- Headless Edge, direct file opening of readable, self-extract and tracked alias at 1360×900 and 390×844: imported markup/12/0 page counts display inertly and correctly in both Japanese and English, with no page errors or HTTP(S) requests.
- Headless Edge, readable and self-extract: real Pipeline JSON import, attach a generated two-page PDF, render intermediate canvas preview, enlarge it, register/use a Recipe, navigate output preview from page 1 to page 2 with no automatic download, run the main Pipeline and explicitly export audit-user-name.pdf. Reloading exported bytes confirms two pages. No console/page errors or HTTP(S) requests.

Local execution logs are pdf-suite-baseline.log, pdf-suite-repository.log, pdf-suite-final.log, pdf-suite-browser.log, pdf-suite-export.log and pdf-suite-preview.log in the operating-system temporary directory. Browser harnesses used the existing local Playwright installation and Edge, without adding a project dependency.

Physical devices, Safari/Firefox, hosted Pages, stress-sized PDFs and a broad editing/undo regression were not rerun. No commit, push, merge or deployment was performed by this repair task.
