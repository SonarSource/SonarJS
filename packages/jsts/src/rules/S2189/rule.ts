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

        /** Ignoring symbols called on or passed as arguments */
        for (const reference of symbol?.references ?? []) {
          const id = reference.identifier as TSESTree.Node;

          if (
            id.parent?.type === 'CallExpression' &&
            id.parent.arguments.includes(id as TSESTree.CallExpressionArgument)
          ) {
            return;
          }

          if (
            id.parent?.type === 'MemberExpression' &&
            id.parent.parent?.type === 'CallExpression' &&
            id.parent.object === id
          ) {
            return;
          }
        }

        /** JS-131: Only report on local variables to avoid FPs */
        if (symbol) {
          // Check if variable is imported/required
          const def = symbol.defs[0];
          if (def?.type === 'ImportBinding') {
            return;
          }

          // Check if variable is at file/module scope (not local to a function)
          const scope = symbol.scope;
          const isFileScope = scope.type === 'module' || scope.type === 'global';

          if (isFileScope) {
            // For file-scope variables, apply additional checks to avoid FPs
            const loopStatement = findFirstMatchingAncestor(node as TSESTree.Node, n =>
              ['WhileStatement', 'DoWhileStatement', 'ForStatement'].includes(n.type),
            );
            const loopBody = loopStatement
              ? (
                  loopStatement as
                    | estree.WhileStatement
                    | estree.DoWhileStatement
                    | estree.ForStatement
                ).body
              : null;

            // Check if variable is written to elsewhere in the file (outside the current loop)
            const hasWriteElsewhere = symbol.references.some(ref => {
              if (!ref.isWrite() || ref.init) return false;
              const writeNode = ref.identifier as estree.Node;
              // Check if this write is outside the current loop
              if (!loopBody) return true;
              return !(
                loopBody.range![0] <= writeNode.range![0] &&
                loopBody.range![1] >= writeNode.range![1]
              );
            });
            if (hasWriteElsewhere) {
              return; // Don't raise - variable is modified elsewhere
            }

            // Check if there's any function call in the loop
            // Any function call could potentially modify file-scope variables
            if (loopBody && hasFunctionCall(loopBody, context)) {
              return;
            }
          }

          alreadyRaisedSymbols.add(symbol);
        }

        context.report(descriptor);
      },
    );

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

/**
 * Check if there are any function calls in the given AST subtree
 */
function hasFunctionCall(node: estree.Node, context: Rule.RuleContext): boolean {
  let found = false;
  const visit = (n: estree.Node) => {
    if (found) return;
    if (n.type === 'CallExpression') {
      found = true;
      return;
    }
    // Don't look inside nested functions
    if (
      n.type === 'FunctionExpression' ||
      n.type === 'FunctionDeclaration' ||
      n.type === 'ArrowFunctionExpression'
    ) {
      return;
    }
    for (const child of childrenOf(n, context.sourceCode.visitorKeys)) {
      visit(child);
    }
  };
  visit(node);
  return found;
}
