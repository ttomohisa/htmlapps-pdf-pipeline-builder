import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const template=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');
const core=fs.readFileSync(path.join(root,'src/vendor/node-editor-core.mjs'),'utf8');

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
  for(const name of ['isAsciiOverlayText','parsePageOrder','pageIndexSet','splitPageRefs','deletePageRefs','duplicatePageRefs','blankInsertionIndex','incomingFor','mergeInputCount','mergeInputPortIds','normalizeRotation','pageVisualRotation','appendOverlay','formatPageNumber']) vm.runInContext(extractFunction(name),context);
  vm.runInContext(extractFunction('createPageEvaluator'),context);
  return context;
}

function materializerContext(){
  const context={console,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,setTimeout,clearTimeout};
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'src/vendor/pdf-lib.min.js'),'utf8'),context);
  for(const name of ['normalizeRotation','pageVisualRotation','visualPageSize','visualToRawPoint','positionedBaseline']) vm.runInContext(extractFunction(name),context);
  vm.runInContext('async '+extractFunction('drawPageOverlays'),context);
  vm.runInContext('async '+extractFunction('materializePageRefs'),context);
  return context;
}

test('v0.6.0 registers document-processing nodes only in the app layer',()=>{
  for(const type of ['page-numbers','watermark-text','text-stamp']) assert.match(template,new RegExp(`type:'${type}'`));
  assert.match(template,/data-i18n="documentGroup"/);
  assert.match(template,/function drawPageOverlays\(/);
  assert.doesNotMatch(core,/page-numbers|watermark-text|text-stamp|drawPageOverlays/);
});

test('document node order preserves when decoration was applied relative to Rotate',async()=>{
  const bytes=new Uint8Array(fs.readFileSync(path.join(root,'tests-fixtures/a.pdf')));
  const graph={nodes:[
    {id:'input',type:'pdf-input',data:{}},
    {id:'number-before',type:'page-numbers',data:{format:'n-total',start:1,position:'bottom-center',fontSize:10,margin:22}},
    {id:'rotate',type:'rotate-pages',data:{degrees:90}},
    {id:'number-after',type:'page-numbers',data:{format:'n',start:10,position:'bottom-center',fontSize:10,margin:22}},
  ],edges:[
    {source:{nodeId:'input',portId:'pages'},target:{nodeId:'number-before',portId:'in'}},
    {source:{nodeId:'number-before',portId:'out'},target:{nodeId:'rotate',portId:'in'}},
    {source:{nodeId:'rotate',portId:'out'},target:{nodeId:'number-after',portId:'in'}},
  ]};
  const ctx=evaluatorContext(graph,[['input',{bytes}]]);
  const evaluator=vm.runInContext(`createPageEvaluator({updateRuntime:false})`,ctx);
  const refs=await evaluator.evalNode('number-after','out');
  assert.equal(refs[0].rotation,90);
  assert.deepEqual(Array.from(refs[0].overlays,overlay=>[overlay.type,overlay.text,overlay.rotation]),[
    ['page-number','1 / 3',0],
    ['page-number','10',90],
  ]);
});

test('materializer writes page number, watermark, and bordered stamp into local PDF bytes',async()=>{
  const ctx=materializerContext();
  ctx.refs=[{kind:'blank',width:420,height:595,baseRotation:0,rotation:0,overlays:[
    {type:'page-number',text:'1 / 1',position:'bottom-center',fontSize:10,margin:22,rotation:0},
    {type:'watermark',text:'CONFIDENTIAL',fontSize:42,opacity:.18,angle:0,rotation:0},
    {type:'stamp',text:'DRAFT',position:'top-right',fontSize:16,margin:24,opacity:.85,rotation:0},
  ]}];
  const bytes=await vm.runInContext(`materializePageRefs(refs,async()=>{throw new Error('not needed')})`,ctx);
  const output=path.join(os.tmpdir(),`pdf-pipeline-v060-${process.pid}.pdf`);
  const textFile=output+'.txt';
  try{
    fs.writeFileSync(output,Buffer.from(bytes));
    execFileSync('pdftotext',[output,textFile]);
    const text=fs.readFileSync(textFile,'utf8');
    assert.match(text,/1\s*\/\s*1/);
    assert.match(text,/CONFIDENTIAL/);
    assert.match(text,/DRAFT/);
  } finally {
    fs.rmSync(output,{force:true});fs.rmSync(textFile,{force:true});
  }
});

test('watermark input rejects non-ASCII text instead of corrupting output',()=>{
  const ctx={};vm.createContext(ctx);vm.runInContext(extractFunction('isAsciiOverlayText'),ctx);
  assert.equal(vm.runInContext(`isAsciiOverlayText('CONFIDENTIAL 2026')`,ctx),true);
  assert.equal(vm.runInContext(`isAsciiOverlayText('社外秘')`,ctx),false);
  assert.equal(vm.runInContext(`isAsciiOverlayText('')`,ctx),false);
});
