import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const template=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');
const core=fs.readFileSync(path.join(root,'src/vendor/node-editor-core.mjs'),'utf8');

test('v0.8.0 palette groups are open by default and independently collapsible',()=>{
  const groups=[...template.matchAll(/<section class="palette-group" data-palette-group>/g)];
  assert.equal(groups.length,4);
  assert.equal([...template.matchAll(/class="palette-group-toggle" type="button" aria-expanded="true"/g)].length,4);
  assert.match(template,/classList\.toggle\('is-collapsed'\)/);
  assert.match(template,/aria-expanded/);
  assert.match(template,/inputOutputGroup/);
  assert.match(template,/transformGroup/);
  assert.match(template,/combineGroup/);
});

test('v0.8.0 keeps click-to-add and adds Node-RED-style palette drag-to-canvas',()=>{
  assert.match(template,/draggable="true" data-add-node="pdf-input"/);
  assert.match(template,/addEventListener\('dragstart'/);
  assert.match(template,/application\/x-browser-kitty-node/);
  assert.match(template,/canvasElement\.addEventListener\('drop'/);
  assert.match(template,/screenToFlowPosition\(\{x:event\.clientX,y:event\.clientY\}\)/);
  assert.match(template,/button\.addEventListener\('click'/);
  assert.doesNotMatch(core,/application\/x-browser-kitty-node/);
});

test('v0.8.1 floating enlarged mode keeps both side panels and temporarily forces MiniMap visible',()=>{
  assert.match(template,/grid-template-rows:auto minmax\(0,1fr\)/);
  assert.match(template,/workspace\.is-expanded \.editor-grid\{display:grid;grid-template-columns:230px minmax\(0,1fr\) 300px/);
  assert.match(template,/workspace\.is-expanded \.palette,\.workspace\.is-expanded \.inspector\{display:block/);
  assert.match(template,/workspace\.is-expanded \.file-status-bar,\.workspace\.is-expanded \.result-bar\{display:none\}/);
  assert.match(template,/workspace\.is-expanded \.nec-minimap\{display:block!important/);
  assert.match(template,/miniMapBeforeExpand=canvas\.isMiniMapVisible\(\)/);
  assert.match(template,/canvas\.setMiniMapVisible\(true\)/);
  assert.match(template,/canvas\.setMiniMapVisible\(miniMapBeforeExpand\)/);
  assert.match(template,/miniMapButton'\)\.disabled=document\.body\.classList\.contains\('canvas-expanded'\)/);
  assert.match(template,/viewportBeforeExpand/);
});

test('saved Recipes are surfaced above the editor with per-input local PDF pickers',()=>{
  assert.match(template,/id="quickRecipesSection"/);
  assert.match(template,/id="quickRecipeList"/);
  assert.match(template,/function renderQuickRecipes\(/);
  assert.match(template,/nodes\.filter\(node=>node\.type==='pdf-input'\)/);
  assert.match(template,/input\.type='file'/);
  assert.match(template,/input\.accept='application\/pdf,\.pdf'/);
  assert.match(template,/function runQuickRecipe\(/);
  assert.match(template,/quickRecipeFiles=new Map\(\)/);
});

test('v0.8.0 UX additions remain local and app-specific',()=>{
  assert.doesNotMatch(template,/\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket\s*\(/);
  assert.doesNotMatch(core,/quickRecipeFiles|palette-group-toggle|palette-drag/);
});
