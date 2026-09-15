import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, data) => { const p=path.join(root, rel); fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, data); };
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const config = JSON.parse(read('app.config.json'));
const dependencyConfig = JSON.parse(read('dependencies.json'));
const dependencyLock = JSON.parse(read('dependencies.lock.json'));
let template = read('src/index.template.html');
const favicon = read('assets/favicon.svg');
let core = read('src/vendor/node-editor-core.mjs');
const pdfLib = read('src/vendor/pdf-lib.min.js');

// Consumer standalone script is classic, so strip the module-only export.
core = core.replace(/\n?export default NodeEditorCore;\s*$/m, '\n');
if (/\bexport\s+default\s+NodeEditorCore\b/.test(core)) throw new Error('ESM export remained in embedded Core source.');

const pdfDependency = dependencyConfig.dependencies?.find(item => item.id === 'pdf-lib');
const pdfLock = dependencyLock.dependencies?.find(item => item.id === 'pdf-lib');
if (!pdfDependency || !pdfLock) throw new Error('pdf-lib dependency metadata or lock entry is missing.');
if (pdfDependency.package !== 'pdf-lib' || pdfDependency.version !== '1.17.1') throw new Error('Unexpected pdf-lib dependency declaration.');
if (pdfLock.package !== pdfDependency.package || pdfLock.version !== pdfDependency.version) throw new Error('pdf-lib dependency lock does not match dependencies.json.');
if (!/^[a-f0-9]{64}$/.test(pdfLock.tarballSha256 || '')) throw new Error('pdf-lib tarball SHA-256 is invalid.');
const pdfAsset = pdfDependency.assets?.find(asset => asset.key === 'runtime');
if (!pdfAsset || pdfAsset.path !== 'dist/pdf-lib.min.js') throw new Error('pdf-lib runtime asset declaration is invalid.');

const pdfBytes = Buffer.from(pdfLib, 'utf8');
const assetBundle = {
  schemaVersion: 2,
  dependencies: {
    'pdf-lib': {
      package: pdfDependency.package,
      version: pdfDependency.version,
      assets: {
        runtime: {
          mime: pdfAsset.mime || 'text/javascript',
          compression: 'none',
          originalBytes: pdfBytes.length,
          storedBytes: pdfBytes.length,
          base64: pdfBytes.toString('base64')
        }
      }
    }
  }
};

const manifest = {
  app: config.slug,
  version: config.version,
  generatedAtUtc: new Date().toISOString(),
  core: { name: 'Node Editor Core', version: '1.0.0', sha256: sha256(core) },
  dependencies: {
    'pdf-lib': {
      package: pdfDependency.package,
      version: pdfDependency.version,
      license: pdfDependency.license,
      homepage: pdfDependency.homepage,
      tarballSha256: pdfLock.tarballSha256,
      embeddedAsset: pdfAsset.path,
      embeddedSha256: sha256(pdfLib)
    }
  },
  runtimeNetwork: false
};
const iconUri = 'data:image/svg+xml;base64,' + Buffer.from(favicon).toString('base64');
const replacements = new Map([
  ['__APP_ICON_DATA_URI__', iconUri],
  ['__APP_CONFIG_JSON__', JSON.stringify(config).replaceAll('<','\\u003c')],
  ['__BUILD_MANIFEST_JSON__', JSON.stringify(manifest).replaceAll('<','\\u003c')],
  ['__NODE_EDITOR_CORE_SOURCE__', core],
  ['__EMBEDDED_ASSET_BUNDLE_JSON__', JSON.stringify(assetBundle).replaceAll('<','\\u003c')],
]);
for (const [key, value] of replacements) {
  const count = template.split(key).length - 1;
  if (count < 1) throw new Error(`${key} was not found.`);
  template = template.replaceAll(key, () => value);
}
const unresolved = [...template.matchAll(/__[A-Z0-9_]+__/g)].map(m=>m[0]);
if (unresolved.length) throw new Error(`Unresolved placeholders: ${[...new Set(unresolved)].join(', ')}`);

write('dist/index.html', template);
write('dist/.nojekyll', '');
write('dist/dependency-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
const bytes = Buffer.from(template, 'utf8');
const gz = zlib.gzipSync(bytes, { level: 9 });
const payload = gz.toString('base64');
const selfExtract = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PDF Pipeline Builder</title></head><body><p>Opening PDF Pipeline Builder…</p><script>(async()=>{const b='${payload}';const raw=Uint8Array.from(atob(b),c=>c.charCodeAt(0));const ds=new DecompressionStream('gzip');const text=await new Response(new Blob([raw]).stream().pipeThrough(ds)).text();document.open();document.write(text);document.close()})().catch(e=>{document.body.textContent='Failed to open: '+e.message})<\/script></body></html>`;
write('dist/index.self-extract.html', selfExtract);
const selfBytes = Buffer.from(selfExtract,'utf8');
write('dist/self-extract-manifest.json', JSON.stringify({
  format:'gzip-base64-document-write-v1',
  source:'index.html',
  sourceBytes:bytes.length,
  sourceSha256:sha256(bytes),
  outputBytes:selfBytes.length,
  outputSha256:sha256(selfBytes)
}, null, 2) + '\n');
write('dist/build-size-report.json', JSON.stringify({
  generatedAtUtc: manifest.generatedAtUtc,
  files: {
    'index.html': { bytes: bytes.length, mib: +(bytes.length/1024/1024).toFixed(3) },
    'index.self-extract.html': { bytes: selfBytes.length, mib: +(selfBytes.length/1024/1024).toFixed(3) }
  }
}, null, 2) + '\n');
console.log(`[OK] dist/index.html ${bytes.length} bytes`);
console.log(`[OK] dist/index.self-extract.html ${selfBytes.length} bytes`);
