import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// The same behavior suite can target a canonical generated readable artifact.
const source=fs.readFileSync(process.env.PDF_PIPELINE_TEST_HTML||new URL('../src/index.template.html',import.meta.url),'utf8');
const core=fs.readFileSync(new URL('../src/vendor/node-editor-core.mjs',import.meta.url),'utf8').replace('export default NodeEditorCore;','');
const eligible=['select-pages','delete-pages','duplicate-pages','insert-blank-page','rotate-pages','reverse-pages','page-numbers','watermark-text','text-stamp'];
const excluded=['pdf-input','pdf-output','split-pages','merge-pages'];
const invalidSettings={
  'select-pages':{range:''},'delete-pages':{range:''},'duplicate-pages':{range:'',copies:21},
  'insert-blank-page':{position:'before',page:0},'rotate-pages':{degrees:45},
  'page-numbers':{format:'bad',start:1.5,position:'middle',fontSize:1,margin:-1},
  'watermark-text':{text:'日本語',fontSize:1,opacity:2,angle:100},
  'text-stamp':{text:'CUSTOM',position:'middle',fontSize:1,margin:-1,opacity:2}
};
function between(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,`missing source region ${start}`);return source.slice(a,b);}
function extractFunction(name){
  const lines=source.split('\n'),start=lines.findIndex(line=>line.startsWith(`    function ${name}(`)||line.startsWith(`    async function ${name}(`));
  assert.notEqual(start,-1,`missing ${name}`);
  const code=lines.slice(start).join('\n'),brace=code.indexOf('{',code.indexOf(')')+1);let depth=0;
  for(let index=brace;index<code.length;index++){
    if(code[index]==='{')depth++;
    else if(code[index]==='}'&&--depth===0)return code.slice(0,index+1);
  }
  throw new Error(`unterminated ${name}`);
}
function createContext(type='rotate-pages',data={},language='en'){
  const ctx=vm.createContext({console,Uint8Array,setTimeout,clearTimeout});
  vm.runInContext(core+`;const Core=NodeEditorCore;let language=${JSON.stringify(language)};`+
    between('    const messages={','    const AppConfirm=')+
    between('    const OVERLAY_POSITIONS=','    const translator=')+
    ['mergeInputCount','mergeInputPortIds','nodeSummary','overlayPositionLabel','pageNumberFormatLabel','normalizeFilename','escapeHtml','recipeGraphFromCurrent'].map(extractFunction).join('\n')+`
    class Element {
      constructor(tag){this.tag=tag;this.children=[];this.style={};this.dataset={};this.attributes={};this.textContent='';this.disabled=false;this.id='';}
      append(...children){this.children.push(...children)}
      replaceChildren(...children){this.children=children;this.textContent=''}
      setAttribute(name,value){this.attributes[name]=String(value)}
      addEventListener(){}
      focus(){focused=this}
    }
    let focused=null,invalidations=0,outputBytes=new Uint8Array([7]);
    const root=new Element('root'),document={createElement:tag=>new Element(tag)};
    function allElements(element=root){return[element,...element.children.flatMap(child=>allElements(child))]}
    const $=id=>id==='#inspectorContent'?root:allElements().find(element=>'#'+element.id===id);
    const noop=()=>{};const closePreviewDialog=noop,renderPreviewSection=noop;
    const renderInputInspector=noop,renderOutputInspector=noop,renderSelectInspector=noop,renderDeletePagesInspector=noop,renderDuplicatePagesInspector=noop,renderBlankPageInspector=noop,renderRotateInspector=noop,renderSplitInspector=noop,renderMergeInspector=noop,renderPageNumbersInspector=noop,renderWatermarkInspector=noop,renderStampInspector=noop;
    const nodeTitle=node=>node.type,fileStore=new Map(),inputErrors=new Map();let previewRequestId=0;
    function invalidateOutput(){invalidations++;outputBytes=null}
    const AppConfirm={ask:async()=>true};
    const type=${JSON.stringify(type)},data=${JSON.stringify(data)};
    const input=registry.create('pdf-input',{id:'input',data:{filename:'source.pdf',pageCount:3}}),step=registry.create(type,{id:'step',position:{x:234,y:123},data}),output=registry.create('pdf-output',{id:'output'});
    const initial=Core.createGraph({appId:'pdf-pipeline-builder',appSchemaVersion:1,nodes:[input,step,output],edges:[Core.createEdge({id:'before',source:{nodeId:'input',portId:'pages'},target:{nodeId:'step',portId:'in'}}),Core.createEdge({id:'after',source:{nodeId:'step',portId:'out'},target:{nodeId:'output',portId:'in'}})],viewport:{x:10,y:20,zoom:1.25}});
    // Use real Core dispatch, history, validation, selection, and serialization.
    // Only canvas painting and its browser notifications are outside this unit boundary.
    const canvas=Object.create(Core.NodeCanvas.prototype);
    Object.assign(canvas,{graph:initial,registry,interactive:true,selectedNodeIds:new Set(['step']),selectedNodeId:'step',selectedEdgeId:null,history:{past:[],future:[],transaction:null},historyLimit:100});
    for(const method of ['_syncNodes','_renderEdges','_applyViewport','_notifySelection','_applyValidationStyles'])canvas[method]=noop;
    canvas.markSaved();
    const PDFLib={PDFDocument:{load:async()=>({getPageCount:()=>3,getPage:index=>({getRotation:()=>({angle:index===1?90:0}),getSize:()=>({width:300,height:400})})})}};
    fileStore.set('input',{bytes:new Uint8Array([1,2,3])});
    `+['canSkipStep','toggleStep','renderStepToggle'].filter(name=>source.includes(`function ${name}(`)).map(extractFunction).join('\n')+
    extractFunction('renderInspector')+between('    function parsePageOrder(','    function visualPageSize('),ctx);
  return ctx;
}
const run=(ctx,code)=>vm.runInContext(code,ctx);
const plain=value=>JSON.parse(JSON.stringify(value));

for(const type of eligible){
  test(`${type}: actual Inspector toggles only disabled state and preserves Core history/selection`,()=>{
    const ctx=createContext(type);run(ctx,'renderInspector()');
    const button=run(ctx,"allElements().find(element=>element.tag==='button'&&element.textContent===t('skipStep'))");
    assert.ok(button,'eligible step must expose Skip this step in the Inspector');
    assert.equal(button.type,'button');
    const original=run(ctx,'Core.serializeGraph(canvas.getGraph())');
    button.onclick();
    const disabled=run(ctx,'Core.getNode(canvas.getGraph(),"step")');
    assert.equal(disabled.disabled,true);
    assert.deepEqual(plain({...disabled,disabled:false}),JSON.parse(original).nodes.find(node=>node.id==='step'));
    assert.deepEqual(plain(run(ctx,'canvas.getGraph().edges')),JSON.parse(original).edges);
    assert.deepEqual(plain(run(ctx,'canvas.getSelection()')),['step']);
    assert.equal(run(ctx,'canvas.getPrimarySelection()'),'step');
    assert.equal(run(ctx,'canvas.canUndo()'),true);
    assert.equal(run(ctx,'canvas.isDirty()'),true);
    assert.equal(run(ctx,'outputBytes'),null);
    assert.equal(run(ctx,'invalidations'),1);
    assert.equal(run(ctx,'nodeSummary(Core.getNode(canvas.getGraph(),"step"))'),run(ctx,"t('stepSkipped')"));
    assert.ok(run(ctx,"allElements().some(element=>element.textContent===t('stepSkippedHint'))"));
    assert.equal(run(ctx,"focused?.textContent"),run(ctx,"t('enableStep')"));
    assert.equal(run(ctx,'canvas.undo()'),true);
    assert.equal(run(ctx,'Core.serializeGraph(canvas.getGraph())'),original);
    assert.deepEqual(plain(run(ctx,'canvas.getSelection()')),['step']);
    assert.equal(run(ctx,'canvas.redo()'),true);
    assert.equal(run(ctx,'Core.getNode(canvas.getGraph(),"step").disabled'),true);
    run(ctx,'renderInspector()');
    const enable=run(ctx,"allElements().find(element=>element.tag==='button'&&element.textContent===t('enableStep'))");
    assert.ok(enable);enable.onclick();
    assert.equal(run(ctx,'Core.serializeGraph(canvas.getGraph())'),original);
    assert.equal(run(ctx,'canvas.history.past.length'),2,'each toggle is a separate undo action');
  });

  test(`${type}: disabled validation retains required connections and JSON/Recipe round trips`,()=>{
    const ctx=createContext(type,invalidSettings[type]||{});
    const enabledIssues=run(ctx,'Core.validateGraph(canvas.getGraph(),{registry})');
    if(invalidSettings[type])assert.ok(enabledIssues.length>0,'the active settings must be invalid');
    run(ctx,`canvas.dispatch({type:'node.disable',nodeId:'step',disabled:true})`);
    assert.deepEqual(plain(run(ctx,'Core.validateGraph(canvas.getGraph(),{registry})')),[],'disabled settings are unused');
    const restored=run(ctx,`Core.deserializeGraph(Core.serializeGraph(canvas.getGraph()),{registry})`);
    assert.equal(restored.coreSchemaVersion,1);
    assert.equal(restored.app.schemaVersion,1);
    assert.equal(restored.nodes.find(node=>node.id==='step').disabled,true);
    assert.deepEqual(plain(restored.nodes.find(node=>node.id==='step').data),plain(run(ctx,'Core.getNode(canvas.getGraph(),"step").data')));
    const recipe=run(ctx,'Core.deserializeGraph(recipeGraphFromCurrent(),{registry})');
    assert.equal(recipe.nodes.find(node=>node.id==='step').disabled,true);
    assert.equal(recipe.nodes.find(node=>node.id==='input').data.filename,'');
    assert.equal(recipe.nodes.find(node=>node.id==='input').data.pageCount,0);
    assert.ok(!JSON.stringify(recipe).includes('bytes'));
    run(ctx,`canvas.dispatch({type:'edge.remove',edgeId:'before'});canvas.dispatch({type:'edge.remove',edgeId:'after'})`);
    const issues=plain(run(ctx,'Core.validateGraph(canvas.getGraph(),{registry})'));
    assert.ok(issues.some(issue=>issue.code==='REQUIRED_TARGET_PORT'&&issue.path==='nodes.step.ports.in'));
    assert.ok(issues.some(issue=>issue.code==='REQUIRED_SOURCE_PORT'&&issue.path==='nodes.step.ports.out'));
  });

  test(`${type}: actual evaluator bypasses processing and re-enables the unchanged settings`,async()=>{
    const data={
      'select-pages':{range:'last,1'},'delete-pages':{range:'2'},'duplicate-pages':{range:'2',copies:2},
      'insert-blank-page':{position:'before',page:2},'rotate-pages':{degrees:270},
      'page-numbers':{format:'page-n',start:10},'watermark-text':{text:'SAMPLE'},'text-stamp':{text:'APPROVED'}
    }[type]||{};
    const ctx=createContext(type,data);
    const active=plain(await run(ctx,"createPageEvaluator().evalNode('output','in')"));
    run(ctx,`canvas.dispatch({type:'node.disable',nodeId:'step',disabled:true})`);
    const bypass=plain(await run(ctx,"createPageEvaluator().evalNode('output','in')"));
    const input=plain(await run(ctx,"createPageEvaluator().evalNode('input','pages')"));
    assert.deepEqual(bypass,input,'page order, rotation, dimensions, and overlays pass through unchanged');
    assert.notDeepEqual(active,bypass,'the enabled operation must be observable');
    run(ctx,`canvas.dispatch({type:'node.disable',nodeId:'step',disabled:false})`);
    assert.deepEqual(plain(await run(ctx,"createPageEvaluator().evalNode('output','in')")),active);
  });
}
for(const type of excluded){
  test(`${type}: Inspector has no bypass control and toggle helper is inert`,()=>{
    const ctx=createContext(type);run(ctx,'renderInspector()');
    assert.equal(run(ctx,"allElements().filter(element=>element.tag==='button'&&[t('skipStep'),t('enableStep')].includes(element.textContent)).length"),0);
    const before=run(ctx,'Core.serializeGraph(canvas.getGraph())');
    assert.equal(run(ctx,'typeof toggleStep'),'function','a guarded toggle helper must exist');
    run(ctx,"toggleStep('step')");
    assert.equal(run(ctx,'Core.serializeGraph(canvas.getGraph())'),before);
    assert.equal(run(ctx,'canvas.canUndo()'),false);
    assert.equal(run(ctx,'invalidations'),0);
  });
}
test('excluded Split, Merge, and Output keep app-specific validation when imported disabled',()=>{
  for(const [type,data,code] of [['split-pages',{range:''},'SPLIT_RANGE_REQUIRED'],['merge-pages',{inputCount:1},'MERGE_INPUT_COUNT_INVALID'],['pdf-output',{filename:''},'FILENAME_REQUIRED']]){
    const ctx=createContext(type,data);run(ctx,`canvas.dispatch({type:'node.disable',nodeId:'step',disabled:true})`);
    assert.ok(run(ctx,'Core.validateGraph(canvas.getGraph(),{registry})').some(issue=>issue.code===code));
  }
});
test('skip controls, status, and help are localized in English and Japanese',()=>{
  for(const language of ['en','ja']){
    const ctx=createContext('rotate-pages',{},language);run(ctx,'renderInspector()');
    for(const key of ['skipStep','enableStep','stepSkipped','stepSkippedHint','helpSkipStep'])assert.notEqual(run(ctx,`t('${key}')`),key);
    const button=run(ctx,"allElements().find(element=>element.tag==='button'&&element.textContent===t('skipStep'))");
    assert.ok(button);button.onclick();
    assert.ok(run(ctx,"allElements().some(element=>element.textContent===t('enableStep'))"));
  }
  assert.match(between('<!-- APP:HELP:BEGIN -->','<!-- APP:HELP:END -->'),/data-i18n="helpSkipStep"/);
});
test('missing node toggle is harmless after selection changes or removal',()=>{
  const ctx=createContext();
  assert.equal(run(ctx,'typeof toggleStep'),'function');
  run(ctx,"toggleStep('removed-node')");
  assert.equal(run(ctx,'canvas.canUndo()'),false);
  assert.equal(run(ctx,'invalidations'),0);
});

test('a repeated click from an old Inspector button toggles current state without resetting settings',()=>{
  const ctx=createContext('rotate-pages',{degrees:270});run(ctx,'renderInspector()');
  const button=run(ctx,"allElements().find(element=>element.tag==='button'&&element.textContent===t('skipStep'))");
  button.onclick();button.onclick();
  assert.equal(run(ctx,'Core.getNode(canvas.getGraph(),"step").disabled'),false);
  assert.equal(run(ctx,'Core.getNode(canvas.getGraph(),"step").data.degrees'),270);
  assert.equal(run(ctx,'canvas.history.past.length'),2);
  assert.equal(run(ctx,'invalidations'),2);
});

for(const [type,data] of [['select-pages',{range:'nonsense'}],['delete-pages',{range:'4'}],['duplicate-pages',{range:'1,,2',copies:2}],['insert-blank-page',{position:'before',page:99}],['watermark-text',{text:'日本語'}]]){
  test(`${type}: skipped invalid runtime settings do not block a serialized Recipe run`,async()=>{
    const ctx=createContext(type,data);
    await assert.rejects(run(ctx,"createPageEvaluator().evalNode('output','in')"));
    run(ctx,`canvas.dispatch({type:'node.disable',nodeId:'step',disabled:true});const restoredRecipe=Core.deserializeGraph(recipeGraphFromCurrent(),{registry})`);
    const result=plain(await run(ctx,"createPageEvaluator({graph:restoredRecipe,files:fileStore,runtimeTarget:null}).evalNode('output','in')"));
    assert.deepEqual(result.map(page=>page.index),[0,1,2]);
    assert.ok(result.every(page=>page.rotation===0&&page.overlays.length===0));
  });
}

test('bypass preserves upstream order, existing rotations, and ordered overlay descriptors',async()=>{
  const ctx=createContext('watermark-text',{text:'SECOND'});
  run(ctx,`canvas.dispatchMany([
    {type:'node.add',node:registry.create('page-numbers',{id:'numbers',data:{format:'page-n',start:10}})},
    {type:'node.add',node:registry.create('rotate-pages',{id:'rotate',data:{degrees:270}})},
    {type:'node.add',node:registry.create('reverse-pages',{id:'reverse'})},
    {type:'edge.remove',edgeId:'before'},
    {type:'edge.add',edge:Core.createEdge({id:'first',source:{nodeId:'input',portId:'pages'},target:{nodeId:'numbers',portId:'in'}})},
    {type:'edge.add',edge:Core.createEdge({id:'second',source:{nodeId:'numbers',portId:'out'},target:{nodeId:'rotate',portId:'in'}})},
    {type:'edge.add',edge:Core.createEdge({id:'third',source:{nodeId:'rotate',portId:'out'},target:{nodeId:'reverse',portId:'in'}})},
    {type:'edge.add',edge:Core.createEdge({id:'fourth',source:{nodeId:'reverse',portId:'out'},target:{nodeId:'step',portId:'in'}})},
    {type:'node.disable',nodeId:'step',disabled:true}
  ])`);
  const upstream=plain(await run(ctx,"createPageEvaluator().evalNode('reverse','out')"));
  const output=plain(await run(ctx,"createPageEvaluator().evalNode('output','in')"));
  assert.deepEqual(output,upstream);
  assert.deepEqual(output.map(page=>page.index),[2,1,0]);
  assert.ok(output.every(page=>page.rotation===270&&page.overlays.length===1&&page.overlays[0].type==='page-number'));
});
