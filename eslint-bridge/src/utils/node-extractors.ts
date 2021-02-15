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
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { Rule, Scope } from 'eslint';
import { flatMap } from './collections';
import { isIdentifier, isLiteral } from './ast-shape';

export function getUniqueWriteUsage(context: Rule.RuleContext, name: string) {
  const variable = getVariableFromName(context, name);
  if (variable) {
    const writeReferences = variable.references.filter(reference => reference.isWrite());
    if (writeReferences.length === 1 && writeReferences[0].writeExpr) {
      return writeReferences[0].writeExpr;
    }
  }
  return undefined;
}

export function getUniqueWriteUsageOrNode(
  context: Rule.RuleContext,
  node: estree.Node,
): estree.Node {
  if (node.type === 'Identifier') {
    return getUniqueWriteUsage(context, node.name) || node;
  } else {
    return node;
  }
}

export function getValueOfExpression<T extends estree.Node['type']>(
  context: Rule.RuleContext,
  expr: estree.Node | undefined | null,
  type: T,
) {
  if (!expr) {
    return undefined;
  }
  if (expr.type === 'Identifier') {
    const usage = getUniqueWriteUsage(context, expr.name);
    if (usage && isNodeType(usage, type)) {
      return usage;
    }
  }

  if (isNodeType(expr, type)) {
    return expr;
  }
  return undefined;
}

// see https://stackoverflow.com/questions/64262105/narrowing-return-value-of-function-based-on-argument
function isNodeType<T extends estree.Node['type']>(
  node: estree.Node,
  type: T,
): node is Extract<estree.Node, { type: T }> {
  return node.type === type;
}

/**
 * for `x = 42` or `let x = 42` when visiting '42' returns 'x' variable
 */
export function getLhsVariable(context: Rule.RuleContext): Scope.Variable | undefined {
  const parent = context.getAncestors()[context.getAncestors().length - 1];
  let formIdentifier: estree.Identifier | undefined;
  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    formIdentifier = parent.id;
  } else if (parent.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
    formIdentifier = parent.left;
  }
  if (formIdentifier) {
    return getVariableFromName(context, formIdentifier.name);
  }

  return undefined;
}

export function getVariableFromName(context: Rule.RuleContext, name: string) {
  let scope: Scope.Scope | null = context.getScope();
  let variable;
  while (variable == null && scope != null) {
    variable = scope.variables.find(value => value.name === name);
    scope = scope.upper;
  }
  return variable;
}

/**
 * Takes array of arguments. Keeps following variable definitions
 * and unpacking arrays as long as possible. Returns flattened
 * array with all collected nodes.
 *
 * A usage example should clarify why this might be useful.
 * According to ExpressJs `app.use` spec, the arguments can be:
 *
 * - A middleware function.
 * - A series of middleware functions (separated by commas).
 * - An array of middleware functions.
 * - A combination of all of the above.
 *
 * This means that methods like `app.use` accept variable arguments,
 * but also arrays, or combinations thereof. This methods helps
 * to flatten out such complicated composed argument lists.
 */
export function flattenArgs(context: Rule.RuleContext, args: estree.Node[]): estree.Node[] {
  // Invokes `getUniqueWriteUsageOrNode` at most once, from then on
  // only flattens arrays.
  function recHelper(nodePossiblyIdentifier: estree.Node): estree.Node[] {
    const n = getUniqueWriteUsageOrNode(context, nodePossiblyIdentifier);
    if (n.type === 'ArrayExpression') {
      return flatMap(n.elements as estree.Node[], recHelper);
    } else {
      return [n];
    }
  }

  return flatMap(args, recHelper);
}

export function resolveIdentifiers(
  node: TSESTree.Node,
  acceptShorthand = false,
): TSESTree.Identifier[] {
  const identifiers: TSESTree.Identifier[] = [];
  resolveIdentifiersAcc(node, identifiers, acceptShorthand);
  return identifiers;
}

function resolveIdentifiersAcc(
  node: TSESTree.Node,
  identifiers: TSESTree.Identifier[],
  acceptShorthand: boolean,
): void {
  if (!node) {
    return;
  }
  switch (node.type) {
    case 'Identifier':
      identifiers.push(node);
      break;
    case 'ObjectPattern':
      node.properties.forEach(prop => resolveIdentifiersAcc(prop, identifiers, acceptShorthand));
      break;
    case 'ArrayPattern':
      node.elements.forEach(
        elem => elem && resolveIdentifiersAcc(elem, identifiers, acceptShorthand),
      );
      break;
    case 'Property':
      if (acceptShorthand || !node.shorthand) {
        resolveIdentifiersAcc(node.value, identifiers, acceptShorthand);
      }
      break;
    case 'RestElement':
      resolveIdentifiersAcc(node.argument, identifiers, acceptShorthand);
      break;
    case 'AssignmentPattern':
      resolveIdentifiersAcc(node.left, identifiers, acceptShorthand);
      break;
    case 'TSParameterProperty':
      resolveIdentifiersAcc(node.parameter, identifiers, acceptShorthand);
      break;
  }
}

export function getObjectExpressionProperty(
  node: estree.Node | undefined | null,
  propertyKey: string,
): estree.Property | undefined {
  if (node?.type === 'ObjectExpression') {
    const properties = node.properties.filter(
      p =>
        p.type === 'Property' &&
        (isIdentifier(p.key, propertyKey) || (isLiteral(p.key) && p.key.value === propertyKey)),
    ) as estree.Property[];
    // if property is duplicated, we return the last defined
    return properties[properties.length - 1];
  }
  return undefined;
}

export function getPropertyWithValue(
  context: Rule.RuleContext,
  objectExpression: estree.ObjectExpression,
  propertyName: string,
  propertyValue: estree.Literal['value'],
): estree.Property | undefined {
  const maybeProperty = getObjectExpressionProperty(objectExpression, propertyName);
  if (maybeProperty) {
    const maybePropertyValue = getValueOfExpression(context, maybeProperty.value, 'Literal');
    if (maybePropertyValue?.value === propertyValue) {
      return maybeProperty;
    }
  }
  return undefined;
}

export function resolveFromFunctionReference(
  context: Rule.RuleContext,
  functionIdentifier: estree.Identifier,
) {
  const reference = context
    .getScope()
    .references.find(ref => ref.identifier === functionIdentifier);
  if (
    reference &&
    reference.resolved &&
    reference.resolved.defs.length === 1 &&
    reference.resolved.defs[0] &&
    reference.resolved.defs[0].type === 'FunctionName'
  ) {
    return reference.resolved.defs[0].node;
  }
  return null;
}
