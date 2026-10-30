import {existsSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

// A page lives beside its same-named config. FactBoxes and test files are not pages.
export function discoverPages(root) {
  const walk = directory => readdirSync(directory, {withFileTypes: true})
    .flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
  return walk(root).filter(file => file.endsWith('.config.ts'))
    .map(file => file.slice(0, -'.config.ts'.length))
    .filter(file => existsSync(file + '.ts'))
    .map(file => './' + relative(root, file).replaceAll('\\', '/'))
    .sort();
}

export function generatePages(root = projectRoot) {
  const features = join(root, 'src/app/features');
  const pages = discoverPages(features);
  const output = '// Generated from feature folders. Do not edit.\n'
    + "import type { PageModule } from '../platform/public-api';\n"
    + pages.map((page, index) => `import * as page${index} from '${page}';`).join('\n')
    + '\n\nexport const featurePageModules: PageModule[] = [\n'
    + pages.map((_, index) => `  page${index},`).join('\n') + '\n];\n';
  const target = join(features, 'feature-pages.generated.ts');
  if (!existsSync(target) || readFileSync(target, 'utf8') !== output) writeFileSync(target, output);
  return pages;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) generatePages();
