import assert from 'node:assert/strict';
import path from 'node:path';
import { API } from 'typescript-native/sync';
import { createFileSystemWithLib } from 'typescript-native/fs';
import { isVariableStatement } from 'typescript-native/ast/is';
import { createNativeFileSystem } from '../../packages/analysis/src/jsts/native/filesystem.mjs';

export function runSmoke(mode = 'callbacks') {
  const cwd = path.resolve('tools/ts7-benchmark/virtual-project');
  const source = path.join(cwd, 'index.ts').replaceAll('\\', '/');
  const dependency = path.join(cwd, 'model.ts').replaceAll('\\', '/');
  const files = new Map([
    [source, 'import { message } from "./model";\nexport const result = message;\n'],
    [dependency, 'export const message: string = "native";\n'],
  ]);
  const adapter = createNativeFileSystem({ cwd, requestFiles: files });
  const api = new API({
    cwd,
    useCaseSensitiveFileNames: true,
    collectTiming: true,
    ...(mode === 'callbacks' ? { fs: adapter.callbacks } : {}),
  });
  let snapshot;
  try {
    const start = performance.now();
    snapshot = api.createSnapshot({
      ...(mode === 'vfs' ? { fileSystem: createFileSystemWithLib([...files]) } : {}),
      createPrograms: [{ rootFiles: [source], compilerOptions: { strict: true, noEmit: true } }],
    });
    const program = snapshot.operation.createdPrograms[0];
    const project = snapshot.getProject(program.id);
    assert.ok(project, 'SonarJS must be able to supply the project to the parser');
    const sourceFile = program.getSourceFile(source);
    assert.ok(sourceFile);
    assert.equal(sourceFile.text, files.get(source));
    assert.ok(program.getSourceFileNames().includes(dependency));
    const statement = sourceFile.statements.find(isVariableStatement);
    const declaration = statement.declarationList.declarations[0];
    const type = project.checker.getTypeAtLocation(declaration.name);
    assert.equal(project.checker.typeToString(type), 'string');
    const diagnostics = program.getSemanticDiagnostics(source);
    assert.equal(diagnostics.length, 0, JSON.stringify(diagnostics));
    adapter.assertHealthy();
    return {
      mode,
      elapsedMs: performance.now() - start,
      sourceFileCount: program.getSourceFileNames().length,
      type: project.checker.typeToString(type),
      filesystem: adapter.getMetrics(),
      timing: api.getTimingInfo(),
    };
  } finally {
    snapshot?.dispose();
    api.close();
  }
}

if (process.argv[1]?.endsWith('smoke.mjs')) {
  console.log(JSON.stringify(['callbacks', 'vfs'].map(runSmoke), null, 2));
}
