/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import { getNodeParent } from '../ancestor.js';
import { isIdentifier } from '../ast.js';

const REACT_COMPONENT_WRAPPER_CALLEES = new Set(['memo', 'forwardRef']);

function hasIdentifierId(node: estree.Node): node is estree.Node & { id: estree.Identifier } {
  return 'id' in node && node.id != null && isIdentifier(node.id);
}

function isVariableDeclaratorWithIdentifierId(
  node: unknown,
): node is estree.VariableDeclarator & { id: estree.Identifier } {
  return (
    !!node &&
    typeof node === 'object' &&
    'type' in node &&
    node.type === 'VariableDeclarator' &&
    'id' in node &&
    !!node.id &&
    typeof node.id === 'object' &&
    'type' in node.id &&
    node.id.type === 'Identifier'
  );
}

function isVariableAssignedFunctionOrClassExpression(
  componentNode: estree.Node,
  parent: unknown,
): parent is estree.VariableDeclarator & { id: estree.Identifier } {
  return (
    (componentNode.type === 'ClassExpression' || componentNode.type === 'FunctionExpression') &&
    isVariableDeclaratorWithIdentifierId(parent)
  );
}

function isReactComponentWrapperCallee(callee: estree.Expression | estree.Super): boolean {
  return (
    (callee.type === 'Identifier' && REACT_COMPONENT_WRAPPER_CALLEES.has(callee.name)) ||
    (callee.type === 'MemberExpression' &&
      isIdentifier(callee.object, 'React') &&
      callee.property.type === 'Identifier' &&
      REACT_COMPONENT_WRAPPER_CALLEES.has(callee.property.name))
  );
}

function isWrappedInReactComponentCall(
  node: estree.Node,
  parent: estree.Node | undefined,
): parent is estree.CallExpression {
  return (
    parent?.type === 'CallExpression' &&
    parent.arguments.includes(node as unknown as estree.Expression) &&
    isReactComponentWrapperCallee(parent.callee)
  );
}

function getOutermostReactWrapperParent(componentNode: estree.Node): estree.Node | undefined {
  let currentNode: estree.Node = componentNode;
  let parent = getNodeParent(currentNode);

  while (isWrappedInReactComponentCall(currentNode, parent)) {
    currentNode = parent;
    parent = getNodeParent(currentNode);
  }

  return parent;
}

export function getOwningVariableDeclarator(
  componentNode: estree.Node,
): (estree.VariableDeclarator & { id: estree.Identifier }) | undefined {
  const parent = getOutermostReactWrapperParent(componentNode);
  return isVariableDeclaratorWithIdentifierId(parent) ? parent : undefined;
}

export function isAnonymousDefaultExportComponent(componentNode: estree.Node): boolean {
  const parent = getOutermostReactWrapperParent(componentNode);
  return parent?.type === 'ExportDefaultDeclaration';
}

export function getComponentVariable(
  sourceCode: SourceCode,
  componentNode: estree.Node,
): Scope.Variable | undefined {
  const componentIdentifier = getComponentIdentifier(componentNode);
  if (!componentIdentifier) {
    return undefined;
  }

  let scope: Scope.Scope | null = sourceCode.getScope(componentNode);
  while (scope) {
    const variable = scope.set.get(componentIdentifier.name);
    if (variable) {
      return variable;
    }
    scope = scope.upper;
  }

  return undefined;
}

export function getComponentIdentifier(componentNode: estree.Node): estree.Identifier | undefined {
  const parent = getNodeParent(componentNode);
  const owningVariableDeclarator = getOwningVariableDeclarator(componentNode);
  if (parent?.type === 'CallExpression' && owningVariableDeclarator) {
    return owningVariableDeclarator.id;
  }

  if (isVariableAssignedFunctionOrClassExpression(componentNode, parent)) {
    return parent.id;
  }

  if (hasIdentifierId(componentNode)) {
    return componentNode.id;
  }

  return isVariableDeclaratorWithIdentifierId(parent) ? parent.id : undefined;
}
