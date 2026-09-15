import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const template=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');
const coreSource=fs.readFileSync(path.join(root,'src/vendor/node-editor-core.mjs'),'utf8');

function extractFunction(name){
  const marker=`function ${name}`;
  const start=template.indexOf(marker);
  assert.notEqual(start,-1,`${name} should exist`);
  const brace=template.indexOf('{',start);
  let depth=0;
  for(let i=brace;i<template.length;i++){
    if(template[i]==='{')depth++;
    else if(template[i]==='}'){
      depth--;
      if(depth===0)return template.slice(start,i+1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

test('v0.7.0 exposes a local Recipe library and keeps portable Pipeline JSON',()=>{
  assert.match(template,/id="recipeButton"/);
  assert.match(template,/id="recipeDialog"/);
  assert.match(template,/RECIPE_STORAGE_KEY='browser-kitty\.pdf-pipeline-builder\.recipes\.v1'/);
  assert.match(template,/localStorage\.setItem\(RECIPE_STORAGE_KEY/);
  assert.match(template,/id="saveGraphButton"/);
  assert.match(template,/id="loadGraphButton"/);
  assert.match(template,/Recipeライブラリ/);
  assert.match(template,/Recipe library/);
});

test('Recipe graph removes source file metadata before persistence',()=>{
  assert.match(template,/function recipeGraphFromCurrent\(\)/);
  assert.match(template,/node\.type==='pdf-input'/);
  assert.match(template,/filename:'',pageCount:0/);
  assert.doesNotMatch(coreSource,/RECIPE_STORAGE_KEY|Recipe library|recipeGraphFromCurrent/);
});

test('Recipe management includes save, same-name overwrite, update, load, delete, and a bounded library',()=>{
  assert.match(template,/const RECIPE_LIMIT=30/);
  for(const fn of ['saveRecipe','updateRecipe','loadRecipe','deleteRecipe']) assert.match(template,new RegExp(`function ${fn}\\(`));
  assert.match(template,/confirmRecipeOverwrite/);
  assert.match(template,/confirmRecipeUpdate/);
  assert.match(template,/confirmRecipeDelete/);
  assert.match(template,/canvas\.isDirty\(\)/);
  assert.match(template,/canvas\.setGraph\(graph,\{preserveSelection:false,resetHistory:true,markSaved:true\}\)/);
});

test('Recipe persistence code does not introduce network APIs',()=>{
  const recipeCode=['readRecipes','writeRecipes','saveRecipe','updateRecipe','loadRecipe','deleteRecipe'].map(extractFunction).join('\n');
  assert.doesNotMatch(recipeCode,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/);
});
