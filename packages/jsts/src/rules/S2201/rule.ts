/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://sonarsource.github.io/rspec/#/rspec/S2201

import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/typescript-estree';
import type { Type } from 'typescript';
import { Rule } from 'eslint';
import { getTypeFromTreeNode, isRequiredParserServices } from '../helpers';
import estree from 'estree';

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
  meta: {
    messages: {
      useForEach: `Consider using "forEach" instead of "map" as its return value is not being used here.`,
      returnValueMustBeUsed: 'The return value of "{{methodName}}" must be used.',
    },
    schema: [],
  },
  create(context) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      CallExpression: (node: estree.Node) => {
        const call = node as estree.CallExpression;
        const { callee } = call;
        if (callee.type === AST_NODE_TYPES.MemberExpression) {
          const { parent } = node as TSESTree.MemberExpression;
          if (parent && parent.type === 'ExpressionStatement') {
            const methodName = context.sourceCode.getText(callee.property as estree.Node);
            const objectType = services.program
              .getTypeChecker()
              .getTypeAtLocation(
                services.esTreeNodeToTSNodeMap.get(callee.object as TSESTree.Node),
              );
            if (
              !hasSideEffect(methodName, objectType, services) &&
              !isReplaceWithCallback(methodName, call.arguments, services)
            ) {
              context.report(reportDescriptor(methodName, node));
            }
          }
        }
      },
    };
  },
};

function isReplaceWithCallback(
  methodName: string,
  callArguments: Array<estree.Expression | estree.SpreadElement>,
  services: ParserServicesWithTypeInformation,
) {
  if (methodName === 'replace' && callArguments.length > 1) {
    const type = getTypeFromTreeNode(callArguments[1], services);
    const typeNode = services.program.getTypeChecker().typeToTypeNode(type, undefined, undefined);
    // dynamically import 'typescript' as classic 'import' will fail if project not using 'typescript' parser
    // we are sure it's available as 'RequiredParserServices' are available here
    const ts = require('typescript');
    return typeNode && ts.isFunctionTypeNode(typeNode);
  }
  return false;
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
  objectType: Type,
  services: ParserServicesWithTypeInformation,
) {
  const typeAsString = typeToString(objectType, services);
  if (typeAsString !== null) {
    const methods = METHODS_WITHOUT_SIDE_EFFECTS[typeAsString];
    return !(methods && methods.has(methodName));
  }
  return true;
}

function typeToString(tp: Type, services: ParserServicesWithTypeInformation): string | null {
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
