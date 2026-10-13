import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const root = resolve('src/app');
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
  ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
const violations = [];
for (const file of walk(root).filter(file => file.endsWith('.ts'))) {
  const source = readFileSync(file, 'utf8');
  const feature = relative(root, file).startsWith('features' + sep);
  for (const match of source.matchAll(/(?:from\s*|import\s*\(|export\s*\*\s*from\s*)['"]([^'"]+)['"]/g)) {
    const specifier = match[1];
    const target = relative(root, resolve(dirname(file), specifier)).replaceAll('\\', '/').replace(/\.ts$/, '');
    if (specifier.includes('erp-core') || (feature && /^(platform|shared\/ui)\//.test(target)
      && !['platform/public-api', 'shared/ui/public-api'].includes(target))) {
      violations.push(`${relative(root, file)}: ${specifier}`);
    }
  }
}
if (violations.length) {
  console.error('Import boundary check failed. Features must use platform/public-api or shared/ui/public-api.\n' + violations.join('\n'));
  process.exit(1);
}
console.log('Import boundary check passed: features use the foundation public APIs; no retired erp-core imports.');
