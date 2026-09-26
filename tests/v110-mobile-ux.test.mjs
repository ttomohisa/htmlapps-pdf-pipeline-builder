import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');
const config=JSON.parse(fs.readFileSync(path.join(root,'app.config.json'),'utf8'));
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

test('v1.1.0 adds a canvas-first mobile workspace without changing desktop markup',()=>{
  assert.equal(config.version,'1.1.0');
  assert.equal(pkg.version,'1.1.0');
  assert.match(source,/PDF Pipeline Builder <span class="version-badge">v1\.1\.0<\/span>/);
  assert.match(source,/class="mobile-action-bar"/);
  assert.match(source,/id="mobileAddButton"/);
  assert.match(source,/id="mobileRunButton"/);
  assert.match(source,/mobile-sheet-palette/);
  assert.match(source,/mobile-sheet-inspector/);
  assert.match(source,/mobile-sheet-tools/);
  assert.match(source,/mobile-sheet-result/);
  assert.match(source,/function openMobileSheet\(name\)/);
  assert.match(source,/openMobileSheet\('inspector'\)/);
  assert.match(source,/if\(isMobileLayout\(\)\)openMobileSheet\('result'\)/);
  assert.match(source,/@media\(max-width:760px\)/);
  assert.match(source,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(source,/connect-src 'none'/);
});

test('mobile sheets remain dismissible and the primary action exposes generated results',()=>{
  assert.match(source,/id="mobileSheetBackdrop"/);
  assert.match(source,/data-mobile-sheet-close/);
  assert.match(source,/mobileSheetBackdrop'\)\.onclick=closeMobileSheets/);
  assert.match(source,/e\.key==='Escape'.*mobile-sheet-open/);
  assert.match(source,/outputBytes\?\{openMobileSheet\('result'\)/);
  assert.match(source,/mobileResult:'結果'/);
  assert.match(source,/mobileResult:'Result'/);
});
