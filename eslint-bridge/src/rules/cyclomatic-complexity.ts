/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-1541

import { Rule, AST } from "eslint";
import * as estree from "estree";
import { EncodedMessage, IssueLocation, getMainFunctionTokenLocation } from "eslint-plugin-sonarjs/lib/utils/locations";
import visit, { childrenOf } from "../utils/visitor";
import { getParent } from "eslint-plugin-sonarjs/lib/utils/nodes";

type FunctionLike =
  | estree.FunctionDeclaration
  | estree.FunctionExpression
  | estree.ArrowFunctionExpression;

const functionLikeType = "FunctionDeclaration, FunctionExpression, ArrowFunctionExpression";

function isFunctionLike(node: estree.Node): node is FunctionLike {
  return functionLikeType.split(", ").includes(node.type);
}

let functionsDefiningModule: estree.Node[];
let functionsImmediatelyInvoked: estree.Node[];

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const [threshold] = context.options;
    return {
      Program: (_node: estree.Node) => {
        functionsDefiningModule = getFunctionsDefiningModule(context);
        functionsImmediatelyInvoked = getFunctionsImmediatelyInvoked(context);
      },
      [`${functionLikeType}`]: (node: estree.Node) => {
        if (
          !functionsDefiningModule.includes(node) &&
          !functionsImmediatelyInvoked.includes(node)
        ) {
          raiseOnUnauthorizedComplexity(node as FunctionLike, threshold, context);
        }
      },
    };
  },
};

function getFunctionsDefiningModule(context: Rule.RuleContext): estree.Node[] {
  const visitor = new FunctionDefiningModuleVisitor(context);
  visitor.visit();
  return visitor.getFunctions();
}

function getFunctionsImmediatelyInvoked(context: Rule.RuleContext): estree.Node[] {
  const visitor = new FunctionImmediatelyInvokedVisitor(context);
  visitor.visit();
  return visitor.getFunctions();
}

function raiseOnUnauthorizedComplexity(node: FunctionLike, threshold: number, context: Rule.RuleContext): void {
  const tokens = computeCyclomaticComplexity(node, context);
  const complexity = tokens.length;
  if (complexity > threshold) {
    context.report({
      message: toEncodedMessage(complexity, threshold, tokens),
      loc: toPrimaryLocation(node, context),
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
    secondaryLocations: tokens.map(toSecondaryLocation),
  };
  return JSON.stringify(encodedMessage);
}

function toPrimaryLocation(node: estree.Node, context: Rule.RuleContext): IssueLocation {
  const func = node as FunctionLike;
  return {
    line: func.loc!.start.line,
    column: func.loc!.start.column,
    endLine: context.getSourceCode().getTokenBefore(func.body)!.loc.end.line,
    endColumn: context.getSourceCode().getTokenBefore(func.body)!.loc.end.column,
  };
}

function toSecondaryLocation(token: ComplexityToken): IssueLocation {
  return {
    line: token.loc!.start.line,
    column: token.loc!.start.column,
    endLine: token.loc!.end.line,
    endColumn: token.loc!.end.column,
    message: "+1",
  };
}

function computeCyclomaticComplexity(node: estree.Node, context: Rule.RuleContext): ComplexityToken[] {
  const visitor = new FunctionComplexityVisitor(node, context);
  visitor.visit();
  return visitor.getComplexityTokens();
}

interface ComplexityToken {
  loc?: AST.SourceLocation | null;
}

class FunctionComplexityVisitor {
  private tokens: ComplexityToken[] = [];

  constructor(private root: estree.Node, private context: Rule.RuleContext) {}

  visit() {
    const visitNode = (node: estree.Node) => {
      let token: ComplexityToken | undefined | null;

      if (isFunctionLike(node)) {
        if (node !== this.root) {
          return;
        } else {
          token = { loc: getMainFunctionTokenLocation(node, getParent(this.context), this.context) };
        }
      } else {
        switch (node.type) {
          case "ConditionalExpression":
            token = this.context
              .getSourceCode()
              .getFirstTokensBetween(node.test, node.consequent)
              .find(token => token.value === "?");
            break;
          case "SwitchCase":
            // ignore default case
            if (!node.test) {
              break;
            }
          case "IfStatement":
          case "ForStatement":
          case "ForInStatement":
          case "ForOfStatement":
          case "WhileStatement":
          case "DoWhileStatement":
            token = this.context.getSourceCode().getFirstToken(node);
            break;
          case "LogicalExpression":
            token = this.context
              .getSourceCode()
              .getTokensAfter(node.left)
              .find(token => ["||", "&&"].includes(token.value) && token.type === "Punctuator");
            break;
        }
      }

      if (token) {
        this.tokens.push(token);
      }

      childrenOf(node, this.context.getSourceCode().visitorKeys).forEach(visitNode);
    };

    visitNode(this.root);
  }

  getComplexityTokens() {
    return this.tokens;
  }
}

class FunctionDefiningModuleVisitor {
  private functions: estree.Node[] = [];
  private amdPattern = false;

  constructor(private context: Rule.RuleContext) {}

  visit() {
    const sourceCode = this.context.getSourceCode();
    visit(sourceCode, node => {
      if (node.type === "CallExpression") {
        this.checkForAMDPattern(node);
        // TODO check for Angular module method call
        // we are missing type information
      }

      if (isFunctionLike(node) && this.amdPattern) {
        this.functions.push(node);
        this.amdPattern = false;
      }
    });
  }

  getFunctions() {
    return this.functions;
  }

  private checkForAMDPattern(node: estree.CallExpression): void {
    if (node.callee.type === "Identifier" && node.callee.name === "define") {
      for (const argument of node.arguments) {
        if (argument.type === "FunctionExpression") {
          this.amdPattern = true;
        }
      }
    }
  }
}

class FunctionImmediatelyInvokedVisitor {
  private functions: estree.Node[] = [];
  private immediatelyInvokedFunctionExpression = false;

  constructor(private context: Rule.RuleContext) {}

  visit() {
    const sourceCode = this.context.getSourceCode();
    visit(sourceCode, node => {
      if (node.type === "CallExpression") {
        this.checkForImmediatelyInvokedFunction(node.callee);
      }

      if (node.type === "NewExpression") {
        // There are no differences between new function(){} and new function(){}() with regard to their respective AST.
        // To detect a call through a NewExpression, either of the following conditions needs to be true:
        // - the expression has one or several arguments,
        // - the expression has zero arguments and the last two tokens, if any, denote a pair of parentheses.
        let called = false;
        if (node.arguments.length > 0) {
          called = true;
        } else {
          const tokens = sourceCode.getLastTokens(node);
          if (tokens.length > 2) {
            const [openParen, closeParen] = [tokens[tokens.length - 2], tokens[tokens.length - 1]];
            if (openParen.value === "(" && closeParen.value === ")") {
              called = true;
            }
          }
        }
        if (called) {
          this.checkForImmediatelyInvokedFunction(node.callee);
        }
      }

      if (node.type === "FunctionExpression" && this.immediatelyInvokedFunctionExpression) {
        this.functions.push(node);
        this.immediatelyInvokedFunctionExpression = false;
      }
    });
  }

  getFunctions() {
    return this.functions;
  }

  private checkForImmediatelyInvokedFunction(node: estree.Expression | estree.Super): void {
    const directFunctionCallee = node.type === "FunctionExpression";
    if (directFunctionCallee) {
      this.immediatelyInvokedFunctionExpression = true;
    }
  }
}
