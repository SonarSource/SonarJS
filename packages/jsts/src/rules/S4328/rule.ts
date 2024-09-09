/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://sonarsource.github.io/rspec/#/rspec/S4328/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import builtins from 'builtin-modules';
import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';
import { generateMeta, RequiredParserServices, getDependencies } from '../helpers';
import { FromSchema } from 'json-schema-to-ts';
import { meta, schema } from './meta';
import { Minimatch } from 'minimatch';

const messages = {
  removeOrAddDependency: 'Either remove this import or add it as a dependency.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, { messages, schema }),
  create(context: Rule.RuleContext) {
    const whitelist = (context.options as FromSchema<typeof schema>)[0]?.whitelist || [];
    const dependencies = getDependencies(context.filename);
    const aliases = extractPathMappingPatterns(context.sourceCode.parserServices);
    const baseUrl = getBaseUrl(context.sourceCode.parserServices);
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
              aliases,
              whitelist,
              baseUrl,
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
          aliases,
          whitelist,
          baseUrl,
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
  aliases: Minimatch[],
  whitelist: string[],
  baseUrl: string | undefined,
  context: Rule.RuleContext,
) {
  const moduleName = module.value;
  if (typeof moduleName !== 'string') {
    return;
  }

  if (ts.isExternalModuleNameRelative(moduleName)) {
    return;
  }

  if (aliases.some(pattern => pattern.match(moduleName))) {
    return;
  }

  if (['node:', 'data:', 'file:'].some(prefix => moduleName.startsWith(prefix))) {
    return;
  }

  if (baseUrl) {
    const underBaseUrlPath = path.join(baseUrl, moduleName);
    const extensions = ['', '.ts', '.d.ts', '.tsx', '.js', '.jsx', '.vue', '.mjs'];
    if (extensions.some(extension => fs.existsSync(underBaseUrlPath + extension))) {
      return;
    }
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
  if (!name.startsWith('@')) {
    return parts[0];
  } else {
    return parts[1];
  }
}

/**
 * The matching pattern part of a path mapping specified
 * in `paths` in `tsconfig.json`.
 */
function extractPathMappingPatterns(parserServices: RequiredParserServices): Minimatch[] {
  const compilerOptions = parserServices.program?.getCompilerOptions();
  return compilerOptions?.paths
    ? Object.keys(compilerOptions?.paths).map(pattern => new Minimatch(pattern, { nocase: true }))
    : [];
}

function getBaseUrl(parserServices: RequiredParserServices): string | undefined {
  return parserServices.program?.getCompilerOptions().baseUrl;
}
