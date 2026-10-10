import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(process.env.PDF_PIPELINE_TEST_HTML || new URL('../src/index.template.html',import.meta.url),'utf8');
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
const rule=selector=>[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(match=>match[1].trim()===selector).map(match=>match[2]).join(';');
// Source contracts are paired with native geometry/wheel checks, not browser emulation.
test('native dialog headers stay outside their shrinkable scrolling content',()=>{
 assert.match(rule('.dialog[open]'),/display\s*:\s*flex/);
 assert.match(rule('.dialog[open]'),/flex-direction\s*:\s*column/);
 assert.match(rule('.dialog[open]'),/overflow\s*:\s*hidden/);
 assert.match(rule('.dialog-head'),/flex\s*:\s*0 0 auto/);
 assert.match(rule('.dialog-body'),/min-height\s*:\s*0/);
 assert.match(rule('.dialog-body'),/flex\s*:\s*1 1 auto/);
 assert.match(rule('.dialog-body'),/overflow\s*:\s*auto/);
});
test('native dialogs lock the root page scroll',()=>assert.match(rule('html:has(dialog[open])'),/overflow\s*:\s*hidden/));
test('unbroken node filenames wrap inside their node summary',()=>assert.match(rule('.nec-node-body .node-summary'),/overflow-wrap\s*:\s*anywhere/));
test('local-processing badge keeps the canonical shield/check artwork',()=>{
 const badge=html.match(/<div class="local-badge">([\s\S]*?)<\/div>/)[1];
 assert.match(badge,/d="M12 3 5 6v5c0 4\.6 2\.8 8 7 10 4\.2-2 7-5\.4 7-10V6z"/);
 assert.match(badge,/d="m9 12 2 2 4-5"/);
});

test('long output-preview metadata is ellipsized without enlarging its header',()=>{
 const metadata=rule('.output-preview-meta');
 assert.match(metadata,/white-space\s*:\s*nowrap/);
 assert.match(metadata,/overflow\s*:\s*hidden/);
 assert.match(metadata,/text-overflow\s*:\s*ellipsis/);
});
