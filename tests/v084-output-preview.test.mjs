import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const template=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');
const core=fs.readFileSync(path.join(root,'src/vendor/node-editor-core.mjs'),'utf8');

test('v0.8.4 Apply to Canvas always asks for in-app confirmation',()=>{
  assert.match(template,/apply\.onclick=\(\)=>applyRecipe\(recipe,\{closeDialog:false,files:new Map\(staged\),forceConfirm:true\}\)/);
  assert.match(template,/confirmQuickRecipeApply:'現在のCanvasをRecipe「\{name\}」に置き換え、選択したPDFを反映しますか？'/);
  assert.match(template,/const confirmKey=forceConfirm\?'confirmQuickRecipeApply':'confirmRecipeLoad'/);
  assert.match(template,/\(forceConfirm\|\|canvas\.isDirty\(\)\)&&!await AppConfirm\.ask/);
});

test('v0.8.4 Quick Recipe opens output preview and does not auto-download',()=>{
  assert.match(template,/id="outputPreviewDialog"/);
  assert.match(template,/id="outputPreviewFrame"/);
  assert.match(template,/id="outputPreviewSaveButton"/);
  assert.match(template,/openOutputPreview\(result\.bytes,result\.filename,result\.pageCount\)/);
  const start=template.indexOf('async function runQuickRecipe(');
  const end=template.indexOf('function saveRecipe(',start);
  const fn=template.slice(start,end);
  assert.doesNotMatch(fn,/downloadBlob\(/);
  assert.match(template,/outputPreviewSaveButton'\)\.onclick=.*downloadBlob/);
});

test('v0.8.4 PDF Output Inspector uses Result wording instead of Intermediate preview',()=>{
  assert.match(template,/node\.type==='pdf-output'\?'resultPreviewTitle':'previewTitle'/);
  assert.match(template,/node\.type==='pdf-output'\?'resultPreviewLoading':'previewLoading'/);
  assert.match(template,/node\.type==='pdf-output'\?'resultPreviewNote':'previewNote'/);
  assert.match(template,/resultPreviewTitle:'結果'/);
  assert.match(template,/resultPreviewLargeTitle:'結果を拡大'/);
  assert.match(template,/resultPreviewTitle:'Result'/);
});

test('v0.8.4 remains local and app-level',()=>{
  assert.doesNotMatch(template,/\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket\s*\(/);
  assert.doesNotMatch(core,/outputPreviewDialog|confirmQuickRecipeApply|resultPreviewTitle/);
});
