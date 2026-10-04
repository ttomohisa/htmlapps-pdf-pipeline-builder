import { assertNoNetworkCalls } from './helpers/runtime-contract.mjs';
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

 test('stable release keeps the validated runtime trust model',()=>{
  assert.match(config.version,/^1\.\d+\.\d+$/);
  assert.equal(pkg.version,config.version);
  assert.match(source,/connect-src 'none'/);
  assert.match(source,/frame-src blob:/);
  assertNoNetworkCalls(source);
  assert.doesNotMatch(source,/\b(?:window\.)?(?:confirm|alert|prompt)\s*\(/);
});

test('README follows the user-facing Browser Kitty release structure',()=>{
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
