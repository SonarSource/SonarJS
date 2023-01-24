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
import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { Node, isIdentifier, getVariableFromScope, getUniqueWriteReference } from './ast';
import Variable = Scope.Variable;

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

function isRequire(node: Node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    node.arguments.length === 1
  );
}

/**
 * Returns 'module' if `node` is a `require('module')` CallExpression
 *
 * For usage inside rules, prefer getFullyQualifiedName()
 *
 * @param node
 * @returns the module name or undefined
 */
function getModuleNameFromRequire(node: Node): estree.Literal | undefined {
  if (isRequire(node)) {
    const moduleName = (node as estree.CallExpression).arguments[0];
    if (moduleName.type === 'Literal') {
      return moduleName;
    }
  }
  return undefined;
}

/**
 * Returns the fully qualified name of ESLint node
 *
 * This function filters out the `node:` prefix
 *
 * A fully qualified name here denotes a value that is accessed through an imported
 * symbol, e.g., `foo.bar.baz` where `foo` was imported either from a require call
 * or an import statement:
 *
 * ```
 * const foo = require('lib');
 * foo.bar.baz.qux; // matches the fully qualified name 'lib.bar.baz.qux' (not 'foo.bar.baz.qux')
 * const foo2 = require('lib').bar;
 * foo2.baz.qux; // matches the fully qualified name 'lib.bar.baz.qux'
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
  return removeNodePrefixIfExists(getFullyQualifiedNameRaw(context, node, fqn, scope));
}

/**
 * Just like getFullyQualifiedName(), but does not filter out the `node:` prefix.
 *
 * To be used for rules that need to work with the `node:` prefix.
 */
export function getFullyQualifiedNameRaw(
  context: Rule.RuleContext,
  node: estree.Node,
  fqn: string[],
  scope?: Scope.Scope,
  visitedVars: Variable[] = [],
): string | null {
  let nodeToCheck = reduceToIdentifier(node, fqn);

  if (!isIdentifier(nodeToCheck)) {
    // require chaining, e.g. `require('lib')()` or `require('lib').prop()`
    if (node.type === 'CallExpression') {
      const qualifiers: string[] = [];
      const maybeRequire = reduceTo('CallExpression', node.callee, qualifiers);
      const module = getModuleNameFromRequire(maybeRequire);
      if (typeof module?.value === 'string') {
        qualifiers.unshift(module.value);
        return qualifiers.join('.');
      }
    }
    return null;
  }

  const variable = getVariableFromScope(scope || context.getScope(), nodeToCheck.name);

  if (!variable || variable.defs.length > 1) {
    return null;
  }

  // built-in variable
  // ESLint marks built-in global variables with an undocumented hidden `writeable` property that should equal `false`.
  // @see https://github.com/eslint/eslint/blob/6380c87c563be5dc78ce0ddd5c7409aaf71692bb/lib/linter/linter.js#L207
  // @see https://github.com/eslint/eslint/blob/6380c87c563be5dc78ce0ddd5c7409aaf71692bb/lib/rules/no-global-assign.js#L81
  if ((variable as any).writeable === false || visitedVars.includes(variable)) {
    fqn.unshift(nodeToCheck.name);
    return fqn.join('.');
  }

  const definition = variable.defs.find(({ type }) => ['ImportBinding', 'Variable'].includes(type));

  if (!definition) {
    return null;
  }

  // imports
  const fqnFromImport = checkFqnFromImport(variable, definition, context, fqn, visitedVars);
  if (fqnFromImport !== null) {
    return fqnFromImport;
  }

  // requires
  const fqnFromRequire = checkFqnFromRequire(variable, definition, context, fqn, visitedVars);
  if (fqnFromRequire !== null) {
    return fqnFromRequire;
  }

  return null;
}

function checkFqnFromImport(
  variable: Scope.Variable,
  definition: Scope.Definition,
  context: Rule.RuleContext,
  fqn: string[],
  visitedVars: Variable[] = [],
) {
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
    // import s3 = require('aws-cdk-lib/aws-s3');
    if ((importDeclaration as TSESTree.Node).type === 'TSImportEqualsDeclaration') {
      const importedModule = (importDeclaration as unknown as TSESTree.TSImportEqualsDeclaration)
        .moduleReference;
      if (
        importedModule.type === 'TSExternalModuleReference' &&
        importedModule.expression.type === 'Literal' &&
        typeof importedModule.expression.value === 'string'
      ) {
        const importedQualifiers = importedModule.expression.value.split('/');
        fqn.unshift(...importedQualifiers);
        return fqn.join('.');
      }
      //import s3 = cdk.aws_s3;
      if (importedModule.type === 'TSQualifiedName') {
        visitedVars.push(variable);
        return getFullyQualifiedNameRaw(
          context,
          importedModule as unknown as estree.Node,
          fqn,
          variable.scope,
          visitedVars,
        );
      }
    }
  }
  return null;
}

function checkFqnFromRequire(
  variable: Scope.Variable,
  definition: Scope.Definition,
  context: Rule.RuleContext,
  fqn: string[],
  visitedVars: Variable[] = [],
) {
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
      visitedVars.push(variable)
      return getFullyQualifiedNameRaw(
        context,
        nodeToCheck,
        fqn,
        variable.scope,
        visitedVars,
      );
    }
  }
  return null;
}

/**
 * Removes `node:` prefix if such exists
 *
 * Node.js builtin modules can be referenced with a `node:` prefix (eg.: node:fs/promises)
 *
 * https://nodejs.org/api/esm.html#node-imports
 *
 * @param fqn Fully Qualified Name (ex.: `node:https.request`)
 * @returns `fqn` sanitized from `node:` prefix (ex.: `https.request`)
 */
function removeNodePrefixIfExists(fqn: string | null) {
  if (fqn === null) {
    return null;
  }
  const NODE_NAMESPACE = 'node:';
  if (fqn.startsWith(NODE_NAMESPACE)) {
    return fqn.substring(NODE_NAMESPACE.length);
  }
  return fqn;
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
    } else if ((nodeToCheck as TSESTree.Node).type === 'TSQualifiedName') {
      const qualified = nodeToCheck as unknown as TSESTree.TSQualifiedName;
      fqn.unshift(qualified.right.name);
      nodeToCheck = qualified.left as estree.Node;
    } else {
      break;
    }
  }

  return nodeToCheck;
}
