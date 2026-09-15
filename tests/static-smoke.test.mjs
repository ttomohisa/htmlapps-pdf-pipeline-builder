import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const template=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');
const core=fs.readFileSync(path.join(root,'src/vendor/node-editor-core.mjs'),'utf8');

test('standalone artifact has local-only CSP and formal app marker',()=>{
  assert.match(dist,/connect-src 'none'/);
  assert.match(dist,/coreVersion:'1\.0\.0'/);
  assert.match(dist,/consumer:'pdf-pipeline-builder'/);
  assert.match(dist,/appVersion:APP_CONFIG\.version/);
  assert.match(dist,/PDF Pipeline Builder <span class="version-badge">v1\.0\.0<\/span>/);
  assert.doesNotMatch(template,/second Consumer|second consumer|validation Consumer|検証Consumer|Node Editor Core検証/);
  assert.doesNotMatch(dist,/__APP_CONFIG_JSON__|__BUILD_MANIFEST_JSON__|__NODE_EDITOR_CORE_SOURCE__|__PDF_LIB_SOURCE__/);
  assert.doesNotMatch(dist,/^\s*export\s+default\s+NodeEditorCore/m);
});

test('application source uses pages Ports and Merge without teaching Core PDF semantics',()=>{
  assert.match(template,/dataType:'pages'/);
  assert.match(template,/type:'merge-pages'/);
  assert.match(template,/required:true/);
  assert.match(template,/PDFLib\.PDFDocument/);
  assert.doesNotMatch(core,/PDFDocument|pdf-lib|pdfInput|selectPages|mergePages|pdfOutput/);
});

test('application source does not initiate runtime network APIs',()=>{
  assert.doesNotMatch(template,/\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket\s*\(/);
});

test('all classic inline scripts parse',()=>{
  const scripts=[...dist.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
  assert.equal(scripts.length,3);
  for(const [i,source] of scripts.entries()) assert.doesNotThrow(()=>new vm.Script(source,{filename:`inline-${i}.js`}));
});



test('dependency metadata is template-compatible and locked',()=>{
  const dependencies=JSON.parse(fs.readFileSync(path.join(root,'dependencies.json'),'utf8'));
  const lock=JSON.parse(fs.readFileSync(path.join(root,'dependencies.lock.json'),'utf8'));
  assert.equal(dependencies.dependencies.length,1);
  const dep=dependencies.dependencies[0];
  assert.equal(dep.id,'pdf-lib');
  assert.equal(dep.package,'pdf-lib');
  assert.equal(dep.version,'1.17.1');
  assert.equal(dep.assets?.[0]?.path,'dist/pdf-lib.min.js');
  assert.ok(dep.homepage);
  const locked=lock.dependencies.find(item=>item.id==='pdf-lib');
  assert.ok(locked);
  assert.equal(locked.package,dep.package);
  assert.equal(locked.version,dep.version);
  assert.match(locked.tarballSha256,/^[a-f0-9]{64}$/);
});

test('generated dependency manifest records the locked tarball and embedded bytes',()=>{
  const lock=JSON.parse(fs.readFileSync(path.join(root,'dependencies.lock.json'),'utf8'));
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist/dependency-manifest.json'),'utf8'));
  const locked=lock.dependencies.find(item=>item.id==='pdf-lib');
  const entry=manifest.dependencies['pdf-lib'];
  assert.equal(entry.package,'pdf-lib');
  assert.equal(entry.version,'1.17.1');
  assert.equal(entry.tarballSha256,locked.tarballSha256);
  const vendor=fs.readFileSync(path.join(root,'src/vendor/pdf-lib.min.js'));
  assert.equal(entry.embeddedSha256,crypto.createHash('sha256').update(vendor).digest('hex'));
  assert.equal(manifest.runtimeNetwork,false);
});

test('self-extract payload restores readable artifact byte-for-byte',()=>{
  const wrapper=fs.readFileSync(path.join(root,'dist/index.self-extract.html'),'utf8');
  const match=wrapper.match(/const b='([^']+)'/);
  assert.ok(match);
  const restored=zlib.gunzipSync(Buffer.from(match[1],'base64'));
  const readable=fs.readFileSync(path.join(root,'dist/index.html'));
  assert.equal(Buffer.compare(restored,readable),0);
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist/self-extract-manifest.json'),'utf8'));
  assert.equal(manifest.sourceSha256,crypto.createHash('sha256').update(readable).digest('hex'));
});


test('file flow exposes input/output state and drag-drop PDF loading',()=>{
  assert.match(template,/id="fileStatusBar"/);
  assert.match(template,/id="inputFileList"/);
  assert.match(template,/id="outputFileList"/);
  assert.match(template,/function renderFileStatus\(\)/);
  assert.match(template,/addEventListener\('drop'/);
  assert.match(template,/reselectRequired/);
  assert.match(template,/function suggestOutputFilename\(/);
  assert.match(template,/inputErrors=new Map\(\)/);
});

test('provided favicon is embedded unchanged and reused as the header icon',()=>{
  const favicon=fs.readFileSync(path.join(root,'assets/favicon.svg'),'utf8');
  assert.match(favicon,/#11644f/i);
  const encoded=Buffer.from(favicon).toString('base64');
  assert.ok(dist.includes('data:image/svg+xml;base64,'+encoded));
  assert.match(template,/<img src="__APP_ICON_DATA_URI__" alt="">/);
});


test('result feedback keeps a dynamic translation state across language changes',()=>{
  assert.match(template,/resultState=\{key:'resultWaiting'/);
  assert.match(template,/function setResultState\(/);
  assert.match(template,/function renderResultState\(/);
  assert.doesNotMatch(template,/id="resultMessage"\s+data-i18n=/);
});

test('v0.3.0 adds reusable page-operation nodes without adding PDF semantics to Core',()=>{
  for(const type of ['delete-pages','duplicate-pages','insert-blank-page']) assert.match(template,new RegExp(`type:'${type}'`));
  assert.match(template,/function deletePageRefs\(/);
  assert.match(template,/function duplicatePageRefs\(/);
  assert.match(template,/function blankInsertionIndex\(/);
  assert.match(template,/node\.type==='delete-pages'/);
  assert.match(template,/node\.type==='duplicate-pages'/);
  assert.match(template,/node\.type==='insert-blank-page'/);
  assert.match(template,/kind:'blank'/);
  assert.match(template,/out\.addPage\(\[Number\(ref\.width\)/);
  assert.doesNotMatch(core,/delete-pages|duplicate-pages|insert-blank-page|blankPageFromNeighbor/);
});

test('v0.3.0 keeps Select Pages compatible while clarifying reorder behavior',()=>{
  assert.match(template,/type:'select-pages'/);
  assert.match(template,/nodeSelect:'ページ選択・並べ替え'/);
  assert.match(template,/nodeSelect:'Select \/ Reorder'/);
  assert.match(template,/3,1,2/);
});



test('v0.4.0 adds Split branching and 2-6 input Merge without PDF semantics in Core',()=>{
  assert.match(template,/type:'split-pages'/);
  assert.match(template,/id:'selected',direction:'output',dataType:'pages'/);
  assert.match(template,/id:'rest',direction:'output',dataType:'pages'/);
  assert.match(template,/function splitPageRefs\(/);
  assert.match(template,/function mergeInputCount\(/);
  assert.match(template,/function mergeInputPortIds\(/);
  assert.match(template,/inputCount:3/);
  assert.match(template,/count>=2&&count<=6/);
  assert.match(template,/edge\.source\.portId/);
  assert.doesNotMatch(core,/split-pages|mergeInputCount|splitPageRefs/);
});

test('v0.4.0 safely disconnects removed Merge ports as one graph edit',()=>{
  assert.match(template,/function setMergeInputCount\(/);
  assert.match(template,/confirmMergeInputReduction/);
  assert.match(template,/type:'edge\.remove'/);
  assert.match(template,/canvas\.dispatchMany\(changes/);
});


test('v0.5.0 previews intermediate node output locally without adding a renderer dependency',()=>{
  assert.match(template,/function renderPreviewSection\(/);
  assert.match(template,/function renderPreviewPages\(/);
  assert.match(template,/function createPageEvaluator\(/);
  assert.match(template,/function materializePageRefs\(/);
  assert.match(template,/previewPortsForNode/);
  assert.match(template,/previewPortByNode/);
  assert.match(template,/frame\.src=`\$\{url\}#toolbar=0/);
  assert.match(dist,/frame-src blob:/);
  assert.match(dist,/connect-src 'none'/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,'dependencies.json'),'utf8')).dependencies.length,1);
});

test('v0.5.0 uses SVG icon controls for canvas display helpers',()=>{
  for(const id of ['expandButton','helperButton','gridButton','miniMapButton']){
    const button=template.match(new RegExp(`<button[^>]*id="${id}"[\\s\\S]*?<\\/button>`))?.[0]||'';
    assert.match(button,/<svg /,`${id} should contain SVG`);
    assert.match(button,/aria-label=/,`${id} should have an accessible label`);
    assert.doesNotMatch(button,/data-i18n=/,`${id} should not replace its SVG with translated text`);
  }
  assert.match(template,/setAttribute\('aria-label',helperLabel\)/);
  assert.match(template,/setAttribute\('aria-label',gridLabel\)/);
});

test('product copy explains reusable workflows in Japanese and English',()=>{
  assert.match(template,/よく使うPDF処理はRecipeとしてこのブラウザーに登録し、別のPDFへそのまま繰り返し使えます/);
  assert.match(template,/Register frequently used PDF processing as a Recipe in this browser, then reuse it with other files/);
});
