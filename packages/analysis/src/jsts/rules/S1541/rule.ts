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
import { isGlobalShadowed } from '../helpers/module.js';
import type { RuleContext } from '../helpers/type.js';
import { childrenOf, getParent } from '../helpers/ancestor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import type { TSESTree } from '@typescript-eslint/utils';
import type { FromSchema } from 'json-schema-to-ts';
import * as meta from './generated-meta.js';
import {
  getModuleFactory,
  getPropertyAccessPath,
  isStableGlobalRoot,
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
    let functionsWithParent: Map<estree.Node, estree.Node | undefined>;
    let functionsDefiningModule: Set<estree.Node>;
    let functionsImmediatelyInvoked: Set<estree.Node>;
    let functionStack: estree.Node[];
    let functionsWithNested: Set<estree.Node>;
    let scopeInitializers: Map<estree.Node, { path: string[]; call: estree.CallExpression }>;
    let writtenPaths: string[][];
    function collectWrites(target: estree.Node) {
      const value = unwrapTypeScriptValue(target);
      const path = getPropertyAccessPath(value, true);
      if (path) {
        if (!isGlobalShadowed(context.sourceCode, value, path[0])) {
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
    function excludeInvokedFunction(expression: estree.Node) {
      const value = getFinalValue(expression);
      if (
        (value.type === 'FunctionExpression' || value.type === 'ArrowFunctionExpression') &&
        !value.generator
      ) {
        functionsImmediatelyInvoked.add(value);
      }
    }
    return {
      Program: () => {
        functionsWithParent = new Map<estree.Node, estree.Node>();
        functionsDefiningModule = new Set();
        functionsImmediatelyInvoked = new Set();
        functionStack = [];
        functionsWithNested = new Set();
        scopeInitializers = new Map();
        writtenPaths = [];
      },
      'Program:exit': () => {
        const stablePaths = new Map<string, boolean>();
        for (const [factory, { path, call }] of scopeInitializers) {
          const key = path.join('.');
          if (!stablePaths.has(key)) {
            stablePaths.set(
              key,
              isStableGlobalRoot(context, call, path[0]) &&
                !writtenPaths.some(write => isPathPrefix(write, path)),
            );
          }
          if (functionsWithNested.has(factory) && stablePaths.get(key)) {
            functionsDefiningModule.add(factory);
          }
        }
        for (const [func, parent] of functionsWithParent.entries()) {
          if (!functionsDefiningModule.has(func) && !functionsImmediatelyInvoked.has(func)) {
            raiseOnUnauthorizedComplexity(func as FunctionNodeType, parent, threshold, context);
          }
        }
      },
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression': (node: estree.Node) => {
        functionsWithParent.set(node, getParent(context, node));
        const enclosing = functionStack.at(-1);
        if (enclosing) {
          functionsWithNested.add(enclosing);
        }
        functionStack.push(node);
      },
      ':matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression):exit': () => {
        functionStack.pop();
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
          functionsDefiningModule.add(factory);
        }
        const initializer = getScopeInitializer(call, context);
        if (initializer) {
          scopeInitializers.set(initializer.factory, { path: initializer.path, call });
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

function getFinalValue(expression: estree.Node): estree.Node {
  const value = unwrapTypeScriptValue(expression);
  if (value.type !== 'SequenceExpression') {
    return value;
  }
  const lastExpression = value.expressions.at(-1);
  return lastExpression ? getFinalValue(lastExpression) : value;
}

function getScopeInitializer(call: estree.CallExpression, context: Rule.RuleContext) {
  if ('optional' in call && call.optional) {
    return undefined;
  }
  const path = getPropertyAccessPath(call.callee, false);
  const name = path?.join('.') ?? '';
  if (
    !path ||
    ![SAP_UI_DEFINE, 'require', 'sap.ui.require', 'System.register'].includes(name) ||
    isGlobalShadowed(context.sourceCode, call, path[0])
  ) {
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
  if (!isValidScopeInitializerExtra(name, extra, dependencies.elements.length)) {
    return undefined;
  }
  return { factory, path };
}

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

function isSynchronousFunction(node: estree.Node | undefined): node is estree.FunctionExpression {
  return node?.type === 'FunctionExpression' && !node.async && !node.generator;
}

function isPathPrefix(prefix: string[], path: string[]): boolean {
  return (
    prefix.length <= path.length &&
    prefix.every((part, index) => part === '*' || part === path[index])
  );
}

function raiseOnUnauthorizedComplexity(
  node: FunctionNodeType,
  parent: estree.Node | undefined,
  threshold: number,
  context: Rule.RuleContext,
): void {
  const tokens = computeCyclomaticComplexity(node, parent, context);
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

function computeCyclomaticComplexity(
  node: estree.Node,
  parent: estree.Node | undefined,
  context: Rule.RuleContext,
): ComplexityToken[] {
  const visitor = new FunctionComplexityVisitor(node, parent, context);
  visitor.visit();
  return visitor.getComplexityTokens();
}

interface ComplexityToken {
  loc: AST.SourceLocation;
}

class FunctionComplexityVisitor {
  private readonly tokens: ComplexityToken[] = [];

  constructor(
    private readonly root: estree.Node,
    private readonly parent: estree.Node | undefined,
    private readonly context: Rule.RuleContext,
  ) {}

  visit() {
    const visitNode = (node: estree.Node) => {
      const { sourceCode } = this.context;
      let token: ComplexityToken | undefined | null;

      if (isFunctionNode(node)) {
        if (node === this.root) {
          token = {
            loc: getMainFunctionTokenLocation(
              node as TSESTree.FunctionLike,
              this.parent as TSESTree.Node,
              this.context as unknown as RuleContext,
            ),
          };
        } else {
          return;
        }
      } else {
        switch (node.type) {
          case 'ConditionalExpression':
            token = sourceCode.getFirstTokenBetween(
              node.test,
              node.consequent,
              token => token.value === '?',
            );
            break;
          case 'SwitchCase':
            // ignore default case
            if (!node.test) {
              break;
            }
          case 'IfStatement':
          case 'ForStatement':
          case 'ForInStatement':
          case 'ForOfStatement':
          case 'WhileStatement':
          case 'DoWhileStatement':
            token = sourceCode.getFirstToken(node);
            break;
          case 'LogicalExpression':
            token = sourceCode.getFirstTokenBetween(
              node.left,
              node.right,
              token => token.value === node.operator,
            );
            break;
        }
      }

      if (token) {
        this.tokens.push(token);
      }

      for (const childNode of childrenOf(node, sourceCode.visitorKeys)) {
        visitNode(childNode);
      }
    };

    visitNode(this.root);
  }

  getComplexityTokens() {
    return this.tokens;
  }
}
