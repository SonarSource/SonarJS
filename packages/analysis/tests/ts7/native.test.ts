import {
  clearProgramCache,
  prepareProgramRequest,
  finishProgramRequest,
  getCompilerGateway,
  configureCompilerInstrumentation,
  getProgramInstrumentation,
  getCompilerInfo,
  getProgramFileNames,
} from 'typescript/control';
import assert from 'node:assert/strict';
import ts from 'typescript';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { test } from 'node:test';
import {
  createStandardProgram,
  createProgramFromSingleFile,
  createOrGetCachedProgramForFile,
} from '../../src/jsts/program/factory.js';
import {
  createProgramOptions,
  createProgramOptionsFromJson,
} from '../../src/jsts/program/tsconfig/options.js';
import { build } from '../../src/jsts/builders/build.js';
import { parsersMap } from '../../src/jsts/parsers/eslint.js';
import { getNativeSession } from '../../src/jsts/native/session.mjs';
import { IncrementalCompilerHost } from '../../src/jsts/program/compilerHost.js';
import {
  setSourceFilesContext,
  clearSourceFileContentCache,
} from '../../src/jsts/program/cache/sourceFileCache.js';
import { normalizeToAbsolutePath } from '../../../shared/src/helpers/files.js';
import { analyzeProject } from '../../src/analyzeProject.js';
import { createConfigurationFromInput } from '../../src/common/configuration.js';
import { initFileStoresForAnalysis, tsConfigStore } from '../../src/file-stores/index.js';
import { sanitizeInputFiles } from '../../src/common/input-sanitize.js';

const root = normalizeToAbsolutePath(path.resolve('tools/ts7-benchmark/fixtures/project'));
const file = normalizeToAbsolutePath(path.join(root, 'index.ts'));

test('public program factory uses the selected libraries and exposes only diagnostic data', () => {
  clearProgramCache();
  configureCompilerInstrumentation({ collectTiming: true });
  const options = createProgramOptions(
    path.join(root, 'tsconfig.json'),
    undefined,
    true,
    undefined,
    root,
  );
  const host = new IncrementalCompilerHost(options.options, root, true);
  const library = ts.getDefaultLibFilePath(options.options);
  assert.equal(host.getDefaultLibLocation(), path.dirname(library));
  assert.ok(host.readFile(library)?.length, 'restriction must admit the selected compiler library');
  if (getCompilerInfo().backend === 'wasm')
    assert.ok(library.startsWith(getCompilerInfo().sdkRoot!.replaceAll('\\', '/')));
  const program = createStandardProgram({ ...options, host });
  try {
    const libraries = getProgramFileNames(program).filter(file =>
      path.basename(file).startsWith('lib.'),
    );
    assert.ok(libraries.length > 0);
    assert.ok(libraries.every(file => file.startsWith(path.dirname(library) + '/')));
    const metrics = getProgramInstrumentation(program)!;
    assert.ok(metrics.ipc.totals.requestCount > 0);
    assert.equal('api' in metrics, false);
    assert.equal('programs' in metrics, false);
    assert.equal('rawPrograms' in metrics, false);
    assert.deepEqual(metrics.failures, []);
  } finally {
    clearProgramCache();
    configureCompilerInstrumentation({ collectTiming: false });
  }
});

function checkType(program, code, expected) {
  const parsed = build({
    filePath: file,
    fileContent: code,
    program,
    tsConfigs: [],
    language: 'ts',
    allowTsParserJsFiles: true,
  } as never);
  const ast = parsed.sourceCode.ast as any;
  const identifier = ast.body[0].declarations[0].id;
  const services = parsed.sourceCode.parserServices as any;
  const mapped = services.esTreeNodeToTSNodeMap.get(identifier);
  const checker = services.program.getTypeChecker();
  assert.equal(checker.typeToString(checker.getTypeAtLocation(mapped)), expected);
  assert.equal(services.tsNodeToESTreeNodeMap.get(mapped), identifier);
  assert.equal(services.program, program);
  assert.equal(parsed.parser, parsersMap.typescript);
  return parsed;
}

test('production factory and released parser share the native compiler contract and node maps', () => {
  const code = 'const value: string = "native"; value.trim();';
  setSourceFilesContext({ [file]: { fileContent: code } });
  try {
    const program = createStandardProgram(
      createProgramOptions(
        normalizeToAbsolutePath(path.join(root, 'tsconfig.json')),
        undefined,
        true,
        undefined,
        root,
      ),
    );
    assert.ok(getNativeSession(program));
    assert.ok(program.getRootFileNames().includes(file));
    assert.ok(program.getSourceFile(file));
    assert.deepEqual(program.getProjectReferences() ?? [], []);
    checkType(program, code, 'string');
    const gateway = getCompilerGateway();
    assert.equal(gateway.provider, process.env.SONARJS_NATIVE_TEST_BACKEND ?? 'ts7');
    if (gateway.provider === 'wasm') {
      assert.ok((globalThis as any).__sonarjsWasm);
      assert.equal(getNativeSession(program)!.api.client.channel.child, undefined);
      assert.equal((globalThis as any)[Symbol.for('sonarjs.ts7.processes')].size, 0);
    }
    assert.equal(gateway.facade, ts);
    assert.ok(
      gateway
        .observations()
        .some(
          ({ importer, specifier }) =>
            importer.includes('/node_modules/@typescript-eslint/typescript-estree/') &&
            specifier === 'typescript',
        ),
    );
  } finally {
    clearProgramCache();
    clearSourceFileContentCache();
  }
});

test('production programs resolve standard library types through the selected provider', () => {
  const code = 'const value = ["native"].map(text => text.length);';
  setSourceFilesContext({ [file]: { fileContent: code } });
  try {
    const program = createStandardProgram(
      createProgramOptions(
        normalizeToAbsolutePath(path.join(root, 'tsconfig.json')),
        undefined,
        true,
        undefined,
        root,
      ),
    );
    checkType(program, code, 'number[]');
  } finally {
    clearProgramCache();
    clearSourceFileContentCache();
  }
});

test('single-file production factory uses native parsing, including S125 fragments', () => {
  const code = 'const value: number = 42;';
  try {
    const program = createProgramFromSingleFile(file, code);
    const parsed = checkType(program, code, 'number');
    assert.equal(parsed.parser.parse('const commented = 42;', { filePath: file }).body.length, 1);
  } finally {
    clearProgramCache();
    clearSourceFileContentCache();
  }
});

test('Vue keeps syntax-only analysis when a native program is supplied', () => {
  const code = 'const value: number = 42;';
  try {
    const program = createProgramFromSingleFile(file, code);
    const parsed = build({
      filePath: file.replace(/\.ts$/, '.vue'),
      fileContent: `<script lang="ts">${code}</script><template><p>{{ value }}</p></template>`,
      program,
      tsConfigs: [path.join(root, 'tsconfig.json')],
      language: 'ts',
      allowTsParserJsFiles: true,
    } as never);
    assert.equal(parsed.parser.meta?.name, 'vue-eslint-parser');
    assert.equal(parsed.sourceCode.ast.body.length, 1);
    assert.ok(!(parsed.sourceCode.parserServices as any).program);
  } finally {
    clearProgramCache();
    clearSourceFileContentCache();
  }
});

test('IDE updates snapshots without replacing the native process or synthetic project', () => {
  const options = () =>
    createProgramOptions(
      normalizeToAbsolutePath(path.join(root, 'tsconfig.json')),
      undefined,
      true,
      undefined,
      root,
    );
  try {
    setSourceFilesContext({ [file]: { fileContent: 'const value: string = "old";' } });
    const before = createOrGetCachedProgramForFile(root, file, options)!;
    const session = getNativeSession(before)!;
    const api = session.api;
    const projectId = session.rawPrograms[0].id;
    assert.equal(createOrGetCachedProgramForFile(root, file, options), before);
    checkType(before, 'const value: string = "old";', 'string');
    finishProgramRequest(true);
    assert.ok(getNativeSession(before));
    clearSourceFileContentCache();
    setSourceFilesContext({ [file]: { fileContent: 'const value: number = 42;' } });
    const after = createOrGetCachedProgramForFile(root, file, options)!;
    assert.notEqual(after, before);
    assert.equal(getNativeSession(after), session);
    assert.equal(session.api, api);
    assert.equal(session.rawPrograms[0].id, projectId);
    assert.equal(getNativeSession(before), undefined);
    checkType(after, 'const value: number = 42;', 'number');
    const snapshot = session.snapshot;
    clearSourceFileContentCache();
    setSourceFilesContext({ [file]: { fileContent: 'const value: number = 42;' } });
    assert.equal(createOrGetCachedProgramForFile(root, file, options), after);
    assert.equal(session.snapshot, snapshot);
  } finally {
    clearProgramCache();
    clearSourceFileContentCache();
  }
});

test('IDE dependency edits retain omitted buffers and reuse unchanged native source files', () => {
  const dependency = normalizeToAbsolutePath(path.join(root, 'changed-model.ts'));
  const other = normalizeToAbsolutePath(path.join(root, 'unchanged.ts'));
  const code = 'const value = dependency; import { dependency } from "./changed-model";';
  const options = () =>
    createProgramOptionsFromJson({ noLib: true, noEmit: true }, [file, dependency, other], root);
  try {
    setSourceFilesContext({
      [file]: { fileContent: code },
      [dependency]: { fileContent: 'export const dependency: string = "old";' },
      [other]: { fileContent: 'export const unchanged = 1;' },
    });
    const before = createOrGetCachedProgramForFile(root, file, options)!;
    checkType(before, code, 'string');
    const session = getNativeSession(before)!;
    const source = session.rawPrograms[0].getSourceFile(other);
    assert.ok(source.nodeId, 'Native source identity must be observable');
    clearSourceFileContentCache();
    setSourceFilesContext({
      [dependency]: { fileContent: 'export const dependency: number = 42;' },
    });
    const after = createOrGetCachedProgramForFile(root, file, options)!;
    assert.equal(getNativeSession(after), session);
    checkType(after, code, 'number');
    assert.equal(session.rawPrograms[0].getSourceFile(other).nodeId, source.nodeId);
    assert.equal(session.rawPrograms[0].getSourceFile(file).text, code);
  } finally {
    clearProgramCache();
    clearSourceFileContentCache();
  }
});

test('IDE filesystem notifications update, remove and recreate dependencies without respawning', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sonarjs-ts7-incremental-'));
  const cwd = normalizeToAbsolutePath(directory);
  const entry = normalizeToAbsolutePath(path.join(directory, 'index.ts'));
  const dependency = normalizeToAbsolutePath(path.join(directory, 'model.ts'));
  const code = 'const value = dependency; import { dependency } from "./model";';
  const options = () => createProgramOptionsFromJson({ noLib: true, noEmit: true }, [entry], cwd);
  const typeOfValue = program => {
    const parsed = build({
      filePath: entry,
      fileContent: code,
      program,
      tsConfigs: [],
      language: 'ts',
      allowTsParserJsFiles: true,
    } as never).sourceCode;
    const services = parsed.parserServices as any;
    const node = (parsed.ast as any).body[0].declarations[0].id;
    const checker = services.program.getTypeChecker();
    return checker.typeToString(
      checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node)),
    );
  };
  try {
    fs.writeFileSync(entry, code);
    fs.writeFileSync(dependency, 'export const dependency: string = "old";');
    setSourceFilesContext({ [entry]: { fileContent: code } });
    const first = createOrGetCachedProgramForFile(cwd, entry, options)!;
    const session = getNativeSession(first)!;
    assert.equal(typeOfValue(first), 'string');
    for (const [text, expected] of [
      ['export const dependency: number = 42;', 'number'],
      [undefined, 'any'],
      ['export const dependency: boolean = true;', 'boolean'],
    ] as const) {
      if (text === undefined) fs.unlinkSync(dependency);
      else fs.writeFileSync(dependency, text);
      clearSourceFileContentCache();
      setSourceFilesContext({ [entry]: { fileContent: code } });
      prepareProgramRequest(text === undefined ? [cwd] : [dependency]);
      const program = createOrGetCachedProgramForFile(cwd, entry, options)!;
      assert.equal(getNativeSession(program), session);
      assert.equal(typeOfValue(program), expected);
    }
  } finally {
    clearProgramCache();
    clearSourceFileContentCache();
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('sonarjs-ts7-incremental-'));
    fs.rmSync(directory, { recursive: true });
  }
});

test('normal project analysis releases scanner ownership but retains IDE ownership', async () => {
  try {
    for (const sonarlint of [false, true]) {
      let session;
      for (const [code, expected] of sonarlint
        ? [
            ['const value: string = "old";;', 'string'],
            ['const value: number = 42;;', 'number'],
          ]
        : [['const value: number = 42;;', 'number']]) {
        const configuration = createConfigurationFromInput({ baseDir: root, sonarlint });
        const input = await sanitizeInputFiles(
          {
            [file]: {
              filePath: file,
              fileContent: '// const commentedOut = 42;\n' + code,
              fileType: 'MAIN',
            },
          },
          configuration,
        );
        await initFileStoresForAnalysis(configuration, input.files);
        const result = await analyzeProject(
          {
            rules: ['S1116', 'S125'].map(key => ({
              key,
              configurations: [],
              fileTypeTargets: ['MAIN'],
              language: 'ts',
              analysisModes: ['DEFAULT'],
            })),
            bundles: [],
          },
          configuration,
        );
        const output = result.files[file];
        assert.ok(output && !('error' in output), JSON.stringify(output));
        assert.ok(
          'issues' in output &&
            output.issues.some(issue => issue.ruleId === 'S125' && issue.line === 1),
        );
        if (sonarlint) {
          const program = createOrGetCachedProgramForFile(root, file, () => {
            throw new Error('The IDE analysis should have retained its native program');
          })!;
          const currentSession = getNativeSession(program)!;
          if (session) assert.equal(currentSession, session);
          session = currentSession;
          checkType(program, '// const commentedOut = 42;\n' + code, expected);
        }
      }
    }
  } finally {
    clearProgramCache();
    clearSourceFileContentCache();
  }
});

test('caught unsupported adapter members still fail production cleanup', () => {
  const program = createProgramFromSingleFile(file, 'const value = 42;');
  assert.throws(() => program.getNodeCount(), /not available|Unsupported|not implemented/i);
  assert.throws(() => finishProgramRequest(true), /Unsupported native adapter member/);
  assert.equal(getNativeSession(program), undefined);
  clearSourceFileContentCache();
});

test('IDE cache eviction and configuration reset release native ownership', () => {
  const sessions: ReturnType<typeof getNativeSession>[] = [];
  try {
    for (let index = 0; index < 11; index++) {
      const entry = normalizeToAbsolutePath(path.join(root, `cache-${index}.ts`));
      clearSourceFileContentCache();
      setSourceFilesContext({ [entry]: { fileContent: 'const value = 42;' } });
      const program = createOrGetCachedProgramForFile(root, entry, () =>
        createProgramOptionsFromJson({ noLib: true, noEmit: true }, [entry], root),
      )!;
      sessions.push(getNativeSession(program)!);
    }
    assert.equal(sessions[0].snapshot.isDisposed(), true);
    assert.ok(getNativeSession(sessions[1].programs[0]));
    assert.ok(getNativeSession(sessions[10].programs[0]));
    tsConfigStore.clearCache();
    for (const session of sessions) assert.equal(session.snapshot.isDisposed(), true);
  } finally {
    clearProgramCache();
    clearSourceFileContentCache();
  }
});

test('native provider honors standard compiler-host callbacks without extra host methods', () => {
  const hosted = normalizeToAbsolutePath(path.join(root, 'host-only.ts'));
  const code = 'export const value: string = "hosted";';
  const reads: string[] = [];
  const host = ts.createCompilerHost({ noLib: true, noEmit: true, types: [] });
  host.getCurrentDirectory = () => root;
  host.fileExists = file => file === hosted;
  host.readFile = file => {
    reads.push(file);
    return file === hosted ? code : undefined;
  };
  host.directoryExists = directory => directory === root;
  host.getDirectories = () => [];
  try {
    const program = ts.createProgram([hosted], { noLib: true, noEmit: true, types: [] }, host);
    assert.equal(program.getCurrentDirectory(), root);
    const source = program.getSourceFile(hosted)!;
    assert.equal(source.text, code);
    const declaration = (source.statements[0] as ts.VariableStatement).declarationList
      .declarations[0];
    const checker = program.getTypeChecker();
    assert.equal(checker.typeToString(checker.getTypeAtLocation(declaration.name)), 'string');
    assert.ok(reads.includes(hosted));
    assert.ok(getNativeSession(program));
  } finally {
    clearProgramCache();
    clearSourceFileContentCache();
  }
});

test('native provider rejects unsupported compiler constructors without a TS6 fallback', () => {
  assert.throws(
    () => ts.createLanguageService({} as ts.LanguageServiceHost),
    /TS7 does not implement createLanguageService/,
  );
  assert.throws(() => finishProgramRequest(false), /TS7 does not implement createLanguageService/);
});
