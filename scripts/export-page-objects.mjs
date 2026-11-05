import {existsSync, readFileSync, realpathSync} from 'node:fs';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {discoverPages, projectRoot} from './discover-pages.mjs';

/** Source inspection only: never import/execute Angular pages or their config expressions. */
export function exportPageObjects(root = projectRoot) {
  root = realpathSync(root);
  const modules = new Map();
  const localPath = path => {
    const actual = realpathSync(path);
    if (actual !== root && !actual.startsWith(root + sep)) throw new Error('UI source escapes repository root');
    return actual;
  };
  const load = path => {
    path = localPath(path);
    if (modules.has(path)) return modules.get(path);
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    const variables = new Map(), imports = new Map();
    for (const statement of source.statements) {
      if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) variables.set(declaration.name.text, declaration.initializer);
      }
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        const target = statement.moduleSpecifier.text;
        const bindings = statement.importClause?.namedBindings;
        if (target.startsWith('.') && bindings && ts.isNamedImports(bindings)) for (const specifier of bindings.elements) {
          imports.set(specifier.name.text, {path: resolve(dirname(path), target), name: (specifier.propertyName ?? specifier.name).text});
        }
      }
    }
    const module = {source, variables, imports, path};
    modules.set(path, module);
    return module;
  };
  const unwrap = (node, module, seen = new Set()) => {
    if (!node) return {node, module};
    while (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node) || ts.isTypeAssertionExpression(node)) node = node.expression;
    if (ts.isIdentifier(node)) {
      const key = module.path + ':' + node.text;
      if (seen.has(key)) return {node: undefined, module};
      seen.add(key);
      if (module.variables.has(node.text)) return unwrap(module.variables.get(node.text), module, seen);
      const imported = module.imports.get(node.text);
      if (imported) {
        const path = [imported.path + '.ts', join(imported.path, 'index.ts')].find(existsSync);
        if (path) { const other = load(path); return unwrap(other.variables.get(imported.name), other, seen); }
      }
    }
    return {node, module};
  };
  const property = (node, module, name, seen = new Set()) => {
    ({node, module} = unwrap(node, module));
    if (!node || !ts.isObjectLiteralExpression(node) || seen.has(node)) return {node: undefined, module};
    seen = new Set(seen).add(node);
    let result = {node: undefined, module};
    for (const prop of node.properties) {
      if (ts.isSpreadAssignment(prop)) {
        const inherited = property(prop.expression, module, name, seen);
        if (inherited.node) result = inherited;
      } else if (ts.isPropertyAssignment(prop) && prop.name.getText(module.source).replace(/^['"]|['"]$/g, '') === name) {
        result = unwrap(prop.initializer, module);
      } else if (ts.isShorthandPropertyAssignment(prop) && prop.name.text === name) result = unwrap(prop.name, module);
    }
    return result;
  };
  const literal = ({node, module}) => {
    ({node, module} = unwrap(node, module));
    if (!node) return undefined;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    return undefined;
  };
  const file = (path, role, line = 1) => ({path: relative(root, localPath(path)).replaceAll('\\', '/'), role, line});
  const pages = [], diagnostics = [];
  for (const entry of discoverPages(join(root, 'src/app/features'))) {
    const stem = join(root, 'src/app/features', entry);
    const configPath = stem + '.config.ts', module = load(configPath);
    const exported = module.source.statements.filter(statement => ts.isVariableStatement(statement) && statement.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))
      .flatMap(statement => [...statement.declarationList.declarations]);
    const declarations = exported.map(declaration => ({declaration, pageId: literal(property(declaration.initializer, module, 'pageId'))})).filter(value => typeof value.pageId === 'string');
    if (declarations.length !== 1) throw new Error(`Expected one statically declared pageId in ${configPath}`);
    const {declaration, pageId} = declarations[0];
    const pageType = literal(property(declaration.initializer, module, 'pageType'));
    if (!['list','card','document','worksheet','setup'].includes(pageType)) throw new Error(`Invalid/unresolved pageType for ${pageId}`);
    const title = literal(property(declaration.initializer, module, 'title'));
    if (typeof title !== 'string') diagnostics.push(`Title expression unresolved for ${pageId}; using pageId in developer catalog only.`);
    const source = property(declaration.initializer, module, 'dataSource');
    const endpoint = literal(property(source.node, source.module, 'endpoint'));
    if (property(declaration.initializer, module, 'object').node) throw new Error(`Use optional objectId instead of duplicated object metadata for ${pageId}`);
    const idNode = property(declaration.initializer, module, 'objectId');
    const objectId = idNode.node ? literal(idNode) : null;
    if (idNode.node && (!Number.isInteger(objectId) || objectId < 1 || objectId > 2147483647)) throw new Error(`Invalid/unresolved objectId for ${pageId}`);
    const endpoints = new Set(typeof endpoint === 'string' ? [endpoint] : []);
    for (const candidate of exported) {
      const dataSource = property(candidate.initializer, module, 'dataSource');
      const value = literal(property(dataSource.node, dataSource.module, 'endpoint'));
      if (typeof value === 'string') endpoints.add(value);
    }
    const files = [file(configPath, 'Angular Config', module.source.getLineAndCharacterOfPosition(declaration.getStart(module.source)).line + 1)];
    const component = load(stem + '.ts');
    const classNode = component.source.statements.find(node => ts.isClassDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword));
    files.push(file(stem + '.ts', 'Angular TypeScript', classNode ? component.source.getLineAndCharacterOfPosition(classNode.getStart(component.source)).line + 1 : 1));
    const componentCall = classNode?.modifiers?.find(node => ts.isDecorator(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(component.source) === 'Component')?.expression;
    const template = componentCall && literal(property(componentCall.arguments[0], component, 'templateUrl'));
    if (typeof template === 'string') files.push(file(resolve(dirname(component.path), template), 'Angular Template'));
    for (const [suffix, role] of [['.factbox.config.ts','Angular FactBox'],['.scss','Angular Styles']]) {
      if (existsSync(stem + suffix)) files.push(file(stem + suffix, role));
    }
    pages.push({pageId, pageType, title: typeof title === 'string' ? title : pageId, objectId, endpoint: typeof endpoint === 'string' ? endpoint : null, endpoints: [...endpoints], files});
  }
  return {version: 1, pages, diagnostics};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rootIndex = process.argv.indexOf('--root');
  process.stdout.write(JSON.stringify(exportPageObjects(rootIndex < 0 ? projectRoot : process.argv[rootIndex + 1])) + '\n');
}
