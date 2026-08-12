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
// https://sonarsource.github.io/rspec/#/rspec/S9332/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  getProperty,
  getValueOfExpression,
  isMethodCall,
  isStringLiteral,
  unwrapTypeScriptExpression,
} from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const NETWORKIDLE = 'networkidle';

/** Methods whose options object is the first argument. */
const OPTIONS_FIRST_ARG_METHODS = new Set(['reload', 'goBack', 'goForward']);

/** Methods whose options object follows a required first argument. */
const OPTIONS_SECOND_ARG_METHODS = new Set(['goto', 'setContent', 'waitForURL']);

const MESSAGE =
  'Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node: estree.Node): void {
        const call = node as estree.CallExpression;
        if (!isMethodCall(call)) {
          return;
        }

        const methodName = call.callee.property.name;
        if (methodName === 'waitForLoadState') {
          reportWaitForLoadState(context, call);
          return;
        }

        if (OPTIONS_FIRST_ARG_METHODS.has(methodName)) {
          reportWaitUntilOption(context, call.arguments[0]);
          return;
        }

        if (OPTIONS_SECOND_ARG_METHODS.has(methodName)) {
          reportWaitUntilOption(context, call.arguments[1]);
        }
      },
    };
  },
};

function reportWaitForLoadState(context: Rule.RuleContext, call: estree.CallExpression): void {
  const stateArgument = call.arguments[0];
  if (!stateArgument || stateArgument.type === 'SpreadElement') {
    return;
  }
  const resolved = getValueOfExpression(context, stateArgument, 'Literal') ?? stateArgument;
  const stateLiteral = unwrapTypeScriptExpression(resolved);
  if (isNetworkidleLiteral(stateLiteral)) {
    context.report({ node: stateLiteral, message: MESSAGE });
  }
}

function reportWaitUntilOption(
  context: Rule.RuleContext,
  optionsArgument: estree.CallExpression['arguments'][number] | undefined,
): void {
  if (!optionsArgument || optionsArgument.type === 'SpreadElement') {
    return;
  }
  const optionsObject = getValueOfExpression(context, optionsArgument, 'ObjectExpression');
  if (!optionsObject) {
    return;
  }
  const waitUntilProperty = getProperty(optionsObject, 'waitUntil', context);
  if (!waitUntilProperty) {
    return;
  }
  const resolved =
    getValueOfExpression(context, waitUntilProperty.value, 'Literal') ?? waitUntilProperty.value;
  const waitUntilValue = unwrapTypeScriptExpression(resolved);
  if (isNetworkidleLiteral(waitUntilValue)) {
    context.report({ node: waitUntilValue, message: MESSAGE });
  }
}

function isNetworkidleLiteral(node: estree.Node | undefined | null): node is estree.Literal {
  return node != null && isStringLiteral(node) && node.value === NETWORKIDLE;
}
