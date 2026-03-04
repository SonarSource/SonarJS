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
// https://sonarsource.github.io/rspec/#/rspec/S2201

import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';
import TS from 'typescript';
import type { Rule, SourceCode } from 'eslint';
import {
  childrenOf,
  generateMeta,
  getTypeFromTreeNode,
  isRequiredParserServices,
} from '../helpers/index.js';
import type estree from 'estree';
import * as meta from './generated-meta.js';

const METHODS_WITHOUT_SIDE_EFFECTS: { [index: string]: Set<string> } = {
  array: new Set([
    'concat',
    'includes',
    'join',
    'slice',
    'indexOf',
    'lastIndexOf',
    'entries',
    'filter',
    'findIndex',
    'findLast',
    'findLastIndex',
    'keys',
    'map',
    'values',
    'find',
    'reduce',
    'reduceRight',
    'toString',
    'toLocaleString',
  ]),
  date: new Set([
    'getDate',
    'getDay',
    'getFullYear',
    'getHours',
    'getMilliseconds',
    'getMinutes',
    'getMonth',
    'getSeconds',
    'getTime',
    'getTimezoneOffset',
    'getUTCDate',
    'getUTCDay',
    'getUTCFullYear',
    'getUTCHours',
    'getUTCMilliseconds',
    'getUTCMinutes',
    'getUTCMonth',
    'getUTCSeconds',
    'getYear',
    'toDateString',
    'toISOString',
    'toJSON',
    'toGMTString',
    'toLocaleDateString',
    'toLocaleTimeString',
    'toTimeString',
    'toUTCString',
    'toString',
    'toLocaleString',
  ]),
  math: new Set([
    'abs',
    'E',
    'LN2',
    'LN10',
    'LOG2E',
    'LOG10E',
    'PI',
    'SQRT1_2',
    'SQRT2',
    'abs',
    'acos',
    'acosh',
    'asin',
    'asinh',
    'atan',
    'atanh',
    'atan2',
    'cbrt',
    'ceil',
    'clz32',
    'cos',
    'cosh',
    'exp',
    'expm1',
    'floor',
    'fround',
    'hypot',
    'imul',
    'log',
    'log1p',
    'log10',
    'log2',
    'max',
    'min',
    'pow',
    'random',
    'round',
    'sign',
    'sin',
    'sinh',
    'sqrt',
    'tan',
    'tanh',
    'trunc',
  ]),
  number: new Set(['toExponential', 'toFixed', 'toPrecision', 'toLocaleString', 'toString']),
  regexp: new Set(['test', 'toString']),
  string: new Set([
    'charAt',
    'charCodeAt',
    'codePointAt',
    'concat',
    'includes',
    'endsWith',
    'indexOf',
    'lastIndexOf',
    'localeCompare',
    'match',
    'normalize',
    'padEnd',
    'padStart',
    'repeat',
    'replace',
    'search',
    'slice',
    'split',
    'startsWith',
    'substr',
    'substring',
    'toLocaleLowerCase',
    'toLocaleUpperCase',
    'toLowerCase',
    'toUpperCase',
    'trim',
    'length',
    'toString',
    'valueOf',

    // HTML wrapper methods
    'anchor',
    'big',
    'blink',
    'bold',
    'fixed',
    'fontcolor',
    'fontsize',
    'italics',
    'link',
    'small',
    'strike',
    'sub',
    'sup',
  ]),
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      useForEach: `Consider using "forEach" instead of "map" as its return value is not being used here.`,
      returnValueMustBeUsed: 'The return value of "{{methodName}}" must be used.',
    },
  }),
  create(context) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      CallExpression: (node: estree.Node) => {
        const call = node as estree.CallExpression;
        const { callee } = call;
        if (callee.type === 'MemberExpression') {
          const { parent } = node as TSESTree.MemberExpression;
          if (parent?.type === 'ExpressionStatement') {
            const methodName = context.sourceCode.getText(callee.property as estree.Node);
            const objectType = services.program
              .getTypeChecker()
              .getTypeAtLocation(
                services.esTreeNodeToTSNodeMap.get(callee.object as TSESTree.Node),
              );
            if (
              !hasSideEffect(methodName, objectType, services) &&
              !isReplaceWithCallback(methodName, call.arguments, services) &&
              !isFindWithAssignmentCallback(
                methodName,
                call.arguments,
                context.sourceCode.visitorKeys,
              )
            ) {
              context.report(reportDescriptor(methodName, node));
            }
          }
        }
      },
    };
  },
};

const FunctionTypeNodeKind = TS.SyntaxKind.FunctionType;

const isFunctionTypeNode = (candidate: TS.Node): candidate is TS.FunctionTypeNode => {
  return candidate.kind === FunctionTypeNodeKind;
};

function isReplaceWithCallback(
  methodName: string,
  callArguments: Array<estree.Expression | estree.SpreadElement>,
  services: ParserServicesWithTypeInformation,
) {
  if (methodName === 'replace' && callArguments.length > 1) {
    const type = getTypeFromTreeNode(callArguments[1], services);
    const typeNode = services.program.getTypeChecker().typeToTypeNode(type, undefined, undefined);

    return typeNode && isFunctionTypeNode(typeNode);
  }
  return false;
}

// Early-exit array methods currently in METHODS_WITHOUT_SIDE_EFFECTS['array']
const EARLY_EXIT_ARRAY_METHODS = new Set(['find', 'findIndex', 'findLast', 'findLastIndex']);

/**
 * Returns true if the call is an early-exit array method whose first argument is an inline
 * function containing an AssignmentExpression. Such callbacks intentionally assign to outer
 * variables to exploit early-exit behavior, making the return value unused by design.
 */
function isFindWithAssignmentCallback(
  methodName: string,
  callArguments: Array<estree.Expression | estree.SpreadElement>,
  visitorKeys: SourceCode.VisitorKeys,
): boolean {
  if (!EARLY_EXIT_ARRAY_METHODS.has(methodName) || callArguments.length === 0) {
    return false;
  }
  const callback = callArguments[0];
  if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') {
    return false;
  }
  return containsAssignment(callback.body, visitorKeys);
}

const FUNCTION_BOUNDARIES = new Set([
  'FunctionExpression',
  'ArrowFunctionExpression',
  'FunctionDeclaration',
]);

/**
 * Recursively checks if an AST node contains an AssignmentExpression, using childrenOf for
 * complete traversal. Stops at nested function boundaries so assignments in inner closures
 * do not suppress the issue.
 */
function containsAssignment(node: estree.Node, visitorKeys: SourceCode.VisitorKeys): boolean {
  if (node.type === 'AssignmentExpression') {
    return true;
  }
  if (FUNCTION_BOUNDARIES.has(node.type)) {
    return false;
  }
  return childrenOf(node, visitorKeys).some(child => containsAssignment(child, visitorKeys));
}

function reportDescriptor(methodName: string, node: estree.Node): Rule.ReportDescriptor {
  if (methodName === 'map') {
    return {
      messageId: 'useForEach',
      node,
    };
  } else {
    return {
      messageId: 'returnValueMustBeUsed',
      node,
      data: { methodName },
    };
  }
}

function hasSideEffect(
  methodName: string,
  objectType: TS.Type,
  services: ParserServicesWithTypeInformation,
) {
  const typeAsString = typeToString(objectType, services);
  if (typeAsString !== null) {
    const methods = METHODS_WITHOUT_SIDE_EFFECTS[typeAsString];
    return !methods?.has(methodName);
  }
  return true;
}

function typeToString(tp: TS.Type, services: ParserServicesWithTypeInformation): string | null {
  const typechecker = services.program.getTypeChecker();

  const baseType = typechecker.getBaseTypeOfLiteralType(tp);
  const typeAsString = typechecker.typeToString(baseType);
  if (typeAsString === 'number' || typeAsString === 'string') {
    return typeAsString;
  }

  const symbol = tp.getSymbol();
  if (symbol) {
    const name = symbol.getName();
    switch (name) {
      case 'Array':
      case 'Date':
      case 'Math':
      case 'RegExp':
        return name.toLowerCase();
    }
  }

  return null;
}
