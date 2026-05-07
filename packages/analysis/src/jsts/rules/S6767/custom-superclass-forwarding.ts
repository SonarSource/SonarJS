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
import { isIdentifier } from '../helpers/ast.js';
import { isReactComponentSuperclass } from '../helpers/react.js';

/**
 * False-positive remediation escape:
 * returns true when the component constructor forwards `props` to its own
 * non-React superclass, which this decorator treats as sufficient usage.
 */
export function hasOwnCustomSuperclassPropsForwarding(
  componentNode: estree.Node | undefined,
  context: Rule.RuleContext,
): boolean {
  if (componentNode?.type !== 'ClassDeclaration' && componentNode?.type !== 'ClassExpression') {
    return false;
  }

  const superClass = componentNode.superClass;
  if (superClass == null || isReactComponentSuperclass(context, superClass)) {
    return false;
  }

  return componentNode.body.body.some(
    member =>
      member.type === 'MethodDefinition' &&
      member.kind === 'constructor' &&
      member.value.body?.body.some(isWholePropsSuperCallStatement) === true,
  );
}

function isWholePropsSuperCallStatement(statement: estree.Statement): boolean {
  if (
    statement.type !== 'ExpressionStatement' ||
    statement.expression.type !== 'CallExpression' ||
    statement.expression.callee.type !== 'Super'
  ) {
    return false;
  }

  // This decorator intentionally treats direct whole-props forwarding to a custom
  // superclass as sufficient usage. Deeper validation of actual superclass prop
  // consumption is intentionally out of scope for this decorator-based design, even
  // though that accepts a small false-negative risk when forwarded props are not read.
  return statement.expression.arguments.some(argument => isIdentifier(argument, 'props'));
}
