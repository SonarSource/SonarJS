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
// https://sonarsource.github.io/rspec/#/rspec/S1541/javascript

import type { AST, Rule } from 'eslint';
import type estree from 'estree';
import {
  type EncodedMessage,
  type IssueLocation,
  getMainFunctionTokenLocation,
} from '../helpers/location.js';
import { type FunctionNodeType, isFunctionNode } from '../helpers/ast.js';
import type { RuleContext } from '../helpers/type.js';
import { getParent } from '../helpers/ancestor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import type { TSESTree } from '@typescript-eslint/utils';
import type { FromSchema } from 'json-schema-to-ts';
import * as meta from './generated-meta.js';
import {
  getModuleFactory,
  getPropertyAccessPath,
  hasRuntimeBinding,
  isStringLiteral,
  unwrapTypeScriptValue,
} from './helpers.js';

const DEFAULT_THRESHOLD = 10;
const SAP_UI_DEFINE = 'sap.ui.define';
const MAX_SCOPE_INITIALIZER_ARGUMENTS = 3;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    const threshold =
      (context.options as FromSchema<typeof meta.schema>)[0]?.threshold ?? DEFAULT_THRESHOLD;
    let functions: FunctionInfo[];
    let functionsToExclude: Set<estree.Node>;
    let functionStack: FunctionInfo[];
    let functionsWithNested: Set<estree.Node>;
    let scopeInitializers: Map<estree.Node, string[]>;
    let writtenPaths: string[][];
    /**
     * `sap.ui.define = other` -> ['sap', 'ui', 'define']
     * `({ x: sap.ui.define } = source)` -> the same path
     */
    function collectWrites(target: estree.Node) {
      const value = unwrapTypeScriptValue(target);
      const path = getPropertyAccessPath(value, true);
      if (path) {
        if (!hasRuntimeBinding(context, value, path[0])) {
          writtenPaths.push(path);
        }
      } else if (value.type === 'ArrayPattern') {
        value.elements.forEach(element => element && collectWrites(element));
      } else if (value.type === 'ObjectPattern') {
        value.properties.forEach(property =>
          collectWrites(property.type === 'RestElement' ? property.argument : property.value),
        );
      } else if (value.type === 'AssignmentPattern') {
        collectWrites(value.left);
      } else if (value.type === 'RestElement') {
        collectWrites(value.argument);
      }
    }
    /**
     * `(function () {})()` -> exclude the function
     * `(function* () {})()` -> keep the function
     */
    function excludeInvokedFunction(expression: estree.Node) {
      const value = getFinalValue(expression);
      if (
        (value.type === 'FunctionExpression' || value.type === 'ArrowFunctionExpression') &&
        !value.generator
      ) {
        functionsToExclude.add(value);
      }
    }
    return {
      Program: () => {
        functions = [];
        functionsToExclude = new Set();
        functionStack = [];
        functionsWithNested = new Set();
        scopeInitializers = new Map();
        writtenPaths = [];
      },
      'Program:exit': () => {
        const stablePaths = new Map<string, boolean>();
        for (const [factory, path] of scopeInitializers) {
          const key = path.join('.');
          const stable =
            stablePaths.get(key) ?? !writtenPaths.some(write => isPathPrefix(write, path));
          stablePaths.set(key, stable);
          if ((path[0] === 'define' || functionsWithNested.has(factory)) && stable) {
            functionsToExclude.add(factory);
          }
        }
        for (const { node: func, parent, tokens } of functions) {
          if (!functionsToExclude.has(func)) {
            raiseOnUnauthorizedComplexity(func, parent, tokens, threshold, context);
          }
        }
      },
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression': (node: estree.Node) => {
        const info: FunctionInfo = {
          node: node as FunctionNodeType,
          parent: getParent(context, node),
          tokens: [],
        };
        functions.push(info);
        const enclosing = functionStack.at(-1);
        if (enclosing) {
          functionsWithNested.add(enclosing.node);
        }
        functionStack.push(info);
      },
      ':matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression):exit': () => {
        functionStack.pop();
      },
      'ConditionalExpression, LogicalExpression, SwitchCase, IfStatement, ForStatement, ForInStatement, ForOfStatement, WhileStatement, DoWhileStatement':
        (node: estree.Node) => {
          const enclosing = functionStack.at(-1);
          if (enclosing) {
            const token = getComplexityToken(node, context);
            if (token) {
              enclosing.tokens.push(token);
            }
          }
        },
      AssignmentExpression: (node: estree.Node) =>
        collectWrites((node as estree.AssignmentExpression).left),
      UpdateExpression: (node: estree.Node) =>
        collectWrites((node as estree.UpdateExpression).argument),
      UnaryExpression: (node: estree.Node) => {
        const unary = node as estree.UnaryExpression;
        if (unary.operator === 'delete') {
          collectWrites(unary.argument);
        }
      },
      'ForInStatement, ForOfStatement': (node: estree.Node) =>
        collectWrites((node as estree.ForInStatement | estree.ForOfStatement).left),
      CallExpression: (node: estree.Node) => {
        const call = node as estree.CallExpression;
        const factory = getModuleFactory(call, context);
        if (factory) {
          scopeInitializers.set(factory, ['define']);
        }
        const initializer = getScopeInitializer(call, context);
        if (initializer) {
          scopeInitializers.set(initializer.factory, initializer.path);
        }
        excludeInvokedFunction(call.callee);
      },
      NewExpression: (node: estree.Node) => {
        const callee = getFinalValue((node as estree.NewExpression).callee);
        if (callee.type === 'FunctionExpression' && !callee.async) {
          excludeInvokedFunction(callee);
        }
      },
      TaggedTemplateExpression: (node: estree.Node) =>
        excludeInvokedFunction((node as estree.TaggedTemplateExpression).tag),
    };
  },
};

/** `(0, (factory as Function))` -> `factory` */
function getFinalValue(expression: estree.Node): estree.Node {
  const value = unwrapTypeScriptValue(expression);
  if (value.type !== 'SequenceExpression') {
    return value;
  }
  const lastExpression = value.expressions.at(-1);
  return lastExpression ? getFinalValue(lastExpression) : value;
}

/**
 * `sap.ui.define([], function () {})` -> factory and ['sap', 'ui', 'define']
 * `sap.ui['define']([], function () {})` -> undefined
 */
function getScopeInitializer(call: estree.CallExpression, context: Rule.RuleContext) {
  const { callee } = call;
  if (
    ('optional' in call && call.optional) ||
    call.arguments.length < 2 ||
    call.arguments.length > MAX_SCOPE_INITIALIZER_ARGUMENTS + 1 ||
    (callee.type === 'Identifier'
      ? callee.name !== 'require'
      : callee.type !== 'MemberExpression' ||
        callee.computed ||
        callee.optional ||
        callee.property.type !== 'Identifier' ||
        !['define', 'require', 'register'].includes(callee.property.name))
  ) {
    return undefined;
  }
  const path = getPropertyAccessPath(callee, false);
  const name = path?.join('.') ?? '';
  if (!path || ![SAP_UI_DEFINE, 'require', 'sap.ui.require', 'System.register'].includes(name)) {
    return undefined;
  }
  const args = call.arguments.map(unwrapTypeScriptValue);
  if (name === SAP_UI_DEFINE && isStringLiteral(args[0])) {
    args.shift();
  }
  const [dependencies, factory, extra] = args;
  if (
    args.length < 2 ||
    args.length > MAX_SCOPE_INITIALIZER_ARGUMENTS ||
    dependencies?.type !== 'ArrayExpression' ||
    !dependencies.elements.every(isStringLiteral) ||
    !isSynchronousFunction(factory)
  ) {
    return undefined;
  }
  if (
    !isValidScopeInitializerExtra(name, extra, dependencies.elements.length) ||
    hasRuntimeBinding(context, call, path[0])
  ) {
    return undefined;
  }
  return { factory, path };
}

/**
 * `sap.ui.define([], function () {}, true)` -> true
 * `System.register(['dep'], function () {}, [{}])` -> true
 * `sap.ui.define([], function () {}, 0)` -> false
 */
function isValidScopeInitializerExtra(
  name: string,
  extra: estree.Node | undefined,
  dependencyCount: number,
): boolean {
  if (!extra) {
    return true;
  }
  if (name === SAP_UI_DEFINE) {
    return extra.type === 'Literal' && typeof extra.value === 'boolean';
  }
  if (name === 'System.register') {
    return (
      extra.type === 'ArrayExpression' &&
      extra.elements.length === dependencyCount &&
      extra.elements.every(element =>
        element ? unwrapTypeScriptValue(element).type === 'ObjectExpression' : false,
      )
    );
  }
  return isFunctionNode(extra);
}

/**
 * `function () {}` -> true
 * `async function () {}` -> false
 * `() => {}` -> false
 */
function isSynchronousFunction(node: estree.Node | undefined): node is estree.FunctionExpression {
  return node?.type === 'FunctionExpression' && !node.async && !node.generator;
}

/** `['sap', 'ui', '*']` matches `['sap', 'ui', 'define']`. */
function isPathPrefix(prefix: string[], path: string[]): boolean {
  return (
    prefix.length <= path.length &&
    prefix.every((part, index) => part === '*' || part === path[index])
  );
}

function raiseOnUnauthorizedComplexity(
  node: FunctionNodeType,
  parent: estree.Node | undefined,
  branchTokens: ComplexityToken[],
  threshold: number,
  context: Rule.RuleContext,
): void {
  const tokens: ComplexityToken[] = [
    {
      loc: getMainFunctionTokenLocation(
        node as TSESTree.FunctionLike,
        parent as TSESTree.Node,
        context as unknown as RuleContext,
      ),
    },
    ...branchTokens,
  ];
  const complexity = tokens.length;
  if (complexity > threshold) {
    context.report({
      message: toEncodedMessage(complexity, threshold, tokens),
      loc: getMainFunctionTokenLocation(
        node as TSESTree.FunctionLike,
        parent as TSESTree.Node,
        context as unknown as RuleContext,
      ),
    });
  }
}

function toEncodedMessage(
  complexity: number,
  threshold: number,
  tokens: ComplexityToken[],
): string {
  const encodedMessage: EncodedMessage = {
    message: `Function has a complexity of ${complexity} which is greater than ${threshold} authorized.`,
    cost: complexity - threshold,
    secondaryLocations: tokens.map(node => toSecondaryLocation(node)),
  };
  return JSON.stringify(encodedMessage);
}

function toSecondaryLocation(token: ComplexityToken): IssueLocation {
  return {
    line: token.loc.start.line,
    column: token.loc.start.column,
    endLine: token.loc.end.line,
    endColumn: token.loc.end.column,
    message: '+1',
  };
}

interface ComplexityToken {
  loc: AST.SourceLocation;
}

interface FunctionInfo {
  node: FunctionNodeType;
  parent: estree.Node | undefined;
  tokens: ComplexityToken[];
}

function getComplexityToken(
  node: estree.Node,
  context: Rule.RuleContext,
): ComplexityToken | null | undefined {
  const { sourceCode } = context;
  switch (node.type) {
    case 'ConditionalExpression':
      return sourceCode.getFirstTokenBetween(
        node.test,
        node.consequent,
        token => token.value === '?',
      );
    case 'SwitchCase':
      if (!node.test) {
        return undefined;
      }
    case 'IfStatement':
    case 'ForStatement':
    case 'ForInStatement':
    case 'ForOfStatement':
    case 'WhileStatement':
    case 'DoWhileStatement':
      return sourceCode.getFirstToken(node);
    case 'LogicalExpression':
      return sourceCode.getFirstTokenBetween(
        node.left,
        node.right,
        token => token.value === node.operator,
      );
  }
}
