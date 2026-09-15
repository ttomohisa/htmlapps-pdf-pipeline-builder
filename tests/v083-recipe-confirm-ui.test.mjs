import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const template=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');
const core=fs.readFileSync(path.join(root,'src/vendor/node-editor-core.mjs'),'utf8');

test('v0.8.3 Quick Recipe uses familiar disclosure chevron and offers both Canvas and direct-output actions',()=>{
  assert.match(template,/document\.createElementNS\('http:\/\/www\.w3\.org\/2000\/svg','svg'\)/);
  assert.match(template,/chevron\.innerHTML='<path d="m9 6 6 6-6 6"\/>'/);
  assert.match(template,/quick-recipe-card\.open \.quick-recipe-chevron\{transform:rotate\(90deg\)\}/);
  assert.match(template,/quickRecipeApplyCanvas:'Canvasに反映'/);
  assert.match(template,/quickRecipeApplyCanvas:'Apply to Canvas'/);
  assert.match(template,/apply\.onclick=\(\)=>applyRecipe\(recipe,\{closeDialog:false,files:new Map\(staged\),forceConfirm:true\}\)/);
  assert.match(template,/actions\.append\(apply,use\)/);
});

test('v0.8.3 uses reusable in-app confirmation dialog instead of browser-native dialogs',()=>{
  assert.match(template,/id="confirmDialog"/);
  assert.match(template,/const AppConfirm=\(\(\)=>\{/);
  assert.match(template,/AppConfirm\.ask\(t\('confirmRecipeOverwrite'/);
  assert.match(template,/AppConfirm\.ask\(t\('confirmRecipeDelete'/);
  assert.match(template,/AppConfirm\.ask\(t\('confirmDelete'/);
  assert.match(template,/AppConfirm\.ask\(t\('confirmClearFile'/);
  assert.match(template,/AppConfirm\.ask\(t\('confirmMergeInputReduction'/);
  assert.match(template,/AppConfirm\.ask\(t\('confirmPreset'/);
  assert.doesNotMatch(template,/\b(?:window\.)?confirm\s*\(/);
  assert.doesNotMatch(template,/\b(?:window\.)?alert\s*\(/);
  assert.doesNotMatch(template,/\b(?:window\.)?prompt\s*\(/);
});

test('v0.8.3 UI changes stay app-level',()=>{
  assert.doesNotMatch(core,/AppConfirm|quickRecipeApplyCanvas|confirmDialog/);
});
