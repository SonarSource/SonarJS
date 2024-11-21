/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4817/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import {
  generateMeta,
  getFullyQualifiedName,
  isLiteral,
  isMemberExpression,
  isMemberWithProperty,
} from '../helpers/index.js';
import { meta } from './meta.js';

const xpathModule = 'xpath';

const xpathEvalMethods = ['select', 'select1', 'evaluate'];
const ieEvalMethods = ['selectNodes', 'SelectSingleNode'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      checkXPath: 'Make sure that executing this XPATH expression is safe.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      MemberExpression: (node: estree.Node) => {
        if (isMemberExpression(node, 'document', 'evaluate')) {
          context.report({ messageId: 'checkXPath', node });
        }
      },
      CallExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.CallExpression, context),
    };
  },
};

function checkCallExpression(
  { callee, arguments: args }: estree.CallExpression,
  context: Rule.RuleContext,
) {
  if (args.length > 0 && isLiteral(args[0])) {
    return;
  }

  // IE
  if (isMemberWithProperty(callee, ...ieEvalMethods) && args.length === 1) {
    context.report({ messageId: 'checkXPath', node: callee });
    return;
  }

  // Document.evaluate
  if (
    isMemberWithProperty(callee, 'evaluate') &&
    !isMemberExpression(callee, 'document', 'evaluate') &&
    args.length >= 4
  ) {
    const resultTypeArgument = args[3];
    const argumentAsText = context.sourceCode.getText(resultTypeArgument);
    if (argumentAsText.includes('XPathResult')) {
      context.report({ messageId: 'checkXPath', node: callee });
      return;
    }
  }

  // "xpath" module
  const fqn = getFullyQualifiedName(context, callee);
  if (xpathEvalMethods.some(method => fqn === `${xpathModule}.${method}`)) {
    context.report({ messageId: 'checkXPath', node: callee });
  }
}
