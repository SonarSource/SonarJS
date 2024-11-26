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
// https://sonarsource.github.io/rspec/#/rspec/S1523/javascript
// SQ key 'eval'

import type { Rule } from 'eslint';
import estree from 'estree';
import { eslintRules } from '../core/index.js';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

const noScriptUrlRule = eslintRules['no-script-url'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      safeCode: 'Make sure that this dynamic injection or execution of code is safe.',
      unexpectedScriptURL: "Make sure that 'javascript:' code is safe as it is a form of eval().",
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.CallExpression, context),
      NewExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.CallExpression, context),
      ...noScriptUrlRule.create(context),
    };
  },
};

function checkCallExpression(node: estree.CallExpression, context: Rule.RuleContext) {
  if (node.callee.type === 'Identifier') {
    const { name } = node.callee;
    if ((name === 'eval' || name === 'Function') && hasAtLeastOneVariableArgument(node.arguments)) {
      context.report({
        messageId: 'safeCode',
        node: node.callee,
      });
    }
  }
}

function hasAtLeastOneVariableArgument(args: Array<estree.Node>) {
  return !!args.find(arg => !isLiteral(arg));
}

function isLiteral(node: estree.Node) {
  if (node.type === 'Literal') {
    return true;
  }

  if (node.type === 'TemplateLiteral') {
    return node.expressions.length === 0;
  }

  return false;
}
