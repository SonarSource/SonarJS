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
// https://sonarsource.github.io/rspec/#/rspec/S9169/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { getVariableFromName, isIdentifier } from '../helpers/ast.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const MESSAGE =
  'Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.';
const VITEST_NAMESPACE_MEMBERS = new Set(['vi', 'vitest']);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression: (node: estree.Node): void => {
        const call = node as estree.CallExpression;
        if (isVitestMockCall(context, call) && !isDirectProgramExpression(context, call)) {
          context.report({ node: call.callee, message: MESSAGE });
        }
      },
    };
  },
};

function isVitestMockCall(context: Rule.RuleContext, call: estree.CallExpression): boolean {
  if (
    call.callee.type !== 'MemberExpression' ||
    call.callee.computed ||
    ('optional' in call.callee && call.callee.optional === true) ||
    ('optional' in call && call.optional === true) ||
    !isIdentifier(call.callee.property, 'mock')
  ) {
    return false;
  }
  return isVitestNamespace(context, call.callee.object);
}

function isVitestNamespace(context: Rule.RuleContext, receiver: estree.Node): boolean {
  if (receiver.type === 'Identifier') {
    if (isGlobalVitestNamespace(context, receiver)) {
      return true;
    }
    const specifier = getVitestImportSpecifier(context, receiver);
    return (
      specifier?.type === 'ImportSpecifier' &&
      isIdentifier(specifier.imported) &&
      VITEST_NAMESPACE_MEMBERS.has(specifier.imported.name) &&
      getFullyQualifiedName(context, receiver) === `vitest.${specifier.imported.name}`
    );
  }

  if (
    receiver.type !== 'MemberExpression' ||
    receiver.computed ||
    !isIdentifier(receiver.property) ||
    !VITEST_NAMESPACE_MEMBERS.has(receiver.property.name) ||
    receiver.object.type !== 'Identifier'
  ) {
    return false;
  }

  const specifier = getVitestImportSpecifier(context, receiver.object);
  return (
    specifier?.type === 'ImportNamespaceSpecifier' &&
    getFullyQualifiedName(context, receiver) === `vitest.${receiver.property.name}`
  );
}

function isGlobalVitestNamespace(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
): boolean {
  if (!VITEST_NAMESPACE_MEMBERS.has(identifier.name)) {
    return false;
  }
  const variable = getVariableFromName(context, identifier.name, identifier);
  return variable === undefined || variable.defs.length === 0;
}

function getVitestImportSpecifier(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
): estree.ImportDeclaration['specifiers'][number] | undefined {
  const variable = getVariableFromName(context, identifier.name, identifier);
  if (variable?.defs.length !== 1) {
    return undefined;
  }

  const definition = variable.defs[0];
  if (
    definition.type !== 'ImportBinding' ||
    definition.parent.type !== 'ImportDeclaration' ||
    definition.parent.source.value !== 'vitest'
  ) {
    return undefined;
  }
  return definition.node;
}

function isDirectProgramExpression(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): boolean {
  const ancestors = context.sourceCode.getAncestors(node);
  const parent = ancestors.at(-1);
  const grandparent = ancestors.at(-2);
  return (
    parent?.type === 'ExpressionStatement' &&
    parent.expression === node &&
    grandparent?.type === 'Program'
  );
}
