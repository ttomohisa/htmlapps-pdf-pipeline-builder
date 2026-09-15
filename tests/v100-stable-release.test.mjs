import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');
const config=JSON.parse(fs.readFileSync(path.join(root,'app.config.json'),'utf8'));
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');
const readmeJa=fs.readFileSync(path.join(root,'README.ja.md'),'utf8');

 test('v1.0.0 promotes the validated release candidate without changing the runtime trust model',()=>{
  assert.equal(config.version,'1.0.0');
  assert.equal(pkg.version,'1.0.0');
  assert.match(source,/PDF Pipeline Builder <span class="version-badge">v1\.0\.0<\/span>/);
  assert.match(source,/connect-src 'none'/);
  assert.match(source,/frame-src blob:/);
  assert.doesNotMatch(source,/\bfetch\s*\(|new\s+XMLHttpRequest\s*\(|new\s+WebSocket\s*\(/);
  assert.doesNotMatch(source,/\b(?:window\.)?(?:confirm|alert|prompt)\s*\(/);
});

test('v1.0.0 README follows the user-facing Browser Kitty release structure',()=>{
  for(const text of [readme,readmeJa]){
    assert.match(text,/GitHub Pages/);
    assert.match(text,/Single HTML|単一HTML/);
    assert.match(text,/Recipe/);
    assert.match(text,/Privacy|プライバシー/);
    assert.match(text,/Limitations|制限事項/);
    assert.match(text,/Dependencies|使用ライブラリ/);
    assert.match(text,/MIT License/);
  }
  assert.match(readme,/https:\/\/ttomohisa\.github\.io\/htmlapps-pdf-pipeline-builder\//);
  assert.match(readmeJa,/https:\/\/ttomohisa\.github\.io\/htmlapps-pdf-pipeline-builder\//);
});
