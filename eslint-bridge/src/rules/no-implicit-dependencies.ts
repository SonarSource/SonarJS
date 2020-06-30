/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import * as builtins from 'builtin-modules';
import * as path from 'path';
import * as fs from 'fs';
import { RequiredParserServices } from '../utils/isRequiredParserServices';

const DefinitelyTyped = '@types/';

/**
 * Cache for each dirname the dependencies of the nearest package.json.
 */
const cache: Map<string, Set<string>> = new Map();

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const whitelist = context.options;
    const dependencies = getDependencies(context.getFilename());
    const aliasedPathsMappings = extractPathMappings(context.parserServices);
    if (aliasedPathsMappings === 'skip') {
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
              aliasedPathsMappings,
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
          aliasedPathsMappings,
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
  aliasedPathsMappings: PathMapping[],
  context: Rule.RuleContext,
) {
  const moduleName = module.value;
  if (typeof moduleName !== 'string') {
    return;
  }

  const ts = require('typescript');
  if (ts.isExternalModuleNameRelative(moduleName)) {
    return;
  }

  if (aliasedPathsMappings.some(mapping => mapping.isApplicableTo(moduleName))) {
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

interface PathMapping {
  isApplicableTo(name: string): boolean;
}

/** A path mapping that matches exactly one name. */
class PathMappingExact implements PathMapping {
  constructor(private readonly value: string) {}
  isApplicableTo(name: string): boolean {
    return name === this.value;
  }
}

/** A path mapping that matches all names starting with a prefix. */
class PathMappingPrefix implements PathMapping {
  constructor(private readonly prefix: string) {}
  isApplicableTo(name: string): boolean {
    return name.startsWith(this.prefix);
  }
}

function extractPathMappings(parserServices: RequiredParserServices): PathMapping[] | 'skip' {
  const program = parserServices.program;
  let pathMappings: PathMapping[] = [];
  if (program) {
    const paths = program.getCompilerOptions().paths;
    if (paths) {
      for (let path in paths) {
        if (path === '*') {
          // All paths can be mapped, possibly into a directory with completely synthetic code.
          // Skip the entire check to avoid false positives.
          return 'skip';
        } else if (path.endsWith('/*')) {
          pathMappings.push(new PathMappingPrefix(path.substring(0, path.length - 1)));
        } else if (path.indexOf('*') < 0) {
          pathMappings.push(new PathMappingExact(path));
        } else {
          // Intentionally left blank.
          // A pattern contains a wildcard, but does not end with it.
        }
      }
    }
  }
  return pathMappings;
}
