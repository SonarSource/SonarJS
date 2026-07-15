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
// https://sonarsource.github.io/rspec/#/rspec/S9027/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { getVariableFromName, isIdentifier } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import * as meta from './generated-meta.js';

const messages = {
  presence:
    'A presence assertion should use a `getBy*` query so a missing element produces Testing Library diagnostics.',
  absence: 'An absence assertion should use a `queryBy*` so it can observe a missing element.',
};

const TESTING_LIBRARY_MODULES = new Set([
  '@testing-library/dom',
  '@testing-library/react',
  '@testing-library/vue',
  '@testing-library/angular',
  '@testing-library/svelte',
]);

const PRESENCE_MATCHERS = new Set(['toBeInTheDocument', 'toBeTruthy', 'toBeDefined']);
const ABSENCE_MATCHERS = new Set(['toBeNull', 'toBeFalsy']);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages, fixable: 'code' }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.Node) {
        if (node.type !== 'CallExpression') {
          return;
        }

        const assertion = getAssertion(node);
        if (!assertion) {
          return;
        }

        const query = getQueryCall(assertion.actual);
        if (!query || isInTestingLibraryWaitFor(context, node)) {
          return;
        }

        const queryMethod = getQueryMethod(query);
        if (
          !queryMethod ||
          query.callee.type !== 'MemberExpression' ||
          query.callee.object.type === 'Super' ||
          !isDirectTestingLibraryScreen(context, query.callee.object)
        ) {
          return;
        }

        const isGetQuery = queryMethod.name.startsWith('get');
        if (assertion.presence === isGetQuery) {
          return;
        }

        const replacement = isGetQuery
          ? queryMethod.name.replace(/^get/, 'query')
          : queryMethod.name.replace(/^query/, 'get');

        context.report({
          node: queryMethod,
          messageId: assertion.presence ? 'presence' : 'absence',
          fix: fixer => fixer.replaceText(queryMethod, replacement),
        });
      },
    };
  },
};

function getAssertion(
  node: estree.CallExpression,
): { actual: estree.Expression; presence: boolean } | null {
  if (
    node.callee.type !== 'MemberExpression' ||
    node.callee.computed ||
    !isIdentifier(node.callee.property) ||
    node.arguments.length !== 0
  ) {
    return null;
  }

  const matcher = node.callee.property.name;
  let object = node.callee.object;
  let negated = false;
  if (
    object.type === 'MemberExpression' &&
    !object.computed &&
    isIdentifier(object.property, 'not')
  ) {
    negated = true;
    object = object.object;
  }

  if (
    object.type !== 'CallExpression' ||
    object.arguments.length !== 1 ||
    !isIdentifier(object.callee, 'expect')
  ) {
    return null;
  }

  const [actual] = object.arguments;
  if (!actual || actual.type === 'SpreadElement') {
    return null;
  }

  if (PRESENCE_MATCHERS.has(matcher)) {
    return { actual, presence: !negated };
  }
  if (ABSENCE_MATCHERS.has(matcher)) {
    return { actual, presence: negated };
  }
  return null;
}

function getQueryCall(actual: estree.Expression): estree.CallExpression | null {
  if (actual.type === 'CallExpression') {
    return actual;
  }
  if (actual.type !== 'MemberExpression' || actual.object.type !== 'CallExpression') {
    return null;
  }

  const queryMethod = getQueryMethod(actual.object);
  if (!queryMethod?.name.includes('AllBy')) {
    return null;
  }

  const isArrayIndex =
    actual.computed &&
    actual.property.type === 'Literal' &&
    typeof actual.property.value === 'number' &&
    Number.isInteger(actual.property.value) &&
    actual.property.value >= 0;
  const isLength = !actual.computed && isIdentifier(actual.property, 'length');

  return isArrayIndex || isLength ? actual.object : null;
}

function getQueryMethod(query: estree.CallExpression): estree.Identifier | null {
  if (
    query.callee.type !== 'MemberExpression' ||
    query.callee.computed ||
    !isIdentifier(query.callee.property) ||
    !/^(get|query)(All)?By[A-Z]/.test(query.callee.property.name)
  ) {
    return null;
  }
  return query.callee.property;
}

function isDirectTestingLibraryScreen(
  context: Rule.RuleContext,
  receiver: estree.Expression,
): boolean {
  if (!isIdentifier(receiver)) {
    return false;
  }

  const variable = getVariableFromName(context, receiver.name, receiver);
  const definition = variable?.defs[0];
  if (
    variable?.defs.length !== 1 ||
    definition?.type !== 'ImportBinding' ||
    definition.node.type !== 'ImportSpecifier' ||
    !isIdentifier(definition.node.imported, 'screen') ||
    definition.parent.type !== 'ImportDeclaration' ||
    typeof definition.parent.source.value !== 'string' ||
    !TESTING_LIBRARY_MODULES.has(definition.parent.source.value)
  ) {
    return false;
  }

  return true;
}

function isInTestingLibraryWaitFor(context: Rule.RuleContext, node: estree.Node): boolean {
  let current = node as estree.Node & Rule.NodeParentExtension;
  while (current.parent) {
    const parent = current.parent as estree.Node & Rule.NodeParentExtension;
    if (
      (current.type === 'ArrowFunctionExpression' || current.type === 'FunctionExpression') &&
      parent.type === 'CallExpression' &&
      parent.arguments.includes(current) &&
      isTestingLibraryWaitFor(context, parent)
    ) {
      return true;
    }
    current = parent;
  }
  return false;
}

function isTestingLibraryWaitFor(context: Rule.RuleContext, node: estree.CallExpression): boolean {
  const fqn = getFullyQualifiedName(context, node.callee);
  return (
    fqn != null &&
    [...TESTING_LIBRARY_MODULES].some(module => fqn === `${module.replace('/', '.')}.waitFor`)
  );
}
