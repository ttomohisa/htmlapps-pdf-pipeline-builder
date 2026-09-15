import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import Core from '../src/vendor/node-editor-core.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const template=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');

function extractFunction(name){
  const marker=`function ${name}`;
  const start=template.indexOf(marker);
  assert.notEqual(start,-1,`missing ${name}`);
  const brace=template.indexOf('{',start);
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

function appHelpers(){
  const context={result:null,t:(key,params={})=>`${key}:${JSON.stringify(params)}`};
  vm.createContext(context);
  const source=[
    extractFunction('parsePageOrder'),
    extractFunction('splitPageRefs'),
    extractFunction('mergeInputCount'),
    extractFunction('mergeInputPortIds')
  ].join('\n');
  vm.runInContext(source,context);
  return context;
}

test('Split uses expression order for selected and original order for rest',()=>{
  const ctx=appHelpers();
  const pages=['P1','P2','P3','P4'];
  const split=vm.runInContext(`splitPageRefs(${JSON.stringify(pages)},'3,1')`,ctx);
  assert.deepEqual(Array.from(split.selected),['P3','P1']);
  assert.deepEqual(Array.from(split.rest),['P2','P4']);
});

test('old Merge data defaults to two inputs while v0.4.0 supports up to six',()=>{
  const ctx=appHelpers();
  assert.equal(vm.runInContext(`mergeInputCount({data:{}})`,ctx),2);
  assert.deepEqual(Array.from(vm.runInContext(`mergeInputPortIds({data:{inputCount:4}})`,ctx)),['a','b','c','d']);
  assert.equal(vm.runInContext(`mergeInputCount({data:{inputCount:99}})`,ctx),6);
});

test('dynamic Merge ports participate in required-port validation',()=>{
  const registry=new Core.NodeRegistry();
  const mergeInputCount=node=>Math.min(6,Math.max(2,Math.trunc(Number(node?.data?.inputCount??2)||2)));
  const mergeInputPortIds=node=>['a','b','c','d','e','f'].slice(0,mergeInputCount(node));
  registry.register({type:'source',getPorts:()=>[{id:'pages',direction:'output',dataType:'pages',required:true}]});
  registry.register({type:'merge-pages',createDefaultData:()=>({inputCount:2}),getPorts:node=>[...mergeInputPortIds(node).map(id=>({id,direction:'input',dataType:'pages',required:true,maxConnections:1})),{id:'out',direction:'output',dataType:'pages',required:true}]});
  registry.register({type:'sink',getPorts:()=>[{id:'in',direction:'input',dataType:'pages',required:true,maxConnections:1}]});

  const nodes=[
    registry.create('source',{id:'a'}),registry.create('source',{id:'b'}),registry.create('source',{id:'c'}),
    registry.create('merge-pages',{id:'m',data:{inputCount:3}}),registry.create('sink',{id:'o'})
  ];
  const edges=[
    Core.createEdge({id:'ea',source:{nodeId:'a',portId:'pages'},target:{nodeId:'m',portId:'a'}}),
    Core.createEdge({id:'eb',source:{nodeId:'b',portId:'pages'},target:{nodeId:'m',portId:'b'}}),
    Core.createEdge({id:'ec',source:{nodeId:'c',portId:'pages'},target:{nodeId:'m',portId:'c'}}),
    Core.createEdge({id:'eo',source:{nodeId:'m',portId:'out'},target:{nodeId:'o',portId:'in'}})
  ];
  const graph=Core.createGraph({appId:'pdf-pipeline-builder',nodes,edges});
  assert.equal(Core.validateGraph(graph,{registry}).length,0);
  const missingC=Core.createGraph({appId:'pdf-pipeline-builder',nodes,edges:edges.filter(edge=>edge.id!=='ec')});
  assert.ok(Core.validateGraph(missingC,{registry}).some(issue=>issue.code==='REQUIRED_TARGET_PORT'&&issue.path.endsWith('.c')));
});
