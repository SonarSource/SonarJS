import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const relative = name => path.relative(root, name).replaceAll('\\', '/');
const configPath = path.join(root, 'packages/tsconfig.app.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
if (parsed.errors.length) throw new Error('Cannot parse application compiler configuration');
const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
const checker = program.getTypeChecker();
const operations = new Map();
const imports = [];
const sdkDeclaration = /\/node_modules\/(?:typescript-classic|typescript)\/lib\/typescript\.d\.ts$/;
const bridgePackage = /^(?:typescript(?:-classic)?(?:\/.*)?|ts-api-utils|@typescript-eslint\/.*)$/;

for (const source of program.getSourceFiles()) {
  const file = relative(source.fileName);
  if (!file.startsWith('packages/') || !file.includes('/src/') || source.isDeclarationFile)
    continue;
  // The integration is an implementation, not an owned consumer to migrate.
  if (file.includes('/jsts/native/')) continue;
  const visit = node => {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const module = node.moduleSpecifier.text;
      if (bridgePackage.test(module)) imports.push({ file, line, module });
    }
    const computed =
      ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression);
    const binding = ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent);
    if (ts.isPropertyAccessExpression(node) || ts.isQualifiedName(node) || computed || binding) {
      const name = ts.isQualifiedName(node)
        ? node.right
        : computed
          ? node.argumentExpression
          : binding
            ? (node.propertyName ?? node.name)
            : node.name;
      const symbol = binding
        ? checker.getPropertyOfType(checker.getTypeAtLocation(node.parent), name.text)
        : computed
          ? checker.getPropertyOfType(checker.getTypeAtLocation(node.expression), name.text)
          : checker.getSymbolAtLocation(name);
      const declarations = symbol
        ?.getDeclarations()
        ?.filter(decl => sdkDeclaration.test(decl.getSourceFile().fileName.replaceAll('\\', '/')));
      if (declarations?.length) {
        const declaration = declarations[0];
        const owner = declaration.parent?.name?.getText() ?? 'ts';
        const operation = `${owner}.${name.text}`;
        const entry = operations.get(operation) ?? { operation, uses: [] };
        const call = ts.isCallExpression(node.parent) && node.parent.expression === node;
        entry.uses.push({ file, line, expression: node.getText(source), call });
        operations.set(operation, entry);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

const report = {
  scope:
    'Application packages/*/src excluding jsts/native and declaration files; static SDK declaration resolution, not runtime coverage.',
  limitations: [
    'Does not traverse third-party implementations, nonliteral computed property names, any-typed members or dynamic dispatch.',
    'Imports identify delegated utility dependencies; their transitive compiler use needs private-bridge conformance tests.',
    'Inherited member names retain their SDK declaration owner; occurrence counts are not execution counts.',
  ],
  imports: imports.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
  operations: [...operations.values()].sort((a, b) => a.operation.localeCompare(b.operation)),
};
const output = path.join(root, 'tools/ts7-benchmark/out/typescript-consumer-inventory.json');
const content = JSON.stringify(report, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(output, 'utf8') !== content)
    throw new Error('Inventory changed; regenerate it');
} else {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, content);
}
console.log(
  JSON.stringify(
    {
      filesWithImports: new Set(imports.map(item => item.file)).size,
      operations: operations.size,
      occurrences: report.operations.reduce((count, item) => count + item.uses.length, 0),
      checker: report.operations
        .filter(item => item.operation.startsWith('TypeChecker.'))
        .map(item => item.operation),
    },
    null,
    2,
  ),
);
