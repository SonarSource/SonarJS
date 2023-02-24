/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S5362/css
import * as stylelint from 'stylelint';
import postcssValueParser from 'postcss-value-parser';

const ruleName = 'function-calc-no-invalid';
const operators = ['+', '-', '*', '/'];

// exported for testing purpose
export const messages = {
  empty: "Fix this empty 'calc' expression.",
  malformed: "Fix this malformed 'calc' expression.",
  divByZero: "Fix this 'calc' expression with division by zero.",
};

const ruleImpl: stylelint.RuleBase = () => {
  return (root: any, result: any) => {
    root.walkDecls((decl: any) => {
      postcssValueParser(decl.value).walk(node => {
        if (!isCalcFunction(node)) {
          return;
        }

        const calc = node as postcssValueParser.FunctionNode;

        checkDivisionByZero(calc.nodes);
        checkMissingOperator(calc.nodes);
        checkEmpty(calc.nodes);
      });

      function isCalcFunction(node: postcssValueParser.Node) {
        return node.type === 'function' && node.value.toLowerCase() === 'calc';
      }

      function isParenthesizedExpression(
        node: postcssValueParser.Node,
      ): node is postcssValueParser.FunctionNode {
        return node.type === 'function' && node.value.toLowerCase() !== 'calc';
      }

      function checkDivisionByZero(nodes: postcssValueParser.Node[]): void {
        const siblings = nodes.filter(node => !isSpaceOrComment(node));
        for (const [index, node] of siblings.entries()) {
          if (isDivision(node)) {
            const operand = siblings[index + 1];
            if (operand && isZero(operand)) {
              report(messages.divByZero);
            }
          } else if (isParenthesizedExpression(node)) {
            // parenthesized expressions are represented as `function` nodes
            // they need to be visited as well if they are not `calc` calls
            checkDivisionByZero(node.nodes);
          }
        }
      }

      function checkMissingOperator(nodes: postcssValueParser.Node[]) {
        const siblings = nodes.filter(node => !isSpaceOrComment(node));
        for (let index = 1; index < siblings.length; index += 2) {
          const node = siblings[index];
          if (!isOperator(node)) {
            report(messages.malformed);
          }
        }
        for (const node of siblings) {
          if (isParenthesizedExpression(node)) {
            // parenthesized expressions are represented as `function` nodes
            // they need to be visited as well if they are not `calc` calls
            checkMissingOperator(node.nodes);
          }
        }
      }

      function checkEmpty(nodes: postcssValueParser.Node[]) {
        if (nodes.filter(node => !isSpaceOrComment(node)).length === 0) {
          report(messages.empty);
        }
      }

      function isSpaceOrComment(node: postcssValueParser.Node) {
        return node.type === 'space' || node.type === 'comment';
      }

      function isOperator(node: postcssValueParser.Node) {
        return (node.type === 'word' && operators.includes(node.value)) || node.type === 'div';
      }

      function isDivision(node: postcssValueParser.Node) {
        return (node.type === 'word' || node.type === 'div') && node.value === '/';
      }

      function isZero(node: postcssValueParser.Node) {
        return node.type === 'word' && parseFloat(node.value) === 0;
      }

      function report(message: string) {
        stylelint.utils.report({
          ruleName,
          result,
          message,
          node: decl,
        });
      }
    });
  };
};

export const rule = stylelint.createPlugin(
  ruleName,
  Object.assign(ruleImpl, {
    messages,
    ruleName,
  }),
);
