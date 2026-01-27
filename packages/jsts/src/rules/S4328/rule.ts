/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S4328/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import builtins from 'builtin-modules';
import ts from 'typescript';
import { generateMeta } from '../helpers/index.js';
import { FromSchema } from 'json-schema-to-ts';
import * as meta from './generated-meta.js';
import { Minimatch } from 'minimatch';
import { dirname } from 'node:path';
import { getDependencies } from '../helpers/package-jsons/dependencies.js';

const messages = {
  removeOrAddDependency: 'Either remove this import or add it as a dependency.',
};

interface ImportCheckOptions {
  dependencies: Set<string | Minimatch>;
  filename: string;
  host: ts.ModuleResolutionHost | undefined;
  options: ts.CompilerOptions | undefined;
  whitelist: string[];
  context: Rule.RuleContext;
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    // we need to find all the npm manifests from the directory of the analyzed file to the context working directory
    const dependencies = getDependencies(dirname(context.filename), context.cwd);

    const whitelist = (context.options as FromSchema<typeof meta.schema>)[0]?.whitelist || [];
    const program = context.sourceCode.parserServices?.program;
    let options: ts.CompilerOptions | undefined;
    let host: ts.ModuleResolutionHost | undefined;
    if (program) {
      const compilerOptions = program.getCompilerOptions();
      options = compilerOptions;
      host = ts.createCompilerHost(compilerOptions);
    }

    const checkOptions: ImportCheckOptions = {
      dependencies,
      filename: context.filename,
      host,
      options,
      whitelist,
      context,
    };

    return {
      CallExpression: (node: estree.Node) => {
        const call = node as estree.CallExpression;
        if (
          call.callee.type === 'Identifier' &&
          call.callee.name === 'require' &&
          call.arguments.length === 1
        ) {
          const [argument] = call.arguments;
          if (argument.type === 'Literal') {
            const requireToken = call.callee;
            raiseOnImplicitImport(argument, requireToken.loc!, checkOptions);
          }
        }
      },
      ImportDeclaration: (node: estree.Node) => {
        const module = (node as estree.ImportDeclaration).source;
        const importToken = context.sourceCode.getFirstToken(node);
        raiseOnImplicitImport(module, importToken!.loc, checkOptions);
      },
    };
  },
};

function raiseOnImplicitImport(
  module: estree.Literal,
  loc: estree.SourceLocation,
  opts: ImportCheckOptions,
) {
  const moduleValue = module.value;
  if (typeof moduleValue !== 'string') {
    return;
  }

  // Strip query parameters and hash fragments from module name
  // Bundlers like Vite use these for transformations (e.g., '?react' for SVG-to-React)
  const moduleName = moduleValue.split('?')[0].split('#')[0];

  if (shouldSkipModule(moduleName, opts)) {
    return;
  }

  const packageName = getPackageName(moduleName);
  if (isKnownDependency(packageName, moduleName, opts)) {
    return;
  }

  if (canResolveTypeScriptModule(moduleName, opts)) {
    return;
  }

  opts.context.report({
    messageId: 'removeOrAddDependency',
    loc,
  });
}

function shouldSkipModule(moduleName: string, opts: ImportCheckOptions): boolean {
  if (ts.isExternalModuleNameRelative(moduleName)) {
    return true;
  }

  if (['node:', 'data:', 'file:'].some(prefix => moduleName.startsWith(prefix))) {
    return true;
  }

  const packageName = getPackageName(moduleName);
  if (opts.whitelist.includes(packageName)) {
    return true;
  }

  if (builtins.includes(packageName)) {
    return true;
  }

  return false;
}

function isKnownDependency(
  packageName: string,
  moduleName: string,
  opts: ImportCheckOptions,
): boolean {
  for (const dependency of opts.dependencies) {
    if (typeof dependency === 'string') {
      if (dependency === packageName) {
        return true;
      }
    } else if (dependency.match(moduleName)) {
      //dependencies are globs for workspaces
      return true;
    }
  }
  return false;
}

function canResolveTypeScriptModule(moduleName: string, opts: ImportCheckOptions): boolean {
  if (!opts.host || !opts.options) {
    return false;
  }

  // check if Typescript can resolve path aliases and 'baseDir'-based import
  const resolved = ts.resolveModuleName(moduleName, opts.filename, opts.options, opts.host);
  return !!(resolved?.resolvedModule && !resolved.resolvedModule.isExternalLibraryImport);
}

function getPackageName(name: string) {
  /*
    - scoped `@namespace/foo/bar` -> package `@namespace/foo`
    - scope `foo/bar` -> package `foo`
  */
  const parts = name.split('/');
  if (name.startsWith('@')) {
    return `${parts[0]}/${parts[1]}`;
  } else {
    return parts[0];
  }
}
