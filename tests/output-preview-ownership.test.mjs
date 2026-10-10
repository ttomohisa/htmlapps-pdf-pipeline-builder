import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(process.env.PDF_PIPELINE_TEST_HTML||new URL('../src/index.template.html',import.meta.url),'utf8');
const line=name=>source.split('\n').find(l=>l.startsWith(`    async function ${name}(`));
function harness(){
 const ctx=vm.createContext({console:{error(){}},Uint8Array});
 vm.runInContext(`let outputPreviewRequestId=0,outputPreviewLoadingTask=null,outputPreviewDoc=null,outputPreviewRenderTask=null,outputPreviewPage=1,outputPreviewOpener=null;const elements=new Map(),opened=[],toasts=[];const document={activeElement:null,otherDialogOpen:false,querySelector(){return this.otherDialogOpen||[...elements.values()].some(e=>e.open)?{}:null}};const getComputedStyle=e=>({visibility:e.visibility});const $=id=>{if(!elements.has(id))elements.set(id,{id,style:{},open:false,events:{},isConnected:true,disabled:false,visible:true,visibility:'visible',focusCalls:0,getClientRects(){return this.visible?[{}]:[]},focus(){this.focusCalls++;document.activeElement=this},addEventListener(name,fn){this.events[name]=fn},setAttribute(){},showModal(){this.open=true;document.activeElement=this},close(){this.open=false;document.activeElement=null},getContext:()=>({clearRect(){}})});return elements.get(id)};const t=k=>k,formatBytes=n=>n;const showToast=(...args)=>toasts.push(args);const openPdfJsDocument=()=>new Promise((resolve,reject)=>opened.push({resolve,reject}));let rendered=0;const renderOutputPreviewPage=async()=>rendered++;`+line('closeOutputPreview')+'\n'+line('openOutputPreview')+'\n'+(source.split('\n').find(l=>l.includes("$('#outputPreviewDialog').addEventListener('cancel'"))||''),ctx);
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

test('ellipsized output metadata retains its full unbroken Unicode filename and title',async()=>{
 const run=harness(),filename='長い合成ファイル名🧪'.repeat(256)+'.pdf';
 await run(`(async()=>{const opening=openOutputPreview(new Uint8Array([1,2]),${JSON.stringify(filename)},2);await Promise.resolve();opened[0].resolve({loadingTask:{destroy:async()=>{}},doc:{name:'Unicode'}});await opening})()`);
 const expected=filename+' · 2 pageUnit · 2';
 assert.equal(run("$('#outputPreviewMeta').textContent"),expected);
 assert.equal(run("$('#outputPreviewMeta').title"),expected);
});

async function openWithOpener(run,name='A',opener='#recipeUse'){
 await run(`(async()=>{const count=opened.length;const opening=openOutputPreview(new Uint8Array([1]),'${name}.pdf',1,$('${opener}'));for(let i=0;i<10&&opened.length===count;i++)await Promise.resolve();if(opened.length!==count+1)throw Error('preview did not request a document');opened.at(-1).resolve({loadingTask:{destroy:async()=>{}},doc:{name:'${name}'}});await opening})()`);
}
test('closing output preview restores the explicit Quick Recipe opener',async()=>{
 const run=harness();await openWithOpener(run);await run('closeOutputPreview()');
 assert.equal(run('document.activeElement'),run("$('#recipeUse')"));
});
test('native Escape restores the explicit output-preview opener',async()=>{
 const run=harness();await openWithOpener(run);
 await run("$('#outputPreviewDialog').events.cancel({preventDefault(){}})");
 assert.equal(run('document.activeElement'),run("$('#recipeUse')"));
});
test('opening a replacement output preview does not focus the previous opener',async()=>{
 const run=harness();await openWithOpener(run,'A','#oldUse');await openWithOpener(run,'B','#newUse');
 assert.equal(run("$('#oldUse').focusCalls"),0);
 await run('closeOutputPreview()');assert.equal(run('document.activeElement'),run("$('#newUse')"));
});
for(const state of ["isConnected=false","disabled=true","visible=false","visibility='hidden'"]){
 test(`output preview skips an unavailable opener: ${state}`,async()=>{
  const run=harness();await openWithOpener(run);run("$('#recipeUse')."+state);await run('closeOutputPreview()');
  assert.equal(run("$('#recipeUse').focusCalls"),0);
 });
}
test('output close does not take focus from another native dialog',async()=>{
 const run=harness();await openWithOpener(run);run('document.otherDialogOpen=true');await run('closeOutputPreview()');
 assert.equal(run("$('#recipeUse').focusCalls"),0);
});
test('repeated close cannot refocus an already closed preview opener',async()=>{
 const run=harness();await openWithOpener(run);await run('closeOutputPreview()');run('document.activeElement=null');await run('closeOutputPreview()');
 assert.equal(run('document.activeElement'),null);assert.equal(run("$('#recipeUse').focusCalls"),1);
});
test('late close cleanup cannot steal focus from a newer open preview',async()=>{
 const run=harness();await openWithOpener(run,'A','#oldUse');
 await run(`(async()=>{let finish;outputPreviewLoadingTask={destroy:()=>new Promise(r=>finish=r)};const closing=closeOutputPreview();const opening=openOutputPreview(new Uint8Array([2]),'B.pdf',1,$('#newUse'));await Promise.resolve();opened.at(-1).resolve({loadingTask:{destroy:async()=>{}},doc:{name:'B'}});await opening;finish();await closing})()`);
 assert.equal(run('document.activeElement'),run("$('#outputPreviewDialog')"));
 assert.equal(run("$('#oldUse').focusCalls"),1);assert.equal(run("$('#newUse').focusCalls"),0);
});
