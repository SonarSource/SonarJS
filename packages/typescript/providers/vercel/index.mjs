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
import path from 'node:path';
import { compilerCall, compilerMethods } from './contract.mjs';
import ts from '../classic.cjs';
import { CompilerContractError } from '../../errors.cjs';
import * as api from './api.mjs';
import { createNativeNodeAdapter, toClassicDiagnostic } from './nativeNodeAdapter.mjs';
import { createNativeTypeAdapter } from './nativeTypeAdapter.mjs';
import { createNativeChecker } from './nativeCheckerAdapter.mjs';

function adaptHost(host, roots, options) {
  const sources = new Map(
    roots
      .map(name => [
        ts.getNormalizedAbsolutePath(name, host.getCurrentDirectory()),
        host.getSourceFile(name, options.target ?? ts.ScriptTarget.Latest)?.text,
      ])
      .filter(([, text]) => text !== undefined),
  );
  return {
    getCurrentDirectory: () => host.getCurrentDirectory(),
    useCaseSensitiveFileNames: () => host.useCaseSensitiveFileNames(),
    getDefaultLibraryDirectory: () =>
      host.getDefaultLibLocation?.() ?? path.dirname(host.getDefaultLibFileName({})),
    // null means absent; undefined in tsc-ts means permission to read disk.
    readFile: name => sources.get(name) ?? host.readFile(name) ?? null,
    fileExists: name => sources.has(name) || host.fileExists(name),
    directoryExists: name => host.directoryExists?.(name) ?? true,
    realpath: name => host.realpath?.(name) ?? name,
    getAccessibleEntries: directory => ({
      files: (host.readDirectory?.(directory, undefined, undefined, ['*'], 1) ?? []).map(file =>
        path.basename(file),
      ),
      directories: (host.getDirectories?.(directory) ?? []).map(file => path.basename(file)),
    }),
  };
}

export function createSourceFile(fileName, text, languageVersion, setParents, scriptKind) {
  scriptKind ??= /\.[cm]?tsx?$/i.test(fileName)
    ? /tsx$/i.test(fileName)
      ? api.ScriptKind.TSX
      : api.ScriptKind.TS
    : /jsx$/i.test(fileName)
      ? api.ScriptKind.JSX
      : api.ScriptKind.JS;
  const raw = api.parseSourceFile(fileName, text, { scriptKind });
  const nodes = createNativeNodeAdapter({
    getSyntacticDiagnostics: () => raw.diagnostics.map(api.diagnosticOf),
  });
  const source = nodes.wrapNode(raw);
  source.languageVersion =
    typeof languageVersion === 'number'
      ? languageVersion
      : (languageVersion?.languageVersion ?? ts.ScriptTarget.Latest);
  return source;
}

function createCompilerHost(options, setParents) {
  const host = ts.createCompilerHost(options, setParents);
  // Retain filesystem/configuration helpers, but never the SDK host's parser.
  host.getSourceFile = (fileName, languageVersion) =>
    compilerCall('CompilerHost.getSourceFile', () => {
      const text = host.readFile(fileName);
      return text === undefined
        ? undefined
        : createSourceFile(fileName, text, languageVersion, setParents);
    });
  return host;
}

export function createProgram(input, options, host) {
  if (Array.isArray(input)) input = { rootNames: input, options, host };
  const callbacks = input.host ?? createCompilerHost(input.options, true);
  const raw = api.createProgram({
    rootNames: input.rootNames,
    options: input.options,
    host: adaptHost(callbacks, input.host ? input.rootNames : [], input.options),
  });
  const nodes = createNativeNodeAdapter({
    getSyntacticDiagnostics: file => raw.getSyntacticDiagnostics(raw.getSourceFile(file)),
  });
  const nativeChecker = api.completeChecker(raw.getTypeChecker());
  const types = createNativeTypeAdapter({ checker: nativeChecker, nodeAdapter: nodes });
  const checker = createNativeChecker({
    checker: nativeChecker,
    nodeAdapter: nodes,
    typeAdapter: types,
  }).checker;
  const getSourceFile = file => {
    const source = raw.getSourceFile(
      ts.getNormalizedAbsolutePath(file, callbacks.getCurrentDirectory()),
    );
    return source && nodes.wrapNode(source);
  };
  checker.getSuggestionDiagnostics = file =>
    compilerCall('getSuggestionDiagnostics', () =>
      raw
        .getSuggestionDiagnostics(nodes.unwrapNode(file))
        .map(d => toClassicDiagnostic(d, getSourceFile)),
    );
  const program = {
    getSourceFile,
    getSourceFileByPath: getSourceFile,
    getSourceFiles: () => raw.getSourceFiles().map(source => nodes.wrapNode(source)),
    getRootFileNames: () => input.rootNames,
    getCompilerOptions: () => input.options,
    getCurrentDirectory: () => callbacks.getCurrentDirectory(),
    getProjectReferences: () => input.projectReferences,
    getResolvedProjectReferences: () => undefined,
    getTypeChecker: () => checker,
    isSourceFileDefaultLibrary: file => raw.isSourceFileDefaultLibrary(nodes.unwrapNode(file)),
    isSourceFileFromExternalLibrary: file =>
      raw.isSourceFileFromExternalLibrary(nodes.unwrapNode(file)),
    getModeForUsageLocation: () => undefined,
    getModeForResolutionAtIndex: () => undefined,
    sourceFileToPackageName: {
      get: file => /node_modules\/(\@[^/]+\/[^/]+|[^/]+)/.exec(file)?.[1],
    },
    dispose: () => raw.dispose(),
  };
  for (const [name, target] of Object.entries({
    getConfigFileParsingDiagnostics: 'getConfigFileParsingDiagnostics',
    getOptionsDiagnostics: 'getProgramDiagnostics',
    getGlobalDiagnostics: 'getGlobalDiagnostics',
    getSemanticDiagnostics: 'getSemanticDiagnostics',
    getSyntacticDiagnostics: 'getSyntacticDiagnostics',
    getDeclarationDiagnostics: 'getDeclarationDiagnostics',
  })) {
    program[name] = file =>
      raw[target](file && nodes.unwrapNode(file)).map(d => toClassicDiagnostic(d, getSourceFile));
  }
  return compilerMethods(program, 'Program');
}

export function createSemanticDiagnosticsBuilderProgram(rootNames, options, host) {
  // SonarJS retains the builder for its program/host cache. A content update builds a fresh
  // TS7 program; no semantic answers or node views cross program generations.
  const program = createProgram({ rootNames, options, host });
  return {
    getProgram: () => program,
    getSemanticDiagnostics: program.getSemanticDiagnostics,
    getSyntacticDiagnostics: program.getSyntacticDiagnostics,
    getCompilerOptions: program.getCompilerOptions,
  };
}
const unsupported = name => () => {
  throw new CompilerContractError(`Vercel TS7 provider does not implement ${name}`);
};
const unsupportedServer = new Proxy(Object.create(null), {
  get(_target, name) {
    return unsupported(`server.${String(name)}`)();
  },
});
// TS6 supplies contract constants and syntax/configuration utilities only. Parsing and
// every program/checker used for analysis above execute the Vercel port in this process.
export default new Proxy(ts, {
  get(target, name) {
    if (name === 'server') return unsupportedServer;
    if (name === 'createCompilerHost') return createCompilerHost;
    if (name === 'createSourceFile')
      return (...args) => compilerCall('createSourceFile', () => createSourceFile(...args));
    if (name === 'createProgram')
      return (...args) => compilerCall('createProgram', () => createProgram(...args));
    if (name === 'createSemanticDiagnosticsBuilderProgram')
      return (...args) =>
        compilerCall('createSemanticDiagnosticsBuilderProgram', () =>
          createSemanticDiagnosticsBuilderProgram(...args),
        );
    if (['createAbstractBuilder', 'createWatchCompilerHost', 'createWatchProgram'].includes(name))
      return unsupported(name);
    return target[name];
  },
});
