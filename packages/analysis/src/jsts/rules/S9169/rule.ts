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
const VITEST_MOCK_FQNS = new Set(['vitest.vi.mock', 'vitest.vitest.mock']);
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

  const fqn = getFullyQualifiedName(context, call);
  if (fqn !== null) {
    return VITEST_MOCK_FQNS.has(fqn);
  }

  return isGlobalVitestNamespace(context, call.callee.object);
}

function isGlobalVitestNamespace(context: Rule.RuleContext, receiver: estree.Node): boolean {
  if (receiver.type !== 'Identifier' || !VITEST_NAMESPACE_MEMBERS.has(receiver.name)) {
    return false;
  }
  const variable = getVariableFromName(context, receiver.name, receiver);
  return variable === undefined || variable.defs.length === 0;
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
