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
import { getVariableFromScope, hasParent, isFunctionNode } from '../helpers/ast.js';

/**
 * Returns `true` when the current node satisfies `nodePredicate`, or when the
 * node is an identifier and one of that identifier's definitions satisfies
 * `definitionPredicate`.
 *
 * `visited` prevents cycles while following identifier definitions.
 */
export function matchesNodeOrIdentifierDefinition(
  node: estree.Node,
  sourceCode: SourceCode,
  visited: Set<Scope.Variable>,
  nodePredicate: (node: estree.Node) => boolean,
  definitionPredicate: (definition: Scope.Definition, variable: Scope.Variable) => boolean,
): boolean {
  if (nodePredicate(node)) {
    return true;
  }

  if (node.type !== 'Identifier') {
    return false;
  }

  const variable = getVariableFromScope(sourceCode.getScope(node), node.name);
  if (!variable || visited.has(variable)) {
    return false;
  }
  visited.add(variable);

  return variable.defs.some(definition => definitionPredicate(definition, variable));
}

/**
 * Returns `true` when `definition` is a function parameter and every direct
 * call to that function passes an argument at that parameter position that
 * satisfies `predicate`.
 *
 * Missing call sites, indirect calls, or mixed reference shapes are treated as
 * unproven and return `false`.
 */
export function everyDirectCallSiteArgumentMatches(
  definition: Scope.Definition,
  sourceCode: SourceCode,
  predicate: (argument: estree.Expression | estree.SpreadElement | undefined) => boolean,
): boolean {
  if (definition.name.type !== 'Identifier' || !isFunctionNode(definition.node)) {
    return false;
  }

  const parameterIndex = definition.node.params.indexOf(definition.name);
  if (parameterIndex === -1) {
    return false;
  }

  const callSites = findDirectCallSites(definition.node, sourceCode);
  return (
    callSites !== null &&
    callSites.length > 0 &&
    callSites.every(callSite => predicate(callSite.arguments[parameterIndex]))
  );
}

/**
 * Collects the direct calls made through a function's own binding.
 *
 * Pseudo-code:
 *   const fn = ...
 *   fn(...)
 *
 * The function's own binding write is ignored for variable-bound functions.
 * Any other reference that is not used as the callee of a call makes the call
 * set unreliable, so the function returns `null` and the fallback stops.
 */
function findDirectCallSites(
  functionNode: estree.Function,
  sourceCode: SourceCode,
): estree.CallExpression[] | null {
  const variable = getFunctionVariable(functionNode, sourceCode);
  if (!variable) {
    return null;
  }

  const bindingIdentifier = getFunctionBindingIdentifier(functionNode);
  const calls: estree.CallExpression[] = [];
  for (const reference of variable.references) {
    if (
      bindingIdentifier != null &&
      reference.isWrite() &&
      reference.identifier === bindingIdentifier
    ) {
      continue;
    }

    const parent = hasParent(reference.identifier) ? reference.identifier.parent : null;
    if (parent?.type === 'CallExpression' && parent.callee === reference.identifier) {
      calls.push(parent);
      continue;
    }
    return null;
  }

  return calls;
}

function getFunctionBindingIdentifier(functionNode: estree.Function): estree.Identifier | null {
  if (functionNode.type === 'FunctionDeclaration' && functionNode.id) {
    return functionNode.id;
  }

  if (!hasParent(functionNode)) {
    return null;
  }

  const parent = functionNode.parent;
  if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return parent.id;
  }

  if (parent?.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
    return parent.left;
  }

  return null;
}

/**
 * Resolves the variable that names a function when the function is declared,
 * assigned to a variable, or assigned to an identifier.
 *
 * Pseudo-code:
 *   function fn() {}
 *   const fn = () => {}
 *   fn = () => {}
 */
function getFunctionVariable(
  functionNode: estree.Function,
  sourceCode: SourceCode,
): Scope.Variable | undefined {
  if (functionNode.type === 'FunctionDeclaration' && functionNode.id) {
    return getVariableFromScope(sourceCode.getScope(functionNode.id), functionNode.id.name);
  }

  if (!hasParent(functionNode)) {
    return undefined;
  }

  const parent = functionNode.parent;
  if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return getVariableFromScope(sourceCode.getScope(parent.id), parent.id.name);
  }

  if (parent?.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
    return getVariableFromScope(sourceCode.getScope(parent.left), parent.left.name);
  }

  return undefined;
}
