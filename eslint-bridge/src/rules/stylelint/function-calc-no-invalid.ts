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

export const rule = stylelint.createPlugin(ruleName, function (_primaryOption, _secondaryOptions) {
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
            checkSpacing(node, index, nodes);
          }
        }
        /* invalid expression */
        if (!complained && !isValid(nodes)) {
          complain('Expected a valid expression');
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
            complain('Unexpected division by zero');
          }
        }
      }

      function checkSpacing(
        node: postcssValueParser.WordNode,
        index: number,
        siblings: postcssValueParser.Node[],
      ) {
        /* missing space after operator */
        if (['+', '-'].includes(node.value[0]) && node.value.length > 1) {
          const previous = siblings[index - 1];
          if (previous && !isOperator(previous)) {
            const operator = node.value[0];
            complain(`Expected space after "${operator}" operator`);
          }
        }
        /* missing space before operator */
        if (['+', '-'].includes(node.value[node.value.length - 1]) && node.value.length > 1) {
          const after = siblings[index + 1];
          if (after && !isOperator(after)) {
            const operator = node.value[node.value.length - 1];
            complain(`Expected space before "${operator}" operator`);
          }
        }
        /* missing spaces surrounding operator */
        for (let i = 1; i < node.value.length - 1; ++i) {
          if (['+', '-'].includes(node.value[i])) {
            const operator = node.value[i];
            complain(`Expected space before "${operator}" operator`);
            complain(`Expected space after "${operator}" operator`);
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

      function complain(message: string) {
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
