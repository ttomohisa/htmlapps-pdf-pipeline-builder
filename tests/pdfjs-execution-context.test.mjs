import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const importMetaDir = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(importMetaDir, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const dependencies = JSON.parse(read('dependencies.json'));
const worker = dependencies.dependencies.find(dependency => dependency.id === 'pdfjs').assets.find(asset => asset.key === 'worker');

test('PDF.js worker-named module declares its actual main-thread execution context', () => {
  assert.equal(worker.executionContext, 'main-thread');
  const schema = JSON.parse(read('schemas/dependencies.schema.json'));
  assert.deepEqual(schema.properties.dependencies.items.properties.assets.items.properties.executionContext.enum, ['main-thread', 'worker']);
});

test('PDF.js initialization imports WorkerMessageHandler in-thread without creating a Worker', async () => {
  const source = read('src/index.template.html');
  const initializer = source.match(/async function ensurePdfJs\(\)\{[^\n]+/)[0];
  const calls = [];
  const handler = {};
  const pdfjs = { GlobalWorkerOptions: { workerPort: 'unset' } };
  const context = vm.createContext({
    Worker: function () { throw new Error('A real Worker is incompatible with the main-thread declaration'); },
    StandaloneAssets: {
      has: () => true,
      async importModule(id, key) {
        calls.push([id, key]);
        if (key === 'worker') return { WorkerMessageHandler: handler };
        assert.equal(context.pdfjsWorker.WorkerMessageHandler, handler);
        return pdfjs;
      }
    }
  });
  vm.runInContext(`let pdfjsModule=null;let pdfjsModulePromise=null;${initializer};globalThis.initialize=ensurePdfJs;`, context);
  assert.equal(await context.initialize(), pdfjs);
  assert.equal(pdfjs.GlobalWorkerOptions.workerPort, null);
  assert.deepEqual(calls, [['pdfjs', 'worker'], ['pdfjs', 'main']]);
});
