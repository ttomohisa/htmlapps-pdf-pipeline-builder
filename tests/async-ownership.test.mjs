import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const core=fs.readFileSync(new URL('../src/vendor/node-editor-core.mjs',import.meta.url),'utf8').replace('export default NodeEditorCore;','');

const source=fs.readFileSync(process.env.PDF_PIPELINE_TEST_HTML||new URL('../src/index.template.html',import.meta.url),'utf8');
const between=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start,`${a} / ${b}`);return source.slice(start,end)};
const line=name=>source.split('\n').find(l=>l.startsWith(`    function ${name}(`));
function harness({realEvaluator=false,materialize=false}={}){
  const context=vm.createContext({Uint8Array,Blob,setTimeout,clearTimeout,console:{error(){}},queueMicrotask});
  vm.runInContext(core+`;const Core=NodeEditorCore;
    const elements=new Map(),events={},toasts=[],downloads=[],statuses=[];
    const noop=()=>{}; const window={addEventListener:(name,fn)=>events[name]=fn};
    const $=id=>{if(!elements.has(id))elements.set(id,{disabled:false,style:{},value:'',textContent:'',open:false,files:[],focus(){},close(){this.open=false}});return elements.get(id)};
    const t=(key,params={})=>key+JSON.stringify(params);
    let confirmAnswer=true;const AppConfirm={ask:async()=>typeof confirmAnswer==='function'?confirmAnswer():confirmAnswer};
    const runtimeStore=new Core.RuntimeStatusStore();
    const renderInspector=noop,renderFileStatus=noop,syncMobileUi=noop,syncToolbar=noop,openMobileSheet=noop,closePreviewDialog=noop;
    let previewClosed=0;const closeOutputPreview=()=>{previewClosed++;return Promise.resolve()};
    const showToast=(...args)=>toasts.push(args),isMobileLayout=()=>false;
    let previewRequestId=0;let resultState='';const setResultState=state=>resultState=state;
    const downloadBlob=(blob,name)=>downloads.push({blob,name});
  `+between('    const fileStore=','    let resultState=')+between('    const OVERLAY_POSITIONS=','    const translator=')+'\n'+['mergeInputCount','mergeInputPortIds','linearGraph','mergeGraph','normalizeFilename','formatBytes','recipeGraphFromCurrent','suggestOutputFilename'].map(line).join('\n')+`
    let graph=linearGraph(),selection='rotate-1',history=new Core.GraphHistory();
    const canvas={getGraph:()=>graph,isDirty:()=>true,setRuntimeStatus:(...args)=>{statuses.push(args);runtimeStore.set(...args)},selectNode:id=>selection=id,openInspector:noop,focusFirstIssue:noop,fitView:noop,
      validateGraph:()=>{const issues=Core.validateGraph(graph,{registry});return{valid:!issues.length,firstIssue:issues[0]}},
      setGraph:g=>{graph=g},dispatch:(change)=>{history.capture(graph);graph=Core.applyChange(graph,change);graphChanged(graph,change,{source:'test'})},
      undo:()=>{graph=history.undo(graph).graph;graphChanged(graph,[],{source:'history-restore'})},redo:()=>{graph=history.redo(graph).graph;graphChanged(graph,[],{source:'history-restore'})}};
    let graphChanged=()=>invalidateOutput();const inputNodes=()=>graph.nodes.filter(n=>n.type==='pdf-input'),outputNodes=()=>graph.nodes.filter(n=>n.type==='pdf-output');
    let loads=[];const PDFLib={PDFDocument:{load:async bytes=>{loads.push(bytes[0]);if(bytes[0]===255)throw Error('bad PDF');return{getPageCount:()=>bytes[0],getPage:()=>({getRotation:()=>({angle:0})})}}}};
  `+between('    function updateNodeData(','    function renderNodeTexts(')+'\n'+(line('canSkipStep')||'')+'\n'+(line('toggleStep')||'')+'\n'+between('    async function attachPdfFile(','    function normalizePageCountMetadata(')+between('    async function applyRecipe(','    async function runQuickRecipe(')+`
    const quickRecipeFiles=new Map();let recipes=[];const readRecipes=()=>recipes;
    const quickRecipeFileMap=id=>quickRecipeFiles.get(id)||new Map();let previewResults=[];
    const openOutputPreview=(...args)=>previewResults.push(args);
  `+between('    async function runQuickRecipe(','    async function saveRecipe(')+`
    const pending=[];const controlledEvaluation=(...args)=>new Promise((resolve,reject)=>pending.push({resolve,reject,args}));
  `+(realEvaluator||materialize?between('    function parsePageOrder(','    function visualPageSize(')+between('    async function evaluatePipeline(','    $(\'#runButton\').onclick=async')+(materialize?between('    async function evaluateGraph(','    async function evaluatePipeline(')+`const materializePageRefs=async refs=>new Uint8Array([refs.length,refs[0].rotation]);`:`const evaluateGraph=controlledEvaluation;`):`const evaluatePipeline=controlledEvaluation,evaluateGraph=controlledEvaluation;`)+source.split('\n').find(l=>l.startsWith("    $('#runButton').onclick=async"))+'\n'+source.split('\n').find(l=>l.startsWith("    $('#savePdfButton').onclick="))+'\n'+source.split('\n').find(l=>l.startsWith("    $('#mergePresetButton').onclick=async"))+'\n'+source.split('\n').find(l=>l.includes("$('#loadGraphInput').onchange=async"))+`
    graphChanged=${source.slice(source.indexOf('onChange:(_graph,change,metadata)=>')+9,source.indexOf(',onConnectionResult:',source.indexOf('onChange:(_graph,change,metadata)=>')))};\n    ${source.split('\n').find(l=>l.includes("window.addEventListener('pagehide',()=>{graphReplacementRequestId"))||''}\n    const file=(name,value)=>({name,type:'application/pdf',arrayBuffer:async()=>new Uint8Array([value]).buffer});
    const result=(value,name='custom-review.pdf')=>({bytes:new Uint8Array([value]),filename:name,pageCount:value});
    const node=()=>Core.getNode(graph,'input-1');
    const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
  `,context);
  return script=>vm.runInContext(script,context);
}

test('late Run success cannot revive Save after a graph edit',async()=>{
  const run=harness();await run(`(async()=>{const running=$('#runButton').onclick();updateNodeData('select-1',{range:'last'});pending[0].resolve(result(3));await running})()`);
  assert.equal(run('outputBytes'),null);assert.equal(run("$('#savePdfButton').disabled"),true);assert.equal(run('resultState'),'resultWaiting');
});
test('reverse PDF completion keeps newer file bytes and matching metadata',async()=>{
  const run=harness();await run(`(async()=>{let finish;const a=file('A.pdf',1);a.arrayBuffer=()=>new Promise(r=>finish=r);const first=attachPdfFile(node(),a);await attachPdfFile(node(),file('B.pdf',2));finish(new Uint8Array([1]).buffer);await first})()`);
  assert.equal(run("fileStore.get('input-1').name"),'B.pdf');assert.equal(run("fileStore.get('input-1').bytes[0]"),2);assert.equal(run('node().data.filename'),'B.pdf');assert.equal(run('node().data.pageCount'),2);
});
test('late Run error and cleanup cannot overwrite a newer result or active run',async()=>{
  const run=harness();await run(`(async()=>{const first=$('#runButton').onclick();invalidateOutput();const second=$('#runButton').onclick();pending[0].reject(Error('stale'));await first;if(!$('#runButton').disabled)throw Error('stale cleanup enabled active Run');pending[1].resolve(result(2));await second})()`);
  assert.equal(run('outputBytes[0]'),2);assert.equal(run('resultState'),'done');assert.equal(run("$('#runButton').disabled"),false);
});
test('normal Run export preserves current custom filename and bytes',async()=>{
  const run=harness();await run(`(async()=>{const running=$('#runButton').onclick();pending[0].resolve(result(4,'review:approved.pdf'));await running;$('#savePdfButton').onclick()})()`);
  assert.equal(run('downloads[0].name'),'review:approved.pdf');assert.equal(run('outputBytes[0]'),4);assert.equal(run("$('#savePdfButton').disabled"),false);
});
test('failed replacement preserves the previous file and metadata',async()=>{
  const run=harness();await run(`(async()=>{await attachPdfFile(node(),file('valid.pdf',3));await attachPdfFile(node(),file('broken.pdf',255))})()`);
  assert.equal(run("fileStore.get('input-1').name"),'valid.pdf');assert.equal(run('node().data.filename'),'valid.pdf');assert.equal(run('node().data.pageCount'),3);
});
test('detach cancels pending file load while cancellation preserves source and output',async()=>{
  const run=harness();await run(`(async()=>{await attachPdfFile(node(),file('valid.pdf',3));outputBytes=new Uint8Array([8]);confirmAnswer=false;await clearPdfFile(node());if(outputBytes[0]!==8)throw Error('cancel lost output');let finish;const a=file('late.pdf',1);a.arrayBuffer=()=>new Promise(r=>finish=r);const loading=attachPdfFile(node(),a);confirmAnswer=true;await clearPdfFile(node());finish(new Uint8Array([1]).buffer);await loading})()`);
  assert.equal(run('fileStore.size'),0);assert.equal(run('node().data.filename'),'');
});
test('accepted Recipe replacement invalidates pending load even when input ID is reused',async()=>{
  const run=harness();await run(`(async()=>{let finish;const a=file('late.pdf',1);a.arrayBuffer=()=>new Promise(r=>finish=r);const loading=attachPdfFile(node(),a);await applyRecipe({name:'new',graph:linearGraph()});finish(new Uint8Array([1]).buffer);await loading})()`);
  assert.equal(run('fileStore.size'),0);assert.equal(run('node().data.filename'),'');
});
test('cancelled Recipe, JSON import, and preset preserve current source and generated output',async()=>{
  const run=harness();await run(`(async()=>{await attachPdfFile(node(),file('keep.pdf',3));outputBytes=new Uint8Array([8]);const before=graph;confirmAnswer=false;await applyRecipe({name:'new',graph:mergeGraph()});$('#loadGraphInput').files=[{text:async()=>Core.serializeGraph(mergeGraph())}];await $('#loadGraphInput').onchange();await $('#mergePresetButton').onclick();if(graph!==before||outputBytes[0]!==8)throw Error('cancel changed current state')})()`);
  assert.equal(run("fileStore.get('input-1').name"),'keep.pdf');
});
test('newer JSON import supersedes an older pending read',async()=>{
  const run=harness();await run(`(async()=>{let finish;$('#loadGraphInput').files=[{text:()=>new Promise(r=>finish=r)}];const old=$('#loadGraphInput').onchange();const current=Core.applyChange(linearGraph(),{type:'node.data',nodeId:'output-1',data:{filename:'newer.pdf'}});$('#loadGraphInput').files=[{text:async()=>Core.serializeGraph(current)}];await $('#loadGraphInput').onchange();finish(Core.serializeGraph(mergeGraph()));await old})()`);
  assert.equal(run("Core.getNode(graph,'output-1').data.filename"),'newer.pdf');
});
test('Run evaluates a source snapshot and ignores stale progress/runtime notifications',async()=>{
  const run=harness({realEvaluator:true});await run(`(async()=>{await attachPdfFile(node(),file('A.pdf',3));updateNodeData('output-1',{filename:'edited:report'});const running=$('#runButton').onclick();const call=pending[0];fileStore.set('input-1',{name:'B.pdf',bytes:new Uint8Array([2])});if(call.args[1].get('input-1').name!=='A.pdf')throw Error('not a source snapshot');invalidateOutput();const before=statuses.length;call.args[2].runtimeTarget.setRuntimeStatus('rotate-1','success');call.args[2].onProgress(1,1);if(statuses.length!==before||$('#progressBar').style.width!=='0%')throw Error('stale progress');call.resolve(result(3));await running})()`);
  assert.equal(run('outputBytes'),null);
});
test('Quick Recipe and Canvas Run share exclusive output ownership',async()=>{
  const run=harness();await run(`(async()=>{recipes=[{id:'r',name:'Saved',graph:linearGraph()}];quickRecipeFiles.set('r',new Map([['input-1',file('recipe.pdf',3)]]));const quick=runQuickRecipe('r',$('#recipeRun'));await tick();const normal=$('#runButton').onclick();pending[1].resolve(result(2));await normal;pending[0].resolve(result(3));await quick})()`);
  assert.equal(run('outputBytes[0]'),2);assert.equal(run('outputSource'),'canvas');assert.equal(run('previewResults.length'),0);
});

for(const action of ['toggleStep("rotate-1")','canvas.undo()','canvas.redo()',"await applyRecipe({name:'new',graph:linearGraph()})","await $('#mergePresetButton').onclick()","$('#loadGraphInput').files=[{text:async()=>Core.serializeGraph(linearGraph())}];await $('#loadGraphInput').onchange()"]){
  test(`graph boundary rejects pending Run: ${action}`,async()=>{
    const run=harness();await run(`(async()=>{canvas.dispatch({type:'node.data',nodeId:'select-1',data:{range:'last'}});canvas.dispatch({type:'node.disable',nodeId:'rotate-1',disabled:true});canvas.undo();const running=$('#runButton').onclick();${action};pending[0].resolve(result(9));await running})()`);
    assert.equal(run('outputBytes'),null);assert.equal(run("$('#savePdfButton').disabled"),true);
  });
}
test('input deletion followed by Undo cannot resurrect an old pending file',async()=>{
  const run=harness();await run(`(async()=>{let finish;const a=file('late.pdf',1);a.arrayBuffer=()=>new Promise(r=>finish=r);const loading=attachPdfFile(node(),a);canvas.dispatch({type:'node.remove',nodeId:'input-1'});canvas.undo();finish(new Uint8Array([1]).buffer);await loading})()`);
  assert.equal(run('fileStore.size'),0);assert.equal(run('fileLoadRequests.size'),0);
});
test('new source accepted during detach confirmation is not detached by the old confirmation',async()=>{
  const run=harness();await run(`(async()=>{await attachPdfFile(node(),file('A.pdf',1));let confirm;confirmAnswer=()=>new Promise(r=>confirm=r);const clearing=clearPdfFile(node());await attachPdfFile(node(),file('B.pdf',2));confirm(true);await clearing})()`);
  assert.equal(run("fileStore.get('input-1').name"),'B.pdf');
});
test('a late parser rejection never restores the superseded file or posts an error',async()=>{
  const run=harness();await run(`(async()=>{await attachPdfFile(node(),file('prior.pdf',3));let reject;const original=PDFLib.PDFDocument.load;PDFLib.PDFDocument.load=bytes=>bytes[0]===1?new Promise((_,r)=>reject=r):original(bytes);const old=attachPdfFile(node(),file('A.pdf',1));await tick();await attachPdfFile(node(),file('B.pdf',2));const count=toasts.length;reject(Error('late broken PDF'));await old;if(toasts.length!==count)throw Error('stale error surfaced')})()`);
  assert.equal(run("fileStore.get('input-1').name"),'B.pdf');assert.equal(run('inputErrors.size'),0);
});
test('page exit invalidates source and output owners and releases runtime references',async()=>{
  const run=harness();await run(`(async()=>{let finish;const a=file('late.pdf',1);a.arrayBuffer=()=>new Promise(r=>finish=r);const loading=attachPdfFile(node(),a);const running=$('#runButton').onclick();events.pagehide();finish(new Uint8Array([1]).buffer);pending[0].resolve(result(8));await Promise.all([loading,running])})()`);
  assert.equal(run('fileStore.size'),0);assert.equal(run('fileLoadRequests.size'),0);assert.equal(run('outputBytes'),null);
});

test('actual evaluation and export keep a user-edited filename across source replacement',async()=>{
  const run=harness({materialize:true});await run(`(async()=>{await attachPdfFile(node(),file('A.pdf',3));updateNodeData('output-1',{filename:'  reviewed:report  '});await attachPdfFile(node(),file('B.pdf',2));await $('#runButton').onclick();$('#savePdfButton').onclick()})()`);
  assert.equal(run('downloads[0].name'),'reviewed-report.pdf');assert.equal(run('outputFilename'),'reviewed-report.pdf');assert.equal(run('outputBytes[0]'),2);assert.equal(run('outputBytes[1]'),90);
});

test('invalidating an active Canvas run clears its previously published node statuses',async()=>{
 const run=harness({realEvaluator:true});await run(`(async()=>{await attachPdfFile(node(),file('source.pdf',3));const running=$('#runButton').onclick();pending[0].args[2].runtimeTarget.setRuntimeStatus('rotate-1','running');toggleStep('rotate-1');if(runtimeStore.has('rotate-1'))throw Error('cancelled runtime status survived');pending[0].resolve(result(3));await running})()`);
 assert.equal(run('outputBytes'),null);
});

const stageFileCode=source.split('\n').find(line=>line.includes('const stageFile=file=>'));
test('changing a Quick Recipe source cancels its pending run without changing the Canvas source',async()=>{
 const run=harness();await run(`(async()=>{let finish;const a=file('A.pdf',3);a.arrayBuffer=()=>new Promise(r=>finish=r);const recipe={id:'r',name:'Saved',graph:linearGraph()};recipes=[recipe];const staged=new Map([['input-1',a]]),filename={};quickRecipeFiles.set('r',staged);const node={id:'input-1'};const quick=runQuickRecipe('r',$('#recipeRun'));${stageFileCode}stageFile(file('B.pdf',2));finish(new Uint8Array([3]).buffer);await tick();if(pending.length)pending[0].resolve(result(3));await quick})()`);
 assert.equal(run('outputBytes'),null);assert.equal(run("$('#savePdfButton').disabled"),true);assert.equal(run('fileStore.size'),0);
});
test('changing the completed Recipe source disables its old export while unrelated Recipe changes preserve a Canvas result',async()=>{
 const run=harness();await run(`(async()=>{const recipe={id:'r',name:'Saved',graph:linearGraph()};recipes=[recipe];const staged=new Map([['input-1',file('A.pdf',3)]]),filename={};quickRecipeFiles.set('r',staged);const node={id:'input-1'};const quick=runQuickRecipe('r',$('#recipeRun'));await tick();pending[0].resolve(result(3));await quick;${stageFileCode}stageFile(file('B.pdf',2));if(outputBytes||!$('#savePdfButton').disabled)throw Error('old Recipe output survived');const normal=$('#runButton').onclick();pending[1].resolve(result(2));await normal;stageFile(file('C.pdf',1))})()`);
 assert.equal(run('outputBytes[0]'),2);assert.equal(run('outputSource'),'canvas');
});

for(const change of [{type:'graph.viewport',viewport:{x:30,y:20,zoom:1.5}},{type:'node.position',nodeId:'rotate-1',position:{x:220,y:180}}]){
 test(`view-only ${change.type} change preserves a running output request`,async()=>{
  const run=harness();await run(`(async()=>{const running=$('#runButton').onclick();canvas.dispatch(${JSON.stringify(change)});pending[0].resolve(result(3));await running})()`);
  assert.equal(run('outputBytes?.[0]'),3);assert.equal(run("$('#savePdfButton').disabled"),false);
 });
}

test('a superseded JSON read resets its picker so the same file can be chosen again',async()=>{
 const run=harness();await run(`(async()=>{let finish;$('#loadGraphInput').value='A.json';$('#loadGraphInput').files=[{text:()=>new Promise(r=>finish=r)}];const importing=$('#loadGraphInput').onchange();confirmAnswer=false;await $('#mergePresetButton').onclick();finish(Core.serializeGraph(linearGraph()));await importing})()`);
 assert.equal(run("$('#loadGraphInput').value"),'');
});

test('Quick Recipe passes its original control to the asynchronous output preview',async()=>{
 const run=harness();await run(`(async()=>{recipes=[{id:'r',name:'Saved',graph:linearGraph()}];quickRecipeFiles.set('r',new Map([['input-1',file('recipe.pdf',3)]]));const button=$('#recipeRun');const quick=runQuickRecipe('r',button);await tick();pending[0].resolve(result(3));await quick;if(previewResults[0][3]!==button)throw Error('output preview lost its initiating control')})()`);
});
