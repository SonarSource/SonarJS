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
import { getFullyQualifiedName } from '../helpers/module.js';
import { withStrictImportResolution } from '../helpers/testing-library.js';
import * as meta from './generated-meta.js';

const RECOGNIZED_MODULE_PREFIXES = [
  '@testing-library.dom',
  '@testing-library.react',
  '@testing-library.vue',
  '@testing-library.angular',
  '@testing-library.svelte',
];

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    { ...withStrictImportResolution(rule), meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      if (!('node' in descriptor)) {
        context.report(descriptor);
        return;
      }

      if (isKnownNonTestingLibraryQuery(context, descriptor.node)) {
        return;
      }

      if (!hasUnsafeFix(descriptor.node)) {
        context.report(descriptor);
        return;
      }

      const { fix: _fix, ...descriptorWithoutFix } = descriptor;
      context.report(descriptorWithoutFix);
    },
  );
}

function isKnownNonTestingLibraryQuery(
  context: Rule.RuleContext,
  node: estree.Node | null | undefined,
): boolean {
  if (node?.type !== 'CallExpression') {
    return false;
  }

  const callback = node.arguments[0];
  const query =
    callback?.type === 'ArrowFunctionExpression' && callback.body.type === 'CallExpression'
      ? getSynchronousQuery(callback.body)
      : undefined;
  if (query?.callee.type !== 'MemberExpression') {
    return false;
  }

  const fqn = getFullyQualifiedName(context, query.callee);
  return (
    fqn != null &&
    !RECOGNIZED_MODULE_PREFIXES.some(prefix => fqn === prefix || fqn.startsWith(`${prefix}.`))
  );
}

function hasUnsafeFix(node: estree.Node | null | undefined) {
  return (
    hasVariableWaitOptions(node) ||
    hasSynchronousQueryWithoutOptionsSlot(node) ||
    hasBareSynchronousQuery(node) ||
    hasOptionsForAsyncQuery(node)
  );
}

function hasVariableWaitOptions(node: estree.Node | null | undefined) {
  return (
    node?.type === 'CallExpression' &&
    node.arguments.length > 1 &&
    node.arguments[1]?.type !== 'ObjectExpression'
  );
}

function hasSynchronousQueryWithoutOptionsSlot(node: estree.Node | null | undefined) {
  if (node?.type !== 'CallExpression' || node.arguments[1]?.type !== 'ObjectExpression') {
    return false;
  }

  const callback = node.arguments[0];
  if (callback?.type !== 'ArrowFunctionExpression' || callback.body.type !== 'CallExpression') {
    return false;
  }

  const query = getSynchronousQuery(callback.body);
  return query?.callee.type === 'MemberExpression' && query.arguments.length < 2;
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
  if (isSynchronousQueryCallee(body.callee)) {
    return body;
  }

  const expectCall = getExpectCall(body.callee);
  const query = expectCall?.arguments[0];
  return query?.type === 'CallExpression' ? query : undefined;
}

function isSynchronousQueryCallee(callee: estree.Expression | estree.Super) {
  if (callee.type === 'Identifier') {
    return /^(get|query)(All)?By/.test(callee.name);
  }

  return (
    callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier' &&
    /^(get|query)(All)?By/.test(callee.property.name)
  );
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
