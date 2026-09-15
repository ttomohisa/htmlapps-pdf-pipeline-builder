# PDF Pipeline Builder v1.0.0 — Application Specification

## 1.0.0 Stable release

- v1.0.0 promotes the validated v0.9.0 release candidate to the first stable release without introducing a new processing model.
- Quick Recipe, Pipeline JSON, Preview / Result, node editing, document processing, Split / Merge, mobile behavior, and local-only execution are treated as the stable baseline.
- Opening Pipeline JSON over unsaved Canvas edits continues to require the reusable in-app confirmation and cancellation preserves runtime PDF selections.
- Quick Recipe `Apply to Canvas` remains the explicit editing path; `Use this Recipe` remains isolated from the current Canvas and opens a local output preview before any download.
- PDF Output continues to use final `Result` semantics in the Inspector.
- Browser-native `confirm()`, `alert()`, and `prompt()` remain unused.
- No runtime network dependency is introduced; Node Editor Core stays at 1.0.0 and pdf-lib stays at 1.17.1.

## 0.9.0 Release Candidate / regression hardening

- v0.9.0 is the release candidate for the first stable release; it intentionally avoids broad new feature work.
- Opening Pipeline JSON while the current Canvas has unsaved graph edits requires the same reusable in-app confirmation UI used by other destructive replacement actions.
- Cancelling that confirmation preserves the current graph, runtime PDF files, selection, viewport, and undo/redo history.
- Pipeline JSON is deserialized and app-id checked before replacement; invalid JSON never clears the current Canvas.
- Quick Recipe isolated execution, explicit output preview before save, PDF Output `Result` semantics, Recipe persistence, mobile layout, and local-only processing remain unchanged and are included in the release-candidate regression matrix.
- The finished product continues to avoid browser-native `confirm()`, `alert()`, and `prompt()` calls.
- No runtime network dependency is introduced; Node Editor Core stays at 1.0.0.

## 0.8.3 Quick Recipe actions and confirmation UI

- Quick Recipe cards use a conventional right-pointing disclosure chevron when closed and rotate it downward when open.
- `Apply to Canvas` loads the Recipe into the editor and carries over any PDF files already staged in that Quick Recipe card.
- `Use this Recipe` remains the isolated execution path and does not replace the current Canvas.
- Overwrite, update, delete, clear-file, merge-input reduction, Recipe replacement, and preset replacement confirmations use one reusable in-app modal dialog.
- The finished product does not call browser-native `window.confirm()`, `window.alert()`, or `window.prompt()`.

## 0.8.2 Quick Recipe execution

- Saved Recipe cards above the editor are collapsed by default and open independently.
- Quick Recipe file selection is runtime-only and is not written to Recipe storage.
- `Use this Recipe` deserializes the saved Recipe into a temporary graph, evaluates it with temporary PDF bytes, materializes the PDF, and outputs it without calling `canvas.setGraph()`.
- The current Canvas graph, selection, fileStore, viewport, and undo/redo history are not replaced by Quick Recipe execution.
- Recipe library `Use` remains the explicit editing path that loads a Recipe into the Canvas.
- Quick Recipe execution uses the same page evaluator and materializer as normal Pipeline execution.
## 1. Positioning

PDF Pipeline Builder is a Browser Kitty application for composing reusable PDF-processing workflows as a node Pipeline.

v1.0.0 establishes the validated feature set as the first stable release. Quick Recipes, previews, PDF processing, persistence, mobile behavior, and local-only execution are part of the stable baseline. All PDF semantics remain in the app layer and Node Editor Core stays at 1.0.0.

Principles:

- browser-only
- no account / installation
- fully local PDF processing
- single-HTML distribution
- PDF bytes remain runtime-only
- Node Editor Core remains PDF-agnostic
- saved Pipelines remain reusable against other PDFs
- Recipes act as local processing templates rather than snapshots of source files
- graph order must have deterministic processing semantics
- existing persisted node types stay compatible where practical

## 2. Current user workflow

1. Load one or more PDFs through PDF Input nodes.
2. Connect page-processing nodes.
3. Select/reorder, delete, duplicate, insert blank pages, rotate, reverse, or split a stream.
4. Process Split branches independently and Merge 2–6 streams when needed.
5. Add Page Numbers, Watermark, and/or Text Stamp nodes at the exact point where visible document decoration should occur.
6. Select any node to inspect the page stream at that point before final execution.
7. Connect one final stream to PDF Output.
8. Run and explicitly save the generated PDF.
9. Optionally save portable Pipeline JSON for transfer/backup.
10. Or register the current graph as a named Recipe in this browser. Saved Recipes appear above the editor and can accept their PDF Inputs before the graph is loaded.

## 3. Current nodes

### PDF Input

- no input
- one required `pages` output
- local PDF picker / drag-and-drop
- only filename/page-count metadata persists
- PDF bytes stay in runtime memory

### Select / Reorder

- required `pages` input/output
- persisted type remains `select-pages`
- supports `all`, ranges, comma lists, descending ranges, and arbitrary order such as `3,1,2`

### Delete Pages

- required `pages` input/output
- removes selected positions from the current page stream

### Duplicate Pages

- required `pages` input/output
- duplicates selected current pages immediately after each original
- 1–20 copies

### Insert Blank Page

- required `pages` input/output
- start / end / before / after
- matches a nearby page size/orientation when available
- A4 fallback when no page is available

### Rotate

- required `pages` input/output
- 0 / 90 / 180 / 270 degrees

### Reverse Pages

- required `pages` input/output
- reverses the current stream

### Split Pages

- one required `pages` input
- two optional outputs: `selected` and `rest`
- at least one output must be connected
- uses the standard page-expression syntax
- `selected` follows expression order
- `rest` preserves original order for all unselected pages
- both outputs may feed independent downstream branches

### Merge Pages

- persisted type remains `merge-pages`
- configurable 2–6 required input Ports (`a` through `f`)
- one required `out` Port
- concatenates streams in A → B → C → D → E → F order
- existing saved Merge nodes without `inputCount` default to 2 inputs
- reducing input count requires confirmation when removed Ports have Edges

### Page Numbers

- required `pages` input/output
- formats: number only, `n / total`, `Page n`, `Page n / total`
- configurable start number, six edge positions, font size, and margin
- text is resolved when this node evaluates, so later reorder operations move the assigned number with the page

### Watermark

- required `pages` input/output
- custom text, font size, opacity, and angle
- centered on each page at the node's current visual orientation
- custom text accepts 1–60 ASCII characters only; custom font embedding is not included

### Text Stamp

- required `pages` input/output
- preset text: DRAFT / CONFIDENTIAL / COPY / INTERNAL / SAMPLE / APPROVED
- configurable six edge positions, font size, margin, and opacity
- rendered with a visible stamp border

### PDF Output

- one required `pages` input
- output filename setting
- exactly one PDF Output is required for execution
- execution fails clearly when the final stream is empty

## 4. Execution model

Evaluation is endpoint-aware because Split has multiple output Ports. Source PDF bytes live only in runtime memory. Evaluation walks upstream from the selected endpoint and returns page-reference arrays.

A source page reference keeps:

- `sourceNodeId`
- source page index
- original PDF page rotation (`baseRotation`)
- accumulated downstream rotation
- ordered document-overlay descriptors

Inserted blank-page descriptors keep width, height, accumulated rotation, and ordered overlays with `baseRotation: 0`.

Each document-processing node appends an immutable overlay descriptor at evaluation time. The descriptor stores the current visual orientation. This makes graph order meaningful:

- decoration added before Rotate rotates with the page later
- decoration added after Rotate is positioned in the already-rotated visual coordinate system
- page-number text is resolved before later Reorder/Reverse operations if Page Numbers appears upstream

The final sequence is materialized with embedded `pdf-lib` 1.17.1. Standard Helvetica / Helvetica Bold are embedded only in generated output; no runtime font fetch occurs. Generated bytes remain in memory until explicit save.

## 5. Intermediate Preview

Selecting a node adds an Intermediate Preview section to the Inspector. Preview evaluates only the upstream path required by that node, so unrelated branches do not need runtime files merely to inspect the selected path.

Endpoint rules:

- PDF Input previews its `pages` output
- normal transform, Merge, and document-processing nodes preview `out`
- Split exposes a local `Selected / Rest` switch and previews the chosen output Port
- PDF Output previews its `in` endpoint

Preview pages are materialized from the same page-reference model and `pdf-lib` materializer used by final execution, including Page Numbers, Watermark, and Text Stamp overlays. Six pages are displayed at a time with Previous / Next navigation.

Each visible page becomes a temporary one-page PDF Blob displayed by the browser's built-in inline PDF viewer. Blob URLs are revoked when Preview is replaced or invalidated. Preview bytes never enter Pipeline JSON.

No preview renderer dependency is included. CSP remains network-closed while allowing only `frame-src blob:` for local Preview frames.

## 6. File management

- Input / Output status bar below Canvas
- loaded / missing / re-selection-required / load-error states
- click-to-focus file chips
- file picker and PDF drag-and-drop
- filename / page count / byte size
- explicit file detach
- output filename suggestion
- completion feedback with filename / page count / generated size

## 7. Persistence / Recipe / compatibility

Pipeline JSON stores graph structure, node settings, positions, edges, viewport, and source display metadata. It never stores source/generated PDF bytes.

The Recipe library is browser-local and uses `localStorage` under `browser-kitty.pdf-pipeline-builder.recipes.v1`. A Recipe stores a serialized graph plus Recipe metadata (`id`, `name`, timestamps, Recipe schema version). Before storage, every PDF Input has `filename` cleared and `pageCount` reset to 0. Source/generated PDF bytes are never stored.

Recipe behavior:

- saved Recipes are surfaced above the node editor as quick-use cards
- each quick card exposes one local file picker / drop target per `pdf-input` node
- staged File objects stay only in runtime memory and are attached only when the Recipe is loaded
- maximum 30 entries
- names are trimmed and limited to 60 characters
- same-name registration asks before overwrite
- existing Recipe can be updated from the current graph
- delete requires confirmation
- loading a Recipe asks before replacing a dirty graph
- loading clears runtime PDF files, input errors, output bytes, and runtime status
- Recipe load marks the restored graph as the new saved baseline
- if browser persistent storage is unavailable, the app falls back to an in-memory session list and tells the user persistence may be lost
- Pipeline JSON remains the portable format for backup/transfer

Compatibility rules:

- `select-pages` type is unchanged
- `merge-pages` type is unchanged; old Merge nodes without `inputCount` resolve to 2 inputs
- `split-pages` remains unchanged
- v0.6.0 adds `page-numbers`, `watermark-text`, and `text-stamp`
- v0.7.0 does not change graph/node schema; Recipe is an app-level persistence wrapper around the existing serialized graph
- v0.8.0 also leaves graph/node schema unchanged; palette drag/collapse, expanded layout, and quick Recipe inputs are app-level UX only
- source PDFs must be re-selected after reopening a Pipeline

## 8. Node Editor Core boundary

Node Editor Core v1.0.0 continues to provide graph editing, typed Ports, required-Port validation, Edge editing/reconnect, Undo / Redo, viewport, helper lines, Grid snap, MiniMap, touch/keyboard foundations, serialization, and runtime/validation hooks.

PDF-specific page expressions, Split semantics, Merge ordering, page-reference rotation, document-overlay semantics, source loading, Preview materialization, and PDF generation remain in PDF Pipeline Builder.

## 9. Privacy / CSP

- `connect-src 'none'`
- `frame-src blob:` only for local intermediate-preview PDFs
- no fetch / XHR / WebSocket at runtime
- no runtime CDN
- no PDF upload
- no telemetry
- embedded `pdf-lib` 1.17.1

## 10. Mobile

- no page-level horizontal scrolling
- Palette remains locally horizontally scrollable
- palette groups remain individually collapsible and open by default
- palette nodes support both click-to-add and drag-to-position
- document-processing nodes remain available from the same Palette
- Inspector remains below Canvas
- Preview grid switches to three columns at narrow widths and retains navigation
- file chips wrap safely
- Canvas toolbar controls retain touch-sized targets
- floating enlarged mode hides side panels/status bars, gives the Canvas the available viewport, and keeps the desktop MiniMap visible

## 11. v0.8.0 non-goals

Not yet included:

- dedicated canvas-based PDF renderer / PDF.js dependency
- multiple independent PDF Output files from one execution
- split-to-many automatic file generation
- custom blank-page size
- metadata editing
- encryption / password protection
- batch execution across multiple independent input sets
- custom embedded fonts / Japanese custom watermark text
- image stamps, signatures, headers/footers, or arbitrary drawing overlays


## 12. v0.8.1 UX refinements

- Desktop editor height is independent from the number of visible palette nodes; Palette and Inspector scroll internally.
- Floating enlarged mode keeps Palette and Inspector visible around the enlarged Canvas.
- Entering floating enlarged mode temporarily forces MiniMap visible and restores the previous MiniMap preference when leaving.
- Each intermediate Preview thumbnail has an expand action that opens the same local Blob PDF in a larger dialog; no external viewer or network request is used.
- Graph schema, Recipe schema, and Node Editor Core remain unchanged from v0.8.0.
