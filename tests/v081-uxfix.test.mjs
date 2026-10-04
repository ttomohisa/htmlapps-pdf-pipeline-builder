import { assertNoNetworkCalls } from './helpers/runtime-contract.mjs';
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

test('large intermediate Preview renders local PDF bytes on a canvas',()=>{
  assert.match(template,/id="previewDialog"/);
  assert.match(template,/class="preview-expand-button"|preview-expand-button/);
  assert.match(template,/function openLargePreview\(bytes,page,isResult=false\)/);
  assert.match(template,/renderPdfBytesToCanvas\(bytes,canvas,\{targetWidth\}\)/);
  assert.match(template,/expandPreview\.onclick=\(\)=>void openLargePreview\(bytes,offset\+i\+1,node\.type==='pdf-output'\)/);
  assert.match(template,/frame-src blob:/);
  assert.match(template,/connect-src 'none'/);
  assertNoNetworkCalls(template);
});

test('v0.8.1 UX fixes stay app-level and do not modify Core semantics',()=>{
  assert.doesNotMatch(core,/previewDialog|preview-expand-button|miniMapBeforeExpand/);
});
