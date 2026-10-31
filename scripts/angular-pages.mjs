import {spawn} from 'node:child_process';
import {watch} from 'node:fs';
import {join} from 'node:path';
import {generatePages, projectRoot} from './discover-pages.mjs';
import {generateDocumentation} from './build-documentation.mjs';

generatePages();
generateDocumentation();
const args = process.argv.slice(2);
const watching = args[0] === 'serve' || args.includes('--watch') || (args[0] === 'test' && !args.includes('--watch=false'));
let timer;
const refreshGeneratedContent = () => {
  clearTimeout(timer);
  timer = setTimeout(() => { generatePages(); generateDocumentation(); }, 100);
};
const watcher = watching ? watch(join(projectRoot, 'src/app/features'), {recursive: true}, (_, filename) => {
  if (!filename || filename.endsWith('feature-pages.generated.ts')) return;
  refreshGeneratedContent();
}) : undefined;
const documentationWatchers = watching ? [
  ...['docs', 'src/app/platform/models'].map(directory => watch(join(projectRoot, directory), {recursive: true}, refreshGeneratedContent)),
  watch(join(projectRoot, 'AGENTS.md'), refreshGeneratedContent),
] : [];
const child = spawn(process.execPath, [join(projectRoot, 'node_modules/@angular/cli/bin/ng.js'), ...args], {cwd: projectRoot, stdio: 'inherit'});
child.on('exit', (code) => { watcher?.close(); documentationWatchers.forEach(item => item.close()); clearTimeout(timer); process.exit(code ?? 1); });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { watcher?.close(); documentationWatchers.forEach(item => item.close()); child.kill(signal); });
