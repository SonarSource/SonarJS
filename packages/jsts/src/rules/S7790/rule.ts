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
// https://sonarsource.github.io/rspec/#/rspec/S7790/javascript

import { Rule } from 'eslint';
import {
  isRequiredParserServices,
  generateMeta,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import estree from 'estree';
import * as meta from './generated-meta.js';

const messages = {
  safeCode: 'Make sure executing a dynamically formatted template is safe here.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
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
  return args.some(arg => !isLiteral(arg));
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
