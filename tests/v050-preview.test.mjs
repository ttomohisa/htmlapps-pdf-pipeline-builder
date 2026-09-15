import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const template=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');

function extractFunction(name){
  const marker=`function ${name}`;
  const start=template.indexOf(marker);
  assert.notEqual(start,-1,`missing ${name}`);
  const closeParen=template.indexOf(')',start);
  const brace=template.indexOf('{',closeParen+1);
  let depth=0;
  for(let i=brace;i<template.length;i++){
    if(template[i]==='{')depth++;
    else if(template[i]==='}'){
      depth--;
      if(depth===0)return template.slice(start,i+1);
    }
  }
  throw new Error(`unterminated ${name}`);
}

function pdfContext(){
  const context={console,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,setTimeout,clearTimeout};
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'src/vendor/pdf-lib.min.js'),'utf8'),context);
  for(const name of ['normalizeRotation','pageVisualRotation','visualPageSize','visualToRawPoint','positionedBaseline']) vm.runInContext(extractFunction(name),context);
  vm.runInContext('async '+extractFunction('drawPageOverlays'),context);
  vm.runInContext('async '+extractFunction('materializePageRefs'),context);
  return context;
}

test('preview materializer creates valid one-page/local preview PDFs from intermediate refs',async()=>{
  const ctx=pdfContext();
  const source=await ctx.PDFLib.PDFDocument.load(new Uint8Array(fs.readFileSync(path.join(root,'tests-fixtures/a.pdf'))));
  ctx.source=source;
  ctx.refs=[
    {kind:'source',sourceNodeId:'input-1',index:2,rotation:90},
    {kind:'blank',width:300,height:400,rotation:180},
    {kind:'source',sourceNodeId:'input-1',index:0,rotation:0},
  ];
  const bytes=await vm.runInContext(`materializePageRefs(refs,async()=>source)`,ctx);
  const out=await ctx.PDFLib.PDFDocument.load(bytes);
  assert.equal(out.getPageCount(),3);
  assert.equal(out.getPage(0).getRotation().angle,90);
  assert.deepEqual([out.getPage(1).getWidth(),out.getPage(1).getHeight()],[300,400]);
  assert.equal(out.getPage(1).getRotation().angle,180);
  assert.equal(out.getPage(2).getRotation().angle,0);
});

function evaluatorContext(graph,loadedFiles){
  const context={console,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,Map,Set,Math,Number,String,Array,Object,Error};
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'src/vendor/pdf-lib.min.js'),'utf8'),context);
  context.fileStore=new Map(loadedFiles);
  context.OVERLAY_POSITIONS=['top-left','top-center','top-right','bottom-left','bottom-center','bottom-right'];
  context.STAMP_TEXTS=['DRAFT','CONFIDENTIAL','COPY','INTERNAL','SAMPLE','APPROVED'];
  context.canvas={getGraph:()=>graph,setRuntimeStatus:()=>{}};
  context.Core={getNode:(g,id)=>g.nodes.find(node=>node.id===id)||null};
  context.t=(key)=>key;
  for(const name of ['isAsciiOverlayText','parsePageOrder','pageIndexSet','splitPageRefs','deletePageRefs','duplicatePageRefs','blankInsertionIndex','incomingFor','mergeInputCount','mergeInputPortIds','normalizeRotation','pageVisualRotation','appendOverlay','formatPageNumber']){
    vm.runInContext(extractFunction(name),context);
  }
  vm.runInContext(extractFunction('createPageEvaluator'),context);
  return context;
}

test('intermediate preview evaluates only the selected upstream path',async()=>{
  const bytes=new Uint8Array(fs.readFileSync(path.join(root,'tests-fixtures/a.pdf')));
  const graph={nodes:[
    {id:'input-a',type:'pdf-input',data:{}},
    {id:'select-a',type:'select-pages',data:{range:'3,1'}},
    {id:'rotate-a',type:'rotate-pages',data:{degrees:90}},
    {id:'output-a',type:'pdf-output',data:{filename:'out.pdf'}},
    {id:'unrelated-missing',type:'pdf-input',data:{}}
  ],edges:[
    {source:{nodeId:'input-a',portId:'pages'},target:{nodeId:'select-a',portId:'in'}},
    {source:{nodeId:'select-a',portId:'out'},target:{nodeId:'rotate-a',portId:'in'}},
    {source:{nodeId:'rotate-a',portId:'out'},target:{nodeId:'output-a',portId:'in'}}
  ]};
  const ctx=evaluatorContext(graph,[['input-a',{bytes}]]);
  const evaluator=vm.runInContext(`createPageEvaluator({updateRuntime:false})`,ctx);
  const refs=await evaluator.evalNode('rotate-a','out');
  assert.deepEqual(Array.from(refs,ref=>[ref.index,ref.rotation]),[[2,90],[0,90]]);
});

test('Split intermediate preview exposes Selected and Rest independently',async()=>{
  const bytes=new Uint8Array(fs.readFileSync(path.join(root,'tests-fixtures/a.pdf')));
  const graph={nodes:[
    {id:'input-a',type:'pdf-input',data:{}},
    {id:'split-a',type:'split-pages',data:{range:'2,1'}}
  ],edges:[
    {source:{nodeId:'input-a',portId:'pages'},target:{nodeId:'split-a',portId:'in'}}
  ]};
  const ctx=evaluatorContext(graph,[['input-a',{bytes}]]);
  const evaluator=vm.runInContext(`createPageEvaluator({updateRuntime:false})`,ctx);
  const selected=await evaluator.evalNode('split-a','selected');
  const rest=await evaluator.evalNode('split-a','rest');
  assert.deepEqual(Array.from(selected,ref=>ref.index),[1,0]);
  assert.deepEqual(Array.from(rest,ref=>ref.index),[2]);
});
