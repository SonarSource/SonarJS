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

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { isFunctionNode, isIdentifier, resolveIdentifiers } from '../../helpers/ast.js';

/**
 * Returns true when the given pattern node binds at least one identifier that
 * is read in the given scope. Delegates to resolveIdentifiers to walk nested
 * destructuring patterns, aliases, defaults, and rest elements, so it covers
 * the same cases as every other consumer of that helper (e.g. `{ section:
 * { items: [...rest] } }` where `rest` is read).
 */
function isBindingRead(node: estree.Pattern | null, scope: Scope.Scope): boolean {
  if (node === null) {
    return false;
  }
  return resolveIdentifiers(node as TSESTree.Node, true).some(
    id => scope.set.get(id.name)?.references.some(ref => ref.isRead()) ?? false,
  );
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
    (prop): prop is estree.AssignmentProperty =>
      prop.type !== 'RestElement' && !prop.computed && isIdentifier(prop.key, propName),
  );

  if (!matchingProperty) {
    return false;
  }

  const scope = context.sourceCode.getScope(componentNode);
  return isBindingRead(matchingProperty.value, scope);
}
