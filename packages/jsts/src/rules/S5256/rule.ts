/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S5256/javascript

import getElementType from 'eslint-plugin-jsx-a11y/lib/util/getElementType';
import * as estree from 'estree';
import { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/utils';
import { getProp, getLiteralPropValue } from 'jsx-ast-utils';
import { computeGrid } from '../helpers/table';
import { isPresentationTable } from '../helpers';
import { generateMeta } from '../helpers';
import rspecMeta from './meta.json';

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData),
  create(context: Rule.RuleContext) {
    const checkValidTable = (tree: TSESTree.JSXElement): boolean => {
      const grid = computeGrid(context, tree);
      if (grid === null) {
        // Unknown table structure, dont raise issue
        return true;
      }
      if (grid.length === 0) {
        return false;
      }
      for (const row of grid) {
        if (row.every(({ isHeader }) => isHeader)) {
          return true;
        }
      }
      for (let col = 0; col < grid[0].length; col++) {
        if (grid.every(row => col >= row.length || row[col].isHeader)) {
          return true;
        }
      }
      return false;
    };
    return {
      JSXElement(node: estree.Node) {
        const tree = node as unknown as TSESTree.JSXElement;
        const elementType = getElementType(context)(tree.openingElement);
        if (elementType === 'table') {
          if (isPresentationTable(context, tree.openingElement)) {
            return;
          }
          const ariaHidden = getProp(tree.openingElement.attributes, 'aria-hidden');
          if (ariaHidden && getLiteralPropValue(ariaHidden) === true) {
            return;
          }
          if (!checkValidTable(tree)) {
            context.report({
              node,
              message: 'Add a valid header row or column to this "<table>".',
            });
          }
        }
      },
    };
  },
};
