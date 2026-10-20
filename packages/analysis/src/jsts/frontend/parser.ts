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
import ts from 'typescript';
import { CompilerContractError } from 'typescript/errors';
import type {} from './vendor/typescript-internals.js';
import type { ParserOptions } from './vendor/types/index.js';
import { astConverter } from './vendor/typescript-estree/ast-converter.js';
import { createParserServices } from './vendor/typescript-estree/createParserServices.js';
import { getScriptKind } from './vendor/typescript-estree/create-program/getScriptKind.js';
import { analyze, type AnalyzeOptions } from './vendor/scope-manager/analyze.js';
import { visitorKeys } from './vendor/visitor-keys/index.js';
import { getLib } from './vendor/scope-options.js';
import { createProgramOptions } from '../program/tsconfig/options.js';
import { createStandardProgram } from '../program/factory.js';

export const meta = { name: 'sonarjs/typescript-parser', version: '1.0.0' };

/** SonarJS owns selection, conversion, lexical output, scopes and parser services. */
export function parseForESLint(code: string, options: ParserOptions = {}) {
  const sourceType = options.sourceType === 'module' ? 'module' : 'script';
  const filePath = path.resolve(
    options.tsconfigRootDir ?? process.cwd(),
    options.filePath && options.filePath !== '<input>'
      ? options.filePath
      : options.ecmaFeatures?.jsx === true
        ? 'estree.tsx'
        : 'estree.ts',
  );
  const program = selectProgram(filePath, code, options);
  const sourceFile = program
    ? findSourceFile(program, filePath)!
    : createSourceFile(filePath, code, options, sourceType);
  // Binding establishes the parent pointers used by the converter and typed rules.
  program?.getTypeChecker();
  const { estree: ast, astMaps } = astConverter(
    sourceFile,
    {
      allowInvalidAST: options.allowInvalidAST === true,
      errorOnUnknownASTType: options.errorOnUnknownASTType === true,
      suppressDeprecatedPropertyWarnings:
        typeof options.suppressDeprecatedPropertyWarnings === 'boolean'
          ? options.suppressDeprecatedPropertyWarnings
          : process.env.NODE_ENV !== 'test',
      comment: true,
      loc: true,
      range: true,
      tokens: true,
    },
    options.preserveNodeMaps !== false,
  );
  ast.sourceType = sourceType;
  const services = createParserServices(astMaps, program);
  const compilerOptions = program?.getCompilerOptions();
  const scopeOptions: AnalyzeOptions = {
    sourceType,
    globalReturn: options.ecmaFeatures?.globalReturn,
    lib: options.lib ?? (compilerOptions ? getLib(compilerOptions) : undefined),
    jsxPragma:
      options.jsxPragma === undefined && compilerOptions?.jsxFactory != null
        ? compilerOptions.jsxFactory.split('.')[0].trim()
        : options.jsxPragma,
    jsxFragmentName:
      options.jsxFragmentName === undefined && compilerOptions?.jsxFragmentFactory != null
        ? compilerOptions.jsxFragmentFactory.split('.')[0].trim()
        : options.jsxFragmentName,
  };
  services.emitDecoratorMetadata ??= options.emitDecoratorMetadata === true;
  services.experimentalDecorators ??= options.experimentalDecorators === true;
  services.isolatedDeclarations ??= options.isolatedDeclarations === true;
  return { ast, scopeManager: analyze(ast, scopeOptions), services, visitorKeys };
}

export function parse(code: string, options?: ParserOptions) {
  return parseForESLint(code, options).ast;
}

function createSourceFile(
  filePath: string,
  code: string,
  options: ParserOptions,
  sourceType: string,
) {
  const jsDocParsingMode =
    options.jsDocParsingMode === 'all'
      ? ts.JSDocParsingMode.ParseAll
      : options.jsDocParsingMode === 'type-info'
        ? ts.JSDocParsingMode.ParseForTypeInfo
        : ts.JSDocParsingMode.ParseNone;
  return ts.createSourceFile(
    filePath,
    code,
    {
      languageVersion: ts.ScriptTarget.Latest,
      jsDocParsingMode,
      setExternalModuleIndicator:
        sourceType === 'module'
          ? file => {
              file.externalModuleIndicator = true;
            }
          : undefined,
    },
    true,
    getScriptKind(filePath, options.ecmaFeatures?.jsx === true),
  );
}

function sourceExtension(fileName: string) {
  return (
    [ts.Extension.Dts, ts.Extension.Dmts, ts.Extension.Dcts].find(extension =>
      fileName.endsWith(extension),
    ) ?? path.extname(fileName)
  );
}

function findSourceFile(program: ts.Program, filePath: string) {
  let sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) {
    const realPath = ts.sys.realpath?.(filePath) ?? filePath;
    sourceFile =
      program.getSourceFile(realPath) ??
      program
        .getSourceFiles()
        .find(file => (ts.sys.realpath?.(file.fileName) ?? file.fileName) === realPath);
  }
  // Keep the upstream safeguard against accepting a declaration redirect for a source file.
  return sourceFile && sourceExtension(sourceFile.fileName) === sourceExtension(filePath)
    ? sourceFile
    : undefined;
}

function selectProgram(filePath: string, code: string, options: ParserOptions): ts.Program | null {
  if (options.projectService || options.project === true) {
    throw new CompilerContractError(
      'The SonarJS parser requires explicit programs or project paths; automatic project discovery is not supported',
    );
  }
  if (options.programs) {
    for (const program of options.programs) {
      if (findSourceFile(program, filePath)) return program;
    }
    throw new Error(`The file was not found in any of the provided program instances: ${filePath}`);
  }
  // Analysis normally supplies its retained program. Legacy project callers use
  // the same SonarJS configuration policy and an explicit source-content overlay.
  const projects = typeof options.project === 'string' ? [options.project] : options.project;
  if (Array.isArray(projects) && projects.length > 0) {
    for (const project of projects) {
      const configPath = path.resolve(options.tsconfigRootDir ?? process.cwd(), project);
      const settings = createProgramOptions(configPath, undefined, true);
      if (!settings.rootNames.some(name => path.resolve(name) === filePath)) continue;
      const host = ts.createCompilerHost(settings.options, true);
      const original = host.getSourceFile.bind(host);
      host.getSourceFile = (name, version, onError, fresh) =>
        path.resolve(name) === filePath
          ? ts.createSourceFile(
              name,
              code,
              version,
              true,
              getScriptKind(name, options.ecmaFeatures?.jsx === true),
            )
          : original(name, version, onError, fresh);
      return createStandardProgram({ ...settings, host });
    }
    throw new Error(`The file was not found in any of the provided projects: ${filePath}`);
  }
  return null;
}
