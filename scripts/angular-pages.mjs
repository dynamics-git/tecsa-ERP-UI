import {spawn} from 'node:child_process';
import {watch} from 'node:fs';
import {join} from 'node:path';
import {generatePages, projectRoot} from './discover-pages.mjs';

generatePages();
const args = process.argv.slice(2);
const watching = args[0] === 'serve' || args.includes('--watch') || (args[0] === 'test' && !args.includes('--watch=false'));
let timer;
const watcher = watching ? watch(join(projectRoot, 'src/app/features'), {recursive: true}, (_, filename) => {
  if (!filename || filename.endsWith('feature-pages.generated.ts')) return;
  clearTimeout(timer);
  timer = setTimeout(() => generatePages(), 100);
}) : undefined;
const child = spawn(process.execPath, [join(projectRoot, 'node_modules/@angular/cli/bin/ng.js'), ...args], {cwd: projectRoot, stdio: 'inherit'});
child.on('exit', (code) => { watcher?.close(); clearTimeout(timer); process.exit(code ?? 1); });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { watcher?.close(); child.kill(signal); });
