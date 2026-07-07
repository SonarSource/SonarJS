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
import { isFunctionNode, isIdentifier } from '../helpers/ast.js';

/**
 * Returns true when the given pattern node corresponds to a variable binding
 * that is read in the given scope, including nested destructuring patterns.
 */
function isBindingRead(node: estree.Pattern | null, scope: Scope.Scope): boolean {
  if (node === null) {
    return false;
  }
  if (isIdentifier(node)) {
    return scope.set.get(node.name)?.references.some(ref => ref.isRead()) ?? false;
  }
  if (node.type === 'AssignmentPattern' && isIdentifier(node.left)) {
    return scope.set.get(node.left.name)?.references.some(ref => ref.isRead()) ?? false;
  }
  if (node.type === 'ObjectPattern' || node.type === 'ArrayPattern') {
    return hasAnyNestedBindingRead(node, scope);
  }
  return false;
}

/**
 * Returns true when at least one binding introduced by the nested destructuring
 * pattern is read in the given scope. Handles ObjectPattern and ArrayPattern
 * recursively to cover cases like `{ section: { title } }`.
 */
function hasAnyNestedBindingRead(
  pattern: estree.ObjectPattern | estree.ArrayPattern,
  scope: Scope.Scope,
): boolean {
  const nodes: (estree.Pattern | null)[] =
    pattern.type === 'ObjectPattern'
      ? pattern.properties.map(p => (p.type === 'RestElement' ? p.argument : p.value))
      : pattern.elements;
  return nodes.some(node => isBindingRead(node, scope));
}

/**
 * Returns true when the reported prop is consumed through a destructured
 * parameter binding in the component function's first parameter.
 *
 * Patterns:
 *   ({ section }: { section: SectionItem }) => <Text>{section.title}</Text>
 *   ({ section: { title } }: { section: SectionItem }) => <Text>{title}</Text>
 *
 * Inner callbacks (e.g., inside React.useCallback) are not recognized as
 * components at function-entry time, so markDestructuredFunctionArgumentsAsUsed
 * never runs for them — this escape suppresses the resulting FP.
 */
export function hasDestructuredParamPropUsage(
  componentNode: estree.Node,
  context: Rule.RuleContext,
  propName: string | undefined,
): boolean {
  if (!propName || !isFunctionNode(componentNode)) {
    return false;
  }

  const firstParam = componentNode.params[0];
  let objectPattern: estree.ObjectPattern;

  if (firstParam?.type === 'ObjectPattern') {
    objectPattern = firstParam;
  } else if (firstParam?.type === 'AssignmentPattern' && firstParam.left.type === 'ObjectPattern') {
    objectPattern = firstParam.left;
  } else {
    return false;
  }

  const matchingProperty = objectPattern.properties.find(
    prop => prop.type !== 'RestElement' && !prop.computed && isIdentifier(prop.key, propName),
  );

  if (!matchingProperty || matchingProperty.type === 'RestElement') {
    return false;
  }

  const value = matchingProperty.value;
  const scope = context.sourceCode.getScope(componentNode);

  if (isIdentifier(value)) {
    // { section } or { section: alias }
    const variable = scope.set.get(value.name);
    return variable?.references.some(ref => ref.isRead()) ?? false;
  } else if (value.type === 'AssignmentPattern' && isIdentifier(value.left)) {
    // { section = default } or { section: alias = default }
    const variable = scope.set.get(value.left.name);
    return variable?.references.some(ref => ref.isRead()) ?? false;
  } else if (value.type === 'ObjectPattern') {
    // { section: { title } } — nested destructuring; suppress if any inner binding is read
    return hasAnyNestedBindingRead(value, scope);
  } else {
    return false;
  }
}
