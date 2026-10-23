'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/index.template.html'),'utf8');
test('hide only the informational footer in the existing phone layout',()=>{
  assert.ok(source.includes('@media (max-width: 760px) { main > footer { display: none; } }'));
  assert.equal((source.match(/<footer\b/g)||[]).length,1);
});
