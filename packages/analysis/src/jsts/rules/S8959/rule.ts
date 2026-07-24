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
import { getFullyQualifiedName } from '../helpers/module.js';
import { removeNodeWithLeadingWhitespaces } from '../helpers/quickfix.js';
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
        if (isMethodCall(call)) {
          if (isUiTestDebugCommand(context, call)) {
            reportDebugCommand(context, call, call.callee.property);
          }
        } else if (isTestingLibraryDebugCommand(context, call)) {
          reportDebugCommand(context, call, call.callee);
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
  const fqn = getFullyQualifiedName(context, call.callee);
  if (!fqn) {
    return false;
  }
  return TESTING_LIBRARY_MODULES.some(module => {
    const prefix = module.replace('/', '.');
    return [
      `${prefix}.screen.debug`,
      `${prefix}.screen.logTestingPlaygroundURL`,
      `${prefix}.prettyDOM`,
      `${prefix}.logRoles`,
    ].includes(fqn);
  });
}

function reportDebugCommand(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  reportNode: estree.Node,
) {
  context.report({
    node: reportNode,
    messageId: 'removeDebugCommand',
    fix: fixer => removeDebugCommand(context, call, fixer),
  });
}

/**
 * Removes the whole statement only for root debug calls used as standalone statements, e.g.
 * `cy.pause();`, `await page.pause();`, `screen.debug();`, or `prettyDOM(el);`. For Cypress chains, only the `.pause()`/`.debug()`
 * link is spliced out, e.g. `cy.get('x').debug().click();` -> `cy.get('x').click();` and
 * `cy.get('x').pause();` -> `cy.get('x');`.
 */
function removeDebugCommand(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  fixer: Rule.RuleFixer,
): Rule.Fix | null {
  const statement = unwrapToStatementExpression(call);
  if (call.callee.type === 'MemberExpression') {
    if (isRootDebugReceiver(call.callee.object) && hasParent(statement)) {
      const { parent } = statement;
      if (parent.type === 'ExpressionStatement' && parent.expression === statement) {
        return removeNodeWithLeadingWhitespaces(context, parent, fixer);
      }
    }
    const objectRange = call.callee.object.range;
    const callRange = call.range;
    if (!objectRange || !callRange) {
      return null;
    }
    return fixer.removeRange([objectRange[1], callRange[1]]);
  } else if (hasParent(statement)) {
    const { parent } = statement;
    if (parent.type === 'ExpressionStatement' && parent.expression === statement) {
      return removeNodeWithLeadingWhitespaces(context, parent, fixer);
    }
  }
  return null;
}

function unwrapToStatementExpression(node: estree.Node): estree.Node {
  let current = node;
  while (hasParent(current)) {
    const { parent } = current;
    if (
      (parent.type === 'ChainExpression' && parent.expression === current) ||
      (parent.type === 'AwaitExpression' && parent.argument === current)
    ) {
      current = parent;
    } else {
      break;
    }
  }
  return current;
}

function isRootDebugReceiver(node: estree.Node): boolean {
  return isIdentifier(unwrapChainExpression(node), 'cy', 'page', 'screen');
}

function unwrapChainExpression(node: estree.Node): estree.Node {
  let current = node;
  while (current.type === 'ChainExpression') {
    current = current.expression;
  }
  return current;
}
