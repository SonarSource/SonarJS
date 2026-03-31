/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
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

import type { Rule } from 'eslint';
import type ts from 'typescript';
import type estree from 'estree';
import { copyingSortLike, sortLike } from '../helpers/collection.js';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  getTypeFromTreeNode,
  isArrayLikeType,
  isBigIntArray,
  isNumberArray,
  isStringArray,
} from '../helpers/type.js';
import {
  isRequiredParserServices,
  type RequiredParserServices,
} from '../helpers/parser-services.js';
import { isCallingMethod, isIdentifier } from '../helpers/ast.js';
import { getNodeParent } from '../helpers/ancestor.js';
import * as meta from './generated-meta.js';

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

/**
 * Checks for Array.from(x.keys()).
 * Detection: AST only.
 * Pseudo-code:
 *   Array.from(collection.keys())
 */
function isArrayFromKeysCall(node: estree.Node): boolean {
  if (
    node.type !== 'CallExpression' ||
    !isCallingMethod(node as estree.CallExpression, 1, 'from')
  ) {
    return false;
  }
  const callExpr = node as estree.CallExpression;
  // isCallingMethod guarantees callee is a MemberExpression; verify receiver is specifically Array
  const callee = callExpr.callee as estree.MemberExpression;
  if (!isIdentifier(callee.object, 'Array')) {
    return false;
  }
  const arg = callExpr.arguments[0];
  // e.g. Array.from(map.keys()) — argument must be a .keys() call
  return (
    arg?.type === 'CallExpression' &&
    arg.callee.type === 'MemberExpression' &&
    arg.callee.property.type === 'Identifier' &&
    arg.callee.property.name === 'keys'
  );
}

/**
 * Checks for Array.from(map.keys()) when map is a built-in Map.
 * Detection: AST + type checker.
 * Pseudo-code:
 *   Array.from(map.keys())
 *
 * Does not suppress Set<string>.keys() or custom .keys() methods.
 */
function isArrayFromMapStringKeysCall(
  object: estree.Node,
  services: RequiredParserServices,
): boolean {
  if (!isArrayFromKeysCall(object)) {
    return false;
  }
  const callExpr = object as estree.CallExpression;
  const arg = callExpr.arguments[0] as estree.CallExpression;
  const innerReceiver = (arg.callee as estree.MemberExpression).object;
  const receiverType = getTypeFromTreeNode(innerReceiver, services);
  return receiverType.symbol?.name === 'Map';
}

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
        'Add a comparator function to sort in a language-sensitive way',
    },
  }),
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    const services = context.sourceCode.parserServices;
    const hasTypeChecker = isRequiredParserServices(services);

    return {
      'CallExpression[arguments.length=0][callee.type="MemberExpression"]': (
        call: estree.CallExpression,
      ) => {
        const { object, property: node } = call.callee as estree.MemberExpression;
        const text = sourceCode.getText(node);

        if (![...sortLike, ...copyingSortLike].includes(text)) {
          return;
        }

        if (!hasTypeChecker) {
          context.report({ node, messageId: 'provideCompareFunction' });
          return;
        }

        // TypeScript type checker available: use type information for precise suppression
        const type = getTypeFromTreeNode(object, services);
        if (!isArrayLikeType(type, services)) {
          return;
        }

        const suggest = getSuggestions(call, type);

        // For string arrays, suppress only provably technical cases where default
        // alphabetical ordering is clearly intentional; report everything else
        // with a localeCompare suggestion.
        if (!isStringArray(type, services)) {
          context.report({ node, suggest, messageId: 'provideCompareFunction' });
          return;
        }

        if (isArrayFromMapStringKeysCall(object, services)) {
          return; // safe: provably technical strings
        }

        context.report({ node, suggest, messageId: 'provideCompareFunctionForArrayOfStrings' });
      },
    };

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
          fix: fixer(call, '(a, b) => a.localeCompare(b)'),
        });
      }
      return suggestions;
    }

    function fixer(call: estree.CallExpression, ...placeholder: string[]): Rule.ReportFixer {
      const closingParenthesis = sourceCode.getLastToken(call, token => token.value === ')')!;
      const indent = ' '.repeat(call.loc?.start.column!);
      const text = placeholder.join(`\n${indent}`);
      return fixer => fixer.insertTextBefore(closingParenthesis, text);
    }
  },
};
