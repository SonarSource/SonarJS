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
// https://sonarsource.github.io/rspec/#/rspec/S5260/javascript

import getElementType from 'eslint-plugin-jsx-a11y/lib/util/getElementType';
import * as estree from 'estree';
import { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/utils';
import { computeGrid } from '../helpers';

export const rule: Rule.RuleModule = {
  meta: {},
  create(context: Rule.RuleContext) {
    const verifyHeaderReferences = (tree: TSESTree.JSXElement) => {
      const grid = computeGrid(context, tree);
      if (grid === null) {
        return true;
      }
      const rowHeaders: Set<string>[] = Array.from({ length: grid.length }, (_, idx) => {
        const ids = grid[idx]
          .filter(({ isHeader, id }) => isHeader && id)
          .map(({ id }) => id) as string[];
        return new Set<string>(ids);
      });
      const colHeaders: Set<string>[] = Array.from({ length: grid[0].length }, (_, idx) => {
        const ids = grid
          .map(row => row[idx])
          .filter(({ isHeader, id }) => isHeader && id)
          .map(({ id }) => id) as string[];
        return new Set<string>(ids);
      });
      for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
          const cell = grid[row][col];
          if (!cell.headers) {
            continue;
          }
        }
      }
    };
    return {
      JSXElement(node: estree.Node) {
        const tree = node as unknown as TSESTree.JSXElement;
        const elementType = getElementType(context)(tree.openingElement);
        if (elementType === 'table') {
          verifyHeaderReferences(tree);
        }
      },
    };
  },
};
