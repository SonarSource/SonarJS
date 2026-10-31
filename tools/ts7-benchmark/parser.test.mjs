import '../../packages/analysis/src/jsts/native/compatibility.mjs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { SourceCode } from 'eslint';
import { API } from 'typescript-native/sync';
import { createFileSystemWithLib } from 'typescript-native/fs';
import parser from '@typescript-eslint/parser';
import { createCompatibleProgram } from '../../packages/typescript/native-compat.mjs';

test('released parser ESTree maps round-trip to the owned program and checker', () => {
  const cwd = path.resolve('tools/ts7-benchmark/virtual-project');
  const file = path.join(cwd, 'mapping.ts').replaceAll('\\', '/');
  const text = 'const value: string = "hello";\nvalue.trim();\n';
  const api = new API({ cwd });
  let snapshot;
  try {
    snapshot = api.createSnapshot({
      fileSystem: createFileSystemWithLib([[file, text]]),
      createPrograms: [{ rootFiles: [file], compilerOptions: { strict: true, noEmit: true } }],
    });
    const project = snapshot.getProject(snapshot.operation.createdPrograms[0].id);
    const program = createCompatibleProgram(api, project);
    const result = parser.parseForESLint(text, {
      programs: [program],
      filePath: file,
      tsconfigRootDir: cwd,
      sourceType: 'module',
      ecmaVersion: 'latest',
    });
    const identifier = result.ast.body[0].declarations[0].id;
    const mapped = result.services.esTreeNodeToTSNodeMap.get(identifier);
    assert.ok(mapped);
    assert.equal(result.services.tsNodeToESTreeNodeMap.get(mapped), identifier);
    const checker = result.services.program.getTypeChecker();
    assert.equal(checker.typeToString(checker.getTypeAtLocation(mapped)), 'string');
    assert.ok(result.scopeManager.scopes.length > 0);
    assert.equal(result.services.program, program);
    assert.equal(parser.version, '8.71.1');
  } finally {
    snapshot?.dispose();
    api.close();
  }
});

function withNativeServices(filename, text, check, extraOptions = {}) {
  const cwd = path.resolve('tools/ts7-benchmark/virtual-project');
  const file = path.join(cwd, filename).replaceAll('\\', '/');
  const api = new API({ cwd });
  let snapshot;
  try {
    snapshot = api.createSnapshot({
      fileSystem: createFileSystemWithLib([[file, text]]),
      createPrograms: [{ rootFiles: [file], compilerOptions: { strict: true, noEmit: true } }],
    });
    const project = snapshot.getProject(snapshot.operation.createdPrograms[0].id);
    const result = parser.parseForESLint(text, {
      programs: [createCompatibleProgram(api, project)],
      filePath: file,
      tsconfigRootDir: cwd,
      sourceType: 'module',
      ecmaVersion: 'latest',
      ...extraOptions,
    });
    check(result, file);
  } finally {
    snapshot?.dispose();
    api.close();
  }
}

test('synthesized type-reference nodes do not require a parent', () => {
  withNativeServices(
    'synthesized.ts',
    'interface Item { value: string }\nconst item: Item = { value: "text" };',
    result => {
      const identifier = result.ast.body.find(node => node.type === 'VariableDeclaration')
        .declarations[0].id;
      const checker = result.services.program.getTypeChecker();
      const type = checker.getTypeAtLocation(result.services.esTreeNodeToTSNodeMap.get(identifier));
      const node = checker.typeToTypeNode(type, undefined, undefined);
      assert.ok(node);
      assert.equal(checker.typeToString(type), 'Item');
    },
  );
});

test('SonarJS suggestion-diagnostics shim preserves deprecation locations', () => {
  const text = '/** @deprecated Use another function. */\nfunction old() { return 1; }\nold();';
  withNativeServices('deprecated.ts', text, (result, file) => {
    const program = result.services.program;
    const source = program.getSourceFile(file);
    const diagnostics = program.getTypeChecker().getSuggestionDiagnostics(source);
    const deprecated = diagnostics.find(diagnostic => diagnostic.reportsDeprecated);
    assert.ok(deprecated);
    assert.equal(deprecated.file, source);
    assert.equal(text.slice(deprecated.start, deprecated.start + deprecated.length), 'old');
    assert.ok(deprecated.messageText);
  });
});

test('released parser conversion and maps support TSX without a second converter', () => {
  withNativeServices(
    'view.tsx',
    'export const element = <div title="hello" />;',
    result => {
      const jsx = result.ast.body[0].declaration.declarations[0].init;
      assert.equal(jsx.type, 'JSXElement');
      const mapped = result.services.esTreeNodeToTSNodeMap.get(jsx);
      assert.ok(mapped);
      assert.equal(result.services.tsNodeToESTreeNodeMap.get(mapped), jsx);
    },
    { ecmaFeatures: { jsx: true } },
  );
});

test('syntax-only parser accepts comment fragments without replacing the owned program', () => {
  const cwd = path.resolve('tools/ts7-benchmark/virtual-project');
  const file = path.join(cwd, 'owned.ts').replaceAll('\\', '/');
  const text = 'export const value: string = "owned";';
  const api = new API({ cwd });
  let snapshot;
  try {
    snapshot = api.createSnapshot({
      fileSystem: createFileSystemWithLib([[file, text]]),
      createPrograms: [{ rootFiles: [file], compilerOptions: { strict: true, noEmit: true } }],
    });
    const project = snapshot.getProject(snapshot.operation.createdPrograms[0].id);
    const failures = [];
    const program = createCompatibleProgram(api, project, (method, error) =>
      failures.push({ method, message: error.message }),
    );
    const options = {
      filePath: path.join(cwd, 'placeholder.ts'),
      tsconfigRootDir: cwd,
      tokens: false,
    };
    const expression = parser.parse('value.trim();', options);
    assert.equal(expression.body[0].type, 'ExpressionStatement');
    assert.equal(
      new SourceCode('value.trim();', expression).getLastToken(expression.body[0]).value,
      ';',
    );
    assert.equal(
      parser.parse('const item: number = 42;', options).body[0].type,
      'VariableDeclaration',
    );
    assert.throws(() => parser.parse('const = ;', options));
    assert.deepEqual(failures, []);
    assert.equal(project.program.getSourceFile(file).text, text);
    const result = parser.parseForESLint(text, {
      programs: [program],
      filePath: file,
      tsconfigRootDir: cwd,
    });
    const identifier = result.ast.body[0].declaration.declarations[0].id;
    const checker = result.services.program.getTypeChecker();
    assert.equal(
      checker.typeToString(
        checker.getTypeAtLocation(result.services.esTreeNodeToTSNodeMap.get(identifier)),
      ),
      'string',
    );
  } finally {
    snapshot?.dispose();
    api.close();
  }
});
