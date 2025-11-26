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
// https://sonarsource.github.io/rspec/#/rspec/S2189/javascript

import { Rule, Scope } from 'eslint';
import { getESLintCoreRule } from '../external/core.js';
import type estree from 'estree';
import {
  childrenOf,
  generateMeta,
  interceptReport,
  isUndefined,
  mergeRules,
} from '../helpers/index.js';
import type { TSESTree } from '@typescript-eslint/utils';
import * as meta from './generated-meta.js';

const noUnmodifiedLoopEslint = getESLintCoreRule('no-unmodified-loop-condition');

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: { ...noUnmodifiedLoopEslint.meta!.messages },
  }),
  create(context: Rule.RuleContext) {
    /**
     * Decorates ESLint `no-unmodified-loop-condition` to raise one issue per symbol.
     */
    const alreadyRaisedSymbols: Set<Scope.Variable> = new Set();
    const ruleDecoration: Rule.RuleModule = interceptReport(
      noUnmodifiedLoopEslint,
      function (context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) {
        const node = (descriptor as any).node as estree.Node;

        const symbol = context.sourceCode
          .getScope(node)
          .references.find(v => v.identifier === node)?.resolved;

        /** Ignoring symbols that have already been reported */
        if (isUndefined(node) || (symbol && alreadyRaisedSymbols.has(symbol))) {
          return;
        }

        /** Ignoring variables not defined locally in the function (JS-131) */
        if (symbol && shouldIgnoreNonLocalVariable(symbol, node, context)) {
          return;
        }

        /** Ignoring symbols called on or passed as arguments */
        if (symbol && isSymbolUsedAsArgumentOrReceiver(symbol)) {
          return;
        }

        if (symbol) {
          alreadyRaisedSymbols.add(symbol);
        }

        context.report(descriptor);
      },
    );

    /** Helper to check if variable should be ignored due to non-local definition */
    function shouldIgnoreNonLocalVariable(
      symbol: Scope.Variable,
      node: estree.Node,
      context: Rule.RuleContext,
    ): boolean {
      const scope = context.sourceCode.getScope(node);
      const functionScope = findFunctionScope(scope);

      if (functionScope?.type !== 'function') {
        return false;
      }

      const variableScope = symbol.scope;

      // Don't report if variable is defined outside the function (may be modified cross-procedurally)
      if (variableScope !== functionScope && !isDescendantScope(functionScope, variableScope)) {
        return true;
      }

      // Don't report on function parameters (may be modified by caller)
      return isParameterDefinition(symbol, variableScope, functionScope);
    }

    /** Helper to find the function scope containing the given scope */
    function findFunctionScope(scope: Scope.Scope): Scope.Scope | null {
      let functionScope: Scope.Scope | null = scope;
      while (
        functionScope &&
        functionScope.type !== 'function' &&
        functionScope.type !== 'global'
      ) {
        functionScope = functionScope.upper;
      }
      return functionScope;
    }

    /** Helper to check if symbol is a parameter definition */
    function isParameterDefinition(
      symbol: Scope.Variable,
      variableScope: Scope.Scope,
      functionScope: Scope.Scope,
    ): boolean {
      if (variableScope !== functionScope || symbol.defs.length === 0) {
        return false;
      }
      return symbol.defs[0].type === 'Parameter';
    }

    /** Helper to check if symbol is used as argument or method receiver */
    function isSymbolUsedAsArgumentOrReceiver(symbol: Scope.Variable): boolean {
      for (const reference of symbol.references) {
        const id = reference.identifier as TSESTree.Node;

        if (
          id.parent?.type === 'CallExpression' &&
          id.parent.arguments.includes(id as TSESTree.CallExpressionArgument)
        ) {
          return true;
        }

        if (
          id.parent?.type === 'MemberExpression' &&
          id.parent.parent?.type === 'CallExpression' &&
          id.parent.object === id
        ) {
          return true;
        }
      }
      return false;
    }

    /** Helper to check if childScope is a descendant of parentScope */
    function isDescendantScope(parentScope: Scope.Scope, childScope: Scope.Scope): boolean {
      let current: Scope.Scope | null = childScope;
      while (current) {
        if (current === parentScope) {
          return true;
        }
        current = current.upper;
      }
      return false;
    }

    /**
     * Extends ESLint `no-unmodified-loop-condition` to consider more corner cases.
     */
    const MESSAGE = "Correct this loop's end condition to not be invariant.";
    const ruleExtension: Rule.RuleModule = {
      create(context: Rule.RuleContext) {
        return {
          WhileStatement: checkWhileStatement,
          DoWhileStatement: checkWhileStatement,
          ForStatement: (node: estree.Node) => {
            const { test, body } = node as estree.ForStatement;
            if (!test || (test.type === 'Literal' && test.value === true)) {
              const hasEndCondition = LoopVisitor.hasEndCondition(body, context);
              if (!hasEndCondition) {
                const firstToken = context.sourceCode.getFirstToken(node);
                context.report({
                  loc: firstToken!.loc,
                  message: MESSAGE,
                });
              }
            }
          },
        };

        function checkWhileStatement(node: estree.Node) {
          const whileStatement = node as estree.WhileStatement | estree.DoWhileStatement;
          if (whileStatement.test.type === 'Literal' && whileStatement.test.value === true) {
            const hasEndCondition = LoopVisitor.hasEndCondition(whileStatement.body, context);
            if (!hasEndCondition) {
              const firstToken = context.sourceCode.getFirstToken(node);
              context.report({ loc: firstToken!.loc, message: MESSAGE });
            }
          }
        }
      },
    };

    const decorationListeners: Rule.RuleListener = ruleDecoration.create(context);
    const extensionListeners: Rule.RuleListener = ruleExtension.create(context);

    return mergeRules(decorationListeners, extensionListeners);
  },
};

class LoopVisitor {
  hasEndCondition = false;

  static hasEndCondition(node: estree.Node, context: Rule.RuleContext) {
    const visitor = new LoopVisitor();
    visitor.visit(node, context);
    return visitor.hasEndCondition;
  }

  private visit(root: estree.Node, context: Rule.RuleContext) {
    const visitNode = (node: estree.Node, isNestedLoop = false) => {
      switch (node.type) {
        case 'WhileStatement':
        case 'DoWhileStatement':
        case 'ForStatement':
          isNestedLoop = true;
          break;
        case 'FunctionExpression':
        case 'FunctionDeclaration':
          // Don't consider nested functions
          return;
        case 'BreakStatement':
          if (!isNestedLoop || !!node.label) {
            this.hasEndCondition = true;
          }
          break;
        case 'YieldExpression':
        case 'ReturnStatement':
        case 'ThrowStatement':
          this.hasEndCondition = true;
          return;
      }
      for (const child of childrenOf(node, context.sourceCode.visitorKeys)) {
        visitNode(child, isNestedLoop);
      }
    };
    visitNode(root);
  }
}
