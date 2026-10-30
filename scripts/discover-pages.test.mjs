import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {discoverPages, generatePages} from './discover-pages.mjs';

test('nested page folders are discovered, added and removed without a central registration', () => {
  const root = mkdtempSync(join(tmpdir(), 'page-discovery-'));
  try {
    const features = join(root, 'src/app/features');
    const folder = join(features, 'extension/orders');
    mkdirSync(folder, {recursive: true});
    writeFileSync(join(folder, 'orders.config.ts'), 'export const ordersListConfig = {};');
    assert.deepEqual(discoverPages(features), []);
    writeFileSync(join(folder, 'orders.ts'), 'export class OrdersPage {}');
    writeFileSync(join(folder, 'orders.factbox.config.ts'), 'export const factBox = {};');
    writeFileSync(join(folder, 'orders.spec.ts'), '');
    assert.deepEqual(generatePages(root), ['./extension/orders/orders']);
    assert.match(readFileSync(join(features, 'feature-pages.generated.ts'), 'utf8'), /extension\/orders\/orders/);
    const second = join(features, 'extension/new-page');
    mkdirSync(second);
    writeFileSync(join(second, 'new-page.config.ts'), '');
    writeFileSync(join(second, 'new-page.ts'), '');
    assert.equal(generatePages(root).length, 2);
    rmSync(folder, {recursive: true});
    assert.deepEqual(generatePages(root), ['./extension/new-page/new-page']);
    assert.doesNotMatch(readFileSync(join(features, 'feature-pages.generated.ts'), 'utf8'), /orders/);
  } finally { rmSync(root, {recursive: true, force: true}); }
});
