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
// https://sonarsource.github.io/rspec/#/rspec/S2925/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { isIdentifier, isMethodCall } from '../helpers/ast.js';
import { importsOrDependsOnModule } from '../helpers/module.js';
import * as meta from './generated-meta.js';

const CYPRESS_MODULES = ['cypress'];
const PLAYWRIGHT_MODULES = ['@playwright/test'];
const PUPPETEER_MODULES = ['puppeteer', 'puppeteer-core'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      fixedWait: 'Replace this fixed wait with a synchronization on an observable condition.',
      debugPause: 'Remove this debug pause from the test.',
    },
  }),
  create(context) {
    const hasCypress = importsOrDependsOnModule(context, CYPRESS_MODULES, CYPRESS_MODULES);
    const hasPlaywright = importsOrDependsOnModule(context, PLAYWRIGHT_MODULES, PLAYWRIGHT_MODULES);
    const hasPuppeteer = importsOrDependsOnModule(context, PUPPETEER_MODULES, PUPPETEER_MODULES);

    if (!hasCypress && !hasPlaywright && !hasPuppeteer) {
      return {};
    }

    return {
      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        const cypressFixedWait = hasCypress ? getCypressFixedWait(call) : null;
        const cypressDebugPause = hasCypress ? getCypressDebugPause(call) : null;
        const pageWaitForTimeout =
          hasPlaywright || hasPuppeteer ? getPageWaitForTimeout(call) : null;
        const pagePause = hasPlaywright ? getPagePause(call) : null;

        if (cypressFixedWait) {
          context.report({
            node: cypressFixedWait,
            messageId: 'fixedWait',
          });
        } else if (cypressDebugPause) {
          context.report({
            node: cypressDebugPause,
            messageId: 'debugPause',
          });
        } else if (pageWaitForTimeout) {
          context.report({
            node: pageWaitForTimeout,
            messageId: 'fixedWait',
          });
        } else if (pagePause) {
          context.report({
            node: pagePause,
            messageId: 'debugPause',
          });
        }
      },
    };
  },
};

function getCypressFixedWait(call: estree.CallExpression) {
  if (
    isMethodCall(call) &&
    isIdentifier(call.callee.object, 'cy') &&
    isIdentifier(call.callee.property, 'wait') &&
    call.arguments.length >= 1 &&
    isNumericLiteralArgument(call.arguments[0])
  ) {
    return call.callee.property;
  }

  return null;
}

function getCypressDebugPause(call: estree.CallExpression) {
  if (
    isMethodCall(call) &&
    isIdentifier(call.callee.object, 'cy') &&
    isIdentifier(call.callee.property, 'pause', 'debug') &&
    call.arguments.length === 0
  ) {
    return call.callee.property;
  }

  return null;
}

function getPageWaitForTimeout(call: estree.CallExpression) {
  if (
    isMethodCall(call) &&
    isIdentifier(call.callee.object, 'page') &&
    isIdentifier(call.callee.property, 'waitForTimeout') &&
    call.arguments.length >= 1
  ) {
    return call.callee.property;
  }

  return null;
}

function getPagePause(call: estree.CallExpression) {
  if (
    isMethodCall(call) &&
    isIdentifier(call.callee.object, 'page') &&
    isIdentifier(call.callee.property, 'pause') &&
    call.arguments.length === 0
  ) {
    return call.callee.property;
  }

  return null;
}

function isNumericLiteralArgument(argument: estree.Expression | estree.SpreadElement) {
  if (argument.type === 'Literal') {
    return typeof argument.value === 'number';
  }

  return (
    argument.type === 'UnaryExpression' &&
    (argument.operator === '+' || argument.operator === '-') &&
    argument.argument.type === 'Literal' &&
    typeof argument.argument.value === 'number'
  );
}
