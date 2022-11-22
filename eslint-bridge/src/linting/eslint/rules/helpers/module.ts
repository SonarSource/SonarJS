/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import assert from 'assert';
import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import {
  Node,
  isDefaultSpecifier,
  isIdentifier,
  isNamespaceSpecifier,
  getUniqueWriteUsage,
  getVariableFromScope,
  getUniqueWriteReference,
} from './ast';

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
  // check if importing using `const f = require('module_name').f` or `const { f } = require('module_name')`
  const writeExpression = getUniqueWriteUsage(context, identifier.name);
  if (writeExpression) {
    let maybeRequireCall: estree.Node;
    if (
      writeExpression.type === 'MemberExpression' &&
      isIdentifier(writeExpression.property, identifier.name)
    ) {
      maybeRequireCall = writeExpression.object;
    } else {
      maybeRequireCall = writeExpression;
    }
    return getModuleNameFromRequire(maybeRequireCall);
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
        if (def.type === 'Variable' && def.node.init) {
          if (isRequire(def.node.init)) {
            required.push(def.node.init as estree.CallExpression);
          } else if (def.node.init.type === 'MemberExpression' && isRequire(def.node.init.object)) {
            required.push(def.node.init.object as estree.CallExpression);
          }
        }
      }),
    ),
  );
  return required;
}

function isRequire(node: estree.Node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    node.arguments.length === 1
  );
}

export function getModuleNameFromRequire(node: Node): estree.Literal | undefined {
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

export function getModuleAndCalledMethod(callee: estree.Node, context: Rule.RuleContext) {
  let module;
  let method: estree.Expression | estree.PrivateIdentifier | undefined;

  if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
    module = getModuleNameOfIdentifier(context, callee.object);
    method = callee.property;
  }
  if (callee.type === 'Identifier') {
    module = getModuleNameOfImportedIdentifier(context, callee);
    method = callee;
  }
  return { module, method };
}

/**
 * Checks that an ESLint member expression matches a fully qualified name
 *
 * A fully qualified name here denotes a value that is accessed through an imported
 * symbol, e.g., `foo.bar.baz` where `foo` was imported either from a require call
 * or an import statement:
 *
 * ```
 * const foo = require('lib');
 * foo.bar.baz.qux; // matches the fully qualified name ['lib', 'bar', 'baz', 'qux']
 * ```
 *
 * @param context the rule context
 * @param expr the member expression
 * @param qualifiers the qualifiers to match
 */
export function hasFullyQualifiedName(
  context: Rule.RuleContext,
  expr: estree.MemberExpression,
  ...qualifiers: string[]
) {
  assert(qualifiers.length >= 2, 'A fully qualified name should include two qualifiers at least.');

  let node: estree.Node = expr;
  while (node.type === 'MemberExpression') {
    const qualifier = qualifiers.pop();
    if (!qualifier || !isIdentifier(node.property, qualifier)) {
      return false;
    }
    node = node.object;
  }

  if (node.type !== 'Identifier') {
    return false;
  }

  const module = getModuleNameOfImportedIdentifier(context, node);
  const qualifier = qualifiers.pop();
  if (!qualifier || module?.value !== qualifier) {
    return false;
  }

  return qualifiers.length === 0;
}

/**
 * Returns the fully qualified name of ESLint node
 *
 * A fully qualified name here denotes a value that is accessed through an imported
 * symbol, e.g., `foo.bar.baz` where `foo` was imported either from a require call
 * or an import statement:
 *
 * ```
 * const foo = require('lib');
 * foo.bar.baz.qux; // matches the fully qualified name ['lib', 'bar', 'baz', 'qux']
 * const foo2 = require('lib').bar;
 * foo2.baz.qux; // matches the fully qualified name ['lib', 'bar', 'baz', 'qux']
 * ```
 *
 * Returns null when an FQN could not be found.
 *
 * @param context the rule context
 * @param node the node
 * @param fqn the already traversed FQN (for recursive calls)
 * @param scope scope to look for the variable definition, used in recursion not to
 *              loop over same variable always in the lower scope
 */
export function getFullyQualifiedName(
  context: Rule.RuleContext,
  node: estree.Node,
  fqn: string[] = [],
  scope?: Scope.Scope,
): string | null {
  let nodeToCheck = reduceToIdentifier(node, fqn);

  if (!isIdentifier(nodeToCheck)) {
    return null;
  }

  const variable = getVariableFromScope(scope || context.getScope(), nodeToCheck.name);

  if (!variable || variable.defs.length > 1) {
    return null;
  }

  const definition = variable.defs.find(({ type }) => ['ImportBinding', 'Variable'].includes(type));

  if (!definition) {
    return null;
  }
  // imports
  if (definition.type === 'ImportBinding') {
    const specifier = definition.node;
    const importDeclaration = definition.parent;
    // import {default as cdk} from 'aws-cdk-lib';
    // vs.
    // import { aws_s3 as s3 } from 'aws-cdk-lib';
    if (specifier.type === 'ImportSpecifier' && specifier.imported?.name !== 'default') {
      fqn.unshift(specifier.imported?.name);
    }
    if (typeof importDeclaration.source?.value === 'string') {
      const importedQualifiers = importDeclaration.source.value.split('/');
      fqn.unshift(...importedQualifiers);
      return fqn.join('.');
    }
  }

  const value = getUniqueWriteReference(variable);
  // requires
  if (definition.type === 'Variable' && value) {
    // case for `const {Bucket} = require('aws-cdk-lib/aws-s3');`
    // case for `const {Bucket: foo} = require('aws-cdk-lib/aws-s3');`
    if (definition.node.id.type === 'ObjectPattern') {
      for (const property of definition.node.id.properties) {
        if ((property as estree.Property).value === definition.name) {
          fqn.unshift(((property as estree.Property).key as estree.Identifier).name);
        }
      }
    }
    const nodeToCheck = reduceTo('CallExpression', value, fqn);
    const module = getModuleNameFromRequire(nodeToCheck)?.value;
    if (typeof module === 'string') {
      const importedQualifiers = module.split('/');
      fqn.unshift(...importedQualifiers);
      return fqn.join('.');
    } else {
      return getFullyQualifiedName(context, nodeToCheck, fqn, variable.scope);
    }
  }
  return null;
}

/**
 * Helper function for getFullyQualifiedName to handle Member expressions
 * filling in the FQN array with the accessed properties.
 * @param node the Node to traverse
 * @param fqn the array with the qualifiers
 */
export function reduceToIdentifier(node: estree.Node, fqn: string[] = []): estree.Node {
  return reduceTo('Identifier', node, fqn);
}

/**
 * Reduce a given node through its ancestors until a given node type is found
 * filling in the FQN array with the accessed properties.
 * @param type the type of node you are looking for to be returned. Returned node still needs to be
 *             checked as its type it's not guaranteed to match the passed type.
 * @param node the Node to traverse
 * @param fqn the array with the qualifiers
 */
export function reduceTo<T extends estree.Node['type']>(
  type: T,
  node: estree.Node,
  fqn: string[] = [],
): estree.Node {
  let nodeToCheck: estree.Node = node;

  while (nodeToCheck.type !== type) {
    if (nodeToCheck.type === 'MemberExpression') {
      const { property } = nodeToCheck;
      if (property.type === 'Literal' && typeof property.value === 'string') {
        fqn.unshift(property.value);
      } else if (property.type === 'Identifier') {
        fqn.unshift(property.name);
      }
      nodeToCheck = nodeToCheck.object;
    } else if (nodeToCheck.type === 'CallExpression' && !getModuleNameFromRequire(nodeToCheck)) {
      nodeToCheck = nodeToCheck.callee;
    } else if (nodeToCheck.type === 'NewExpression') {
      nodeToCheck = nodeToCheck.callee;
    } else if (nodeToCheck.type === 'ChainExpression') {
      nodeToCheck = nodeToCheck.expression;
    } else if ((nodeToCheck as TSESTree.Node).type === 'TSNonNullExpression') {
      // we should migrate to use only TSESTree types everywhere to avoid casting
      nodeToCheck = (nodeToCheck as unknown as TSESTree.TSNonNullExpression)
        .expression as estree.Expression;
    } else {
      break;
    }
  }

  return nodeToCheck;
}
