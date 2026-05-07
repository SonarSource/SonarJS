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
import { getNodeParent } from '../helpers/ancestor.js';
import { isFunctionNode, isIdentifier } from '../helpers/ast.js';
import { isForwardRefCallee } from '../helpers/react.js';

/**
 * False-positive remediation escape:
 * returns true when the specific reported prop is consumed through a `forwardRef`
 * callback that closes over the component's props binding.
 *
 * function Component(props) {
 *   forwardRef(() => props.propName);
 * }
 */
export function hasForwardRefCallbackPropUsage(
  sourceCode: SourceCode,
  componentNode: estree.Node | undefined,
  propName: string | undefined,
): boolean {
  if (!componentNode || !propName || !isFunctionNode(componentNode)) {
    return false;
  }

  const propsParam = componentNode.params[0];
  if (!isIdentifier(propsParam)) {
    return false;
  }

  const variable = sourceCode.getScope(componentNode).set.get(propsParam.name);
  if (!variable) {
    return false;
  }

  return variable.references.some(reference =>
    isPropReferenceInForwardRefCallback(reference, propName),
  );
}

/**
 * Pseudo code for the matched AST:
 * forwardRef(
 *   (...) => {
 *     referenceIdentifier.propName;
 *   },
 * );
 *
 * The matched reference must be the object side of a direct member access,
 * and that member access must appear somewhere inside the first argument of `forwardRef(...)`.
 */
function isPropReferenceInForwardRefCallback(
  reference: Scope.Reference,
  propName: string,
): boolean {
  const memberExpression = getNodeParent(reference.identifier);
  if (
    memberExpression?.type !== 'MemberExpression' ||
    memberExpression.object !== reference.identifier ||
    memberExpression.computed ||
    !isIdentifier(memberExpression.property, propName)
  ) {
    return false;
  }

  // Walk up ancestors. Track `prev` so that when we find a forwardRef CallExpression
  // we can confirm the reference sits inside its first argument (the render callback),
  // not in the callee position or a later argument.
  let prev: estree.Node = memberExpression;
  let current: estree.Node | undefined = getNodeParent(memberExpression);
  while (current) {
    if (current.type === 'CallExpression') {
      const call = current;
      if (isForwardRefCallee(call.callee) && call.arguments[0] === prev) {
        return true;
      }
    }
    prev = current;
    current = getNodeParent(current);
  }
  return false;
}
