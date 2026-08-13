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
// https://sonarsource.github.io/rspec/#/rspec/S9153/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { isDotNotation, unwrapTypeScriptExpression } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  importsTestingLibrary,
  isDirectTestingLibraryBinding,
} from '../helpers/testing-library.js';
import * as meta from './generated-meta.js';

const messages = {
  throwingQuery:
    'Use a queryBy* callback so waitForElementToBeRemoved can report a clear error when the element is already absent.',
  asyncQuery:
    'A findBy* query returns a promise, not the element required by this disappearance wait.',
};

type ImportedName = 'screen' | 'waitForElementToBeRemoved';
type QueryKind = 'get' | 'find';

interface Query {
  kind: QueryKind;
  method: estree.Identifier;
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages, fixable: 'code' }),
  create(context: Rule.RuleContext): Rule.RuleListener {
    if (!importsTestingLibrary(context)) {
      return {};
    }

    return {
      CallExpression(node: estree.Node): void {
        if (
          node.type !== 'CallExpression' ||
          !isTestingLibraryBinding(context, node.callee, 'waitForElementToBeRemoved')
        ) {
          return;
        }

        const firstArgument = node.arguments[0];
        if (!firstArgument || firstArgument.type === 'SpreadElement') {
          return;
        }

        const directQuery = getQuery(context, firstArgument);
        if (directQuery) {
          if (directQuery.kind === 'find') {
            report(context, directQuery, 'asyncQuery');
          }
          return;
        }

        const callbackQuery = getSimpleCallbackQuery(context, firstArgument);
        if (!callbackQuery) {
          return;
        }

        report(
          context,
          callbackQuery,
          callbackQuery.kind === 'get' ? 'throwingQuery' : 'asyncQuery',
        );
      },
    };
  },
};

function getSimpleCallbackQuery(context: Rule.RuleContext, node: estree.Expression): Query | null {
  if (
    (node.type !== 'ArrowFunctionExpression' && node.type !== 'FunctionExpression') ||
    node.async ||
    node.generator
  ) {
    return null;
  }

  if (node.body.type !== 'BlockStatement') {
    return getQuery(context, node.body);
  }

  if (node.body.body.length !== 1) {
    return null;
  }

  const [statement] = node.body.body;
  if (statement.type !== 'ReturnStatement' || !statement.argument) {
    return null;
  }

  return getQuery(context, statement.argument);
}

function getQuery(context: Rule.RuleContext, node: estree.Node): Query | null {
  node = unwrapTypeScriptExpression(node);
  if (
    node.type !== 'CallExpression' ||
    !isDotNotation(node.callee) ||
    !isTestingLibraryBinding(context, node.callee.object, 'screen')
  ) {
    return null;
  }

  if (/^get(All)?By[A-Z]/.test(node.callee.property.name)) {
    return { kind: 'get', method: node.callee.property };
  }
  if (/^find(All)?By[A-Z]/.test(node.callee.property.name)) {
    return { kind: 'find', method: node.callee.property };
  }
  return null;
}

function isTestingLibraryBinding(
  context: Rule.RuleContext,
  node: estree.Node,
  importedName: ImportedName,
): boolean {
  return isDirectTestingLibraryBinding(context, node, importedName, {
    allowNamespaceImport: true,
    allowSubpathImport: true,
  });
}

function report(context: Rule.RuleContext, query: Query, messageId: keyof typeof messages): void {
  context.report({
    node: query.method,
    messageId,
    fix:
      query.kind === 'get'
        ? (fixer: Rule.RuleFixer): Rule.Fix =>
            fixer.replaceText(query.method, query.method.name.replace(/^get/, 'query'))
        : null,
  });
}
