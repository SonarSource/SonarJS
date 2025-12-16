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

/**
 * Checks if a variable is imported or required
 */
function isImportedOrRequired(symbol: Scope.Variable): boolean {
  if (!symbol || symbol.defs.length === 0) {
    return false;
  }

  for (const def of symbol.defs) {
    // Check for import statements
    if (def.type === 'ImportBinding') {
      return true;
    }
    // Check for require calls
    if (def.type === 'Variable' && def.node.init) {
      const init = def.node.init;
      if (
        init.type === 'CallExpression' &&
        init.callee.type === 'Identifier' &&
        init.callee.name === 'require'
      ) {
        return true;
      }
      // Check for destructured require: const { x } = require('...')
      if (
        init.type === 'MemberExpression' &&
        init.object.type === 'CallExpression' &&
        init.object.callee.type === 'Identifier' &&
        init.object.callee.name === 'require'
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Checks if a variable is a function parameter
 */
function isFunctionParameter(symbol: Scope.Variable): boolean {
  if (!symbol || symbol.defs.length === 0) {
    return false;
  }

  for (const def of symbol.defs) {
    if (def.type === 'Parameter') {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a node is part of a compound logical expression (&&, ||)
 * within the loop condition
 */
function isInCompoundCondition(node: estree.Node, context: Rule.RuleContext): boolean {
  const ancestors = context.sourceCode.getAncestors(node);

  // Look for a LogicalExpression ancestor (&&, ||) before hitting a loop statement
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];

    // Stop when we hit a loop - we only care about compound conditions within the loop test
    if (
      ancestor.type === 'WhileStatement' ||
      ancestor.type === 'DoWhileStatement' ||
      ancestor.type === 'ForStatement'
    ) {
      break;
    }

    if (ancestor.type === 'LogicalExpression') {
      return true;
    }
  }

  return false;
}

/**
 * Collects all identifier nodes from an expression tree
 */
function collectIdentifiers(
  node: estree.Node,
  visitorKeys: Record<string, string[]>,
): estree.Identifier[] {
  const identifiers: estree.Identifier[] = [];

  function visit(n: estree.Node) {
    if (n.type === 'Identifier') {
      identifiers.push(n);
      return;
    }

    // Use childrenOf to properly traverse without circular references
    for (const child of childrenOf(n, visitorKeys)) {
      visit(child);
    }
  }

  visit(node);
  return identifiers;
}

/**
 * Checks if a function call in the loop condition might modify the variable
 * For example: while (next() && ch < 10) where next() modifies ch
 * This applies to file-scope variables and also to function-scope variables that
 * are at the top level of their function (module pattern like AMD/CommonJS)
 */
function hasFunctionCallInConditionThatMightModifyVariable(
  node: estree.Node,
  symbol: Scope.Variable | undefined,
  context: Rule.RuleContext,
): boolean {
  if (!symbol) {
    return false;
  }

  // Check if it's a file-scope variable OR a function-scope variable at the top level
  const isFileScope = isFileScopeVariable(symbol);
  const isFunctionScopeTopLevel = symbol.scope.type === 'function';

  if (!isFileScope && !isFunctionScopeTopLevel) {
    return false;
  }

  const ancestors = context.sourceCode.getAncestors(node);

  // Find the loop node
  let loopNode: estree.WhileStatement | estree.DoWhileStatement | estree.ForStatement | null = null;
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    if (
      ancestor.type === 'WhileStatement' ||
      ancestor.type === 'DoWhileStatement' ||
      ancestor.type === 'ForStatement'
    ) {
      loopNode = ancestor;
      break;
    }
  }

  if (!loopNode) {
    return false;
  }

  // Get the loop's test condition
  const testCondition = loopNode.type === 'ForStatement' ? loopNode.test : loopNode.test;
  if (!testCondition) {
    return false;
  }

  // Check if there are any function calls in the test condition
  function hasCallExpression(n: estree.Node): boolean {
    if (n.type === 'CallExpression') {
      return true;
    }
    for (const child of childrenOf(n, context.sourceCode.visitorKeys)) {
      if (hasCallExpression(child)) {
        return true;
      }
    }
    return false;
  }

  return hasCallExpression(testCondition);
}

/**
 * Checks if there are other variables in the same compound condition that ARE modified in the loop
 */
function hasOtherModifiedVariablesInCompoundCondition(
  node: estree.Node,
  symbol: Scope.Variable | undefined,
  context: Rule.RuleContext,
): boolean {
  const ancestors = context.sourceCode.getAncestors(node);

  // Find the loop node
  let loopNode: estree.WhileStatement | estree.DoWhileStatement | estree.ForStatement | null = null;
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    if (
      ancestor.type === 'WhileStatement' ||
      ancestor.type === 'DoWhileStatement' ||
      ancestor.type === 'ForStatement'
    ) {
      loopNode = ancestor;
      break;
    }
  }

  if (!loopNode) {
    return false;
  }

  // Get the loop's test condition
  const testCondition = loopNode.type === 'ForStatement' ? loopNode.test : loopNode.test;
  if (!testCondition) {
    return false;
  }

  // Collect all identifiers in the test condition
  const allIdentifiers = collectIdentifiers(testCondition, context.sourceCode.visitorKeys);

  // Get all unique symbols in the condition
  const symbolsInCondition = new Set<Scope.Variable>();
  for (const id of allIdentifiers) {
    const scope = context.sourceCode.getScope(id);
    const ref = scope.references.find(r => r.identifier === id);
    if (ref?.resolved) {
      symbolsInCondition.add(ref.resolved);
    }
  }

  // Check if any OTHER symbol (not the current one) is modified in the loop
  for (const otherSymbol of symbolsInCondition) {
    if (otherSymbol === symbol) {
      continue; // Skip the current symbol
    }

    // Check if this other symbol is written to in the loop body
    for (const ref of otherSymbol.references) {
      if (ref.isWrite()) {
        const writeNode = ref.identifier as estree.Node;
        // Check if the write is inside the loop
        if (isNodeInsideLoop(writeNode, loopNode)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Checks if a variable is declared at file/module scope
 * Excludes variables declared in loop init (e.g., for (var i=0; ...))
 */
function isFileScopeVariable(symbol: Scope.Variable): boolean {
  if (!symbol || symbol.defs.length === 0) {
    return false;
  }

  // Check if declared in a loop init
  for (const def of symbol.defs) {
    if (def.type === 'Variable') {
      // Check if the variable declarator is part of a for loop init
      let node: (estree.Node & { parent?: estree.Node }) | undefined = def.node as estree.Node & {
        parent?: estree.Node;
      };
      while (node) {
        if (node.type === 'ForStatement') {
          return false;
        }
        // Stop at the program level
        if (node.type === 'Program') {
          break;
        }
        node = node.parent as (estree.Node & { parent?: estree.Node }) | undefined;
      }
    }
  }

  // A file-scope variable has a scope that is either 'module' or 'global'
  const scope = symbol.scope;
  const isFileScope = scope.type === 'module' || scope.type === 'global';
  return isFileScope;
}

/**
 * Finds the loop node that contains the given node
 */
function findContainingLoop(
  node: estree.Node,
  context: Rule.RuleContext,
): estree.WhileStatement | estree.DoWhileStatement | estree.ForStatement | null {
  const ancestors = context.sourceCode.getAncestors(node);

  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    if (
      ancestor.type === 'WhileStatement' ||
      ancestor.type === 'DoWhileStatement' ||
      ancestor.type === 'ForStatement'
    ) {
      return ancestor;
    }
  }
  return null;
}

/**
 * Checks if any non-local function is called within a loop body
 * Local functions are defined in the same file and don't modify external state
 */
function hasNonLocalFunctionCallInLoop(
  loopNode: estree.WhileStatement | estree.DoWhileStatement | estree.ForStatement,
  context: Rule.RuleContext,
): boolean {
  const body = loopNode.body;
  const program = context.sourceCode.ast;

  // Get all function declarations and function expressions assigned to variables in the file
  const localFunctions = new Set<string>();
  for (const statement of program.body) {
    if (statement.type === 'FunctionDeclaration' && statement.id) {
      localFunctions.add(statement.id.name);
    }
    // Also check for function expressions assigned to variables
    // e.g., var next = function() { ... }
    if (statement.type === 'VariableDeclaration') {
      for (const declarator of statement.declarations) {
        if (
          declarator.id.type === 'Identifier' &&
          declarator.init &&
          (declarator.init.type === 'FunctionExpression' ||
            declarator.init.type === 'ArrowFunctionExpression')
        ) {
          localFunctions.add(declarator.id.name);
        }
      }
    }
  }

  function visitNode(node: estree.Node): boolean {
    if (node.type === 'CallExpression') {
      // Check if it's a call to a locally-defined function
      if (node.callee.type === 'Identifier' && localFunctions.has(node.callee.name)) {
        // It's a local function, skip it
        return false;
      }
      // It's a non-local function call
      return true;
    }
    // Don't traverse into nested functions
    if (
      node.type === 'FunctionExpression' ||
      node.type === 'FunctionDeclaration' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      return false;
    }
    // Check children using the helper
    for (const child of childrenOf(node, context.sourceCode.visitorKeys)) {
      if (visitNode(child)) {
        return true;
      }
    }
    return false;
  }

  return visitNode(body);
}

/**
 * Checks if a file-scope variable is written to elsewhere in the file (outside the loop)
 */
function isWrittenElsewhereInFile(symbol: Scope.Variable, loopNode: estree.Node): boolean {
  // Get the definition nodes to exclude them
  const definitionNodes = new Set(
    symbol.defs.map(def => def.name.range).filter((r): r is [number, number] => r !== undefined),
  );

  for (const reference of symbol.references) {
    if (reference.isWrite()) {
      const writeNode = reference.identifier as estree.Node;
      const writeRange = writeNode.range;

      // Skip if this is the initial declaration/definition
      if (writeRange && definitionNodes.has(writeRange as [number, number])) {
        continue;
      }

      // Check if the write is outside the loop
      if (!isNodeInsideLoop(writeNode, loopNode)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Checks if a node is inside a loop
 */
function isNodeInsideLoop(node: estree.Node, loopNode: estree.Node): boolean {
  // Simple range check
  const nodeRange = node.range;
  const loopRange = loopNode.range;
  if (!nodeRange || !loopRange) {
    return false;
  }
  return nodeRange[0] >= loopRange[0] && nodeRange[1] <= loopRange[1];
}

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

        // Step 1: Ignore imported/required variables
        if (symbol && isImportedOrRequired(symbol)) {
          return;
        }

        // Step 1b: Ignore function parameters in compound conditions
        // Function parameters often act as configuration/control flags in compound conditions
        // where other parts of the condition can change to terminate the loop
        if (symbol && isFunctionParameter(symbol) && isInCompoundCondition(node, context)) {
          return;
        }

        // Step 1c: For variables in compound conditions, check if OTHER variables in the condition change
        // If the loop condition is compound (&&, ||) and other variables ARE modified, don't raise
        // This handles cases where one variable acts as a gate but other variables control termination
        if (
          isInCompoundCondition(node, context) &&
          hasOtherModifiedVariablesInCompoundCondition(node, symbol ?? undefined, context)
        ) {
          return;
        }

        // Step 1d: If there's a function call in the loop condition that might modify the variable
        // For example: while (next() && ch < 10) where next() modifies ch
        // This applies to file-scope variables that could be modified by function calls
        if (hasFunctionCallInConditionThatMightModifyVariable(node, symbol ?? undefined, context)) {
          return;
        }

        // Step 2: Check if passed as argument or used as method receiver
        // If passed as argument: check type and decide (don't continue to step 3)
        // If used as method receiver: don't raise (object can be modified)
        let isPassedAsArgument = false;
        let isUsedAsMethodReceiver = false;

        for (const reference of symbol?.references ?? []) {
          const id = reference.identifier as TSESTree.Node;

          // Check if passed as argument
          if (
            id.parent?.type === 'CallExpression' &&
            id.parent.arguments.includes(id as TSESTree.CallExpressionArgument)
          ) {
            isPassedAsArgument = true;
          }

          // Check if used as method receiver (e.g., obj.method())
          if (
            id.parent?.type === 'MemberExpression' &&
            id.parent.parent?.type === 'CallExpression' &&
            id.parent.object === id
          ) {
            isUsedAsMethodReceiver = true;
          }
        }

        // If used as method receiver, don't raise (object can be modified)
        if (isUsedAsMethodReceiver) {
          return;
        }

        // If passed as argument, check type and decide (skip step 3)
        if (isPassedAsArgument) {
          // Check if the variable is initialized with an object/array literal
          let isObject = false;
          if (symbol && symbol.defs.length > 0) {
            const def = symbol.defs[0];
            if (def.type === 'Variable' && def.node.init) {
              const init = def.node.init;
              if (init.type === 'ObjectExpression' || init.type === 'ArrayExpression') {
                isObject = true;
              }
            }
          }
          // If it's an object, don't raise
          if (isObject) {
            return;
          }
          // If it's a primitive, continue to raise (skip step 3)
          // Don't check file-scope logic - we already know the decision
          if (symbol) {
            alreadyRaisedSymbols.add(symbol);
          }
          context.report(descriptor);
          return;
        }

        // Step 3: For file-scope variables (or function-scope variables in the same scope as the loop),
        // check for function calls or external writes
        if (symbol && isFileScopeVariable(symbol)) {
          const loopNode = findContainingLoop(node, context);
          if (loopNode) {
            const hasNonLocal = hasNonLocalFunctionCallInLoop(loopNode, context);
            if (hasNonLocal) {
              return;
            }
            const writtenElsewhere = isWrittenElsewhereInFile(symbol, loopNode);
            if (writtenElsewhere) {
              return;
            }
          }
        }

        // Step 3b: For variables in function scope (not file-scope, but in an enclosing function),
        // also check if there are local function expressions that might modify them
        if (symbol && !isFileScopeVariable(symbol) && symbol.scope.type === 'function') {
          const loopNode = findContainingLoop(node, context);
          if (loopNode) {
            const hasNonLocal = hasNonLocalFunctionCallInLoop(loopNode, context);
            if (hasNonLocal) {
              return;
            }
          }
        }

        // Step 4: Check if the loop has an end condition (break/return/throw)
        // This applies to all loops, not just while(true)
        const loopNode = findContainingLoop(node, context);
        if (loopNode) {
          const hasEndCondition = LoopVisitor.hasEndCondition(loopNode.body, context);
          if (hasEndCondition) {
            return;
          }
        }

        if (symbol) {
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
