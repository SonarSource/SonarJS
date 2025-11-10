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
// https://sonarsource.github.io/rspec/#/rspec/S5362/css
import stylelint, { type PostcssResult } from 'stylelint';
import postcssValueParser from 'postcss-value-parser';
import type PostCSS from 'postcss';

const ruleName = 'sonar/function-calc-no-invalid';
const operators = new Set(['+', '-', '*', '/']);

// exported for testing purpose
export const messages = {
  empty: "Fix this empty 'calc' expression.",
  malformed: "Fix this malformed 'calc' expression.",
  divByZero: "Fix this 'calc' expression with division by zero.",
};

const ruleImpl: stylelint.RuleBase = () => {
  return (root: PostCSS.Root, result: PostcssResult) => {
    root.walkDecls((decl: PostCSS.Declaration) => {
      function report(message: string) {
        stylelint.utils.report({
          ruleName,
          result,
          message,
          node: decl,
        });
      }

      postcssValueParser(decl.value).walk(node => {
        if (!isCalcFunction(node)) {
          return;
        }

        const calc = node as postcssValueParser.FunctionNode;
        checkDivisionByZero(calc.nodes, () => report(messages.divByZero));
        checkMissingOperator(calc.nodes, () => report(messages.malformed));
        checkEmpty(calc.nodes, () => report(messages.empty));
      });
    });
  };
};

function isCalcFunction(node: postcssValueParser.Node) {
  return node.type === 'function' && node.value.toLowerCase() === 'calc';
}

function isParenthesizedExpression(
  node: postcssValueParser.Node,
): node is postcssValueParser.FunctionNode {
  return node.type === 'function' && node.value.toLowerCase() !== 'calc';
}

function checkDivisionByZero(nodes: postcssValueParser.Node[], report: () => void): void {
  const siblings = nodes.filter(node => !isSpaceOrComment(node));
  for (const [index, node] of siblings.entries()) {
    if (isDivision(node)) {
      const operand = siblings[index + 1];
      if (operand && isZero(operand)) {
        report();
      }
    } else if (isParenthesizedExpression(node)) {
      // parenthesized expressions are represented as `function` nodes
      // they need to be visited as well if they are not `calc` calls
      checkDivisionByZero(node.nodes, report);
    }
  }
}

function checkMissingOperator(nodes: postcssValueParser.Node[], report: () => void) {
  const siblings = nodes.filter(node => !isSpaceOrComment(node));
  for (let index = 1; index < siblings.length; index += 2) {
    const node = siblings[index];
    if (!isOperator(node)) {
      report();
    }
  }
  for (const node of siblings) {
    if (isParenthesizedExpression(node)) {
      // parenthesized expressions are represented as `function` nodes
      // they need to be visited as well if they are not `calc` calls
      checkMissingOperator(node.nodes, report);
    }
  }
}

function checkEmpty(nodes: postcssValueParser.Node[], report: () => void) {
  if (nodes.filter(node => !isSpaceOrComment(node)).length === 0) {
    report();
  }
}

function isSpaceOrComment(node: postcssValueParser.Node) {
  return node.type === 'space' || node.type === 'comment';
}

function isOperator(node: postcssValueParser.Node) {
  return (node.type === 'word' && operators.has(node.value)) || node.type === 'div';
}

function isDivision(node: postcssValueParser.Node) {
  return (node.type === 'word' || node.type === 'div') && node.value === '/';
}

function isZero(node: postcssValueParser.Node) {
  return node.type === 'word' && Number.parseFloat(node.value) === 0;
}

export const rule = stylelint.createPlugin(
  ruleName,
  Object.assign(ruleImpl, {
    messages,
    ruleName,
  }),
) as { ruleName: string; rule: stylelint.Rule };
