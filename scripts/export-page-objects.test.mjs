import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync, unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, basename} from 'node:path';
import {exportPageObjects} from './export-page-objects.mjs';

function fixture(t, config) {
  const prefix = join(realpathSync(tmpdir()), 'tecsa-object-source-');
  const root = mkdtempSync(prefix);
  t.after(() => { assert.ok(resolve(root).startsWith(prefix)); rmSync(root, {recursive:true,force:true}); });
  const dir = join(root, 'src/app/features/example'); mkdirSync(dir, {recursive:true});
  writeFileSync(join(dir, 'example.config.ts'), config);
  writeFileSync(join(dir, 'example.ts'), `throw new Error('Source must not execute');
    @Component({templateUrl:'./different-template.html'}) export class ExamplePage {}`);
  writeFileSync(join(dir, 'different-template.html'), '<p>Existing shared page</p>');
  return {root,dir};
}

test('discovers current PR and pages without IDs through existing folder discovery', () => {
  const inventory = exportPageObjects();
  const pr = inventory.pages.find(page => page.pageId === 'purchase-requisition');
  assert.equal(pr.objectId,10000);
  // Source-less Object pages are completed by Laravel's existing ObjectRegistry,
  // not a second source map embedded in the Angular exporter.
  assert.equal(pr.endpoint,null);
  assert.deepEqual(pr.endpoints,[]);
  assert.ok(pr.files.some(file => file.role==='Angular TypeScript' && file.path.endsWith('/purchase-requisition.ts')));
  assert.ok(pr.files.some(file => file.role==='Angular Template' && file.path.endsWith('/purchase-requisition.html')));
  assert.ok(inventory.pages.filter(page => page.objectId===null).length > 30);
});

test('resolves local/imported constants and spread metadata without executing source', t => {
  const {root,dir} = fixture(t, `import {source as sharedSource} from './data';
    const base={pageId:'example',pageType:'document',title:'Example'};
    export const exampleListConfig={...base,objectId:50000,dataSource:sharedSource} satisfies ListPageConfig;`);
  writeFileSync(join(dir,'data.ts'), `throw new Error('Do not execute imports'); export const source={endpoint:'/examples'};`);
  const [page] = exportPageObjects(root).pages;
  assert.equal(page.title,'Example'); assert.equal(page.objectId,50000); assert.equal(page.endpoint,'/examples');
  assert.ok(page.files.some(file => file.path.endsWith('/different-template.html')));
});

test('unassigned pages keep null IDs; dynamic titles are diagnosed instead of executed', t => {
  const {root} = fixture(t, `export const listConfig={pageId:'example',pageType:'worksheet',title:()=>{throw 'never'},dataSource:{endpoint:'/examples'}};`);
  const inventory=exportPageObjects(root); assert.equal(inventory.pages[0].objectId,null);
  assert.equal(inventory.pages[0].title,'example'); assert.equal(inventory.diagnostics.length,1);
});

test('rejects malformed IDs and non-static page kinds', t => {
  const {root,dir}=fixture(t,'');
  for(const id of ['-1','0','1.5','2147483648','getId()']) {
    writeFileSync(join(dir,'example.config.ts'),`export const config={pageId:'example',pageType:'card',title:'Example',objectId:${id}};`);
    assert.throws(()=>exportPageObjects(root),/Invalid\/unresolved objectId/);
  }
});

test('rejects source imports escaping the explicitly selected UI repository', t => {
  const {root,dir}=fixture(t,'');
  const outside=root+'-outside.ts'; writeFileSync(outside,`export const source={endpoint:'/examples'};`);
  t.after(()=>unlinkSync(outside));
  writeFileSync(join(dir,'example.config.ts'),`import {source} from '../../../../../${basename(root)}-outside'; export const config={pageId:'example',pageType:'list',title:'Example',dataSource:source};`);
  assert.throws(()=>exportPageObjects(root),/escapes repository root/);
});
