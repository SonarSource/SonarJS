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
import type { AST, Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { type FunctionNodeType } from '../helpers/ast.js';
import { getParent } from '../helpers/ancestor.js';
import {
  type EncodedMessage,
  type IssueLocation,
  getMainFunctionTokenLocation,
} from '../helpers/location.js';
import type { RuleContext } from '../helpers/type.js';

interface ComplexityTraversal {
  enterFunction(node: FunctionNodeType): void;
  leaveFunction(): void;
  addBranch(node: estree.Node): void;
  hasNestedFunction(node: estree.Node): boolean;
}

/** Store branch tokens for the current function, separate from its nested functions. */
export class ComplexityAccumulator implements ComplexityTraversal {
  private readonly functions: FunctionInfo[] = [];
  private readonly functionStack: FunctionInfo[] = [];
  private readonly functionsWithNested = new Set<estree.Node>();

  constructor(
    private readonly getBranchToken: (node: estree.Node) => ComplexityToken | null | undefined,
    private readonly getFunctionParent: (node: FunctionNodeType) => estree.Node | undefined,
  ) {}

  enterFunction(node: FunctionNodeType) {
    const info: FunctionInfo = { node, parent: this.getFunctionParent(node), tokens: [] };
    this.functions.push(info);
    const enclosing = this.functionStack.at(-1);
    if (enclosing) {
      this.functionsWithNested.add(enclosing.node);
    }
    this.functionStack.push(info);
  }

  leaveFunction() {
    this.functionStack.pop();
  }

  addBranch(node: estree.Node) {
    const enclosing = this.functionStack.at(-1);
    if (enclosing) {
      const token = this.getBranchToken(node);
      if (token) {
        enclosing.tokens.push(token);
      }
    }
  }

  hasNestedFunction(node: estree.Node): boolean {
    return this.functionsWithNested.has(node);
  }

  getFunctions(): readonly FunctionInfo[] {
    return this.functions;
  }
}

/** Connect complexity counting to ESLint token locations and issue reporting. */
export class ComplexityTracker implements ComplexityTraversal {
  private readonly accumulator: ComplexityAccumulator;

  constructor(private readonly context: Rule.RuleContext) {
    this.accumulator = new ComplexityAccumulator(
      node => getComplexityToken(node, context),
      node => getParent(context, node),
    );
  }

  enterFunction(node: FunctionNodeType) {
    this.accumulator.enterFunction(node);
  }

  leaveFunction() {
    this.accumulator.leaveFunction();
  }

  addBranch(node: estree.Node) {
    this.accumulator.addBranch(node);
  }

  hasNestedFunction(node: estree.Node): boolean {
    return this.accumulator.hasNestedFunction(node);
  }

  reportOverThreshold(threshold: number, isExcluded: (node: estree.Node) => boolean) {
    for (const { node, parent, tokens } of this.accumulator.getFunctions()) {
      if (!isExcluded(node)) {
        raiseOnUnauthorizedComplexity(node, parent, tokens, threshold, this.context);
      }
    }
  }
}

function raiseOnUnauthorizedComplexity(
  node: FunctionNodeType,
  parent: estree.Node | undefined,
  branchTokens: ComplexityToken[],
  threshold: number,
  context: Rule.RuleContext,
): void {
  const complexity = branchTokens.length + 1;
  if (complexity <= threshold) {
    return;
  }
  const primaryLocation = getMainFunctionTokenLocation(
    node as TSESTree.FunctionLike,
    parent as TSESTree.Node,
    context as unknown as RuleContext,
  );
  const tokens: ComplexityToken[] = [{ loc: primaryLocation }, ...branchTokens];
  context.report({
    message: toEncodedMessage(complexity, threshold, tokens),
    loc: primaryLocation,
  });
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
      return node.test ? sourceCode.getFirstToken(node) : undefined;
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
