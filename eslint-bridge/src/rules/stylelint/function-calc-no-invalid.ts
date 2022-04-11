/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

export const rule = stylelint.createPlugin(ruleName, function () {
  return (root, result) => {
    root.walkDecls(decl => {
      /* flag to report an invalid expression iff the calc argument has no other issues */
      let complained = false;
      postcssValueParser(decl.value).walk(calc => {
        if (calc.type !== 'function' || calc.value.toLowerCase() !== 'calc') {
          return;
        }
        const nodes = calc.nodes.filter(node => !isSpaceOrComment(node));
        for (const [index, node] of nodes.entries()) {
          if (node.type === 'word') {
            checkDivisionByZero(node, index, nodes);
          }
        }
        /* invalid expression */
        if (!complained && !isValid(nodes)) {
          report(`Fix this 'calc' expression`);
        }
      });

      function checkDivisionByZero(
        node: postcssValueParser.WordNode,
        index: number,
        siblings: postcssValueParser.Node[],
      ) {
        if (node.value === '/') {
          const operand = siblings[index + 1];
          if (operand && isZero(operand)) {
            report('Unexpected division by zero');
          }
        }
      }

      function isValid(nodes: postcssValueParser.Node[]) {
        /* empty expression */
        if (nodes.length === 0) {
          return false;
        }
        /* missing operator */
        for (let index = 1; index < nodes.length; index += 2) {
          const node = nodes[index];
          if (!isOperator(node)) {
            return false;
          }
        }
        return true;
      }

      function isSpaceOrComment(node: postcssValueParser.Node) {
        return node.type === 'space' || node.type === 'comment';
      }

      function isOperator(node: postcssValueParser.Node) {
        return node.type === 'word' && operators.includes(node.value);
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
        complained = true;
      }
    });
  };
});
