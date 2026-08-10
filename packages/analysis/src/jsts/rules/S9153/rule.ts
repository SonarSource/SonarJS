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
import { getVariableFromName, isIdentifier } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const messages = {
  throwingQuery:
    'This callback cannot observe removal because getBy* throws when the element is absent.',
  asyncQuery:
    'A findBy* query returns a promise, not the element required by this disappearance wait.',
};

const TESTING_LIBRARY_MODULES = [
  '@testing-library/dom',
  '@testing-library/react',
  '@testing-library/vue',
  '@testing-library/angular',
  '@testing-library/svelte',
] as const;

type ImportedName = 'screen' | 'waitForElementToBeRemoved';
type QueryKind = 'get' | 'find';

interface Query {
  kind: QueryKind;
  method: estree.Identifier;
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node: estree.Node): void {
        if (
          node.type !== 'CallExpression' ||
          !isDirectTestingLibraryBinding(context, node.callee, 'waitForElementToBeRemoved')
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
  if (
    node.type !== 'CallExpression' ||
    node.callee.type !== 'MemberExpression' ||
    node.callee.computed ||
    !isIdentifier(node.callee.property) ||
    !isDirectTestingLibraryBinding(context, node.callee.object, 'screen')
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

function isDirectTestingLibraryBinding(
  context: Rule.RuleContext,
  node: estree.Node,
  importedName: ImportedName,
): boolean {
  if (isIdentifier(node)) {
    return isDirectNamedImport(context, node, importedName);
  }

  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    isIdentifier(node.object) &&
    isIdentifier(node.property, importedName) &&
    isDirectNamespaceImport(context, node.object)
  );
}

function isDirectNamedImport(
  context: Rule.RuleContext,
  node: estree.Identifier,
  importedName: ImportedName,
): boolean {
  const variable = getVariableFromName(context, node.name, node);
  const definition = variable?.defs[0];
  return (
    variable?.defs.length === 1 &&
    definition?.type === 'ImportBinding' &&
    definition.node.type === 'ImportSpecifier' &&
    isIdentifier(definition.node.imported, importedName) &&
    definition.parent.type === 'ImportDeclaration' &&
    typeof definition.parent.source.value === 'string' &&
    isTestingLibraryModule(definition.parent.source.value)
  );
}

function isDirectNamespaceImport(context: Rule.RuleContext, node: estree.Identifier): boolean {
  const variable = getVariableFromName(context, node.name, node);
  const definition = variable?.defs[0];
  return (
    variable?.defs.length === 1 &&
    definition?.type === 'ImportBinding' &&
    definition.node.type === 'ImportNamespaceSpecifier' &&
    definition.parent.type === 'ImportDeclaration' &&
    typeof definition.parent.source.value === 'string' &&
    isTestingLibraryModule(definition.parent.source.value)
  );
}

function isTestingLibraryModule(moduleName: string): boolean {
  return TESTING_LIBRARY_MODULES.some(
    (module: string): boolean => moduleName === module || moduleName.startsWith(`${module}/`),
  );
}

function report(context: Rule.RuleContext, query: Query, messageId: keyof typeof messages): void {
  context.report({
    node: query.method,
    messageId,
  });
}
