/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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

import { Rule } from "eslint";
import * as estree from "estree";
import * as builtins from "builtin-modules";
import * as path from "path";
import * as fs from "fs";

/**
 * Cache for each dirname the dependencies of the nearest package.json.
 */
const cache: Map<string, Set<string>> = new Map();

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const whitelist = context.options;
    const dependencies = getDependencies(context.getFilename());
    return {
      CallExpression: (node: estree.Node) => {
        const call = node as estree.CallExpression;
        if (
          call.callee.type === "Identifier" &&
          call.callee.name === "require" &&
          call.arguments.length === 1
        ) {
          const [argument] = call.arguments;
          if (argument.type === "Literal") {
            const module = argument;
            const requireToken = call.callee;
            raiseOnImplicitImport(module, requireToken.loc!, dependencies, whitelist, context);
          }
        }
      },
      ImportDeclaration: (node: estree.Node) => {
        const module = (node as estree.ImportDeclaration).source;
        const importToken = context.getSourceCode().getFirstToken(node);
        raiseOnImplicitImport(module, importToken!.loc, dependencies, whitelist, context);
      },
    };
  },
};

function raiseOnImplicitImport(
  module: estree.Literal,
  loc: estree.SourceLocation,
  dependencies: Set<string>,
  whitelist: string[],
  context: Rule.RuleContext,
) {
  const moduleName = module.value;
  if (typeof moduleName !== "string") {
    return;
  }

  const ts = require("typescript");
  if (ts.isExternalModuleNameRelative(moduleName)) {
    return;
  }

  const packageName = getPackageName(moduleName);
  if (
    !whitelist.includes(packageName) &&
    !builtins.includes(packageName) &&
    !dependencies.has(packageName)
  ) {
    context.report({
      message: "Either remove this import or add it as a dependency.",
      loc,
    });
  }
}

function getPackageName(name: string) {
  /*
    - scoped `@namespace/foo/bar` -> package `@namespace/foo`
    - scope `foo/bar` -> package `foo`
  */
  const parts = name.split("/");
  if (!name.startsWith("@")) {
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
      const content = JSON.parse(fs.readFileSync(packageJsonPath, "utf8").replace(/^\uFEFF/, ""));
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
  Object.keys(dependencies).forEach(name => result.add(name));
}

function findPackageJson(current: string): string | undefined {
  const fileName = path.join(current, "package.json");
  if (fs.existsSync(fileName)) {
    return fileName;
  }

  let prev: string = current;
  current = path.dirname(current);

  if (prev !== current) {
    return findPackageJson(current);
  }
  return undefined;
}
