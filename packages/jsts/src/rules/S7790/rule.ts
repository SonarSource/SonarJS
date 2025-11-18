/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
// https://sonarsource.github.io/rspec/#/rspec/S2077/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta, getFullyQualifiedName } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const templatingFqns: Set<string> = new Set([
  'pug.compile',
  'pug.render',
  'ejs.compile',
  'ejs.render',
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      reviewDynamicTemplate: `Make sure this dynamically formatted template is safe here.`,
    },
  }),

  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        const fqn = getFullyQualifiedName(context, callExpression);

        if (fqn && templatingFqns.has(fqn) && isQuestionable(callExpression)) {
          context.report({
            messageId: 'reviewDynamicTemplate',
            node: callExpression.callee,
          });
        }
      },
    };
  },
};

function isQuestionable(node: estree.CallExpression, index = 0): boolean {
  const args = node.arguments;
  const templateString = args[index] as estree.Expression | estree.SpreadElement | undefined;

  if (!templateString) {
    return false;
  }

  // Is a template literal with expressions
  if (templateString.type === 'TemplateLiteral' && templateString.expressions.length !== 0) {
    return true;
  }

  // Is a concatenation involving one or more variables
  if (isConcatenation(templateString)) {
    return isVariableConcat(templateString);
  }

  // Is a variable which value cannot be determined statically
  return !isHardcodedLiteral(templateString);
}

function isVariableConcat(node: estree.BinaryExpression): boolean {
  const { left, right } = node;
  if (!isHardcodedLiteral(right)) {
    return true;
  }
  if (isConcatenation(left)) {
    return isVariableConcat(left);
  }
  return !isHardcodedLiteral(left);
}

function isConcatenation(node: estree.Node): node is estree.BinaryExpression {
  return node.type === 'BinaryExpression' && node.operator === '+';
}

function isHardcodedLiteral(node: estree.Node) {
  // A hardcoded string literal or a template literal without expressions
  return (
    node.type === 'Literal' || (node.type === 'TemplateLiteral' && node.expressions.length === 0)
  );
}
