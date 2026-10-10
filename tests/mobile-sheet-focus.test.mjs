import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(process.env.PDF_PIPELINE_TEST_HTML || new URL('../src/index.template.html',import.meta.url),'utf8');
function harness(){
 const classes=new Set(),listeners={},panels=new Map();
 const document={activeElement:null,body:{classList:{add(...xs){xs.forEach(x=>classes.add(x))},remove(...xs){xs.forEach(x=>classes.delete(x))},contains(x){return classes.has(x)}}},dialogOpen:false,
  querySelector(selector){if(selector==='dialog[open]')return this.dialogOpen?{}:null;return panels.get(selector)||null;},addEventListener(type,callback){listeners[type]=callback}};
 function control(id,{disabled=false,visible=true}={}){return{id,disabled,isConnected:true,focus(){document.activeElement=this},getClientRects(){return visible?[{}]:[]}}}
 const opener=control('opener');document.activeElement=opener;
 for(const selector of ['.palette','.inspector','.mobile-tools-sheet','.result-bar']){
  const controls=[control(selector+'-close'),control(selector+'-hidden',{visible:false}),control(selector+'-disabled',{disabled:true}),control(selector+'-last')];
  panels.set(selector,{controls,querySelectorAll(){return controls.filter(x=>!x.disabled)},contains(target){return controls.includes(target)},querySelector(){return controls[0]}});
 }
 const media={matches:true};
 const context={document,window:{matchMedia(){return media}},HTMLElement:Object,$:s=>document.querySelector(s),setExpanded(){},requestAnimationFrame(fn){fn()}};
 const begin=html.indexOf('    const mobileMedia=');const end=html.indexOf('    function syncMobileUi',begin);
 assert.ok(begin>=0&&end>begin);vm.runInNewContext(html.slice(begin,end)+';globalThis.openSheet=openMobileSheet;globalThis.closeSheets=closeMobileSheets;',context);
 const kb=html.indexOf("document.addEventListener('keydown',",html.indexOf('function setExpanded('));
 const ke=html.indexOf("\n    $('#mergePresetButton')",kb);assert.ok(kb>=0&&ke>kb);vm.runInNewContext(html.slice(kb,ke),context);
 function key(key,shiftKey=false){const event={key,shiftKey,prevented:false,preventDefault(){this.prevented=true}};listeners.keydown(event);return event;}
 return{context,document,panels,opener,classes,media,key};
}
for(const [name,selector] of [['palette','.palette'],['inspector','.inspector'],['tools','.mobile-tools-sheet'],['result','.result-bar']]){
 test(`${name} sheet focuses its first control and restores the opener on close`,()=>{
  const h=harness();h.context.openSheet(name);assert.equal(h.document.activeElement,h.panels.get(selector).controls[0]);
  h.context.closeSheets();assert.equal(h.document.activeElement,h.opener);assert.equal(h.classes.has('mobile-sheet-open'),false);
 });
}
test('Tab and reverse Tab wrap within visible enabled sheet controls',()=>{
 const h=harness(),panel=h.panels.get('.mobile-tools-sheet');h.context.openSheet('tools');
 assert.equal(h.key('Tab',true).prevented,true);assert.equal(h.document.activeElement,panel.controls[3]);
 assert.equal(h.key('Tab').prevented,true);assert.equal(h.document.activeElement,panel.controls[0]);
 h.document.activeElement=h.opener;assert.equal(h.key('Tab').prevented,true);assert.equal(h.document.activeElement,panel.controls[0]);
});
test('Escape closes the sheet and restores the opener',()=>{
 const h=harness();h.context.openSheet('tools');h.document.activeElement=h.panels.get('.mobile-tools-sheet').controls[3];h.key('Escape');assert.equal(h.classes.has('mobile-sheet-open'),false);assert.equal(h.document.activeElement,h.opener);
});
test('switching sheets preserves the original opener',()=>{
 const h=harness();h.context.openSheet('palette');h.document.activeElement=h.panels.get('.palette').controls[3];h.context.openSheet('inspector');h.document.activeElement=h.panels.get('.inspector').controls[3];h.context.closeSheets();assert.equal(h.document.activeElement,h.opener);
});
test('a nested native dialog owns Tab and Escape without closing its underlying sheet',()=>{
 const h=harness();h.context.openSheet('inspector');h.document.dialogOpen=true;
 assert.equal(h.key('Tab').prevented,false);h.key('Escape');assert.equal(h.classes.has('mobile-sheet-inspector'),true);
});
test('desktop requests do not open a mobile sheet or change focus',()=>{
 const h=harness();h.media.matches=false;h.context.openSheet('tools');assert.equal(h.classes.size,0);assert.equal(h.document.activeElement,h.opener);
});

for(const [name,selector] of [['inspector','.inspector'],['result','.result-bar']]){
 test(`${name} with no actionable content still focuses and cycles its close control`,()=>{
  const h=harness(),panel=h.panels.get(selector);panel.controls[3].disabled=true;
  h.context.openSheet(name);assert.equal(h.document.activeElement,panel.controls[0]);
  assert.equal(h.key('Tab').prevented,true);assert.equal(h.document.activeElement,panel.controls[0]);
  assert.equal(h.key('Tab',true).prevented,true);h.context.closeSheets();assert.equal(h.document.activeElement,h.opener);
 });
}
test('all four actual sheet shells keep an enabled close control outside dynamic content',()=>{
 for(const fragment of ['class="mobile-tools-sheet"','class="panel palette"','class="panel inspector"','class="result-bar"']){
  const start=html.indexOf(fragment);assert.ok(start>=0,fragment);
  const head=html.slice(start).match(/<div class="mobile-sheet-head">([\s\S]*?)<\/button>/)?.[1];
  assert.ok(head,fragment);assert.match(head,/data-mobile-sheet-close/);assert.doesNotMatch(head,/\bdisabled\b|\bhidden\b/);
 }
});
