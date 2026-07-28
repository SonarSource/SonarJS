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
import { getFullyQualifiedName } from '../helpers/module.js';
import { isTestRelatedFile } from '../helpers/test-file-pattern.js';
import * as meta from './generated-meta.js';

const TESTING_LIBRARY_MODULES = [
  '@testing-library/dom',
  '@testing-library/react',
  '@testing-library/vue',
  '@testing-library/angular',
  '@testing-library/svelte',
  '@testing-library/preact',
];

const TESTING_LIBRARY_DEBUG_COMMANDS = [
  'screen.debug',
  'screen.logTestingPlaygroundURL',
  'render.debug',
  'prettyDOM',
  'logRoles',
];

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
        if (isMethodCall(call)) {
          if (isUiTestDebugCommand(context, call)) {
            reportDebugCommand(context, call.callee.property);
          }
        } else if (isTestingLibraryDebugCommand(context, call)) {
          reportDebugCommand(context, call.callee);
        }
      },
    };
  },
};

function isUiTestDebugCommand(
  context: Rule.RuleContext,
  call: estree.CallExpression & {
    callee: estree.MemberExpression & { property: estree.Identifier };
  },
) {
  const { callee } = call;
  const { object, property } = callee;
  switch (property.name) {
    case 'pause':
      return chainStartsWithCy(object) || isIdentifier(object, 'page');
    case 'debug':
      return isTestingLibraryDebugCommand(context, call) || chainStartsWithCy(object);
    case 'logTestingPlaygroundURL':
      return isTestingLibraryDebugCommand(context, call);
    default:
      return false;
  }
}

function isTestingLibraryDebugCommand(
  context: Rule.RuleContext,
  call: estree.CallExpression,
): boolean {
  // getFullyQualifiedName intentionally resolves imports in the current file only.
  // Custom test-utils wrappers that re-export Testing Library symbols are not resolved here.
  const fqn = getFullyQualifiedName(context, call.callee);
  if (!fqn) {
    return false;
  }
  return TESTING_LIBRARY_MODULES.some(module => {
    const prefix = `${module.replace('/', '.')}.`;
    return (
      fqn.startsWith(prefix) &&
      TESTING_LIBRARY_DEBUG_COMMANDS.some(command => fqn.endsWith(`.${command}`))
    );
  });
}

function reportDebugCommand(context: Rule.RuleContext, reportNode: estree.Node) {
  context.report({
    node: reportNode,
    messageId: 'removeDebugCommand',
  });
}
