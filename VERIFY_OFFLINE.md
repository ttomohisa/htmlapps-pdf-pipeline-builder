# PDF Pipeline Builder v1.0.0 Offline Verification

This v1.0.0 stable-release checklist covers safe Pipeline JSON replacement, Quick Recipes, local output preview, PDF Output Result wording, in-app confirmations, fixed editor height, floating Canvas, MiniMap, intermediate previews, document processing, persistence, and mobile regression.

## 1. Startup / network

1. Open `dist/index.html` directly.
2. Confirm visible version is v1.0.0.
3. Confirm Info and EN / JA switching work.
4. Confirm favicon and top-left icon match `assets/favicon.svg`.
5. Confirm CSP contains both `connect-src 'none'` and `frame-src blob:`.
6. Confirm Preview causes no external HTTP(S), fetch, XHR, WebSocket, CDN, telemetry, or PDF upload.

## 2. Canvas / Toolbar

1. Confirm all four Palette groups start open and can be collapsed independently.
2. Confirm nodes can still be added by click and can also be dragged from the Palette onto the exact Canvas drop position.
3. Drag existing nodes and confirm Ports / Edges stay aligned.
4. Confirm zoom `− / % / ＋` and Fit all work.
5. Confirm Helper Lines, Grid Snap, MiniMap, and Float & Enlarge are SVG icon buttons.
6. Confirm active states and translated tooltip / aria-label text.
7. Confirm the four-corners icon opens an enlarged editor while keeping Palette / Inspector visible, the desktop MiniMap remains visible, and Escape restores the normal layout.
8. Select an Edge directly, delete it, Undo, and Redo.

## 3. Document-processing nodes

1. Load a visually distinct three-page PDF.
2. Add Page Numbers and verify all four formats, start number, six positions, font size, and margin in Preview and final output.
3. Add Watermark and verify ASCII text, font size, opacity, and angle in Preview and final output.
4. Confirm non-ASCII custom Watermark text is rejected with user-facing validation rather than a raw exception.
5. Add Text Stamp and verify DRAFT / CONFIDENTIAL / COPY / INTERNAL / SAMPLE / APPROVED plus six positions, font size, margin, opacity, and border.
6. With source pages containing `/Rotate`, verify correct visible position/orientation for 0 / 90 / 180 / 270 degrees.

## 4. Graph-order semantics

1. `Page Numbers → Reorder`: confirm assigned labels move with their pages.
2. `Reorder → Page Numbers`: confirm numbering follows the reordered stream.
3. `Stamp → Rotate`: confirm the stamp rotates with the page afterward.
4. `Rotate → Stamp`: confirm the stamp is positioned against the already-rotated page.
5. Confirm Intermediate Preview and final output agree for these cases.

## 5. Intermediate Preview

1. Select PDF Input and confirm all pages appear.
2. Verify node-local Preview for Select / Reorder, Delete, Duplicate, Blank, Rotate, Reverse, Page Numbers, Watermark, and Text Stamp.
3. Verify Split `Selected / Rest` switching and Merge A → B → C… order.
4. Verify PDF Output previews the final incoming stream.
5. With a 7+ page PDF, confirm six pages per Preview page and Previous / Next navigation.
6. Confirm only the selected upstream path is evaluated; an unrelated missing Input does not block Preview.
7. Confirm missing required files/connections produce user-facing guidance instead of raw exceptions.
8. Confirm old Blob URLs are revoked when Preview changes.

## 6. PDF execution regression

Run representative pipelines covering Select / Reorder, Delete, Duplicate, Insert Blank Page, Rotate, Reverse, Split, 2–6 input Merge, and all three document-processing nodes. Confirm Preview and final PDF page count/order/rotation/decorations agree and empty-output handling still works.

## 7. Pipeline persistence / reuse

1. Save Pipeline JSON containing document-processing nodes.
2. Reopen it for a different PDF.
3. Confirm PDF bytes were not persisted and each PDF Input requests re-selection.
4. Re-select different PDFs and confirm the same graph/settings can Preview and execute without rebuilding the workflow.
5. Confirm Intro / Help explain that saved Pipelines can be reused with other PDFs.

## 8. Recipe library

1. Register the current Pipeline with a name such as “Submission PDF finish”.
2. Confirm the Recipe list shows name, node count, and updated time.
3. Saving the same name again must ask before overwrite.
4. Change the Pipeline, then Use the Recipe and confirm nodes / Edges / settings / positions return to the saved workflow.
5. After Recipe load, confirm PDF Input filename/page-count metadata is empty and new source PDFs are required.
6. Update an existing Recipe from the current Pipeline.
7. Delete asks for confirmation; cancel preserves the Recipe and confirm removes it.
8. Confirm the 30-Recipe limit.
9. In DevTools Application, verify Recipe data is in `localStorage` and contains no PDF bytes, Blob URLs, source filenames, or page counts.
10. Confirm Save/Open Pipeline JSON still works independently as the portable backup/transfer format.
11. Confirm saved Recipes appear above the node editor.
12. Confirm each quick Recipe card exposes one local PDF picker / drop target per PDF Input.
13. Confirm **Use this Recipe** restores the graph and attaches the PDFs selected in the card to the corresponding inputs.
14. Confirm staged quick-Recipe File/PDF bytes are not persisted to localStorage.

## 9. Mobile

At about 390px width confirm:

- no page-level horizontal scrolling
- Palette scrolls locally and its group controls remain usable
- document-processing nodes remain selectable
- Inspector fields stay within the viewport
- Preview switches to three columns without clipping frames/page numbers/navigation
- Canvas icon controls retain roughly 44px touch targets
- file chips wrap safely
- Recipe plus run/save controls do not overlap
- Recipe dialog stays inside the viewport and Register / Use / Update / Delete remain touchable
- long filenames do not break layout

## 10. Self-extract

1. Open `dist/index.self-extract.html` directly.
2. Confirm document-processing nodes / Preview / Split / multi-input Merge work there too.
3. Confirm build verification restores `dist/index.html` byte-for-byte.

### v1.0.0 stable-release focused checks

1. Make an unsaved graph edit, choose Open Pipeline, and select a valid Pipeline JSON; an in-app confirmation must appear before replacement.
2. Cancel the confirmation and verify nodes, edges, selected PDF files, viewport, and undo/redo history remain unchanged.
3. Accept the confirmation and verify the Pipeline loads with PDF Inputs waiting for file re-selection.
4. Select malformed JSON or a JSON file with another app id and verify the current Canvas and selected PDFs are preserved.
5. Quick Recipe cards start collapsed and use the familiar right/down disclosure chevron.
6. Apply to Canvas always uses the in-app confirmation and applies the Recipe plus staged PDFs only after acceptance.
7. Use this Recipe runs without changing the Canvas, does not auto-download, and opens the local output preview.
8. A download starts only after Save PDF is pressed in the output preview.
9. PDF Output Inspector says Result; all other node previews remain Intermediate preview.
10. Recipe overwrite/update/delete, node delete, input clear, Merge input reduction, sample replacement, and Pipeline JSON replacement do not use browser-native confirm/alert/prompt.
11. Check desktop Japanese, desktop English, and 390px mobile for page-level horizontal scrolling, fixed-UI overlap, overflowing dialogs, and long-filename breakage.
12. Reconfirm `connect-src 'none'`, `frame-src blob:`, no runtime network API, and unchanged Node Editor Core 1.0.0.
