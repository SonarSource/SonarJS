/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of the
 * Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import { getUniqueWriteReference, getVariableFromName } from '../helpers/ast.js';

function isObjectPatternBinding(variable: Scope.Variable) {
  return variable.defs.some(
    definition =>
      definition.type === 'Variable' &&
      definition.node.type === 'VariableDeclarator' &&
      definition.node.id.type === 'ObjectPattern',
  );
}

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
