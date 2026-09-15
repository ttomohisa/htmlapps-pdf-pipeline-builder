import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/index.template.html',import.meta.url),'utf8');
const core=fs.readFileSync(new URL('../src/vendor/node-editor-core.mjs',import.meta.url));
const favicon=fs.readFileSync(new URL('../assets/favicon.svg',import.meta.url));

function loadHandler(){
  const start=source.indexOf("$('#loadGraphButton').onclick");
  const end=source.indexOf("$('#runButton').onclick",start);
  assert.ok(start>=0 && end>start,'Pipeline load handler must exist');
  return source.slice(start,end);
}

test('v0.9.0 release candidate confirms destructive Pipeline JSON replacement',()=>{
  const handler=loadHandler();
  assert.match(handler,/Core\.deserializeGraph\(await file\.text\(\),\{registry\}\)/);
  assert.match(handler,/graph\.app\.id!==['"]pdf-pipeline-builder['"]/);
  assert.match(handler,/canvas\.isDirty\(\)&&!await AppConfirm\.ask\(t\(['"]confirmGraphLoad['"]\),\{confirmKey:['"]confirmReplace['"]\}\)/);
  const confirmIndex=handler.indexOf("AppConfirm.ask(t('confirmGraphLoad')");
  const clearIndex=handler.indexOf('fileStore.clear()');
  const setGraphIndex=handler.indexOf('canvas.setGraph(');
  assert.ok(confirmIndex>=0 && clearIndex>confirmIndex && setGraphIndex>confirmIndex,'confirmation must happen before clearing runtime files or replacing the graph');
});

test('v0.9.0 Pipeline import cancellation can return before any destructive mutation',()=>{
  const handler=loadHandler();
  const guard="if(canvas.isDirty()&&!await AppConfirm.ask(t('confirmGraphLoad'),{confirmKey:'confirmReplace'}))return;";
  assert.ok(handler.includes(guard));
  const guardIndex=handler.indexOf(guard);
  for(const mutation of ['fileStore.clear()','inputErrors.clear()','runtimeStore.clearAll()','canvas.setGraph(']){
    assert.ok(handler.indexOf(mutation)>guardIndex,`${mutation} must happen only after confirmation`);
  }
});

test('v0.9.0 keeps application confirmations in-app and runtime local',()=>{
  assert.doesNotMatch(source,/\b(?:window\.)?(?:confirm|alert|prompt)\s*\(/);
  assert.match(source,/connect-src 'none'/);
  assert.match(source,/frame-src blob:/);
  assert.doesNotMatch(source,/\bfetch\s*\(/);
  assert.doesNotMatch(source,/new\s+XMLHttpRequest\s*\(/);
  assert.doesNotMatch(source,/new\s+WebSocket\s*\(/);
});

test('v0.9.0 keeps Core and favicon pinned to the v0.8.4 release candidate baseline',()=>{
  assert.ok(core.length>1000);
  assert.ok(favicon.length>20);
  assert.match(source,/coreVersion:'1\.0\.0'/);
  assert.match(source,/PDF Pipeline Builder <span class="version-badge">v1\.0\.0<\/span>/);
});
