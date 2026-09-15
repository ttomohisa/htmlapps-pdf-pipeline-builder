import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const template=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');
const core=fs.readFileSync(path.join(root,'src/vendor/node-editor-core.mjs'),'utf8');

test('v0.8.1 keeps desktop Canvas height independent from palette content',()=>{
  assert.match(template,/\.editor-grid\{display:grid;grid-template-columns:230px minmax\(0,1fr\) 300px;height:640px;min-height:0\}/);
  assert.match(template,/\.palette\{[^}]*overflow-y:auto/);
  assert.match(template,/\.inspector\{[^}]*height:100%;max-height:none;overflow:auto/);
  assert.match(template,/\.canvas-panel\{[^}]*height:100%/);
  assert.match(template,/\.canvas\{height:100%;min-height:0/);
  assert.match(template,/\.editor-grid\{display:flex;flex-direction:column;height:auto\}/);
});

test('v0.8.1 large intermediate Preview reuses local Blob pages',()=>{
  assert.match(template,/id="previewDialog"/);
  assert.match(template,/class="preview-expand-button"|preview-expand-button/);
  assert.match(template,/function openLargePreview\(url,page,isResult=false\)/);
  assert.match(template,/frame\.src=`\$\{url\}#toolbar=1&navpanes=0&view=Fit`/);
  assert.match(template,/expandPreview\.onclick=\(\)=>openLargePreview\(url,offset\+i\+1,node\.type==='pdf-output'\)/);
  assert.match(template,/frame-src blob:/);
  assert.match(template,/connect-src 'none'/);
  assert.doesNotMatch(template,/\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket\s*\(/);
});

test('v0.8.1 UX fixes stay app-level and do not modify Core semantics',()=>{
  assert.doesNotMatch(core,/previewDialog|preview-expand-button|miniMapBeforeExpand/);
});
