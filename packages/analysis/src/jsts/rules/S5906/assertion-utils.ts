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

import type { Rule, Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import { getVariableFromName, isIdentifier, isMethodCall } from '../helpers/ast.js';

export type Suggestion = {
  assertion: string;
  replacement?: string;
  kind?: 'length';
};

const PLAYWRIGHT_LOCATOR_FACTORIES = new Set([
  'getByRole',
  'getByText',
  'getByLabel',
  'getByPlaceholder',
  'getByAltText',
  'getByTitle',
  'getByTestId',
  'locator',
  'frameLocator',
]);

export function isPlaywrightLocatorExpression(
  context: Rule.RuleContext,
  node: estree.Node,
  locatorVariables: ReadonlySet<Scope.Variable>,
): boolean {
  if (isIdentifier(node)) {
    const variable = getVariableFromName(context, node.name, node);
    return variable !== undefined && locatorVariables.has(variable);
  }
  if (node.type !== 'CallExpression' || !isMethodCall(node)) {
    return false;
  }
  const property = node.callee.property;
  return (
    isIdentifier(property) &&
    PLAYWRIGHT_LOCATOR_FACTORIES.has(property.name) &&
    isPlaywrightLocatorRoot(context, node.callee.object, locatorVariables)
  );
}

function isPlaywrightLocatorRoot(
  context: Rule.RuleContext,
  node: estree.Node,
  locatorVariables: ReadonlySet<Scope.Variable>,
): boolean {
  if (isIdentifier(node)) {
    if (node.name === 'page') {
      return true;
    }
    const variable = getVariableFromName(context, node.name, node);
    return variable !== undefined && locatorVariables.has(variable);
  }
  return isPlaywrightLocatorExpression(context, node, locatorVariables);
}

// As soon as a third rule consumes this, promote it out of S5906/ into a
// shared module under helpers/ (e.g. helpers/playwright-locators.ts) so it no
// longer lives under a specific rule's directory.
export function trackPlaywrightLocators(
  context: Rule.RuleContext,
  locators: Set<Scope.Variable>,
): Rule.RuleListener {
  return {
    VariableDeclarator(node) {
      if (node.type !== 'VariableDeclarator' || !isIdentifier(node.id)) {
        return;
      }
      if (node.init && isPlaywrightLocatorExpression(context, node.init, locators)) {
        const variable = context.sourceCode.getDeclaredVariables(node)[0];
        if (variable) {
          locators.add(variable);
        }
      }
    },
  };
}

export function isLengthAccess(node: estree.Node): node is estree.MemberExpression {
  return (
    node.type === 'MemberExpression' && !node.computed && isIdentifier(node.property, 'length')
  );
}

export function isNullLiteral(node: estree.Node): boolean {
  return node.type === 'Literal' && node.value === null;
}

export function isUndefinedExpression(node: estree.Node): boolean {
  return isIdentifier(node, 'undefined');
}

export function isNaNExpression(node: estree.Node): boolean {
  return (
    isIdentifier(node, 'NaN') ||
    (node.type === 'MemberExpression' &&
      isIdentifier(node.object, 'Number') &&
      isIdentifier(node.property, 'NaN'))
  );
}

export function getBooleanValue(node: estree.Node): boolean | undefined {
  return node.type === 'Literal' && typeof node.value === 'boolean' ? node.value : undefined;
}

export function replacement(
  replacementText: string,
  _node: estree.CallExpression,
  _sourceCode?: SourceCode,
  kind?: Suggestion['kind'],
): Suggestion {
  return {
    assertion: replacementText,
    replacement: replacementText,
    ...(kind ? { kind } : {}),
  };
}
