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
import type { Rule } from 'eslint';
import type estree from 'estree';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { withStrictImportResolution } from '../helpers/testing-library.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    { ...withStrictImportResolution(rule), meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      if (!('node' in descriptor) || !hasUnsafeFix(descriptor.node)) {
        context.report(descriptor);
        return;
      }

      const { fix: _fix, ...descriptorWithoutFix } = descriptor;
      context.report(descriptorWithoutFix);
    },
  );
}

function hasUnsafeFix(node: estree.Node | null | undefined) {
  return (
    hasVariableWaitOptions(node) || hasBareSynchronousQuery(node) || hasOptionsForAsyncQuery(node)
  );
}

function hasVariableWaitOptions(node: estree.Node | null | undefined) {
  return (
    node?.type === 'CallExpression' &&
    node.arguments.length > 1 &&
    node.arguments[1]?.type !== 'ObjectExpression'
  );
}

function hasOptionsForAsyncQuery(node: estree.Node | null | undefined) {
  const callback = node?.type === 'CallExpression' ? node.arguments[0] : undefined;
  return (
    node?.type === 'CallExpression' &&
    node.arguments.length > 1 &&
    callback?.type === 'ArrowFunctionExpression' &&
    callback.async &&
    callback.body.type === 'BlockStatement'
  );
}

function hasBareSynchronousQuery(node: estree.Node | null | undefined) {
  const callback = node?.type === 'CallExpression' ? node.arguments[0] : undefined;
  if (callback?.type !== 'ArrowFunctionExpression' || callback.body.type !== 'CallExpression') {
    return false;
  }

  const query = getSynchronousQuery(callback.body);
  return query?.callee.type === 'Identifier' && /^(get|query)(All)?By/.test(query.callee.name);
}

function getSynchronousQuery(body: estree.CallExpression) {
  if (body.callee.type === 'Identifier') {
    return body;
  }

  const expectCall = getExpectCall(body.callee);
  const query = expectCall?.arguments[0];
  return query?.type === 'CallExpression' ? query : undefined;
}

function getExpectCall(
  callee: estree.Expression | estree.Super,
): estree.CallExpression | undefined {
  if (callee.type === 'CallExpression') {
    return callee.callee.type === 'Identifier' && callee.callee.name === 'expect'
      ? callee
      : undefined;
  }

  return callee.type === 'MemberExpression' ? getExpectCall(callee.object) : undefined;
}
