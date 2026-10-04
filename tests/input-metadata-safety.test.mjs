import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import Core from '../src/vendor/node-editor-core.mjs';

const source=fs.readFileSync(new URL('../src/index.template.html',import.meta.url),'utf8');
function extractFunction(name){
  const start=source.indexOf(`function ${name}(`);
  assert.notEqual(start,-1,`missing ${name}`);
  const brace=source.indexOf('{',source.indexOf(')',start));
  let depth=0;
  for(let i=brace;i<source.length;i++){
    if(source[i]==='{')depth++;
    else if(source[i]==='}'&&--depth===0)return source.slice(start,i+1);
  }
  throw new Error(`unterminated ${name}`);
}

// A minimal DOM records the actual production renderer's text and markup sinks.
// Browser execution is checked separately; these tests forbid HTML parsing entirely.
function renderMetadata(pageCount,{filename='input.pdf',info=null,error=null}={}){
  const htmlWrites=[];
  class Element{
    constructor(tag){this.tag=tag;this.children=[];this.style={};this.textContent='';}
    append(...children){this.children.push(...children);}
    addEventListener(){}
    set innerHTML(value){htmlWrites.push(value);}
  }
  const context={document:{createElement:tag=>new Element(tag)},
    fileStore:new Map(info?[['input',info]]:[]),inputErrors:new Map(error?[['input',error]]:[]),
    t:key=>key,formatBytes:size=>`${size} bytes`};
  vm.createContext(context);
  for(const name of ['escapeHtml','normalizePageCountMetadata','renderInputInspector']){
    if(source.includes(`function ${name}(`))vm.runInContext(extractFunction(name),context);
  }
  const root=new Element('root');
  context.renderInputInspector(root,{id:'input',data:{filename,pageCount}});
  assert.deepEqual(htmlWrites,[],'input metadata must never enter an HTML parsing sink');
  const meta=root.children.find(child=>child.className==='meta-box');
  return meta.children.map(row=>row.children[1].textContent);
}

const payload='<img src=x onerror="globalThis.injected=true"><script>globalThis.injected=true</script>';
for(const value of [payload,'12','',NaN,Infinity,-Infinity,-1,1.5,Number.MAX_SAFE_INTEGER+1,null,undefined,{},[],true]){
  test(`invalid page-count metadata ${String(value)} displays unknown`,()=>{
    assert.equal(renderMetadata(value)[1],'—');
  });
}
for(const value of [0,1,12,Number.MAX_SAFE_INTEGER]){
  test(`valid page-count metadata ${value} retains its display`,()=>{
    assert.equal(renderMetadata(value)[1],value===0?'—':String(value));
  });
}
test('loaded PDF count overrides malicious or stale imported metadata',()=>{
  assert.deepEqual(renderMetadata(payload,{info:{name:'loaded.pdf',pageCount:3,size:123}}),['loaded.pdf','3','123 bytes']);
  assert.equal(renderMetadata(999,{info:{name:'loaded.pdf',pageCount:3,size:123}})[1],'3');
});
test('filenames and load-error names containing markup remain literal text',()=>{
  assert.equal(renderMetadata(2,{filename:payload})[0],payload);
  assert.equal(renderMetadata(2,{error:{name:payload,message:payload}})[0],payload);
});

for(const value of [payload,'12',-1,1.5,Number.MAX_SAFE_INTEGER+1,4]){
  test(`Pipeline JSON import safely renders page-count metadata ${String(value)}`,()=>{
    const graph=Core.createGraph({appId:'pdf-pipeline-builder',nodes:[Core.createNode({id:'input',type:'pdf-input',data:{filename:'imported.pdf',pageCount:value}})]});
    const restored=Core.deserializeGraph(Core.serializeGraph(graph));
    assert.equal(restored.nodes[0].data.filename,'imported.pdf');
    assert.equal(renderMetadata(restored.nodes[0].data.pageCount)[1],value===4?'4':'—');
  });
}
