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
import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  isDefaultSpecifier,
  isIdentifier,
  isNamespaceSpecifier,
  getUniqueWriteUsage,
} from './utils-ast';

/**
 * Returns the module name, when an identifier either represents a namespace for that module,
 * or is an alias for the default exported value.
 *
 * Returns undefined otherwise.
 * example: Given `import * as X from 'module_name'`, `getModuleNameOfIdentifier(X)`
 * returns `module_name`.
 */
export function getModuleNameOfIdentifier(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
): estree.Literal | undefined {
  const { name } = identifier;
  // check if importing using `import * as X from 'module_name'`
  const importDeclaration = getImportDeclarations(context).find(
    importDecl => isNamespaceSpecifier(importDecl, name) || isDefaultSpecifier(importDecl, name),
  );
  if (importDeclaration) {
    return importDeclaration.source;
  }
  // check if importing using `const X = require('module_name')`
  const writeExpression = getUniqueWriteUsage(context, name);
  if (writeExpression) {
    return getModuleNameFromRequire(writeExpression);
  }
  return undefined;
}

/**
 * Returns the module name of either a directly `require`d or referenced module in
 * the following cases:
 *
 *  1. If `node` is a `require('m')` call;
 *  2. If `node` is an identifier `i` bound by an import, as in `import i from 'm'`;
 *  3. If `node` is an identifier `i`, and there is a single assignment with a `require`
 *     on the right hand side, i.e. `var i = require('m')`;
 *
 * then, in all three cases, the returned value will be the name of the module `'m'`.
 *
 * @param node the expression that is expected to evaluate to a module
 * @param context the rule context
 * @return literal with the name of the module or `undefined`.
 */
export function getModuleNameOfNode(
  context: Rule.RuleContext,
  node: estree.Node,
): estree.Literal | undefined {
  if (node.type === 'Identifier') {
    return getModuleNameOfIdentifier(context, node);
  } else {
    return getModuleNameFromRequire(node);
  }
}

/**
 * Returns the module name, when an identifier represents a binding imported from another module.
 * Returns undefined otherwise.
 * example: Given `import { f } from 'module_name'`, `getModuleNameOfImportedIdentifier(f)` returns `module_name`
 */
export function getModuleNameOfImportedIdentifier(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
) {
  // check if importing using `import { f } from 'module_name'`
  const importedDeclaration = getImportDeclarations(context).find(({ specifiers }) =>
    specifiers.some(
      spec => spec.type === 'ImportSpecifier' && spec.imported.name === identifier.name,
    ),
  );
  if (importedDeclaration) {
    return importedDeclaration.source;
  }
  // check if importing using `const f = require('module_name').f`
  const writeExpression = getUniqueWriteUsage(context, identifier.name);
  if (
    writeExpression &&
    writeExpression.type === 'MemberExpression' &&
    isIdentifier(writeExpression.property, identifier.name)
  ) {
    return getModuleNameFromRequire(writeExpression.object);
  }

  return undefined;
}

export function getImportDeclarations(context: Rule.RuleContext) {
  const program = context.getSourceCode().ast;
  if (program.sourceType === 'module') {
    return program.body.filter(
      node => node.type === 'ImportDeclaration',
    ) as estree.ImportDeclaration[];
  }
  return [];
}

export function getRequireCalls(context: Rule.RuleContext) {
  const required: estree.CallExpression[] = [];
  const { scopeManager } = context.getSourceCode();
  scopeManager.scopes.forEach(scope =>
    scope.variables.forEach(variable =>
      variable.defs.forEach(def => {
        if (
          def.type === 'Variable' &&
          def.node.init?.type === 'CallExpression' &&
          def.node.init.callee.type === 'Identifier' &&
          def.node.init.callee.name === 'require' &&
          def.node.init.arguments.length === 1
        ) {
          required.push(def.node.init);
        }
      }),
    ),
  );
  return required;
}

export function getModuleNameFromRequire(node: estree.Node): estree.Literal | undefined {
  if (
    node.type === 'CallExpression' &&
    isIdentifier(node.callee, 'require') &&
    node.arguments.length === 1
  ) {
    const moduleName = node.arguments[0];
    if (moduleName.type === 'Literal') {
      return moduleName;
    }
  }
  return undefined;
}

export function isCallToFQN(
  context: Rule.RuleContext,
  callExpression: estree.CallExpression,
  moduleName: string,
  functionName: string,
) {
  const { callee } = callExpression;
  if (callee.type !== 'MemberExpression') {
    return false;
  }
  const module = getModuleNameOfNode(context, callee.object);
  return module?.value === moduleName && isIdentifier(callee.property, functionName);
}
