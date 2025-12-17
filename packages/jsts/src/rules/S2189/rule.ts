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
 * Type alias for loop statement nodes
 */
type LoopStatement = estree.WhileStatement | estree.DoWhileStatement | estree.ForStatement;

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
    if (isLoopStatement(ancestor)) {
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
  const loopNode = findLoopInAncestors(ancestors);
  if (!loopNode) {
    return false;
  }

  // Get the loop's test condition
  const testCondition = loopNode.test;
  if (!testCondition) {
    return false;
  }

  return hasCallExpressionInNode(testCondition, context);
}

/**
 * Check if there are any function calls in a node tree
 */
function hasCallExpressionInNode(node: estree.Node, context: Rule.RuleContext): boolean {
  if (node.type === 'CallExpression') {
    return true;
  }
  for (const child of childrenOf(node, context.sourceCode.visitorKeys)) {
    if (hasCallExpressionInNode(child, context)) {
      return true;
    }
  }
  return false;
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
  const loopNode = findLoopInAncestors(ancestors);
  if (!loopNode) {
    return false;
  }

  // Get the loop's test condition
  const testCondition = loopNode.test;
  if (!testCondition) {
    return false;
  }

  const symbolsInCondition = getSymbolsInCondition(testCondition, context);
  return checkIfOtherSymbolsModified(symbolsInCondition, symbol, loopNode);
}

/**
 * Get all symbols referenced in a condition
 */
function getSymbolsInCondition(
  condition: estree.Node,
  context: Rule.RuleContext,
): Set<Scope.Variable> {
  const allIdentifiers = collectIdentifiers(condition, context.sourceCode.visitorKeys);
  const symbolsInCondition = new Set<Scope.Variable>();
  for (const id of allIdentifiers) {
    const scope = context.sourceCode.getScope(id);
    const ref = scope.references.find(r => r.identifier === id);
    if (ref?.resolved) {
      symbolsInCondition.add(ref.resolved);
    }
  }
  return symbolsInCondition;
}

/**
 * Check if a symbol has a write reference inside the loop
 */
function hasWriteReferenceInLoop(symbol: Scope.Variable, loopNode: LoopStatement): boolean {
  for (const ref of symbol.references) {
    if (ref.isWrite()) {
      const writeNode = ref.identifier as estree.Node;
      if (isNodeInsideLoop(writeNode, loopNode)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if any other symbol (besides the given one) is modified in the loop
 */
function checkIfOtherSymbolsModified(
  symbolsInCondition: Set<Scope.Variable>,
  currentSymbol: Scope.Variable | undefined,
  loopNode: LoopStatement,
): boolean {
  for (const otherSymbol of symbolsInCondition) {
    if (otherSymbol === currentSymbol) {
      continue;
    }

    if (hasWriteReferenceInLoop(otherSymbol, loopNode)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a variable is declared in a loop initialization
 */
function isDeclaredInLoopInit(def: Scope.Definition): boolean {
  if (def.type !== 'Variable') {
    return false;
  }

  let node: (estree.Node & { parent?: estree.Node }) | undefined = def.node as estree.Node & {
    parent?: estree.Node;
  };
  while (node) {
    if (node.type === 'ForStatement') {
      return true;
    }
    if (node.type === 'Program') {
      break;
    }
    node = node.parent as (estree.Node & { parent?: estree.Node }) | undefined;
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
  if (symbol.defs.some(def => isDeclaredInLoopInit(def))) {
    return false;
  }

  // A file-scope variable has a scope that is either 'module' or 'global'
  const scope = symbol.scope;
  return scope.type === 'module' || scope.type === 'global';
}

/**
 * Helper to check if a node is a loop statement
 */
function isLoopStatement(node: estree.Node): node is LoopStatement {
  return (
    node.type === 'WhileStatement' ||
    node.type === 'DoWhileStatement' ||
    node.type === 'ForStatement'
  );
}

/**
 * Finds a loop node in an array of ancestors
 */
function findLoopInAncestors(ancestors: estree.Node[]): LoopStatement | null {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (isLoopStatement(ancestors[i])) {
      return ancestors[i] as LoopStatement;
    }
  }
  return null;
}

/**
 * Finds the loop node that contains the given node
 */
function findContainingLoop(node: estree.Node, context: Rule.RuleContext): LoopStatement | null {
  const ancestors = context.sourceCode.getAncestors(node);
  return findLoopInAncestors(ancestors);
}

/**
 * Check if a declarator is a function expression or arrow function
 */
function isFunctionDeclarator(declarator: estree.VariableDeclarator): boolean {
  return (
    declarator.id.type === 'Identifier' &&
    declarator.init !== null &&
    declarator.init !== undefined &&
    (declarator.init.type === 'FunctionExpression' ||
      declarator.init.type === 'ArrowFunctionExpression')
  );
}

/**
 * Add function names from variable declarations to the set
 */
function addFunctionNamesFromDeclaration(
  declaration: estree.VariableDeclaration,
  localFunctions: Set<string>,
): void {
  for (const declarator of declaration.declarations) {
    if (isFunctionDeclarator(declarator) && declarator.id.type === 'Identifier') {
      localFunctions.add(declarator.id.name);
    }
  }
}

/**
 * Get all locally-defined function names in the program
 */
function getLocalFunctionNames(program: estree.Program): Set<string> {
  const localFunctions = new Set<string>();
  for (const statement of program.body) {
    if (statement.type === 'FunctionDeclaration' && statement.id) {
      localFunctions.add(statement.id.name);
    }
    if (statement.type === 'VariableDeclaration') {
      addFunctionNamesFromDeclaration(statement, localFunctions);
    }
  }
  return localFunctions;
}

/**
 * Check if a node contains a non-local function call
 */
function containsNonLocalCall(
  node: estree.Node,
  localFunctions: Set<string>,
  visitorKeys: Record<string, string[]>,
): boolean {
  if (node.type === 'CallExpression') {
    const isLocalCall = node.callee.type === 'Identifier' && localFunctions.has(node.callee.name);
    return !isLocalCall;
  }
  // Don't traverse into nested functions
  if (
    node.type === 'FunctionExpression' ||
    node.type === 'FunctionDeclaration' ||
    node.type === 'ArrowFunctionExpression'
  ) {
    return false;
  }
  // Check children
  for (const child of childrenOf(node, visitorKeys)) {
    if (containsNonLocalCall(child, localFunctions, visitorKeys)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if any non-local function is called within a loop body
 * Local functions are defined in the same file and don't modify external state
 */
function hasNonLocalFunctionCallInLoop(
  loopNode: LoopStatement,
  context: Rule.RuleContext,
): boolean {
  const localFunctions = getLocalFunctionNames(context.sourceCode.ast);
  return containsNonLocalCall(loopNode.body, localFunctions, context.sourceCode.visitorKeys);
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
      if (writeRange && definitionNodes.has(writeRange)) {
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

/**
 * Check how a symbol is used (as argument or method receiver)
 */
function analyzeSymbolUsage(symbol: Scope.Variable | undefined): {
  isPassedAsArgument: boolean;
  isUsedAsMethodReceiver: boolean;
} {
  let isPassedAsArgument = false;
  let isUsedAsMethodReceiver = false;

  for (const reference of symbol?.references ?? []) {
    const id = reference.identifier as TSESTree.Node;

    if (
      id.parent?.type === 'CallExpression' &&
      id.parent.arguments.includes(id as TSESTree.CallExpressionArgument)
    ) {
      isPassedAsArgument = true;
    }

    if (
      id.parent?.type === 'MemberExpression' &&
      id.parent.parent?.type === 'CallExpression' &&
      id.parent.object === id
    ) {
      isUsedAsMethodReceiver = true;
    }
  }

  return { isPassedAsArgument, isUsedAsMethodReceiver };
}

/**
 * Check if a symbol is initialized with an object or array
 */
function isInitializedWithObject(symbol: Scope.Variable | undefined): boolean {
  if (!symbol || symbol.defs.length === 0) {
    return false;
  }

  const def = symbol.defs[0];
  if (def.type === 'Variable' && def.node.init) {
    const init = def.node.init;
    return init.type === 'ObjectExpression' || init.type === 'ArrayExpression';
  }
  return false;
}

/**
 * Apply step 1 filters: imported variables, parameters, compound conditions
 */
function shouldSkipStep1(
  node: estree.Node,
  symbol: Scope.Variable | undefined,
  context: Rule.RuleContext,
): boolean {
  if (!symbol) {
    return false;
  }

  if (isImportedOrRequired(symbol)) {
    return true;
  }
  if (isFunctionParameter(symbol) && isInCompoundCondition(node, context)) {
    return true;
  }
  if (
    isInCompoundCondition(node, context) &&
    hasOtherModifiedVariablesInCompoundCondition(node, symbol, context)
  ) {
    return true;
  }
  if (hasFunctionCallInConditionThatMightModifyVariable(node, symbol, context)) {
    return true;
  }

  return false;
}

/**
 * Check if a symbol is file-scope or function-scope
 */
function isFileScopeOrFunctionScope(symbol: Scope.Variable): boolean {
  return isFileScopeVariable(symbol) || symbol.scope.type === 'function';
}

/**
 * Check if symbol should be skipped due to non-local function calls
 */
function shouldSkipDueToNonLocalCalls(
  symbol: Scope.Variable,
  loopNode: LoopStatement,
  context: Rule.RuleContext,
): boolean {
  if (!isFileScopeOrFunctionScope(symbol)) {
    return false;
  }
  return hasNonLocalFunctionCallInLoop(loopNode, context);
}

/**
 * Apply step 3 filter: check file-scope and function-scope variables
 */
function shouldSkipStep3(
  node: estree.Node,
  symbol: Scope.Variable | undefined,
  isPassedAsArgument: boolean,
  context: Rule.RuleContext,
): boolean {
  if (!symbol || isPassedAsArgument) {
    return false;
  }

  const loopNode = findContainingLoop(node, context);
  if (!loopNode) {
    return false;
  }

  // Check for non-local function calls (applies to both file-scope and function-scope)
  if (shouldSkipDueToNonLocalCalls(symbol, loopNode, context)) {
    return true;
  }

  // Check for writes elsewhere in file (only for file-scope)
  if (isFileScopeVariable(symbol)) {
    return isWrittenElsewhereInFile(symbol, loopNode);
  }

  return false;
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: noUnmodifiedLoopEslint.meta?.messages ?? {},
  }),
  create(context: Rule.RuleContext) {
    const alreadyRaisedSymbols: Set<Scope.Variable> = new Set();
    const ruleDecoration: Rule.RuleModule = interceptReport(
      noUnmodifiedLoopEslint,
      function (context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) {
        const node = (descriptor as Rule.ReportDescriptor & { node: estree.Node }).node;
        const symbol =
          context.sourceCode.getScope(node).references.find(v => v.identifier === node)?.resolved ??
          undefined;

        if (isUndefined(node) || (symbol && alreadyRaisedSymbols.has(symbol))) {
          return;
        }

        if (shouldSkipStep1(node, symbol, context)) {
          return;
        }

        const { isPassedAsArgument, isUsedAsMethodReceiver } = analyzeSymbolUsage(symbol);

        if (isUsedAsMethodReceiver) {
          return;
        }

        if (isPassedAsArgument && isInitializedWithObject(symbol)) {
          return;
        }

        if (shouldSkipStep3(node, symbol, isPassedAsArgument, context)) {
          return;
        }

        const loopNode = findContainingLoop(node, context);
        if (loopNode && LoopVisitor.hasEndCondition(loopNode.body, context)) {
          return;
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
          ForStatement: checkForStatement,
        };

        function checkForStatement(node: estree.Node) {
          const { test, body } = node as estree.ForStatement;
          if (!test || (test.type === 'Literal' && test.value === true)) {
            const hasEndCondition = LoopVisitor.hasEndCondition(body, context);
            if (!hasEndCondition) {
              const firstToken = context.sourceCode.getFirstToken(node);
              if (firstToken?.loc) {
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
              if (firstToken?.loc) {
                context.report({ loc: firstToken.loc, message: MESSAGE });
              }
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
    const visitNode = (node: estree.Node, isNestedLoop = false, isInSwitch = false) => {
      // Determine the flags to pass to children based on the current node
      let childIsNestedLoop = isNestedLoop;
      let childIsInSwitch = isInSwitch;

      switch (node.type) {
        case 'WhileStatement':
        case 'DoWhileStatement':
        case 'ForStatement':
          childIsNestedLoop = true;
          break;
        case 'SwitchStatement':
          childIsInSwitch = true;
          break;
        case 'FunctionExpression':
        case 'FunctionDeclaration':
          // Don't consider nested functions
          return;
        case 'BreakStatement':
          if ((!isNestedLoop && !isInSwitch) || !!node.label) {
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
        visitNode(child, childIsNestedLoop, childIsInSwitch);
      }
    };
    visitNode(root);
  }
}
