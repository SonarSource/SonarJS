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
// https://sonarsource.github.io/rspec/#/rspec/S2871/javascript

import type { Rule, Scope } from 'eslint';
import type ts from 'typescript';
import type estree from 'estree';
import { getNodeParent } from '../helpers/ancestor.js';
import { copyingSortLike, sortLike } from '../helpers/collection.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getVariableFromName, isIdentifier } from '../helpers/ast.js';
import {
  getTypeFromTreeNode,
  isArrayLikeType,
  isBigIntArray,
  isBooleanArray,
  isNumberArray,
  isStringArray,
} from '../helpers/type.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import * as meta from './generated-meta.js';

const allSortLike = new Set([...sortLike, ...copyingSortLike]);
const equalityOperators = new Set(['==', '!=', '===', '!==']);

type BareSortInfo = {
  methodName: string;
  receiver: estree.Node;
};

type StringJoinSortChainInfo = BareSortInfo & {
  joinSeparator: string;
};

// Matches JSON.stringify(<expr>) — exactly one argument, non-computed property access.
// Does not match: JSON.stringify(x, replacer, space), JSON['stringify'](x), myObj.stringify(x).
function isJsonStringifyCall(node: estree.Node | null): boolean {
  if (node === null || node.type !== 'CallExpression') {
    return false;
  }
  const callExpr = node as estree.CallExpression;
  if (callExpr.arguments.length !== 1) {
    return false;
  }
  const callee = callExpr.callee;
  if (callee.type !== 'MemberExpression') {
    return false;
  }
  return (
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'JSON' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'stringify'
  );
}

const compareNumberFunctionPlaceholder = '(a, b) => (a - b)';
const compareBigIntFunctionPlaceholder = [
  '(a, b) => {',
  '  if (a < b) {',
  '    return -1;',
  '  } else if (a > b) {',
  '    return 1;',
  '  } else {',
  '    return 0;',
  '  }',
  '}',
];
const languageSensitiveOrderPlaceholder = '(a, b) => a.localeCompare(b)';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    hasSuggestions: true,
    messages: {
      provideCompareFunction:
        'Provide a compare function to avoid sorting elements alphabetically.',
      provideCompareFunctionForArrayOfStrings:
        'Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.',
      suggestNumericOrder: 'Add a comparator function to sort in ascending order',
      suggestLanguageSensitiveOrder:
        'Add a comparator function to sort in ascending language-sensitive order',
    },
  }),
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    return {
      'CallExpression[arguments.length=0][callee.type="MemberExpression"]': (
        call: estree.CallExpression,
      ) => {
        const { object, property: node } = call.callee as estree.MemberExpression;
        const text = sourceCode.getText(node);
        const type = getTypeFromTreeNode(object, services);

        if (allSortLike.has(text) && isArrayLikeType(type, services)) {
          if (isSortUsedForNormalizationComparison(call)) {
            return;
          }
          const suggest = getSuggestions(call, type);
          const messageId = getMessageId(type);
          context.report({ node, suggest, messageId });
        }
      },
    };

    function isSortUsedForNormalizationComparison(call: estree.CallExpression): boolean {
      return (
        isJsonStringifySortComparison(call) ||
        isStringJoinSortComparison(call) ||
        isReturnedByComparedNormalizer(call)
      );
    }

    // Matches JSON.stringify(arr.sort()) == JSON.stringify(arr.sort()) or
    // JSON.stringify(arr.toSorted()) == JSON.stringify(arr.toSorted()) when both
    // sides use the same sort family over primitive arrays with known-safe
    // default sort semantics (number, string, boolean, bigint).
    function isJsonStringifySortComparison(call: estree.CallExpression): boolean {
      const parent = getNodeParent(call);
      if (!isJsonStringifyCall(parent) || (parent as estree.CallExpression).arguments[0] !== call) {
        return false;
      }
      const sibling = getEqualityComparisonSibling(parent);
      if (!isJsonStringifyCall(sibling)) {
        return false;
      }

      const callInfo = getBareSortInfo(call);
      const siblingInfo = getBareSortInfo((sibling as estree.CallExpression).arguments[0]);
      if (callInfo === null || siblingInfo === null) {
        return false;
      }

      return (
        callInfo.methodName === siblingInfo.methodName &&
        isPrimitiveSortReceiver(callInfo.receiver) &&
        isPrimitiveSortReceiver(siblingInfo.receiver)
      );
    }

    function isStringJoinSortComparison(call: estree.CallExpression): boolean {
      const chainRoot = getStringJoinSortChainRoot(call);
      if (chainRoot === null) {
        return false;
      }
      const sibling = getEqualityComparisonSibling(chainRoot);
      const callInfo = getStringJoinSortChainInfo(chainRoot);
      const siblingInfo = getStringJoinSortChainInfo(sibling);

      return (
        callInfo !== null &&
        siblingInfo !== null &&
        callInfo.methodName === siblingInfo.methodName &&
        callInfo.joinSeparator === siblingInfo.joinSeparator &&
        isPrimitiveSortReceiver(callInfo.receiver) &&
        isPrimitiveSortReceiver(siblingInfo.receiver)
      );
    }

    function getStringJoinSortChainRoot(call: estree.CallExpression): estree.CallExpression | null {
      const mapCall = getChainedMethodCall(call, 'map');
      if (mapCall === null || !isStringMapCall(mapCall)) {
        return null;
      }
      const joinCall = getChainedMethodCall(mapCall, 'join');
      if (joinCall === null || getJoinSeparator(joinCall) === null) {
        return null;
      }
      return joinCall;
    }

    function getStringJoinSortChainInfo(node: estree.Node | null): StringJoinSortChainInfo | null {
      if (node === null || node.type !== 'CallExpression') {
        return null;
      }
      const joinSeparator = getJoinSeparator(node);
      if (joinSeparator === null || node.callee.type !== 'MemberExpression') {
        return null;
      }
      const mapCall = node.callee.object;
      if (mapCall.type !== 'CallExpression' || !isStringMapCall(mapCall)) {
        return null;
      }
      if (mapCall.callee.type !== 'MemberExpression') {
        return null;
      }
      const sortInfo = getBareSortInfo(mapCall.callee.object);
      if (sortInfo === null) {
        return null;
      }
      return {
        ...sortInfo,
        joinSeparator,
      };
    }

    function isReturnedByComparedNormalizer(call: estree.CallExpression): boolean {
      const callInfo = getBareSortInfo(call);
      const functionVariable = getEnclosingReturnedFunctionVariable(call);
      return (
        callInfo !== null &&
        isPrimitiveSortReceiver(callInfo.receiver) &&
        functionVariable !== null &&
        isUsedOnlyInJsonStringifyComparisons(functionVariable)
      );
    }

    function getEnclosingReturnedFunctionVariable(
      call: estree.CallExpression,
    ): Scope.Variable | null {
      let currentNode: estree.Node | undefined = getNodeParent(call);
      let returnStatement: estree.ReturnStatement | undefined;

      while (currentNode) {
        if (currentNode.type === 'ReturnStatement') {
          returnStatement = currentNode as estree.ReturnStatement;
        }
        if (
          currentNode.type === 'FunctionDeclaration' ||
          currentNode.type === 'FunctionExpression' ||
          currentNode.type === 'ArrowFunctionExpression'
        ) {
          if (returnStatement === undefined) {
            return null;
          }
          return getLocalFunctionVariable(currentNode);
        }
        currentNode = getNodeParent(currentNode);
      }

      return null;
    }

    function getLocalFunctionVariable(functionNode: estree.Node): Scope.Variable | null {
      const parent = getNodeParent(functionNode);
      if (
        parent?.type === 'ExportNamedDeclaration' ||
        parent?.type === 'ExportDefaultDeclaration'
      ) {
        return null;
      }
      if (functionNode.type === 'FunctionDeclaration') {
        if (functionNode.id === null) {
          return null;
        }
        return getVariableFromName(context, functionNode.id.name, functionNode) ?? null;
      }
      if (parent?.type === 'VariableDeclarator' && isIdentifier(parent.id)) {
        return getVariableFromName(context, parent.id.name, parent) ?? null;
      }
      return null;
    }

    function isUsedOnlyInJsonStringifyComparisons(functionVariable: Scope.Variable): boolean {
      const calls = collectFunctionCalls(functionVariable);
      return (
        calls.length > 0 &&
        calls.every(call => isJsonStringifyFunctionCallComparison(call, functionVariable))
      );
    }

    function collectFunctionCalls(functionVariable: Scope.Variable): estree.CallExpression[] {
      return functionVariable.references.flatMap(reference => {
        if (!reference.isRead()) {
          return [];
        }
        const parent = getNodeParent(reference.identifier);
        return parent?.type === 'CallExpression' && parent.callee === reference.identifier
          ? [parent]
          : [];
      });
    }

    function isJsonStringifyFunctionCallComparison(
      call: estree.CallExpression,
      functionVariable: Scope.Variable,
    ): boolean {
      const parent = getNodeParent(call);
      if (!isJsonStringifyCall(parent) || (parent as estree.CallExpression).arguments[0] !== call) {
        return false;
      }
      const sibling = getEqualityComparisonSibling(parent);
      if (!isJsonStringifyCall(sibling)) {
        return false;
      }
      const siblingArgument = (sibling as estree.CallExpression).arguments[0];
      return (
        siblingArgument.type === 'CallExpression' &&
        siblingArgument.callee.type === 'Identifier' &&
        getVariableFromName(context, siblingArgument.callee.name, siblingArgument) ===
          functionVariable
      );
    }

    function getEqualityComparisonSibling(node: estree.Node): estree.Node | null {
      const parent = getNodeParent(node);
      if (parent.type !== 'BinaryExpression' || !equalityOperators.has(parent.operator)) {
        return null;
      }
      return parent.left === node ? parent.right : parent.left;
    }

    function getChainedMethodCall(
      object: estree.Node,
      methodName: string,
    ): estree.CallExpression | null {
      const member = getNodeParent(object);
      if (
        member.type !== 'MemberExpression' ||
        member.object !== object ||
        member.computed ||
        !isIdentifier(member.property, methodName)
      ) {
        return null;
      }
      const call = getNodeParent(member);
      if (call.type !== 'CallExpression' || call.callee !== member) {
        return null;
      }
      return call as estree.CallExpression;
    }

    function isStringMapCall(call: estree.CallExpression): boolean {
      return (
        call.arguments.length === 1 &&
        isIdentifier(call.arguments[0] as estree.Node, 'String') &&
        call.callee.type === 'MemberExpression' &&
        isIdentifier(call.callee.property, 'map')
      );
    }

    function getJoinSeparator(call: estree.CallExpression): string | null {
      if (call.arguments.length === 0) {
        return ',';
      }
      if (
        call.arguments.length === 1 &&
        call.arguments[0].type === 'Literal' &&
        typeof call.arguments[0].value === 'string'
      ) {
        return call.arguments[0].value;
      }
      return null;
    }

    function getBareSortInfo(node: estree.Node): BareSortInfo | null {
      if (node.type !== 'CallExpression') {
        return null;
      }
      const callExpr = node as estree.CallExpression;
      if (callExpr.arguments.length !== 0) {
        return null;
      }
      if (callExpr.callee.type !== 'MemberExpression') {
        return null;
      }
      const callee = callExpr.callee;
      const text = sourceCode.getText(callee.property);
      if (!allSortLike.has(text)) {
        return null;
      }
      const receiverType = getTypeFromTreeNode(callee.object, services);
      if (!isArrayLikeType(receiverType, services)) {
        return null;
      }
      return {
        methodName: text,
        receiver: callee.object,
      };
    }

    function isPrimitiveSortReceiver(receiver: estree.Node): boolean {
      const receiverType = getTypeFromTreeNode(receiver, services);
      return (
        isNumberArray(receiverType, services) ||
        isBigIntArray(receiverType, services) ||
        isStringArray(receiverType, services) ||
        isBooleanArray(receiverType, services)
      );
    }

    function getSuggestions(call: estree.CallExpression, type: ts.Type) {
      const suggestions: Rule.SuggestionReportDescriptor[] = [];
      if (isNumberArray(type, services)) {
        suggestions.push({
          messageId: 'suggestNumericOrder',
          fix: fixer(call, compareNumberFunctionPlaceholder),
        });
      } else if (isBigIntArray(type, services)) {
        suggestions.push({
          messageId: 'suggestNumericOrder',
          fix: fixer(call, ...compareBigIntFunctionPlaceholder),
        });
      } else if (isStringArray(type, services)) {
        suggestions.push({
          messageId: 'suggestLanguageSensitiveOrder',
          fix: fixer(call, languageSensitiveOrderPlaceholder),
        });
      }
      return suggestions;
    }

    function getMessageId(type: ts.Type) {
      if (isStringArray(type, services)) {
        return 'provideCompareFunctionForArrayOfStrings';
      }

      return 'provideCompareFunction';
    }

    function fixer(call: estree.CallExpression, ...placeholder: string[]): Rule.ReportFixer {
      const closingParenthesis = sourceCode.getLastToken(call, token => token.value === ')')!;
      const indent = ' '.repeat(call.loc?.start.column!);
      const text = placeholder.join(`\n${indent}`);
      return fixer => fixer.insertTextBefore(closingParenthesis, text);
    }
  },
};
