import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import Core from '../src/vendor/node-editor-core.mjs';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const inspector = source.slice(source.indexOf('    function renderInputInspector('), source.indexOf('    function renderSelectInspector('));
const escape = source.slice(source.indexOf('    function escapeHtml('), source.indexOf('\n', source.indexOf('    function escapeHtml(')));
const formatBytes = source.slice(source.indexOf('    function formatBytes('), source.indexOf('\n', source.indexOf('    function formatBytes(')));

function importedInput(pageCount) {
  const graph = Core.createGraph({appId:'pdf-pipeline-builder', nodes:[Core.createNode({
    id:'input', type:'pdf-input', data:{filename:'saved.pdf', pageCount}
  })]});
  return Core.deserializeGraph(Core.serializeGraph(graph)).nodes[0];
}

function renderMetadata(node, info) {
  // Capture the actual HTML sink without adding a browser/DOM dependency to npm test.
  const root = {children:[], append(...elements) { this.children.push(...elements); }};
  const element = () => ({append() {}, addEventListener() {}, style:{}});
  const context = vm.createContext({document:{createElement:element}, root, node,
    fileStore:new Map(info ? [[node.id, info]] : []), inputErrors:new Map(), t:key=>key});
  vm.runInContext(`${escape}\n${formatBytes}\n${inspector}\nrenderInputInspector(root,node);`, context);
  return root.children.find(child=>child.className==='meta-box').innerHTML;
}

test('imported HTML-looking page-count metadata stays inert in the inspector HTML sink', () => {
  const node = importedInput('<mark data-audit="count">12 & 13</mark>');
  const html = renderMetadata(node);
  assert.ok(html.includes('<strong>&lt;mark data-audit=&quot;count&quot;&gt;12 &amp; 13&lt;/mark&gt;</strong>'), 'page count must be escaped as display text');
  assert.ok(!html.includes('<mark'), 'imported metadata must not create markup');
  assert.equal(node.data.pageCount, '<mark data-audit="count">12 & 13</mark>', 'display must preserve saved metadata');
});

test('saved positive page counts and unset counts retain their inspector display', () => {
  assert.ok(renderMetadata(importedInput(12)).includes('<span>pages</span><strong>12</strong>'));
  assert.ok(renderMetadata(importedInput(0)).includes('<span>pages</span><strong>—</strong>'));
});

test('loaded PDF page count takes precedence over saved display metadata', () => {
  assert.ok(renderMetadata(importedInput(12), {name:'current.pdf', pageCount:3, size:50}).includes('<span>pages</span><strong>3</strong>'));
});
