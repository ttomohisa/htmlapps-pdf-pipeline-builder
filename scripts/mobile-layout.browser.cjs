'use strict';
// Focused native footer / Help regression in the existing unprivileged PR job.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const cfg={"slug": "pdf-pipeline-builder", "file": "dist/index.html", "bp": 760, "badge": "localBadge", "footer": "main > footer", "nav": "#mobileActionBar", "body": ".dialog-body", "header": ".dialog-head", "end": "[data-i18n=\"helpGraphNote\"]", "close": "#helpCloseButton"};
const evidence=path.resolve('test-results/mobile-layout');
async function bounds(locator,width,height,label,vertical=true){const r=await locator.boundingBox();assert.ok(r&&r.x>=-1&&r.x+r.width<=width+1&&(!vertical||(r.y>=-1&&r.y+r.height<=height+1)),label+': visible controls fit '+JSON.stringify(r));}
// Check rendered geometry, including clipping by an ancestor (isVisible alone misses it).
async function auditHeader(page, label) {
  const badge = page.locator('header #versionBadge');
  assert.equal(await badge.textContent(), 'v' + require('../app.config.json').version, label + ': current header version');
  assert.equal(await badge.isVisible(), true, label + ': version visible');
  const clipped = await badge.evaluate(el => {
    const r = el.getBoundingClientRect(), problems = [];
    if (r.width <= 0 || r.height <= 0 || r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) problems.push('outside viewport');
    if (el.scrollWidth > el.clientWidth + 1) problems.push('version text clipped');
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p), b = p.getBoundingClientRect();
      if (/hidden|clip|auto|scroll/.test(s.overflowX) && (r.left < b.left - 1 || r.right > b.right + 1)) problems.push('ancestor clips x: ' + p.className);
      if (/hidden|clip|auto|scroll/.test(s.overflowY) && (r.top < b.top - 1 || r.bottom > b.bottom + 1)) problems.push('ancestor clips y: ' + p.className);
    }
    return problems;
  });
  assert.deepEqual(clipped, [], label + ': complete header version remains readable');
  const help = page.locator('#helpButton svg');
  assert.equal(await help.isVisible(), true, label + ': Help icon visible');
  assert.ok(await help.evaluate(svg => {
    const paths = [...svg.querySelectorAll('path')], shape = paths.map(p => p.getAttribute('d')).join(' ');
    return /[aAcC]/.test(shape) && paths.some(p => /[hH]\.01/.test(p.getAttribute('d')) && getComputedStyle(p).strokeLinecap === 'round') && svg.getBBox().width > 0;
  }), label + ': question-mark curve and painted dot, not information icon');
  const shield = page.locator('.local-badge svg');
  if (await shield.count()) {
    assert.ok(await shield.evaluate(svg => [...svg.querySelectorAll('path')].some(p => /^M12 3 5 6/.test(p.getAttribute('d')))), label + ': local-processing shield');
  }
}

async function main(){
 fs.mkdirSync(evidence,{recursive:true});const browser=await chromium.launch();
 try{
  const cases=[];for(const language of ['ja','en'])for(const [width,height]of [[1360,900],[cfg.bp+1,568],[cfg.bp,568],[320,568], [360,640], [390,844],[393,252]])cases.push({file:cfg.file,language,width,height});
  if(cfg.slug!=='temporary-links'){cases.push({file:'dist/index.self-extract.html',language:'en',width:360,height:640});cases.push({file:cfg.slug+'.html',language:'ja',width:1360,height:900});}
  if(cfg.slug==='video-compressor')cases.push({file:'dist/index.mt.html',language:'en',width:360,height:640});
  for(const {file,language,width,height}of cases){
   const context=await browser.newContext({viewport:{width,height},locale:language,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],requests=[],label=`${file} ${language} ${width}x${height}`;
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
   try{
    await page.goto(pathToFileURL(path.resolve(file)).href);await page.locator('#helpButton').waitFor();
    await page.waitForFunction(()=>typeof document.querySelector('#helpButton').onclick==='function');
    if(await page.locator('html').getAttribute('lang')!==language)await page.locator('#languageButton').click();
    const badge=page.locator('[data-i18n="'+cfg.badge+'"]');assert.equal((await badge.textContent()).trim(),language==='ja'?'完全ローカル処理':'Fully local processing');
    if(await badge.isVisible())await bounds(badge,width,height,label,false);
    assert.equal(await page.locator(cfg.footer).isVisible(),width>cfg.bp,label+': informational footer');
    if(cfg.slug==='temporary-links'){
     await page.locator('#urlInput').fill('https://example.com/synthetic');await page.locator('#noteInput').fill('Synthetic layout check');await page.locator('#addButton').click();assert.match(await page.locator('#list').textContent(),/Synthetic layout check/);assert.equal(await page.locator('#addButton').isEnabled(),true);
    }else{
     const bar=page.locator(cfg.nav);assert.equal(await bar.isVisible(),width<=cfg.bp,label+': functional bar unchanged');
     if(width<=cfg.bp){
      await bounds(bar,width,height,label);
      if(cfg.slug==='pdf-pipeline-builder'){await page.locator('#mobileAddButton').click();await page.locator('.palette').waitFor({state:'visible',timeout:3000});assert.equal(await page.locator('.palette').isVisible(),true);await page.keyboard.press('Escape');await page.locator('.palette').waitFor({state:'hidden',timeout:3000});assert.equal(await page.locator('.palette').isVisible(),false);}
      else{assert.equal(await page.locator('#mobileCompressButton').isDisabled(),true);await page.locator('#mobileSettingsButton').click();await page.locator('#mobileFileButton').click();}
     }
    }
    for(const w of [cfg.bp+1,cfg.bp,width]){await page.setViewportSize({width:w,height});assert.equal(await page.locator(cfg.footer).isVisible(),w>cfg.bp,label+': footer resize');}
    await page.evaluate(()=>scrollTo({left:0,top:0,behavior:'instant'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    // A desktop-to-phone resize transitions every existing sheet for 180–200 ms.
    // Observe their real closed state instead of capturing a translucent transition.
    if(width<=cfg.bp)await page.waitForFunction(()=>!document.body.classList.contains('mobile-sheet-open')&&[...document.querySelectorAll('.palette,.inspector,.result-bar,.mobile-tools-sheet')].every(el=>{const s=getComputedStyle(el);return s.visibility==='hidden'&&s.opacity==='0'&&el.getAnimations().every(a=>a.playState==='finished');}),{},{timeout:3000});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+': page width');
    if(cfg.nav&&width<=cfg.bp)await bounds(page.locator(cfg.nav),width,height,label);
    if(cfg.slug!=='video-compressor'&&file===cfg.file&&[1360,320].includes(width)){
     if(cfg.slug==='temporary-links')await page.waitForFunction(()=>getComputedStyle(document.querySelector('#toast')).opacity==='0',{},{timeout:8000});
     await page.screenshot({path:path.join(evidence,`${language}-${width}.png`)});
    }
    await auditHeader(page, label);
        await page.locator('#helpButton').click();
        const visibleHelpText = await page.locator('#helpDialog').innerText();
        assert.doesNotMatch(visibleHelpText, /(?:EN\s*\/\s*JA|JA\s*[\/／]\s*EN|ヘッダーのEN|Use EN in the header)/, label + ': redundant language instructions removed');
        assert.match(visibleHelpText, language === 'ja' ? /アイコン.*読み上げ名.*ツールチップ/ : /Icon labels and tooltips/i, label + ': useful adjacent Help guidance retained');
const body=page.locator('#helpDialog '+cfg.body);await body.evaluate(el=>{el.scrollTop=el.scrollHeight;});
    if(cfg.slug==='video-compressor'){assert.equal(await page.locator('main #versionText').count(),0);assert.match(await page.locator('#versionText').textContent(),/v\d+\.\d+/);assert.match(await page.locator('#ffmpegVersionText').textContent(),/FFmpeg WASM Builder/);}
    const end=await page.locator(cfg.end).evaluate(el=>{const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let t,last;while(t=walker.nextNode())if(t.textContent.length)last=t;const range=document.createRange();range.setStart(last,last.textContent.length-1);range.setEnd(last,last.textContent.length);const r=range.getBoundingClientRect();let top=0,bottom=innerHeight;for(let p=el.parentElement;p;p=p.parentElement){if(/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowY)){const b=p.getBoundingClientRect();top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom);}}return{top:r.top,bottom:r.bottom,clipTop:top,clipBottom:bottom};});
    assert.ok(end.top>=end.clipTop-1&&end.bottom<=end.clipBottom+1,label+': final Help content reachable '+JSON.stringify(end));assert.ok(await body.evaluate(el=>el.scrollWidth<=el.clientWidth+1),label+': Help width');await bounds(page.locator('#helpDialog '+cfg.header),width,height,label);
    const modal=await page.locator('#helpDialog').boundingBox(),point=[[1,1],[width-1,1],[1,height-1],[width-1,height-1]].find(([x,y])=>x<modal.x||x>modal.x+modal.width||y<modal.y||y>modal.y+modal.height);assert.ok(point,label+': genuine backdrop point');
    const y=await page.evaluate(()=>scrollY);await page.mouse.move(...point);await page.mouse.wheel(0,400);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>scrollY),y,label+': background locked');
    await page.keyboard.press('Escape');assert.equal(await page.locator('#helpDialog').isVisible(),false);await page.locator('#helpButton').click();await page.locator(cfg.close).click();assert.equal(await page.locator('#helpDialog').isVisible(),false);
    assert.deepEqual(errors,[],label+': console errors');assert.deepEqual(requests,[],label+': runtime requests');console.log('PASS '+label);
   }catch(error){await page.screenshot({path:path.join(evidence,'failure.png')}).catch(()=>{});throw new Error(label+': '+error.message,{cause:error});}finally{await context.close();}
  }
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
