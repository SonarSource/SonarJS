/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S3616/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, isLiteral } from '../helpers/index.js';
import * as meta from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      specifyCase: `Explicitly specify {{nesting}} separate cases that fall through; currently this case clause only works for "{{expression}}".`,
    },
  }),
  create(context: Rule.RuleContext) {
    function reportIssue(node: estree.Node, clause: estree.Node, nestingLvl: number) {
      context.report({
        messageId: 'specifyCase',
        data: {
          nesting: nestingLvl.toString(),
          expression: String(getTextFromNode(clause)),
        },
        node,
      });
    }

    function getTextFromNode(node: estree.Node) {
      if (node.type === 'Literal') {
        return node.value;
      } else {
        return context.sourceCode.getText(node);
      }
    }

    return {
      'SwitchCase > SequenceExpression'(node: estree.Node) {
        const expressions = (node as estree.SequenceExpression).expressions;
        reportIssue(node, expressions[expressions.length - 1], expressions.length);
      },
      'SwitchCase > LogicalExpression'(node: estree.Node) {
        if (!isSwitchTrue(getEnclosingSwitchStatement(context, node))) {
          const firstElemAndNesting = getFirstElementAndNestingLevel(
            node as estree.LogicalExpression,
            0,
          );
          if (firstElemAndNesting) {
            reportIssue(node, firstElemAndNesting[0], firstElemAndNesting[1] + 1);
          }
        }
      },
    };
  },
};

function getEnclosingSwitchStatement(
  context: Rule.RuleContext,
  node: estree.Node,
): estree.SwitchStatement {
  const ancestors = context.sourceCode.getAncestors(node);
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (ancestors[i].type === 'SwitchStatement') {
      return ancestors[i] as estree.SwitchStatement;
    }
  }
  throw new Error('A switch case should have an enclosing switch statement');
}

function isSwitchTrue(node: estree.SwitchStatement) {
  return isLiteral(node.discriminant) && node.discriminant.value === true;
}

function getFirstElementAndNestingLevel(
  logicalExpression: estree.LogicalExpression,
  currentLvl: number,
): [estree.Node, number] | undefined {
  if (logicalExpression.operator === '||') {
    if (logicalExpression.left.type === 'LogicalExpression') {
      return getFirstElementAndNestingLevel(logicalExpression.left, currentLvl + 1);
    } else {
      return [logicalExpression.left, currentLvl + 1];
    }
  }
  return undefined;
}
