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
// https://sonarsource.github.io/rspec/#/rspec/S8959/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { hasParent, isIdentifier, isMethodCall } from '../helpers/ast.js';
import { chainStartsWithCy } from '../helpers/cypress.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { removeNodeWithLeadingWhitespaces } from '../helpers/quickfix.js';
import { isTestRelatedFile } from '../helpers/test-file-pattern.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      removeDebugCommand: 'Remove this debug command from the test.',
    },
    fixable: 'code',
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

        if (isUiTestDebugCommand(call.callee)) {
          reportDebugCommand(context, call);
        }
      },
    };
  },
};

function isUiTestDebugCommand(callee: estree.MemberExpression & { property: estree.Identifier }) {
  const { object, property } = callee;
  switch (property.name) {
    case 'pause':
      return chainStartsWithCy(object) || isIdentifier(object, 'page');
    case 'debug':
      return chainStartsWithCy(object);
    default:
      return false;
  }
}

function reportDebugCommand(
  context: Rule.RuleContext,
  call: estree.CallExpression & { callee: estree.MemberExpression },
) {
  context.report({
    node: call.callee.property,
    messageId: 'removeDebugCommand',
    fix: fixer => removeDebugCommand(context, call, fixer),
  });
}

/**
 * Removes the whole statement when the debug call stands alone, e.g. `cy.pause();` or
 * `await page.pause();`. Otherwise only the `.pause()`/`.debug()` link is spliced out of
 * the chain, e.g. `cy.get('x').debug().click();` -> `cy.get('x').click();`.
 */
function removeDebugCommand(
  context: Rule.RuleContext,
  call: estree.CallExpression & { callee: estree.MemberExpression },
  fixer: Rule.RuleFixer,
): Rule.Fix {
  const statement = unwrapToStatementExpression(call);
  if (hasParent(statement)) {
    const { parent } = statement;
    if (parent.type === 'ExpressionStatement' && parent.expression === statement) {
      return removeNodeWithLeadingWhitespaces(context, parent, fixer);
    }
  }
  return fixer.removeRange([call.callee.object.range![1], call.range![1]]);
}

function unwrapToStatementExpression(node: estree.Node): estree.Node {
  let current = node;
  while (hasParent(current)) {
    const { parent } = current;
    if (parent.type === 'ChainExpression' && parent.expression === current) {
      current = parent;
    } else if (parent.type === 'AwaitExpression' && parent.argument === current) {
      current = parent;
    } else {
      break;
    }
  }
  return current;
}
