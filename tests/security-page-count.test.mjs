import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import Core from '../src/vendor/node-editor-core.mjs';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const inspector = source.slice(source.indexOf('    function renderInputInspector('), source.indexOf('    function renderSelectInspector('));
const escape = source.slice(source.indexOf('    function escapeHtml('), source.indexOf('\n', source.indexOf('    function escapeHtml(')));
const normalize = source.split(/\r?\n/).find(line => line.startsWith('    function normalizePageCountMetadata('));
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
  const element = () => ({children:[], append(...elements) { this.children.push(...elements); }, addEventListener() {}, style:{}, set innerHTML(value) { throw new Error('Metadata must use text-only rendering'); }});
  const context = vm.createContext({document:{createElement:element}, root, node,
    fileStore:new Map(info ? [[node.id, info]] : []), inputErrors:new Map(), t:key=>key});
  vm.runInContext(`${escape}\n${normalize}\n${formatBytes}\n${inspector}\nrenderInputInspector(root,node);`, context);
  return Object.fromEntries(root.children.find(child=>child.className==='meta-box').children.map(row=>row.children.map(child=>child.textContent)));
}

test('imported HTML-looking page counts are rejected for display without mutating saved graphs', () => {
  const node = importedInput('<mark data-audit="count">12 & 13</mark>');
  assert.equal(renderMetadata(node).pages, '—', 'non-numeric saved page count is not displayed');
  assert.equal(node.data.pageCount, '<mark data-audit="count">12 & 13</mark>', 'display must preserve saved metadata');
});

test('saved positive page counts and unset counts retain their inspector display', () => {
  assert.equal(renderMetadata(importedInput(12)).pages, '12');
  assert.equal(renderMetadata(importedInput(0)).pages, '—');
});

test('loaded PDF page count takes precedence over saved display metadata', () => {
  assert.equal(renderMetadata(importedInput(12), {name:'current.pdf', pageCount:3, size:50}).pages, '3');
});
