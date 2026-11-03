import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import ts from 'typescript';
import {compileArticle, expandSources, generateDocumentation, root} from './build-documentation.mjs';

test('headings have unique anchors and code stays text with language metadata', () => {
  const result = compileArticle('# Guide\n\nIntro.\n\n## First\n\n## First\n\n```typescript\nconst value = "<script>";\n```', {id: 'test/guide'});
  assert.equal(result.title, 'Guide');
  assert.deepEqual(result.outline.map(item => item.id), ['first', 'first-1']);
  assert.deepEqual(result.blocks.find(item => item.kind === 'code'), {kind: 'code', language: 'typescript', code: 'const value = "<script>";'});
});

test('raw HTML is escaped and unsafe links are rejected', () => {
  const result = compileArticle('# Guide\n\n<script>alert(1)</script>', {id: 'test/guide'});
  assert.ok(result.blocks[0].html.includes('&lt;script&gt;'));
  assert.throws(() => compileArticle('# Guide\n\n[bad](javascript:alert)', {id: 'test/guide'}), /Unsupported documentation link/);
  assert.throws(() => compileArticle('No title', {id: 'test/guide'}), /Missing article title/);
});

test('source includes are restricted and current examples are used', () => {
  assert.throws(() => expandSources('<!-- source: ../.env -->', root), /Invalid source/);
  assert.throws(() => expandSources('<!-- source: .env -->', root), /Invalid source/);
  assert.throws(() => expandSources('<!-- source: src/.env -->', root), /Invalid source/);
  assert.throws(() => expandSources('<!-- guide: ../private.md -->', root), /Invalid guide/);
  const result = expandSources('<!-- source: src/app/features/administration/users/users.config.ts -->', root);
  assert.ok(result.includes("headerPKProp: 'userName'"));
});

test('published articles include every page type, source examples and generated property contracts', () => {
  const articles = generateDocumentation();
  assert.ok(articles.length >= 35);
  assert.equal(new Set(articles.map(item => item.id)).size, articles.length);
  const dataSource = articles.find(item => item.id === 'reference/data-source-config');
  assert.ok(dataSource.searchText.includes('headerPKProp'));
  assert.ok(dataSource.searchText.includes('lineFKProp'));
  assert.ok(articles.find(item => item.id === 'examples/users').blocks.some(block => block.kind === 'code' && block.code.includes('usersLineConfig')));
  assert.ok(articles.find(item => item.id === 'reference/field-value').searchText.includes("'decimal'"));
  const before = readFileSync(new URL('../public/documentation/content.json', import.meta.url), 'utf8');
  generateDocumentation();
  assert.equal(readFileSync(new URL('../public/documentation/content.json', import.meta.url), 'utf8'), before);
});

test('invalid article links and duplicate public IDs fail the build', () => {
  const directory = mkdtempSync(join(tmpdir(), 'tecsa-docs-'));
  try {
    const folder = join(directory, 'docs/learn/01-test');
    mkdirSync(folder, {recursive: true});
    mkdirSync(join(directory, 'src/app/platform/models'), {recursive: true});
    writeFileSync(join(folder, '01-one.md'), '# One\n\n[Missing](/documentation/test/missing)');
    assert.throws(() => generateDocumentation(directory), /Broken documentation link/);
    writeFileSync(join(folder, '01-one.md'), '# One\n\nText.');
    writeFileSync(join(folder, '02-one.md'), '# Other\n\nText.');
    assert.throws(() => generateDocumentation(directory), /Duplicate documentation article IDs/);
  } finally {rmSync(directory, {recursive: true, force: true});}
});

test('complete sample page code type-checks against the actual platform public API', () => {
  const article = generateDocumentation().find(item => item.id === 'frontend/page-pattern');
  const blocks = article.blocks.filter(block => block.kind === 'code' && block.language === 'typescript');
  const folder = resolve(root, 'src/app/features/administration/samples');
  const virtual = new Map(['samples.config.ts', 'samples.factbox.config.ts', 'samples.ts'].map((file, index) => [join(folder, file), blocks[index].code]));
  const options = {strict: true, noEmit: true, skipLibCheck: true, experimentalDecorators: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, types: []};
  const host = ts.createCompilerHost(options);
  const read = host.readFile.bind(host), exists = host.fileExists.bind(host), directoryExists = host.directoryExists.bind(host);
  host.fileExists = file => virtual.has(resolve(file)) || exists(file);
  host.directoryExists = directory => resolve(directory) === folder || directoryExists(directory);
  host.readFile = file => virtual.get(resolve(file)) ?? read(file);
  host.getSourceFile = (file, version) => {
    const content = host.readFile(file);
    return content === undefined ? undefined : ts.createSourceFile(file, content, version, true);
  };
  const program = ts.createProgram([...virtual.keys()], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCurrentDirectory: () => root, getCanonicalFileName: file => file, getNewLine: () => '\n'}));
});
