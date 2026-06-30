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
import { isIdentifier, isMethodCall } from '../helpers/ast.js';
import { chainStartsWithCy } from '../helpers/cypress.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isTestRelatedFile } from '../helpers/test-file-pattern.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      removeDebugCommand: 'Remove this debug command from the test.',
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
        if (
          (methodName === 'pause' || methodName === 'debug') &&
          chainStartsWithCy(call.callee.object)
        ) {
          reportDebugCommand(context, property);
        } else if (methodName === 'pause' && isIdentifier(call.callee.object, 'page')) {
          reportDebugCommand(context, property);
        }
      },
    };
  },
};

function reportDebugCommand(context: Rule.RuleContext, node: estree.Node) {
  context.report({
    node,
    messageId: 'removeDebugCommand',
  });
}
