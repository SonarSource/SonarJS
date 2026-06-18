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
// https://sonarsource.github.io/rspec/#/rspec/S8783/javascript

import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { getProperty, getValueOfExpression, isMethodCall } from '../helpers/ast.js';
import { chainStartsWithCy } from '../helpers/cypress.js';
import { getDependenciesSanitizePaths } from '../helpers/dependency-manifests/dependencies.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { importsOrDependsOnModule } from '../helpers/module.js';
import {
  isPlaywrightLocatorExpression,
  trackPlaywrightLocators,
} from '../S5906/assertion-utils.js';
import * as meta from './generated-meta.js';

const messages = {
  removeForce: 'Remove this forced interaction and wait for the element to be actionable instead.',
};

const PLAYWRIGHT_MODULES = ['@playwright/test'];

// The options object is always the trailing argument of these commands, but it can
// follow a variable number of positional arguments (e.g. Cypress `.click(options)`,
// `.click(position, options)`, `.click(x, y, options)`). The mapped value is the
// minimum index at which the options object may appear, guarding required positional
// arguments (e.g. the event name of Cypress `.trigger()` or the value of `.type()`).
const CYPRESS_MIN_OPTIONS_INDEX = new Map([
  ['click', 0],
  ['check', 0],
  ['clear', 0],
  ['dblclick', 0],
  ['rightclick', 0],
  ['select', 1],
  ['trigger', 1],
  ['type', 1],
  ['uncheck', 0],
]);

const PLAYWRIGHT_MIN_OPTIONS_INDEX = new Map([
  ['check', 0],
  ['clear', 0],
  ['click', 0],
  ['dblclick', 0],
  ['dragTo', 1],
  ['fill', 1],
  ['hover', 0],
  ['selectOption', 1],
  ['selectText', 0],
  ['setChecked', 1],
  ['tap', 0],
  ['uncheck', 0],
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const hasCypress = getDependenciesSanitizePaths(context).has('cypress');
    const hasPlaywright = importsOrDependsOnModule(context, PLAYWRIGHT_MODULES, PLAYWRIGHT_MODULES);
    const playwrightLocators = new Set<Scope.Variable>();

    if (!hasCypress && !hasPlaywright) {
      return {};
    }

    function reportIfForced(call: estree.CallExpression, minOptionsIndex: number): void {
      if (call.arguments.length <= minOptionsIndex) {
        return;
      }
      const optionsArgument = call.arguments.at(-1);
      const forceProperty = findForceTrueProperty(context, optionsArgument);
      if (!forceProperty) {
        return;
      }
      context.report({
        node: forceProperty,
        messageId: 'removeForce',
      });
    }

    return {
      ...(hasPlaywright ? trackPlaywrightLocators(context, playwrightLocators) : {}),
      CallExpression(node: estree.Node) {
        if (node.type !== 'CallExpression' || !isMethodCall(node)) {
          return;
        }
        if (hasCypress) {
          checkCypressCall(node);
        }
        if (hasPlaywright) {
          checkPlaywrightCall(node);
        }
      },
    };

    function checkCypressCall(call: estree.CallExpression): void {
      if (!isMethodCall(call) || !chainStartsWithCy(call.callee.object)) {
        return;
      }
      const minOptionsIndex = CYPRESS_MIN_OPTIONS_INDEX.get(call.callee.property.name);
      if (minOptionsIndex !== undefined) {
        reportIfForced(call, minOptionsIndex);
      }
    }

    function checkPlaywrightCall(call: estree.CallExpression): void {
      if (!isMethodCall(call)) {
        return;
      }
      const minOptionsIndex = PLAYWRIGHT_MIN_OPTIONS_INDEX.get(call.callee.property.name);
      if (minOptionsIndex === undefined) {
        return;
      }
      if (isPlaywrightLocatorExpression(context, call.callee.object, playwrightLocators)) {
        reportIfForced(call, minOptionsIndex);
      }
    }
  },
};

function findForceTrueProperty(
  context: Rule.RuleContext,
  candidate: estree.Node | estree.SpreadElement | undefined,
): estree.Property | null {
  if (!candidate || candidate.type === 'SpreadElement') {
    return null;
  }
  const options = getValueOfExpression(context, candidate, 'ObjectExpression', true);
  const forceProperty = getProperty(options, 'force', context);
  if (!forceProperty) {
    return null;
  }
  return forceProperty.value.type === 'Literal' && forceProperty.value.value === true
    ? forceProperty
    : null;
}
