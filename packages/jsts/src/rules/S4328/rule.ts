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
import { getDependenciesSanitizePaths } from '../helpers/package-jsons/dependencies.js';

const messages = {
  removeOrAddDependency: 'Either remove this import or add it as a dependency.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    // we need to find all the npm manifests from the directory of the analyzed file to the context working directory
    const dependencies = getDependenciesSanitizePaths(context);

    const whitelist = (context.options as FromSchema<typeof meta.schema>)[0]?.whitelist || [];
    const program = context.sourceCode.parserServices?.program;
    let options: ts.CompilerOptions, host: ts.ModuleResolutionHost;
    if (program) {
      options = program?.getCompilerOptions();
      host = ts.createCompilerHost(options);
    }
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
            raiseOnImplicitImport(
              argument,
              requireToken.loc!,
              dependencies,
              context.filename,
              host,
              options,
              whitelist,
              context,
            );
          }
        }
      },
      ImportDeclaration: (node: estree.Node) => {
        const module = (node as estree.ImportDeclaration).source;
        const importToken = context.sourceCode.getFirstToken(node);
        raiseOnImplicitImport(
          module,
          importToken!.loc,
          dependencies,
          context.filename,
          host,
          options,
          whitelist,
          context,
        );
      },
    };
  },
};

function raiseOnImplicitImport(
  module: estree.Literal,
  loc: estree.SourceLocation,
  dependencies: Set<string | Minimatch>,
  filename: string,
  host: ts.ModuleResolutionHost | undefined,
  options: ts.CompilerOptions | undefined,
  whitelist: string[],
  context: Rule.RuleContext,
) {
  const moduleValue = module.value;
  if (typeof moduleValue !== 'string') {
    return;
  }

  // Strip query parameters and hash fragments from module name
  // Bundlers like Vite use these for transformations (e.g., '?react' for SVG-to-React)
  const moduleName = moduleValue.split('?')[0].split('#')[0];

  if (ts.isExternalModuleNameRelative(moduleName)) {
    return;
  }

  if (['node:', 'data:', 'file:'].some(prefix => moduleName.startsWith(prefix))) {
    return;
  }

  const packageName = getPackageName(moduleName);
  if (whitelist.includes(packageName)) {
    return;
  }

  if (builtins.includes(packageName)) {
    return;
  }

  for (const dependency of dependencies) {
    if (typeof dependency === 'string') {
      if (dependency === packageName) {
        return;
      }
    } else if (dependency.match(moduleName)) {
      //dependencies are globs for workspaces
      return;
    }
  }

  if (host && options) {
    // check if Typescript can resolve path aliases and 'baseDir'-based import
    const resolved = ts.resolveModuleName(moduleName, filename, options, host);
    if (resolved?.resolvedModule && !resolved.resolvedModule.isExternalLibraryImport) {
      return;
    }
  }

  context.report({
    messageId: 'removeOrAddDependency',
    loc,
  });
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
