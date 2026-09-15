# Security / Privacy

PDF Pipeline Builder processes source PDFs and generated PDFs locally in the browser.

- Runtime CSP includes `connect-src 'none'`.
- Source PDF bytes and generated PDF bytes are not stored in Pipeline JSON or Recipes.
- Recipes use browser-local `localStorage` and strip PDF Input filename/page-count metadata before storage.
- No account, analytics, telemetry, upload API, or runtime CDN is required.
- Generated PDF bytes stay in browser memory until the user explicitly saves them.
- `pdf-lib` is embedded in the standalone HTML at build time.

Please use GitHub private vulnerability reporting for security issues once the repository is public.
