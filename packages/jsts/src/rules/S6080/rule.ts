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
// https://sonarsource.github.io/rspec/#/rspec/S6080/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import {
  Chai,
  generateMeta,
  getUniqueWriteUsageOrNode,
  isIdentifier,
  isMethodCall,
  isNumberLiteral,
  isThisExpression,
  Mocha,
} from '../helpers/index.js';
import { meta } from './meta.js';

const MESSAGE =
  'Set this timeout to 0 if you want to disable it, otherwise use a value lower than 2147483648.';
const MAX_DELAY_VALUE = 2_147_483_647;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData),
  create(context: Rule.RuleContext) {
    if (!Chai.isImported(context)) {
      return {};
    }
    const constructs: estree.Node[] = [];
    return {
      CallExpression: (node: estree.Node) => {
        if (Mocha.isTestConstruct(node)) {
          constructs.push(node);
          return;
        }
        if (constructs.length > 0) {
          checkTimeoutDisabling(node as estree.CallExpression, context);
        }
      },
      'CallExpression:exit': (node: estree.Node) => {
        if (Mocha.isTestConstruct(node)) {
          constructs.pop();
        }
      },
    };
  },
};

function checkTimeoutDisabling(node: estree.CallExpression, context: Rule.RuleContext) {
  if (isMethodCall(node) && node.arguments.length > 0) {
    const {
      callee: { object, property },
      arguments: [value],
    } = node;
    if (
      isThisExpression(object) &&
      isIdentifier(property, 'timeout') &&
      isDisablingTimeout(value, context)
    ) {
      context.report({
        message: MESSAGE,
        node: value,
      });
    }
  }
}

function isDisablingTimeout(timeout: estree.Node, context: Rule.RuleContext) {
  const usage = getUniqueWriteUsageOrNode(context, timeout);
  return isNumberLiteral(usage) && usage.value > MAX_DELAY_VALUE;
}
