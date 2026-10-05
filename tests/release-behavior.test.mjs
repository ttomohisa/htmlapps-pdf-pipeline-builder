import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const readable=fs.readFileSync(path.join(root,'dist/index.html'));
const alias=fs.readFileSync(path.join(root,'pdf-pipeline-builder.html'));
const wrapper=fs.readFileSync(path.join(root,'dist/index.self-extract.html'),'utf8');
const payload=wrapper.match(/<script id="self-extract-payload" type="application\/octet-stream">([A-Za-z0-9+/=\s]+)<\/script>/)?.[1];
const behaviors=['async-ownership.test.mjs','output-preview-ownership.test.mjs','step-bypass.test.mjs'].map(name=>path.join(root,'tests',name));

test('tracked catalog alias and restored wrapper match the canonical readable build',()=>{
  assert.deepEqual(alias,readable);
  assert.ok(payload,'canonical self-extract payload exists');
  assert.deepEqual(zlib.gunzipSync(Buffer.from(payload,'base64')),readable);
});

for(const variant of ['dist/index.html','pdf-pipeline-builder.html','restored self-extract']){
  test(`source-boundary behaviors pass against ${variant}`,()=>{
    let directory=null;
    try{
      let target=path.join(root,variant);
      if(variant==='restored self-extract'){
        assert.ok(payload);directory=fs.mkdtempSync(path.join(os.tmpdir(),'pdf-pipeline-release-'));
        target=path.join(directory,'restored.html');fs.writeFileSync(target,zlib.gunzipSync(Buffer.from(payload,'base64')));
      }
      const env={...process.env,PDF_PIPELINE_TEST_HTML:target};delete env.NODE_TEST_CONTEXT;
      const report=execFileSync(process.execPath,['--test','--test-reporter=tap',...behaviors],{cwd:root,env,encoding:'utf8',stdio:'pipe'});
      assert.match(report,/# tests [1-9]\d*/);assert.match(report,/# fail 0/);
    }finally{if(directory)fs.rmSync(directory,{recursive:true,force:true})}
  });
}
