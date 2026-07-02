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
import {
  getUniqueWriteUsage,
  isIdentifier,
  isMethodCall,
  isNumberLiteral,
} from '../helpers/ast.js';
import { chainStartsWithCy } from '../helpers/cypress.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isTestRelatedFile } from '../helpers/test-file-pattern.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      fixedWait: 'Replace this fixed wait with a synchronization on an observable condition.',
    },
  }),
  create(context: Rule.RuleContext) {
    if (!isTestRelatedFile(context.filename, context.settings?.testFileExtensions as string[])) {
      return {};
    }

    return {
      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        if (!isMethodCall(call)) {
          return;
        }

        const property = call.callee.property;
        const methodName = property.name;
        if (methodName === 'wait' && chainStartsWithCy(call.callee.object)) {
          reportCypressWait(context, call, property);
        } else if (methodName === 'waitForTimeout' && isIdentifier(call.callee.object, 'page')) {
          reportFixedWait(context, property);
        }
      },
    };
  },
};

function reportCypressWait(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  reportNode: estree.Node,
) {
  const [firstArgument] = call.arguments;
  if (!firstArgument) {
    return;
  }
  if (isNumericLiteralOrUnaryNumericLiteral(firstArgument)) {
    reportFixedWait(context, reportNode);
    return;
  }
  if (firstArgument.type === 'Identifier') {
    const resolved = getUniqueWriteUsage(context, firstArgument.name, firstArgument);
    if (resolved && isNumericLiteralOrUnaryNumericLiteral(resolved)) {
      reportFixedWait(context, reportNode);
    }
  }
}

function isNumericLiteralOrUnaryNumericLiteral(node: estree.Node) {
  return (
    isNumberLiteral(node) ||
    (node.type === 'UnaryExpression' &&
      (node.operator === '+' || node.operator === '-') &&
      isNumberLiteral(node.argument))
  );
}

function reportFixedWait(context: Rule.RuleContext, node: estree.Node) {
  context.report({
    node,
    messageId: 'fixedWait',
  });
}
