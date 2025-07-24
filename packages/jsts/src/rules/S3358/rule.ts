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
// https://sonarsource.github.io/rspec/#/rspec/S3358/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      extractTernary: 'Extract this nested ternary operation into an independent statement.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      'ConditionalExpression ConditionalExpression': (node: estree.Node) => {
        if (!isNestingBroken(context.sourceCode.getAncestors(node))) {
          context.report({
            messageId: 'extractTernary',
            node,
          });
        }
      },
    };
  },
};

function isNestingBroken(ancestors: estree.Node[]) {
  let parent = ancestors.pop()!;
  while (parent.type !== 'ConditionalExpression') {
    if (breaksNesting(parent)) {
      return true;
    }
    parent = ancestors.pop()!;
  }
  return false;
}

function breaksNesting(node: estree.Node) {
  return [
    'ArrayExpression',
    'ObjectExpression',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'JSXExpressionContainer',
  ].includes(node.type);
}
