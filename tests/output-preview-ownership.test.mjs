import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(process.env.PDF_PIPELINE_TEST_HTML||new URL('../src/index.template.html',import.meta.url),'utf8');
const line=name=>source.split('\n').find(l=>l.startsWith(`    async function ${name}(`));
function harness(){
 const ctx=vm.createContext({console:{error(){}},Uint8Array});
 vm.runInContext(`let outputPreviewRequestId=0,outputPreviewLoadingTask=null,outputPreviewDoc=null,outputPreviewRenderTask=null,outputPreviewPage=1;const elements=new Map(),opened=[],toasts=[];const $=id=>{if(!elements.has(id))elements.set(id,{style:{},open:false,events:{},addEventListener(name,fn){this.events[name]=fn},setAttribute(){},showModal(){this.open=true},close(){this.open=false},getContext:()=>({clearRect(){}})});return elements.get(id)};const t=k=>k,formatBytes=n=>n;const showToast=(...args)=>toasts.push(args);const openPdfJsDocument=()=>new Promise((resolve,reject)=>opened.push({resolve,reject}));let rendered=0;const renderOutputPreviewPage=async()=>rendered++;`+line('closeOutputPreview')+'\n'+line('openOutputPreview')+'\n'+(source.split('\n').find(l=>l.includes("$('#outputPreviewDialog').addEventListener('cancel'"))||''),ctx);
 return text=>vm.runInContext(text,ctx);
}
test('closed output preview discards and destroys a late document',async()=>{
 const run=harness();await run(`(async()=>{const opening=openOutputPreview(new Uint8Array([1]),'A.pdf',1);await Promise.resolve();await closeOutputPreview();let destroyed=0;opened[0].resolve({loadingTask:{destroy:async()=>destroyed++},doc:{name:'A'}});await opening;if(destroyed!==1)throw Error('stale PDF.js task leaked')})()`);
 assert.equal(run('outputPreviewDoc'),null);assert.equal(run('rendered'),0);assert.equal(run("$('#outputPreviewDialog').open"),false);
});
test('late close cleanup cannot blank or close a newer preview',async()=>{
 const run=harness();await run(`(async()=>{let finish;outputPreviewLoadingTask={destroy:()=>new Promise(r=>finish=r)};const closing=closeOutputPreview();const opening=openOutputPreview(new Uint8Array([2]),'B.pdf',1);await Promise.resolve();opened[0].resolve({loadingTask:{destroy:async()=>{}},doc:{name:'B'}});await opening;$('#outputPreviewCanvas').width=800;finish();await closing})()`);
 assert.equal(run("$('#outputPreviewDialog').open"),true);assert.equal(run("$('#outputPreviewCanvas').width"),800);assert.equal(run('outputPreviewDoc.name'),'B');
});
test('late rejected preview cannot surface an obsolete error',async()=>{
 const run=harness();await run(`(async()=>{const opening=openOutputPreview(new Uint8Array([1]),'A.pdf',1);await Promise.resolve();await closeOutputPreview();opened[0].reject(Error('stale'));await opening})()`);
 assert.equal(run('toasts.length'),0);
});

test('native Escape invalidates a pending preview and releases its late PDF.js task',async()=>{
 const run=harness();await run(`(async()=>{const opening=openOutputPreview(new Uint8Array([1]),'A.pdf',1);await Promise.resolve();const cancel=$('#outputPreviewDialog').events.cancel;if(!cancel)throw Error('native cancel does not clean up');let prevented=false;cancel({preventDefault(){prevented=true}});if(!prevented)throw Error('unowned native close');let destroyed=0;opened[0].resolve({loadingTask:{destroy:async()=>destroyed++},doc:{name:'A'}});await opening;if(destroyed!==1)throw Error('stale PDF.js task leaked')})()`);
 assert.equal(run('outputPreviewDoc'),null);assert.equal(run("$('#outputPreviewDialog').open"),false);
});
