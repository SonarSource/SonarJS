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
// https://sonarsource.github.io/rspec/#/rspec/S9339/javascript

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { getVariableFromName, isIdentifier } from '../helpers/ast.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import * as meta from './generated-meta.js';

const AXIOS_MODULE = 'axios';
const AXIOS_ALL = `${AXIOS_MODULE}.all`;
const AXIOS_SPREAD = `${AXIOS_MODULE}.spread`;
const AXIOS_CANCEL_TOKEN = `${AXIOS_MODULE}.CancelToken`;
const AXIOS_CANCEL_TOKEN_SOURCE = `${AXIOS_CANCEL_TOKEN}.source`;
// Position of the request config argument, which differs per method: the body-taking
// methods push it after the payload.
const AXIOS_CONFIG_ARGUMENT_INDEX = new Map([
  [AXIOS_MODULE, 0],
  [`${AXIOS_MODULE}.request`, 0],
  [`${AXIOS_MODULE}.get`, 1],
  [`${AXIOS_MODULE}.delete`, 1],
  [`${AXIOS_MODULE}.head`, 1],
  [`${AXIOS_MODULE}.options`, 1],
  [`${AXIOS_MODULE}.post`, 2],
  [`${AXIOS_MODULE}.put`, 2],
  [`${AXIOS_MODULE}.patch`, 2],
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    hasSuggestions: true,
    messages: {
      deprecatedHelper:
        '{{symbol}} is a deprecated Axios helper; {{alternative}} is the native equivalent.',
      cancelToken:
        'CancelToken is a deprecated Axios API; AbortController is the standard cancellation mechanism.',
      suggestAll: 'Replace axios.all() with Promise.all().',
      suggestSpread: 'Replace axios.spread() with array destructuring.',
    },
  }),
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node: estree.Node): void {
        visitCallExpression(context, node as estree.CallExpression);
      },
      NewExpression(node: estree.Node): void {
        visitNewExpression(context, node as estree.NewExpression);
      },
      MemberExpression(node: estree.Node): void {
        visitMemberExpression(context, node as estree.MemberExpression);
      },
      Property(node: estree.Node): void {
        visitCancelTokenProperty(context, node as estree.Property);
      },
    };
  },
};

function visitCallExpression(context: Rule.RuleContext, call: estree.CallExpression): void {
  if (hasComputedMember(call.callee) || isCallOfCall(call)) {
    return;
  }
  const fqn = getFullyQualifiedName(context, call);
  if (fqn === AXIOS_ALL) {
    reportHelper(context, call, 'axios.all()', 'Promise.all()');
    return;
  }
  if (fqn === AXIOS_SPREAD) {
    reportHelper(context, call, 'axios.spread()', 'array destructuring');
    return;
  }
  if (fqn === AXIOS_CANCEL_TOKEN_SOURCE) {
    context.report({
      node: getCancelTokenSourceReportNode(call.callee),
      messageId: 'cancelToken',
    });
  }
}

function visitNewExpression(context: Rule.RuleContext, expression: estree.NewExpression): void {
  if (hasComputedMember(expression.callee)) {
    return;
  }
  if (getFullyQualifiedName(context, expression) !== AXIOS_CANCEL_TOKEN) {
    return;
  }
  context.report({
    node: getCancelTokenConstructReportNode(expression.callee),
    messageId: 'cancelToken',
  });
}

function visitMemberExpression(
  context: Rule.RuleContext,
  member: estree.MemberExpression,
): void {
  if (member.computed || getFullyQualifiedName(context, member) !== AXIOS_CANCEL_TOKEN) {
    return;
  }
  if (isCancelTokenMemberCoveredByCallOrConstruct(context, member)) {
    return;
  }
  context.report({
    node: getMemberProperty(member),
    messageId: 'cancelToken',
  });
}

function visitCancelTokenProperty(context: Rule.RuleContext, property: estree.Property): void {
  if (property.computed || !isCancelTokenKey(property.key)) {
    return;
  }
  const argument = getDirectArgumentCall(context, property);
  if (argument === null) {
    return;
  }
  const fqn = getFullyQualifiedName(context, argument.call);
  if (fqn === null || AXIOS_CONFIG_ARGUMENT_INDEX.get(fqn) !== argument.index) {
    return;
  }
  context.report({
    node: property.key,
    messageId: 'cancelToken',
  });
}

function reportHelper(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  symbol: string,
  alternative: string,
): void {
  const reportNode = getCalleeReportNode(call.callee);
  context.report({
    node: reportNode,
    messageId: 'deprecatedHelper',
    data: { symbol, alternative },
    suggest: getHelperSuggestions(context, call, symbol),
  });
}

function getHelperSuggestions(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  symbol: string,
): Rule.SuggestionReportDescriptor[] {
  if (symbol === 'axios.all()') {
    return isPromiseShadowed(context, call)
      ? []
      : [
          {
            messageId: 'suggestAll',
            fix: (fixer: Rule.RuleFixer): Rule.Fix => fixer.replaceText(call.callee, 'Promise.all'),
          },
        ];
  }
  const spreadFix = getSpreadFix(context, call);
  return spreadFix === null
    ? []
    : [
        {
          messageId: 'suggestSpread',
          fix: spreadFix,
        },
      ];
}

function getSpreadFix(
  context: Rule.RuleContext,
  call: estree.CallExpression,
): ((fixer: Rule.RuleFixer) => Rule.Fix) | null {
  const callback = call.arguments[0];
  if (callback?.type !== 'ArrowFunctionExpression') {
    return null;
  }
  const rewritten = rewriteSpreadCallback(context, callback);
  if (rewritten === null) {
    return null;
  }
  return (fixer: Rule.RuleFixer): Rule.Fix => fixer.replaceText(call, rewritten);
}

function rewriteSpreadCallback(
  context: Rule.RuleContext,
  callback: estree.ArrowFunctionExpression,
): string | null {
  if (
    hasTypeAnnotations(callback) ||
    callback.params.length === 0 ||
    !callback.params.every(isSimpleIdentifierParam)
  ) {
    return null;
  }
  const names = callback.params.map(
    (param: estree.Pattern): string => (param as estree.Identifier).name,
  );
  const pattern = `[${names.join(', ')}]`;
  const prefix = callback.async ? 'async ' : '';
  return `(${prefix}(${pattern}) => ${formatArrowBody(context, callback)})`;
}

function formatArrowBody(
  context: Rule.RuleContext,
  callback: estree.ArrowFunctionExpression,
): string {
  const bodyText = context.sourceCode.getText(callback.body);
  return callback.body.type === 'BlockStatement' ? bodyText : `(${bodyText})`;
}

function isSimpleIdentifierParam(param: estree.Pattern): param is estree.Identifier {
  if (param.type !== 'Identifier') {
    return false;
  }
  const tsParam = param as TSESTree.Identifier;
  return tsParam.typeAnnotation === undefined;
}

// The suggestion rebuilds the arrow from param names and body text, so any type syntax
// living outside those two parts would be silently dropped.
function hasTypeAnnotations(callback: estree.ArrowFunctionExpression): boolean {
  const tsCallback = callback as TSESTree.ArrowFunctionExpression;
  return tsCallback.returnType !== undefined || tsCallback.typeParameters !== undefined;
}

function isCallOfCall(call: estree.CallExpression): boolean {
  return unwrapChain(call.callee).type === 'CallExpression';
}

function unwrapChain(node: estree.Expression | estree.Super): estree.Expression | estree.Super {
  return node.type === 'ChainExpression' ? unwrapChain(node.expression) : node;
}

function isPromiseShadowed(context: Rule.RuleContext, node: estree.Node): boolean {
  const variable = getVariableFromName(context, 'Promise', node);
  return variable !== undefined && variable.defs.length > 0;
}

function hasComputedMember(node: estree.Expression | estree.Super): boolean {
  if (node.type === 'ChainExpression') {
    return hasComputedMember(node.expression);
  }
  if (node.type === 'MemberExpression') {
    return node.computed || hasComputedMember(node.object);
  }
  return false;
}

function getCalleeReportNode(callee: estree.Expression | estree.Super): estree.Node {
  if (callee.type === 'ChainExpression') {
    return getCalleeReportNode(callee.expression);
  }
  if (callee.type === 'MemberExpression') {
    return getMemberProperty(callee);
  }
  return callee;
}

function getCancelTokenSourceReportNode(callee: estree.Expression | estree.Super): estree.Node {
  if (callee.type === 'ChainExpression') {
    return getCancelTokenSourceReportNode(callee.expression);
  }
  if (callee.type === 'MemberExpression') {
    if (callee.object.type === 'MemberExpression') {
      return getMemberProperty(callee.object);
    }
    return callee.object;
  }
  return callee;
}

function getCancelTokenConstructReportNode(callee: estree.Expression | estree.Super): estree.Node {
  if (callee.type === 'MemberExpression') {
    return getMemberProperty(callee);
  }
  return callee;
}

function getMemberProperty(member: estree.MemberExpression): estree.Node {
  return member.property;
}

function isCancelTokenMemberCoveredByCallOrConstruct(
  context: Rule.RuleContext,
  member: estree.MemberExpression,
): boolean {
  const parent = getParent(context, member);
  if (parent === undefined) {
    return false;
  }
  if (parent.type === 'NewExpression' && parent.callee === member) {
    return true;
  }
  if (
    parent.type === 'MemberExpression' &&
    parent.object === member &&
    !parent.computed &&
    isIdentifier(parent.property, 'source')
  ) {
    const grandParent = getParent(context, parent);
    return grandParent?.type === 'CallExpression' && grandParent.callee === parent;
  }
  return false;
}

function getDirectArgumentCall(
  context: Rule.RuleContext,
  property: estree.Property,
): { call: estree.CallExpression; index: number } | null {
  const objectExpression = getParent(context, property);
  if (objectExpression?.type !== 'ObjectExpression') {
    return null;
  }
  const call = getParent(context, objectExpression);
  if (call?.type !== 'CallExpression') {
    return null;
  }
  const index = call.arguments.indexOf(objectExpression);
  return index === -1 ? null : { call, index };
}

function isCancelTokenKey(key: estree.Expression | estree.PrivateIdentifier): boolean {
  return (
    isIdentifier(key, 'cancelToken') || (key.type === 'Literal' && key.value === 'cancelToken')
  );
}

function getParent(context: Rule.RuleContext, node: estree.Node): estree.Node | undefined {
  const ancestors: estree.Node[] = context.sourceCode.getAncestors(node);
  return ancestors.at(-1);
}
