import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(process.env.PDF_PIPELINE_TEST_HTML||new URL('../src/index.template.html',import.meta.url),'utf8');
const markup=source.slice(0,source.indexOf('<script>'));
const line=name=>source.split('\n').find(value=>value.startsWith(`    function ${name}(`));
const between=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));

// Exercise production localization against attributes parsed from the real HTML.
// Rendering and PDF processing are unrelated to this language-only contract.
function harness(language='en'){
  const elements=[...markup.matchAll(/<([\w-]+)\b([^>]*)>/g)].map(([,tag,attributes])=>{
    const attrs=Object.fromEntries([...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(([,name,value])=>[name,value]));
    const dataset=Object.fromEntries(Object.entries(attrs).filter(([key])=>key.startsWith('data-')).map(([key,value])=>[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()),value]));
    return{tag,attrs,dataset,textContent:'',setAttribute(name,value){attrs[name]=String(value)},getAttribute(name){return attrs[name]??null},get title(){return attrs.title||''},set title(value){attrs.title=String(value)}};
  });
  const query=selector=>selector.startsWith('#')?elements.find(el=>el.attrs.id===selector.slice(1)):elements.find(el=>el.attrs[selector.slice(1,-1)]!==undefined);
  const queryAll=selector=>elements.filter(el=>el.attrs[selector.slice(1,-1)]!==undefined);
  const context=vm.createContext({document:{documentElement:{}},$:query,$$:queryAll});
  vm.runInContext(`let language=${JSON.stringify(language)};`+between('    const messages={','    const AppConfirm=')+`
    const renderResultState=()=>{},renderInspector=()=>{},renderNodeTexts=()=>{},syncToolbar=()=>{},renderFileStatus=()=>{},renderRecipeList=()=>{},renderQuickRecipes=()=>{};
  `+line('applyLanguage'),context);
  return{elements,query,apply(locale){vm.runInContext(`language=${JSON.stringify(locale)};applyLanguage()`,context)},context};
}

const controls={
  helpButton:['使い方','Help'],
  zoomOutButton:['縮小','Zoom out'],zoomInButton:['拡大','Zoom in'],
  mobileZoomOutButton:['縮小','Zoom out'],mobileZoomInButton:['拡大','Zoom in'],
  zoomResetButton:['表示倍率を100%に戻す','Reset zoom to 100%'],
  helpCloseButton:['閉じる','Close'],recipeCloseButton:['閉じる','Close'],
  previewDialogCloseButton:['閉じる','Close'],outputPreviewCloseButton:['閉じる','Close'],
  outputPreviewPrevButton:['前へ','Previous'],outputPreviewNextButton:['次へ','Next']
};
for(const locale of ['en','ja']){
  test(`${locale}: icon control names and tooltips follow the selected language`,()=>{
    const app=harness(locale);app.apply(locale);
    for(const[id,labels]of Object.entries(controls)){
      const button=app.query('#'+id),expected=labels[locale==='ja'?0:1];
      assert.equal(button.getAttribute('aria-label'),expected,id+' accessible name');
      assert.equal(button.title,expected,id+' tooltip');
    }
  });
  test(`${locale}: hidden dialogs and mobile regions are localized before opening`,()=>{
    const app=harness(locale);app.apply(locale);
    const expected=locale==='ja'?['出力プレビュー','その他の操作','Pipeline操作','PDF Pipelineキャンバス']:['Output preview','More actions','Pipeline actions','PDF Pipeline Canvas'];
    ['outputPreviewCanvas','mobileToolsSheet','mobileActionBar','canvas'].forEach((id,index)=>assert.equal(app.query('#'+id).getAttribute('aria-label'),expected[index],id));
    for(const button of app.elements.filter(el=>el.attrs['data-mobile-sheet-close']!==undefined||el.attrs.class==='mobile-sheet-close')){
      assert.equal(button.getAttribute('aria-label'),locale==='ja'?'閉じる':'Close');
      assert.equal(button.title,locale==='ja'?'閉じる':'Close');
    }
    for(const group of app.elements.filter(el=>el.attrs.role==='group'))assert.equal(group.getAttribute('aria-label'),locale==='ja'?'表示倍率':'Zoom');
  });
}
test('repeated JA/EN switches refresh hidden and visible labels without changing icon markup',()=>{
  const app=harness('ja');
  for(const locale of ['ja','en','ja','en']){
    app.apply(locale);
    assert.equal(app.context.document.documentElement.lang,locale);
    assert.equal(app.query('#languageButton').textContent,locale==='ja'?'EN':'JA');
    for(const[id,labels]of Object.entries(controls))assert.equal(app.query('#'+id).getAttribute('aria-label'),labels[locale==='ja'?0:1],id);
  }
  assert.match(markup,/<button[^>]+id="helpButton"[^>]*><svg/);
});
