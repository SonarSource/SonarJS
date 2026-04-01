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
 * Returns true when every declaration of the symbol lives in a .d.ts file.
 * Used to distinguish global built-ins (declared in TypeScript lib files) from
 * user-defined types that happen to share the same name.
 */
function isSymbolFromDeclarationFiles(symbol: ts.Symbol): boolean {
  const declarations = symbol.declarations;
  return (
    declarations != null &&
    declarations.length > 0 &&
    declarations.every(d => d.getSourceFile().isDeclarationFile)
  );
}

/**
 * Checks whether an Identifier node refers to a global built-in constructor
 * (e.g. Object, Array) by verifying that its type symbol is declared exclusively
 * in TypeScript declaration files (.d.ts), not in user source code.
 * This guards against local shadows such as `const Object = { keys: ... }`.
 * Detection: AST + type checker.
 */
function isGlobalBuiltinIdentifier(
  node: estree.Node,
  name: string,
  services: RequiredParserServices,
): boolean {
  if (!isIdentifier(node, name)) {
    return false;
  }
  const type = getTypeFromTreeNode(node, services);
  const symbol = type.symbol;
  if (!symbol) {
    return false;
  }
  return isSymbolFromDeclarationFiles(symbol);
}

/**
 * Checks for Array.from(x).
 * Detection: AST + type checker (verifies Array is the global built-in).
 * Pseudo-code:
 *   Array.from(source)
 */
function isArrayFromCall(
  node: estree.Node,
  predicate: (arg: estree.Node) => boolean,
  services: RequiredParserServices,
): boolean {
  if (
    node.type !== 'CallExpression' ||
    !isCallingMethod(node as estree.CallExpression, 1, 'from')
  ) {
    return false;
  }
  const callExpr = node as estree.CallExpression;
  // isCallingMethod guarantees callee is a MemberExpression; verify receiver is the global Array
  const callee = callExpr.callee as estree.MemberExpression;
  if (!isGlobalBuiltinIdentifier(callee.object, 'Array', services)) {
    return false;
  }
  const arg = callExpr.arguments[0];
  return arg != null && predicate(arg);
}

/**
 * Checks for Object.keys(x) or Object.getOwnPropertyNames(x).
 * Detection: AST + type checker (verifies Object is the global built-in).
 * Pseudo-code:
 *   Object.keys(source)
 *   Object.getOwnPropertyNames(source)
 */
function isObjectKeysLikeCall(node: estree.Node, services: RequiredParserServices): boolean {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    isGlobalBuiltinIdentifier(node.callee.object, 'Object', services) &&
    node.callee.property.type === 'Identifier' &&
    ['keys', 'getOwnPropertyNames'].includes(node.callee.property.name) &&
    node.arguments.length === 1
  );
}

/**
 * Checks for Array.from(Object.keys(x)) or Array.from(Object.getOwnPropertyNames(x)).
 * Detection: AST + type checker.
 * Pseudo-code:
 *   Array.from(Object.keys(source))
 *   Array.from(Object.getOwnPropertyNames(source))
 */
function isArrayFromObjectKeysLikeCall(
  node: estree.Node,
  services: RequiredParserServices,
): boolean {
  return isArrayFromCall(node, arg => isObjectKeysLikeCall(arg, services), services);
}

/**
 * Checks for Array.from(x.keys()).
 * Detection: AST + type checker (verifies Array is the global built-in).
 * Pseudo-code:
 *   Array.from(collection.keys())
 */
function isArrayFromKeysCall(node: estree.Node, services: RequiredParserServices): boolean {
  return isArrayFromCall(
    node,
    arg =>
      arg.type === 'CallExpression' &&
      arg.callee.type === 'MemberExpression' &&
      arg.callee.property.type === 'Identifier' &&
      arg.callee.property.name === 'keys',
    services,
  );
}

/**
 * Checks for Array.from(map.keys()) when map is a built-in Map.
 * Detection: AST + type checker.
 * Pseudo-code:
 *   Array.from(map.keys())
 *
 * Does not suppress Set<string>.keys(), custom .keys() methods, or user-defined
 * types named Map (imported from a module). Uses the checker FQN to distinguish
 * the global built-in Map (FQN: "Map") from module-scoped user-defined types
 * (FQN: '"path/to/module".Map').
 */
function isArrayFromMapStringKeysCall(
  object: estree.Node,
  services: RequiredParserServices,
): boolean {
  if (!isArrayFromKeysCall(object, services)) {
    return false;
  }
  const callExpr = object as estree.CallExpression;
  const arg = callExpr.arguments[0] as estree.CallExpression;
  const innerReceiver = (arg.callee as estree.MemberExpression).object;
  const receiverType = getTypeFromTreeNode(innerReceiver, services);
  const symbol = receiverType.symbol;
  if (!symbol) {
    return false;
  }
  const checker = services.program.getTypeChecker();
  if (checker.getFullyQualifiedName(symbol) !== 'Map') {
    return false;
  }
  // Verify the symbol is from a declaration file (TypeScript lib) to exclude
  // user-defined types named Map declared in non-module (script) source files,
  // which also have FQN "Map" but are not the built-in Map.
  return isSymbolFromDeclarationFiles(symbol);
}

/**
 * Checks for key collections that are considered technical string arrays and
 * can be safely sorted with the default alphabetical order.
 */
function isTechnicalStringKeysArray(
  object: estree.Node,
  services: RequiredParserServices,
): boolean {
  return (
    isObjectKeysLikeCall(object, services) ||
    isArrayFromObjectKeysLikeCall(object, services) ||
    isArrayFromMapStringKeysCall(object, services)
  );
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

        if (![...sortLike, ...copyingSortLike].includes(text)) {
          return;
        }

        const type = getTypeFromTreeNode(object, services);

        if (!isArrayLikeType(type, services)) {
          return;
        }

        if (isStringArray(type, services) && isTechnicalStringKeysArray(object, services)) {
          return;
        }

        const suggest = getSuggestions(call, type);
        const messageId = getMessageId(type);
        context.report({ node, suggest, messageId });
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
