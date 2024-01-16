/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { RequiredParserServices } from '../helpers';
import { getDependencies } from '@sonar/jsts';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      removeOrAddDependency: 'Either remove this import or add it as a dependency.',
    },
  },
  create(context: Rule.RuleContext) {
    const whitelist = context.options;
    const dependencies = getDependencies(context.filename);
    const aliasedPathsMappingPatterns = extractPathMappingPatterns(
      context.sourceCode.parserServices,
    );
    const baseUrl = getBaseUrl(context.sourceCode.parserServices);
    if (aliasedPathsMappingPatterns === 'matchAll') {
      // deactivates this rule altogether.
      return {};
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
              whitelist,
              aliasedPathsMappingPatterns,
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
          whitelist,
          aliasedPathsMappingPatterns,
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
  dependencies: Set<string>,
  whitelist: string[],
  aliasedPathsMappingPatterns: PathMappingPattern[],
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

  if (aliasedPathsMappingPatterns.some(pattern => pattern.isApplicableTo(moduleName))) {
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
  if (
    !whitelist.includes(packageName) &&
    !builtins.includes(packageName) &&
    !dependencies.has(packageName)
  ) {
    context.report({
      messageId: 'removeOrAddDependency',
      loc,
    });
  }
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
    return `${parts[0]}/${parts[1]}`;
  }
}

/**
 * The matching pattern part of a path mapping specified
 * in `paths` in `tsconfig.json`.
 */
interface PathMappingPattern {
  isApplicableTo(name: string): boolean;
}

class PathMappingNoAsteriskPattern implements PathMappingPattern {
  constructor(private readonly value: string) {}
  isApplicableTo(name: string): boolean {
    return name === this.value;
  }
}

class PathMappingSingleAsteriskPattern implements PathMappingPattern {
  constructor(private readonly prefix: string, private readonly suffix: string) {}
  isApplicableTo(name: string): boolean {
    return name.startsWith(this.prefix) && name.endsWith(this.suffix);
  }
}

const PATH_MAPPING_ASTERISK_PATTERN = /^([^*]*)\*([^*]*)$/; // matches any string with single asterisk '*'
const PATH_MAPPING_ASTERISK_PATTERN_PREFIX_IDX = 1;
const PATH_MAPPING_ASTERISK_PATTERN_SUFFIX_IDX = 2;
function extractPathMappingPatterns(
  parserServices: RequiredParserServices,
): PathMappingPattern[] | 'matchAll' {
  const compilerOptions = parserServices.program?.getCompilerOptions();
  const paths = compilerOptions?.paths ?? [];
  const pathMappingPatterns: PathMappingPattern[] = [];
  for (const p in paths) {
    if (p === '*') {
      return 'matchAll';
    } else {
      const m = p.match(PATH_MAPPING_ASTERISK_PATTERN);
      if (m) {
        pathMappingPatterns.push(
          new PathMappingSingleAsteriskPattern(
            m[PATH_MAPPING_ASTERISK_PATTERN_PREFIX_IDX],
            m[PATH_MAPPING_ASTERISK_PATTERN_SUFFIX_IDX],
          ),
        );
      } else if (!p.includes('*')) {
        pathMappingPatterns.push(new PathMappingNoAsteriskPattern(p));
      } else {
        // This case should not occur: `tsc` emits error if there is more than one asterisk
      }
    }
  }
  return pathMappingPatterns;
}

function getBaseUrl(parserServices: RequiredParserServices): string | undefined {
  return parserServices.program?.getCompilerOptions().baseUrl;
}
