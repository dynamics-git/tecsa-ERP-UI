import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Marked} from 'marked';
import ts from 'typescript';

export const root = fileURLToPath(new URL('../', import.meta.url));
const walk = directory => readdirSync(directory, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))
  .flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const slug = text => text.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cleanName = text => text.replace(/^\d+-/, '').replace(/\.md$/, '');
const titleCase = text => text.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function compileArticle(markdown, metadata) {
  const outline = [], counts = new Map();
  const parser = new Marked({gfm: true});
  parser.use({renderer: {
    heading({tokens, depth}) {
      const label = this.parser.parseInline(tokens);
      const base = slug(label), count = counts.get(base) ?? 0;
      counts.set(base, count + 1);
      const id = count ? `${base}-${count}` : base;
      if (depth > 1) outline.push({id, title: label.replace(/<[^>]*>/g, ''), level: depth});
      return depth === 1 ? '' : `<h${depth} id="${id}">${label}</h${depth}>`;
    },
    html({text}) { return escape(text); },
    link({href, tokens}) {
      if (!/^(https?:|mailto:|\/documentation\/|#)/.test(href)) throw new Error(`Unsupported documentation link: ${href}`);
      return `<a href="${escape(href)}"${href.startsWith('https:') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${this.parser.parseInline(tokens)}</a>`;
    },
  }});
  const tokens = parser.lexer(markdown), blocks = [];
  let pending = [];
  const flush = () => { if (pending.length) blocks.push({kind: 'html', html: parser.parser(pending)}); pending = []; };
  for (const token of tokens) {
    if (token.type === 'code') { flush(); blocks.push({kind: 'code', language: token.lang || 'text', code: token.text}); }
    else pending.push(token);
  }
  flush();
  const title = tokens.find(token => token.type === 'heading' && token.depth === 1)?.text;
  if (!title) throw new Error(`Missing article title: ${metadata.id}`);
  const summary = tokens.find(token => token.type === 'paragraph')?.text.replace(/[`*]/g, '') ?? '';
  return {...metadata, title, summary, outline, blocks, searchText: markdown.replace(/[#`*|]/g, ''), readingMinutes: Math.max(1, Math.ceil(markdown.split(/\s+/).length / 220))};
}

export function expandSources(markdown, projectRoot) {
  const withGuides = markdown.replace(/<!-- guide: ([^\n]+) -->/g, (_, source) => {
    const path = resolve(projectRoot, source.trim());
    if (!path.startsWith(resolve(projectRoot, 'docs') + sep) || !source.endsWith('.md') || source.startsWith('docs/learn/')) throw new Error(`Invalid guide include: ${source}`);
    return `\nCurrent repository guide: \`${source}\`\n\n${readFileSync(path, 'utf8').replace(/^# /gm, '## ')}\n`;
  });
  return withGuides.replace(/<!-- source: ([^\n]+) -->/g, (_, source) => {
    const path = resolve(projectRoot, source.trim());
    if (!path.startsWith(resolve(projectRoot) + sep) || !/^(src\/|docs\/|AGENTS\.md$)/.test(source) || !/\.(ts|html|scss|md)$/.test(source)) throw new Error(`Invalid source include: ${source}`);
    const language = path.endsWith('.ts') ? 'typescript' : path.endsWith('.html') ? 'html' : 'markdown';
    return `\nSource: \`${source}\`\n\n\`\`\`\`${language}\n${readFileSync(path, 'utf8')}\n\`\`\`\`\n`;
  });
}

function references(projectRoot) {
  return walk(join(projectRoot, 'src/app/platform/models')).filter(file => file.endsWith('.model.ts') || file.endsWith('field-value.ts')).map(file => {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const name = file.split(/[\\/]/).pop().replace(/(?:\.model)?\.ts$/, '');
    let markdown = `# ${titleCase(name)} reference\n\nGenerated from the current TypeScript declarations. Types describe the available contract; the guided articles explain the recommended pattern and business constraints.\n\nSource: \`${relative(projectRoot, file).replaceAll('\\', '/')}\`\n`;
    for (const node of source.statements) {
      if (ts.isInterfaceDeclaration(node)) {
        markdown += `\n## ${node.name.text}\n\n`;
        if (node.heritageClauses) markdown += `Inherits: ${node.heritageClauses.map(item => '`' + item.getText(source) + '`').join(', ')}.\n\n`;
        markdown += '| Property | Required | Type | Description |\n| --- | --- | --- | --- |\n';
        for (const member of node.members) {
          const description = (member.jsDoc ?? []).map(doc => typeof doc.comment === 'string' ? doc.comment : '').join(' ').replaceAll('|', '\\|').replaceAll('\n', ' ');
          const type = member.type?.getText(source).replaceAll('|', '\\|').replaceAll('\n', ' ') ?? member.getText(source).replaceAll('|', '\\|').replaceAll('\n', ' ');
          markdown += `| ${member.name?.getText(source) ?? 'signature'} | ${member.questionToken ? 'No' : 'Yes'} | \`${type}\` | ${description || 'See the type and the guided examples.'} |\n`;
        }
      } else if (ts.isTypeAliasDeclaration(node)) markdown += `\n## ${node.name.text}\n\n\`\`\`typescript\n${node.getText(source)}\n\`\`\`\n`;
      else if (ts.isVariableStatement(node) && node.getText(source).includes('FIELD_VALUE_TYPES')) markdown += `\n## Supported value types\n\n\`\`\`typescript\n${node.getText(source)}\n\`\`\`\n`;
    }
    return {id: `reference/${name}`, section: 'reference', sectionTitle: 'Reference', source: relative(projectRoot, file).replaceAll('\\', '/'), markdown};
  });
}

export function generateDocumentation(projectRoot = root) {
  const contentRoot = join(projectRoot, 'docs/learn');
  const entries = walk(contentRoot).filter(file => file.endsWith('.md')).map(file => {
    const parts = relative(contentRoot, file).replaceAll('\\', '/').split('/');
    const section = cleanName(parts[0]);
    return {id: parts.map(cleanName).join('/'), section, sectionTitle: titleCase(section), source: relative(projectRoot, file).replaceAll('\\', '/'), markdown: expandSources(readFileSync(file, 'utf8'), projectRoot)};
  });
  entries.push(...references(projectRoot));
  const articles = entries.map(({markdown, ...metadata}) => compileArticle(markdown, metadata));
  const ids = new Map(articles.map(article => [article.id, article]));
  if (ids.size !== articles.length) throw new Error('Duplicate documentation article IDs');
  for (const article of articles) {
    for (const block of article.blocks.filter(item => item.kind === 'html')) {
      for (const match of block.html.matchAll(/href="\/documentation\/([^"#]+)(?:#([^"]+))?"/g)) {
        const target = ids.get(match[1]);
        if (!target || (match[2] && !target.outline.some(heading => heading.id === match[2]))) throw new Error(`Broken documentation link in ${article.id}: ${match[0]}`);
      }
    }
  }
  const output = join(projectRoot, 'public/documentation/content.json');
  const json = JSON.stringify({version: 1, articles});
  mkdirSync(dirname(output), {recursive: true});
  if (!existsSync(output) || readFileSync(output, 'utf8') !== json) writeFileSync(output, json);
  return articles;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const articles = generateDocumentation();
  process.stdout.write(`Documentation: ${articles.length} articles generated and links checked.\n`);
}
