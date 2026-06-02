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
import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { getUniqueWriteReference, getVariableFromName, isIdentifier } from '../helpers/ast.js';

function isObjectPatternBinding(variable: Scope.Variable) {
  return variable.defs.some(
    definition =>
      definition.type === 'Variable' &&
      definition.node.type === 'VariableDeclarator' &&
      definition.node.id.type === 'ObjectPattern',
  );
}

/**
 * Returns all read references reachable from `scope`, including nested scopes.
 *
 * Pseudo code:
 *   function outer() {
 *     props.label; // included
 *     function inner() {
 *       props.title; // included
 *     }
 *   }
 */
export function collectReferences(scope: Scope.Scope): Scope.Reference[] {
  return [
    ...scope.references.filter(reference => reference.isRead()),
    ...scope.childScopes.flatMap(collectReferences),
  ];
}

/**
 * Returns true when `node` is the tracked whole-props expression itself or a
 * single-write alias of it.
 *
 * Pseudo code:
 *   props
 *   const forwarded = props;
 *   forwarded
 *
 *   const forwarded = props;
 *   const copy = forwarded;
 *   copy
 */
export function isWholePropsExpressionOrAlias(
  context: Rule.RuleContext,
  node: estree.Node,
  isTrackedPropsExpression: (node: estree.Node) => boolean,
  seen = new Set<Scope.Variable>(),
): boolean {
  if (isTrackedPropsExpression(node)) {
    return true;
  }
  if (node.type !== 'Identifier') {
    return false;
  }

  const variable = getVariableFromName(context, node.name, node);
  if (!variable || seen.has(variable) || isObjectPatternBinding(variable)) {
    return false;
  }

  seen.add(variable);
  const writeExpr = getUniqueWriteReference(variable);
  return (
    !!writeExpr && isWholePropsExpressionOrAlias(context, writeExpr, isTrackedPropsExpression, seen)
  );
}

/**
 * Returns true when `node` reads `propName` from the tracked props expression,
 * either directly, through a whole-props alias, or through destructuring.
 *
 * Pseudo code:
 *   props.label
 *
 *   const forwarded = props;
 *   forwarded.label
 *
 *   const { label } = props;
 *   label
 *
 *   const forwarded = props;
 *   const { label } = forwarded;
 *   label
 */
export function isNamedPropExpressionOrAlias(
  context: Rule.RuleContext,
  node: estree.Node,
  propName: string,
  isTrackedPropsExpression: (node: estree.Node) => boolean,
  seen = new Set<Scope.Variable>(),
): boolean {
  if (
    node.type === 'MemberExpression' &&
    !node.computed &&
    isIdentifier(node.property, propName) &&
    isWholePropsExpressionOrAlias(context, node.object, isTrackedPropsExpression, seen)
  ) {
    return true;
  }
  if (node.type !== 'Identifier') {
    return false;
  }

  const variable = getVariableFromName(context, node.name, node);
  if (!variable || seen.has(variable)) {
    return false;
  }

  seen.add(variable);
  const writeExpr = getUniqueWriteReference(variable);
  if (
    writeExpr &&
    isNamedPropExpressionOrAlias(context, writeExpr, propName, isTrackedPropsExpression, seen)
  ) {
    return true;
  }

  return variable.defs.some(
    definition =>
      definition.type === 'Variable' &&
      definition.node.type === 'VariableDeclarator' &&
      definition.node.id.type === 'ObjectPattern' &&
      definition.node.init != null &&
      isWholePropsExpressionOrAlias(
        context,
        definition.node.init,
        isTrackedPropsExpression,
        seen,
      ) &&
      definition.node.id.properties.some(
        property =>
          property.type === 'Property' &&
          !property.computed &&
          property.kind === 'init' &&
          isIdentifier(property.key, propName) &&
          property.value.type === 'Identifier' &&
          property.value === definition.name,
      ),
  );
}
