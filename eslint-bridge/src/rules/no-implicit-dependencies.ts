/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-4328

import { Rule } from 'eslint';
import * as estree from 'estree';
import builtins from 'builtin-modules';
import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';
import { RequiredParserServices } from '../utils/parser-services';

const DefinitelyTyped = '@types/';

/**
 * Cache for each dirname the dependencies of the nearest package.json.
 */
const cache: Map<string, Set<string>> = new Map();

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const whitelist = context.options;
    const dependencies = getDependencies(context.getFilename());
    const aliasedPathsMappingPatterns = extractPathMappingPatterns(context.parserServices);
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
              context,
            );
          }
        }
      },
      ImportDeclaration: (node: estree.Node) => {
        const module = (node as estree.ImportDeclaration).source;
        const importToken = context.getSourceCode().getFirstToken(node);
        raiseOnImplicitImport(
          module,
          importToken!.loc,
          dependencies,
          whitelist,
          aliasedPathsMappingPatterns,
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

  const packageName = getPackageName(moduleName);
  if (
    !whitelist.includes(packageName) &&
    !builtins.includes(packageName) &&
    !dependencies.has(packageName)
  ) {
    context.report({
      message: 'Either remove this import or add it as a dependency.',
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

function getDependencies(fileName: string) {
  const dirname = path.dirname(fileName);

  const cached = cache.get(dirname);
  if (cached) {
    return cached;
  }

  const result = new Set<string>();
  const packageJsonPath = findPackageJson(path.resolve(dirname));
  if (packageJsonPath !== undefined) {
    try {
      // remove BOM from file content before parsing
      const content = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8').replace(/^\uFEFF/, ''));
      if (content.dependencies !== undefined) {
        addDependencies(result, content.dependencies);
      }
      if (content.devDependencies !== undefined) {
        addDependencies(result, content.devDependencies);
      }
      if (content.peerDependencies !== undefined) {
        addDependencies(result, content.peerDependencies);
      }
    } catch {}
  }

  cache.set(dirname, result);

  return result;
}

function addDependencies(result: Set<string>, dependencies: any) {
  Object.keys(dependencies).forEach(name =>
    result.add(name.startsWith(DefinitelyTyped) ? name.substring(DefinitelyTyped.length) : name),
  );
}

function findPackageJson(current: string): string | undefined {
  const fileName = path.join(current, 'package.json');
  if (fs.existsSync(fileName)) {
    return fileName;
  }

  const prev: string = current;
  current = path.dirname(current);

  if (prev !== current) {
    return findPackageJson(current);
  }
  return undefined;
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
  const compilerOptions = parserServices.program && parserServices.program.getCompilerOptions();
  const paths = (compilerOptions && compilerOptions.paths) || [];
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
