# Changelog

## 1.0.0 - 2026-09-15

- Promoted the validated v0.9.0 release candidate to the first stable PDF Pipeline Builder release.
- Kept the v0.9.0 processing and persistence model unchanged: Quick Recipes, Pipeline JSON, intermediate Preview, PDF Output Result preview, document-processing nodes, Split / Merge, and browser-local Recipes are now the stable baseline.
- Reworked README.md and README.ja.md to follow the established Browser Kitty repository structure used by PDF Organizer: demo, features, quick start, usage, Pages deployment, development, privacy, limitations, dependencies, contributing, and license.
- Updated visible version, app metadata, release verification docs, screenshots, and release packaging to v1.0.0.
- Re-ran desktop / mobile, Japanese / English, local-only runtime, CSP, standalone, self-extract, Pipeline replacement, Quick Recipe, Preview / Result, and persistence regression checks.
- Kept Node Editor Core 1.0.0, embedded pdf-lib 1.17.1, favicon, and runtime no-network policy unchanged.

## 0.9.0 - 2026-09-15

- Promoted the current feature set to the release candidate for the first stable release; no broad new feature area was added.
- Added an in-app replacement confirmation when opening Pipeline JSON over unsaved Canvas edits.
- Cancelling Pipeline replacement now preserves the current graph, runtime PDF selections, viewport, and undo/redo history.
- Invalid or wrong-app Pipeline JSON is rejected before the current Canvas is cleared.
- Re-ran regression coverage for Quick Recipes, local output preview, intermediate/final Preview, document processing, Split/Merge, Recipe persistence, mobile layout, CSP, and self-extract output.
- Kept browser-native confirm/alert/prompt out of application confirmations.
- Kept Node Editor Core 1.0.0, favicon, embedded pdf-lib, and local-only runtime model unchanged.

## 0.8.4 - 2026-09-15

- `Apply to Canvas` from Quick Recipe now always asks for in-app confirmation before replacing the Canvas.
- `Use this Recipe` no longer downloads automatically; it opens a local output preview and lets the user explicitly save the PDF.
- Quick Recipe output remains isolated from the current Canvas and still populates the Result state for re-saving.
- PDF Output Inspector now labels its preview as `Result` / `結果`, including the enlarged preview title.
- Updated Japanese / English / mobile screenshots.
- Kept Node Editor Core, favicon, CSP, and offline processing unchanged.

## 0.8.3 - 2026-09-15

- Changed Quick Recipe disclosure to the familiar right-chevron / down-chevron pattern.
- Added `Apply to Canvas` to the left of `Use this Recipe`; staged local PDFs are carried into the Canvas when available.
- Kept `Use this Recipe` as the isolated direct-output path that does not replace the current Canvas.
- Replaced browser-native confirmation prompts with a reusable in-app confirmation dialog for Recipe overwrite/update/delete/load, node delete, file clear, Merge input reduction, and sample replacement.
- Kept Node Editor Core, favicon, offline behavior, and PDF processing semantics unchanged.

## 0.8.2 - 2026-09-15

- Quick Recipe cards now start collapsed and can be opened independently.
- Quick Recipe execution no longer replaces the current Canvas graph.
- Selecting Recipe inputs and pressing “Use this Recipe” runs the saved graph in isolation and outputs the generated PDF directly.
- The generated Recipe output is also retained in the Result area for re-saving.
- Loading a Recipe into the Canvas for editing remains available from the Recipe library.
- No runtime network dependency was added; Node Editor Core remains unchanged.


## 0.8.1 - 2026-09-15

- Keep the desktop Canvas height stable regardless of Palette content; Palette and Inspector now scroll internally.
- Keep the Node Palette and Inspector visible in floating enlarged mode instead of hiding both side panels.
- Force MiniMap visible while floating enlarged mode is active, then restore the previous MiniMap preference on exit.
- Add a large local-only dialog for intermediate Preview pages, opened from an expand icon on each thumbnail.
- Preserve v0.8.0 Recipe, palette drag, document processing, and offline behavior without changing Node Editor Core.

## 0.8.0 - 2026-09-15

- Added independent collapse / expand controls for the four palette groups; all groups start open.
- Kept click-to-add and added Node-RED-style drag-to-canvas node creation at the drop position.
- Reworked floating enlarged mode so the Canvas receives the available viewport instead of being squeezed by Palette / Inspector / status rows.
- Kept the MiniMap visible in floating enlarged mode on desktop-width layouts, including coarse-pointer devices.
- Preserved the pre-expand viewport and restore it when leaving floating enlarged mode.
- Added quick Recipe cards above the node editor for saved Recipes.
- Added one local PDF picker / drop target per Recipe PDF Input and attach the staged local files when loading that Recipe.
- Kept Recipe files runtime-only; no File/PDF bytes are written to localStorage or Pipeline JSON.
- Preserved v0.7.0 Recipe management, all PDF processing / Preview behavior, CSP `connect-src 'none'`, Node Editor Core 1.0.0, and the existing favicon.

## 0.7.0 - 2026-09-15

- Added a browser-local Recipe library for registering frequently used Pipelines by name and reusing them with different PDFs.
- Added Recipe create, same-name overwrite confirmation, update, load, and delete flows with a 30-entry limit.
- Stripped PDF Input filename/page-count metadata before Recipe persistence so Recipes behave as processing templates rather than source-file snapshots.
- Kept source/generated PDF bytes and Preview Blob URLs out of Recipe data.
- Kept portable Pipeline JSON save/open unchanged for backup, transfer, and external version control.
- Added a memory-only fallback with user-facing warning when browser persistent storage is unavailable.
- Added responsive Recipe dialog UI and translated Japanese/English states, including mobile-safe actions.
- Kept Node Editor Core unchanged at 1.0.0, favicon unchanged, runtime networking disabled, and all v0.6.0 document-processing / Preview behavior intact.

## 0.6.0 - 2026-09-15

- Added Page Numbers with four numbering formats plus configurable start number, position, font size, and margin.
- Added Text Watermark with configurable ASCII text, font size, opacity, and angle.
- Added preset Text Stamp values (DRAFT / CONFIDENTIAL / COPY / INTERNAL / SAMPLE / APPROVED) with configurable position, font size, margin, and opacity.
- Added all three document-processing nodes to Intermediate Preview using the same page-reference/materialization path as final output.
- Preserved graph-order semantics: decoration added before Rotate rotates with the page, while decoration added after Rotate is positioned against the already-rotated page; page numbering likewise resolves at the node's position in the Pipeline.
- Added original-page rotation tracking so overlays render correctly for source PDFs whose pages already contain `/Rotate` values.
- Limited custom Watermark text to ASCII in v0.6.0 so the embedded standard PDF font can generate output without runtime font/network dependencies.
- Kept Node Editor Core unchanged at 1.0.0 and added no new runtime dependency.
- Preserved `connect-src 'none'`, local Blob Preview, Pipeline persistence/reuse, mobile layout, and single-HTML/self-extract output.

## 0.5.0 - 2026-09-15

- Added Intermediate Preview to the Inspector so selecting a node shows the page stream at that exact point in the Pipeline without running the final output first.
- Preview evaluates only the selected node's required upstream path; unrelated branches do not need files just to inspect another branch.
- Added Split preview switching between `Selected` and `Rest`.
- Added six-page preview paging to avoid creating large numbers of inline PDF viewers for long documents.
- Reused the final page-reference/materialization model for Preview so Select / Reorder, Delete, Duplicate, Blank, Rotate, Reverse, Split, Merge, Input, and Output states remain consistent with final execution.
- Kept Preview fully local by creating temporary one-page PDF Blob URLs and revoking them when the preview changes.
- Kept `connect-src 'none'`; added only `frame-src blob:` so local Blob PDFs can be displayed by the browser's built-in PDF viewer.
- Changed Helper Lines, Grid Snap, MiniMap, and Float & Enlarge toolbar controls to SVG icon buttons with translated accessible labels/tooltips.
- Added product copy explaining that saved Pipelines can be reused with other PDFs.
- Kept Node Editor Core at 1.0.0 and added no new runtime dependency.
- Preserved v0.4.0 Split / multi-input Merge, earlier page operations, Pipeline persistence, local-only execution, mobile layout, and self-extract output.

## 0.4.0 - 2026-09-15

- Added Split Pages with `selected` and `rest` output Ports so one page stream can branch into independent downstream processing paths.
- Split uses existing page-expression syntax; selected pages follow expression order while the remaining branch preserves original order.
- Changed Pipeline evaluation to be source-Port-aware so multi-output nodes can feed different downstream branches correctly.
- Expanded Merge Pages from fixed A/B inputs to a configurable 2–6 inputs (A through F), concatenated in Port order.
- Kept the persisted `merge-pages` type compatible; older Pipelines without `inputCount` resolve to two inputs.
- Added confirmation when reducing Merge inputs would disconnect existing Edges, and applies those removals plus the setting change as one Undo-able graph edit.
- Updated the Merge sample to demonstrate three independent PDF inputs.
- Kept Node Editor Core unchanged at 1.0.0 and retained all PDF-specific semantics inside the Consumer.
- Preserved v0.3.0 page operations, v0.2.0 file-state management, local-only processing, CSP, mobile layout, and self-extract output.

## 0.3.0 - 2026-09-15

- Clarified the existing Select Pages node as Select / Reorder without changing its persisted `select-pages` type.
- Added Delete Pages with current-stream page expressions such as `1`, `2-4`, and `1,3,5`.
- Added Duplicate Pages with 1–20 copies inserted immediately after each selected current page.
- Added Insert Blank Page for start, end, before-page, and after-page positions.
- Blank pages inherit nearby page size/orientation at runtime, with A4 fallback when no page is available.
- Extended rotation and output materialization so inserted blank pages can flow through downstream Rotate / Reverse / Merge operations.
- Added a clear execution error when the final page stream is empty.
- Kept all PDF-specific page semantics inside PDF Pipeline Builder; Node Editor Core remains unchanged at 1.0.0.
- Preserved v0.2.0 file-state management, Pipeline persistence, Edge editing, Undo / Redo, mobile layout, local-only processing, and self-extract output.

## 0.2.0 - 2026-09-15

- Applied the user-provided PDF Pipeline Builder SVG as both `assets/favicon.svg` and the top-left app icon.
- Added an always-visible Input PDF / Output PDF status bar below the Canvas so multi-input Pipelines show which files are loaded, missing, need re-selection, or failed to load.
- Added click-to-focus file chips that select the corresponding PDF Input / Output node and open its Inspector.
- Added PDF drag-and-drop support to the PDF Input Inspector while preserving the normal file picker.
- Added file-size metadata, explicit file detach, and clearer re-selection state after reopening Pipeline JSON.
- Added PDF load-error state without storing failed file bytes in the graph.
- Added a safe output filename suggestion (`<source>-processed.pdf`) while preserving user-customized output names.
- Included output filename in completion/save feedback and shows generated output size in the file status bar.
- Added preflight focus to the first PDF Input that is missing a runtime file before execution.
- Preserved all v0.1.0 PDF execution, Merge, Edge editing, Undo / Redo, Pipeline persistence, local-only processing, and Node Editor Core 1.0.0 behavior.

## 0.1.0 - 2026-09-14

- Promoted PDF Pipeline Builder from the Node Editor Core validation Consumer into the formal application development baseline.
- Preserved the existing real PDF-processing path: PDF Input, Select Pages, Rotate, Reverse, Merge, PDF Output, execution, and save.
- Preserved Pipeline JSON save/reopen, Edge selection/deletion, Undo / Redo, Pan / Zoom, Fit, MiniMap, helper lines, Grid snap, and floating enlarged workspace.
- Replaced validation/Second Consumer wording in the product UI with application-facing copy.
- Changed the visible version badge to PDF Pipeline Builder v0.1.0 while keeping Node Editor Core 1.0.0 as the pinned editor foundation.
- Kept source and generated PDF bytes outside persistent Pipeline JSON.
- Kept embedded `pdf-lib` 1.17.1 and runtime `connect-src 'none'`.
