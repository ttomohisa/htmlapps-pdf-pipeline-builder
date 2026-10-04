import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { assertNoNetworkCalls } from './helpers/runtime-contract.mjs';

const source=fs.readFileSync(new URL('../src/index.template.html',import.meta.url),'utf8');
const dist=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');

function embeddedContext(){
  const context={atob,Uint8Array,Blob,Response,DecompressionStream,URL,console};
  context.window={addEventListener(){}};
  vm.createContext(context);
  // Exercise the actual generated asset loader, including gzip and byte caching.
  const start=dist.indexOf('    const BUILD_MANIFEST=');
  const end=dist.indexOf("    if(typeof Promise.withResolvers",start);
  assert.ok(start>=0&&end>start);
  vm.runInContext(dist.slice(start,end),context);
  context.StandaloneAssets=context.window.StandaloneAssets;
  const factoryStart=source.indexOf('    const PDFJS_CMAP_ASSETS=');
  const factoryEnd=source.indexOf('    async function ensurePdfJs',factoryStart);
  vm.runInContext(source.slice(factoryStart,factoryEnd)+';globalThis.factory=new EmbeddedPdfBinaryDataFactory()',context);
  return context;
}

test('PDF.js binary resource factory returns embedded CMaps and rejects every unsupported resource',async()=>{
  const context=embeddedContext();
  const expected={
    'UniJIS-UCS2-H.bcmap':'ad2352f40870880fbf7f8ee5abadff743fbd025fbf9830b8ada472d1c5e4da0b',
    'Adobe-Japan1-UCS2.bcmap':'66c5d0dc4964f4093e77b194023f3a0f689324028ec8330e1e1d0570bcba7c2f'
  };
  for(const [filename,sha256] of Object.entries(expected)){
    const bytes=await context.factory.fetch({kind:'cMapUrl',filename});
    assert.equal(createHash('sha256').update(bytes).digest('hex'),sha256);
  }
  for(const request of [undefined,{kind:'fontUrl',filename:'font.pfb'},{kind:'cMapUrl',filename:'unknown.bcmap'},{kind:'cMapUrl',filename:'https://example.invalid/map'},{kind:'cMapUrl',filename:'../UniJIS-UCS2-H.bcmap'}]){
    await assert.rejects(()=>context.factory.fetch(request),/unavailable/);
  }
});

test('network source guard still detects calls in the embedded-resource method and elsewhere',()=>{
  assertNoNetworkCalls(source);
  for(const call of ['fetch("https://example.invalid")','window.fetch("https://example.invalid")','new XMLHttpRequest()','new WebSocket("wss://example.invalid")','navigator.sendBeacon("https://example.invalid", "data")']){
    assert.throws(()=>assertNoNetworkCalls(source+';'+call));
    assert.throws(()=>assertNoNetworkCalls(source.replace("return StandaloneAssets.bytesAsync('pdfjs',assetKey)",call)));
  }
});

test('Japanese and English reusable-workflow messages resolve without exposing untranslated keys',()=>{
  const start=source.indexOf('    const messages=');
  const end=source.indexOf('    const AppConfirm=',start);
  assert.ok(start>=0&&end>start);
  const context={language:'ja'};vm.createContext(context);
  vm.runInContext(source.slice(start,end)+';globalThis.translate=t',context);
  for(const key of ['introBody','helpCoreBody','recipeLead','recipeStorageNote']){
    context.language='ja';const ja=context.translate(key);
    context.language='en';const en=context.translate(key);
    assert.notEqual(ja,key);assert.notEqual(en,key);assert.notEqual(ja,en);
    assert.ok(ja.length>0&&en.length>0);
  }
});
