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
  findFirstMatchingAncestor,
  functionLike,
  generateMeta,
  getFullyQualifiedName,
  interceptReport,
  isUndefined,
  mergeRules,
} from '../helpers/index.js';
import type { TSESTree } from '@typescript-eslint/utils';
import * as meta from './generated-meta.js';

const noUnmodifiedLoopEslint = getESLintCoreRule('no-unmodified-loop-condition');

const loopTypes = new Set([
  'WhileStatement',
  'DoWhileStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
]);

/**
 * Gets the body of a loop node.
 */
function getLoopBody(loop: estree.Node): estree.Node | null {
  return (
    (loop as estree.WhileStatement).body ||
    (loop as estree.ForStatement).body ||
    (loop as estree.DoWhileStatement).body ||
    null
  );
}

/**
 * Checks if a node is inside a function definition.
 */
function isInsideFunctionDefinition(node: TSESTree.Node): boolean {
  return findFirstMatchingAncestor(node, n => functionLike.has(n.type)) !== undefined;
}

/**
 * Checks if a variable is declared at file/module scope AND not as part of a loop construct.
 */
function isFileScopeVariable(symbol: Scope.Variable): boolean {
  const scope = symbol.scope;
  if (scope.type !== 'global' && scope.type !== 'module') {
    return false;
  }

  // Check if the variable is declared as part of a loop construct (e.g., for (var x = ...))
  // Such variables are technically module-scoped due to var hoisting,
  // but they're semantically loop-local
  for (const def of symbol.defs) {
    if (def.type === 'Variable' && def.parent?.type === 'VariableDeclaration') {
      const declarationParent = (def.parent as TSESTree.Node).parent;
      if (
        declarationParent?.type === 'ForStatement' ||
        declarationParent?.type === 'ForInStatement' ||
        declarationParent?.type === 'ForOfStatement'
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Finds the containing loop (while, do-while, for) for a node.
 */
function findContainingLoop(node: estree.Node): estree.Node | null {
  const loop = findFirstMatchingAncestor(node as TSESTree.Node, n => loopTypes.has(n.type));
  return (loop as estree.Node) ?? null;
}

/**
 * Checks if variable is passed as argument or used as method receiver.
 */
function isPassedAsArgumentOrReceiver(symbol: Scope.Variable): boolean {
  for (const reference of symbol.references) {
    const id = reference.identifier as TSESTree.Node;

    // Passed as argument to a function call
    if (
      id.parent?.type === 'CallExpression' &&
      id.parent.arguments.includes(id as TSESTree.CallExpressionArgument)
    ) {
      return true;
    }

    // Used as method receiver (e.g., obj.method())
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

/**
 * Checks if the variable is written inside a function (elsewhere in the file).
 * This means a function could potentially modify the variable when called.
 */
function isWrittenInsideFunction(symbol: Scope.Variable): boolean {
  for (const reference of symbol.references) {
    // Check if the write is inside a function
    if (reference.isWrite() && isInsideFunctionDefinition(reference.identifier as TSESTree.Node)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if any function is called within the loop body.
 */
function hasFunctionCallInLoop(loop: estree.Node, context: Rule.RuleContext): boolean {
  let hasCall = false;

  const visitNode = (node: estree.Node) => {
    if (hasCall) {
      return;
    }

    if (node.type === 'CallExpression') {
      hasCall = true;
      return;
    }

    // Don't traverse into nested functions
    if (
      node.type === 'FunctionExpression' ||
      node.type === 'FunctionDeclaration' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      return;
    }

    for (const child of childrenOf(node, context.sourceCode.visitorKeys)) {
      visitNode(child);
    }
  };

  const body = getLoopBody(loop);
  if (body) {
    visitNode(body);
  }

  return hasCall;
}

/**
 * Checks if a file-scope symbol should be suppressed based on FP reduction algorithm.
 */
function shouldSuppressFileScopeSymbol(
  context: Rule.RuleContext,
  symbol: Scope.Variable,
  node: estree.Node,
  containingLoop: estree.Node | null,
): boolean {
  // Check if variable is imported/required - don't raise
  if (getFullyQualifiedName(context, node) !== null) {
    return true;
  }

  // Check if variable is passed as argument or used as method receiver
  if (isPassedAsArgumentOrReceiver(symbol)) {
    return true;
  }

  if (containingLoop) {
    // Check if any function is called in the loop - don't raise
    // (only for file-scope variables that could be modified through closures)
    if (hasFunctionCallInLoop(containingLoop, context)) {
      return true;
    }

    // Check if variable is written inside a function - don't raise
    if (isWrittenInsideFunction(symbol)) {
      return true;
    }
  }

  return false;
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: { ...noUnmodifiedLoopEslint.meta?.messages },
  }),
  create(context: Rule.RuleContext) {
    /**
     * Decorates ESLint `no-unmodified-loop-condition` to raise one issue per symbol.
     */
    const alreadyRaisedSymbols: Set<Scope.Variable> = new Set();
    const ruleDecoration: Rule.RuleModule = interceptReport(
      noUnmodifiedLoopEslint,
      function (context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) {
        const node = (descriptor as Rule.ReportDescriptor & { node?: estree.Node }).node;

        /** Ignoring undefined nodes */
        if (!node || isUndefined(node)) {
          return;
        }

        const symbol = context.sourceCode
          .getScope(node)
          .references.find(v => v.identifier === node)?.resolved;
        /** Ignoring symbols that have already been reported */
        if (symbol && alreadyRaisedSymbols.has(symbol)) {
          return;
        }

        /** Check if the symbol should be reported based on the FP reduction algorithm */
        if (symbol && !shouldReportSymbol(context, symbol, node)) {
          return;
        }

        if (symbol) {
          alreadyRaisedSymbols.add(symbol);
        }

        context.report(descriptor);
      },
    );

    /**
     * Determines if a symbol should be reported based on its definition and usage.
     * This implements the FP reduction algorithm from JS-131.
     */
    function shouldReportSymbol(
      context: Rule.RuleContext,
      symbol: Scope.Variable,
      node: estree.Node,
    ): boolean {
      // Find the containing loop for this node
      const containingLoop = findContainingLoop(node);

      if (containingLoop) {
        // Check if loop has break/return/throw - don't raise if there's another exit condition
        const body = getLoopBody(containingLoop);
        if (body && LoopVisitor.hasEndCondition(body, context)) {
          return false;
        }
      }

      // Only filter file-scope variables; local variables should always be reported
      // (unless the loop has break/return/throw checked above)
      if (!isFileScopeVariable(symbol)) {
        return true;
      }

      // Apply FP suppression rules for file-scope symbols
      if (shouldSuppressFileScopeSymbol(context, symbol, node, containingLoop)) {
        return false;
      }

      // File-scope variable with no function calls and no writes inside functions - raise
      return true;
    }

    /**
     * Extends ESLint `no-unmodified-loop-condition` to consider more corner cases.
     */
    const MESSAGE = "Correct this loop's end condition to not be invariant.";
    const ruleExtension: Rule.RuleModule = {
      create(context: Rule.RuleContext) {
        function checkForStatement(node: estree.Node) {
          const { test, body } = node as estree.ForStatement;
          if (!test || (test.type === 'Literal' && test.value === true)) {
            const hasEndCondition = LoopVisitor.hasEndCondition(body, context);
            if (!hasEndCondition) {
              const firstToken = context.sourceCode.getFirstToken(node);
              if (firstToken) {
                context.report({
                  loc: firstToken.loc,
                  message: MESSAGE,
                });
              }
            }
          }
        }

        function checkWhileStatement(node: estree.Node) {
          const whileStatement = node as estree.WhileStatement | estree.DoWhileStatement;
          if (whileStatement.test.type === 'Literal' && whileStatement.test.value === true) {
            const hasEndCondition = LoopVisitor.hasEndCondition(whileStatement.body, context);
            if (!hasEndCondition) {
              const firstToken = context.sourceCode.getFirstToken(node);
              if (firstToken) {
                context.report({ loc: firstToken.loc, message: MESSAGE });
              }
            }
          }
        }

        return {
          WhileStatement: checkWhileStatement,
          DoWhileStatement: checkWhileStatement,
          ForStatement: checkForStatement,
        };
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
