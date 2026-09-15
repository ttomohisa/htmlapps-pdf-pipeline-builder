import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const template=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');
const core=fs.readFileSync(path.join(root,'src/vendor/node-editor-core.mjs'),'utf8');

test('v0.8.2 quick Recipe cards start collapsed and can be expanded independently',()=>{
  assert.match(template,/body\.hidden=true/);
  assert.match(template,/aria-expanded','false'/);
  assert.match(template,/quick-recipe-card\.open/);
  assert.match(template,/quickRecipeExpand/);
  assert.match(template,/quickRecipeCollapse/);
  assert.match(template,/toggle\.onclick=\(\)=>\{body\.hidden=!body\.hidden/);
});

test('v0.8.2 quick Recipe executes in isolation instead of replacing the Canvas graph',()=>{
  assert.match(template,/async function runQuickRecipe\(/);
  assert.match(template,/Core\.deserializeGraph\(JSON\.stringify\(recipe\.graph\),\{registry\}\)/);
  assert.match(template,/evaluateGraph\(graph,files/);
  assert.match(template,/openOutputPreview\(result\.bytes,result\.filename,result\.pageCount\)/);
  const start=template.indexOf('async function runQuickRecipe(');
  const end=template.indexOf('function saveRecipe(',start);
  const fn=template.slice(start,end);
  assert.doesNotMatch(fn,/downloadBlob\(/);
  assert.doesNotMatch(fn,/canvas\.setGraph\(/);
  assert.doesNotMatch(fn,/applyRecipe\(/);
  assert.doesNotMatch(fn,/fileStore\.clear\(/);
});

test('Recipe library still supports loading a Recipe into the Canvas for editing',()=>{
  assert.match(template,/function loadRecipe\(id\)/);
  assert.match(template,/applyRecipe\(recipe,\{closeDialog:true\}\)/);
  assert.match(template,/canvas\.setGraph\(graph/);
});

test('v0.8.2 quick Recipe remains local and app-specific',()=>{
  assert.doesNotMatch(template,/\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket\s*\(/);
  assert.doesNotMatch(core,/runQuickRecipe|quick-recipe-card|quickRecipeExpand/);
});
