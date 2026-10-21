/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import * as sdk from 'typescript-go/sync';
import * as native from 'typescript-go/ast';
import { serverFS } from 'typescript-go/fs';
import metadata from 'typescript-go/package.json' with { type: 'json' };
import configuration from '../../providers.json' with { type: 'json' };
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from '../../compat/index.cjs';
import { CompilerContractError } from '../../errors.cjs';
import { sys, normalize, nativePaths, restorePaths, nativeFileSystem } from './filesystem.mjs';
import { createRuntime } from './runtime.mjs';
import { createObjects } from './objects.mjs';
import { createConfiguration } from './config.mjs';

const descriptor = configuration.providers['tsgo-ipc'];
const packaged = typeof __SONARJS_COMPILER_BUNDLE__ !== 'undefined';
const libraryDirectory = packaged
  ? path.resolve(__dirname, descriptor.libraryDestination ?? '')
  : fileURLToPath(new URL('../../' + descriptor.libraries + '/', import.meta.url));
const executable = path.join(
  libraryDirectory,
  `tsc-${process.platform}-${process.arch}${process.platform === 'win32' ? '.exe' : ''}`,
);
const runtime = createRuntime(sdk.API, serverFS, executable, metadata.version);
const finalizers = new FinalizationRegistry(({ call, snapshot }) => {
  try {
    call(() => snapshot.dispose());
  } catch {}
});
export const close = () => runtime.close();
export const timing = () => runtime.timing();
const config = createConfiguration(runtime);
const getDefaultLibFilePath = (options = {}) => {
  const target = options.target ?? ts.ScriptTarget.ESNext;
  const name =
    target <= ts.ScriptTarget.ES5
      ? 'lib.d.ts'
      : target === ts.ScriptTarget.ES2015
        ? 'lib.es6.d.ts'
        : `lib.${target === ts.ScriptTarget.ESNext ? 'esnext' : ts.ScriptTarget[target].toLowerCase()}.full.d.ts`;
  return path.join(libraryDirectory, name).replaceAll('\\', '/');
};
const diagnostic = (value, getFile) => ({
  category: value.category,
  code: value.code,
  file: value.fileName && getFile?.(value.fileName),
  start: value.pos,
  length: value.end - value.pos,
  messageText: value.messageChain?.length
    ? {
        category: value.category,
        code: value.code,
        messageText:
          value.code === 6387
            ? value.text.replace("The signature 'new (", "The signature '(")
            : value.text,
        next: value.messageChain.map(item => diagnostic(item).messageText),
      }
    : value.code === 6387
      ? value.text.replace("The signature 'new (", "The signature '(")
      : value.text,
  reportsDeprecated: value.reportsDeprecated,
  reportsUnnecessary: value.reportsUnnecessary,
  relatedInformation: value.relatedInformation?.map(item => diagnostic(item, getFile)),
});
const supportedSyntax = values => values.filter(value => value.code !== 2880);
const defaultReaders = new WeakMap();

function createCompilerHost(options = {}) {
  const host = {
    ...sys,
    getDefaultLibLocation: () => libraryDirectory,
    getDefaultLibFileName: getDefaultLibFilePath,
    getCanonicalFileName: file => (sys.useCaseSensitiveFileNames ? file : file.toLowerCase()),
    useCaseSensitiveFileNames: () => sys.useCaseSensitiveFileNames,
    getNewLine: () => sys.newLine,
  };
  host.getSourceFile = (file, version) => {
    const text = host.readFile(file);
    return text === undefined ? undefined : createSourceFile(file, text, version ?? options.target);
  };
  defaultReaders.set(host, host.getSourceFile);
  return host;
}

export function createProgram(input, options, host) {
  if (Array.isArray(input)) input = { rootNames: input, options, host };
  const callbacks = input.host ?? createCompilerHost(input.options);
  const cwd = callbacks.getCurrentDirectory?.() ?? sys.getCurrentDirectory();
  const reversed = new Map();
  const nativePath = file => nativePaths(normalize(file, cwd), reversed);
  const rootPaths = new Map(input.rootNames.map(file => [nativePath(file), file]));
  const roots = [...rootPaths.keys()];
  const hostPath = file => rootPaths.get(file) ?? restorePaths(file, reversed);
  const overlays = new Map();
  const readSource = file =>
    typeof callbacks.getSourceFileText === 'function'
      ? callbacks.getSourceFileText(file)
      : defaultReaders.get(callbacks) === callbacks.getSourceFile
        ? callbacks.readFile(file)
        : (callbacks.getSourceFile?.(file, input.options?.target ?? ts.ScriptTarget.Latest)?.text ??
          callbacks.readFile(file));
  for (const file of roots) {
    const text = readSource(rootPaths.get(file));
    if (text !== undefined) overlays.set(file, text);
  }
  const callbacksWithOverlays = Object.assign(nativeFileSystem(callbacks, reversed), {
    // getSourceFile can itself invoke the native parser. Never call it from a
    // native filesystem callback: synchronous RPCs cannot be re-entered.
    readFile: file =>
      overlays.get(file) ??
      callbacks.getSourceFileText?.(hostPath(file)) ??
      callbacks.readFile(hostPath(file)),
    fileExists: file => overlays.has(file) || callbacks.fileExists(hostPath(file)),
  });
  const call = runtime.bind(callbacksWithOverlays);
  const snapshot = call(api =>
    api.createSnapshot({
      createPrograms: [
        {
          rootFiles: roots,
          compilerOptions: nativePaths(input.options ?? {}, reversed),
          options: { projectReferences: nativePaths(input.projectReferences, reversed) },
        },
      ],
    }),
  );
  const raw = snapshot.operation.createdPrograms[0];
  const remote = snapshot.getProject(raw.id).checker;
  let disposed = false;
  const checked = operation => {
    if (disposed) throw new CompilerContractError('TSGo IPC program was disposed');
    return call(operation);
  };
  const objects = createObjects({
    native,
    sdk,
    checker: remote,
    call: checked,
    diagnostics: (file, method = 'getSyntacticDiagnostics') =>
      supportedSyntax(checked(() => raw[method](file.fileName)))
        .filter(value => value.code < 8000 || value.code >= 9000)
        .map(value => diagnostic(value, getSourceFile)),
  });
  function getSourceFile(file) {
    const rawFile = checked(() => raw.getSourceFile(nativePath(file)));
    const wrapped = objects.wrap(rawFile);
    if (wrapped) wrapped.fileName = hostPath(rawFile.fileName);
    return wrapped;
  }
  const program = {
    getSourceFile,
    getSourceFileByPath: getSourceFile,
    getSourceFiles: () => checked(() => raw.getSourceFileNames()).map(getSourceFile),
    getRootFileNames: () => input.rootNames,
    getCompilerOptions: () => input.options ?? {},
    getCurrentDirectory: () => cwd,
    getProjectReferences: () => input.projectReferences,
    getResolvedProjectReferences: () => undefined,
    getTypeChecker: () => objects.checker,
    isSourceFileDefaultLibrary: file =>
      checked(() => raw.isSourceFileDefaultLibrary(objects.unwrap(file))),
    isSourceFileFromExternalLibrary: file =>
      checked(() => raw.isSourceFileFromExternalLibrary(objects.unwrap(file))),
    getModeForUsageLocation: (file, usage) =>
      checked(() => raw.getModeForUsageLocation(nativePath(file.fileName), objects.unwrap(usage))),
    getModeForResolutionAtIndex: (file, index) =>
      checked(() => raw.getModeForResolutionAtIndex(nativePath(file.fileName), index)),
    getResolvedModule: (file, name, mode) =>
      checked(() => raw.getResolvedModule(file.fileName, name, mode)),
    sourceFileToPackageName: {
      get: file => /node_modules\/(\@[^/]+\/[^/]+|[^/]+)/.exec(file)?.[1],
    },
    dispose() {
      if (disposed) return;
      call(() => snapshot.dispose());
      disposed = true;
      finalizers.unregister(program);
    },
  };
  for (const [name, target] of Object.entries({
    getSyntacticDiagnostics: 'getSyntacticDiagnostics',
    getSemanticDiagnostics: 'getSemanticDiagnostics',
    getOptionsDiagnostics: 'getProgramDiagnostics',
    getGlobalDiagnostics: 'getGlobalDiagnostics',
    getConfigFileParsingDiagnostics: 'getConfigFileParsingDiagnostics',
    getDeclarationDiagnostics: 'getDeclarationDiagnostics',
  }))
    program[name] = file => {
      const values = checked(() => raw[target](file && nativePath(file.fileName)));
      return (name === 'getSyntacticDiagnostics' ? supportedSyntax(values) : values).map(value =>
        diagnostic(value, getSourceFile),
      );
    };
  finalizers.register(program, { call, snapshot }, program);
  return program;
}
export function createSourceFile(file, text, version, _setParents, scriptKind) {
  const requested =
    scriptKind ??
    (/\.tsx$/i.test(file)
      ? ts.ScriptKind.TSX
      : /\.jsx$/i.test(file)
        ? ts.ScriptKind.JSX
        : /\.[cm]?js$/i.test(file)
          ? ts.ScriptKind.JS
          : ts.ScriptKind.TS);
  const extensions = {
    [ts.ScriptKind.TS]: '.ts',
    [ts.ScriptKind.TSX]: '.tsx',
    [ts.ScriptKind.JS]: '.js',
    [ts.ScriptKind.JSX]: '.jsx',
  };
  const originalName = normalize(file);
  const nativeName = nativePaths(originalName);
  const inferred = /\.tsx$/i.test(file)
    ? ts.ScriptKind.TSX
    : /\.jsx$/i.test(file)
      ? ts.ScriptKind.JSX
      : /\.[cm]?js$/i.test(file)
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;
  const name =
    /\.[cm]?[jt]sx?$/i.test(file) && inferred === requested
      ? nativeName
      : nativeName + '.__sonarjs' + (extensions[requested] ?? '.ts');
  const callbacks = {
    ...createCompilerHost({ noLib: true }),
    readFile: f => (f === name ? text : undefined),
    fileExists: f => f === name,
    getSourceFile: f => (f === name ? { text } : undefined),
    directoryExists: () => true,
    readDirectory: () => [],
    getDirectories: () => [],
  };
  // Use a short-lived native program to get parser diagnostics together with its
  // AST. The decoded syntax stays local after the remote snapshot is released.
  const program = createProgram({
    rootNames: [name],
    options: { noLib: true, noResolve: true, allowJs: true },
    host: callbacks,
  });
  const result = program.getSourceFile(name);
  result.parseDiagnostics = program
    .getSyntacticDiagnostics(result)
    .filter(value => value.code < 8000 || value.code >= 9000);
  result.languageVersion =
    typeof version === 'number' ? version : (version?.languageVersion ?? ts.ScriptTarget.Latest);
  result.fileName = originalName;
  if (typeof version === 'object') version.setExternalModuleIndicator?.(result);
  program.dispose();
  return result;
}
const unsupported = name => () => {
  throw new CompilerContractError(`TSGo IPC does not implement ${name}`);
};
const scannerKind = value => ts.SyntaxKind[native.SyntaxKind[value]];
const visitComments = method => (text, pos, visitor, state) =>
  native[method](text, pos, (start, end, kind, newline) =>
    visitor(start, end, scannerKind(kind), newline, state),
  );
export default {
  ...ts,
  ...config,
  sys,
  getDefaultLibFilePath,
  createCompilerHost,
  createSourceFile,
  createProgram,
  createSemanticDiagnosticsBuilderProgram: (rootNames, options, host) => {
    const program = createProgram({ rootNames, options, host });
    return {
      getProgram: () => program,
      getSemanticDiagnostics: program.getSemanticDiagnostics,
      getSyntacticDiagnostics: program.getSyntacticDiagnostics,
      getCompilerOptions: program.getCompilerOptions,
    };
  },
  resolveModuleName: (name, file, options, host) =>
    // The public native resolver rejects empty specifiers instead of reporting
    // an unresolved module, as callers of the compiler contract expect.
    name === ''
      ? { resolvedModule: undefined }
      : runtime.invoke(host, api => {
          const resolver = api.createModuleResolver(options);
          try {
            return resolver.resolveModuleName(name, path.dirname(file));
          } finally {
            resolver.dispose();
          }
        }),
  getShebang: native.getShebang,
  identifierToKeywordKind: node => {
    const value = native.stringToToken(node.text);
    return value === undefined ? undefined : scannerKind(value);
  },
  tokenToString: kind => native.tokenToString(native.SyntaxKind[ts.SyntaxKind[kind]]),
  isIdentifierStart: native.isIdentifierStart,
  isIdentifierPart: native.isIdentifierPart,
  forEachLeadingCommentRange: visitComments('forEachLeadingCommentRange'),
  forEachTrailingCommentRange: visitComments('forEachTrailingCommentRange'),
  server: new Proxy(Object.create(null), {
    get: (_target, name) => unsupported(`server.${String(name)}`)(),
  }),
  createAbstractBuilder: unsupported('createAbstractBuilder'),
  createWatchCompilerHost: unsupported('createWatchCompilerHost'),
  createWatchProgram: unsupported('createWatchProgram'),
};
