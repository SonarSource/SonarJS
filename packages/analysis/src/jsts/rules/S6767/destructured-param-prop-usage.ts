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

import type { Rule } from 'eslint';
import type estree from 'estree';
import { isFunctionNode, isIdentifier } from '../helpers/ast.js';

/**
 * Returns true when the reported prop is consumed through a destructured
 * parameter binding in the component function's first parameter.
 *
 * Pattern: ({ section }: { section: SectionItem }) => <Text>{section.title}</Text>
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
  let localIdentifier: estree.Identifier;

  if (isIdentifier(value)) {
    // { section } or { section: alias }
    localIdentifier = value;
  } else if (value.type === 'AssignmentPattern' && isIdentifier(value.left)) {
    // { section = default } or { section: alias = default }
    localIdentifier = value.left;
  } else {
    return false;
  }

  const variable = context.sourceCode.getScope(componentNode).set.get(localIdentifier.name);
  if (!variable) {
    return false;
  }

  return variable.references.some(ref => ref.isRead());
}
