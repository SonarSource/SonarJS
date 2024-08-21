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
import { computeGrid, TableCell } from '../helpers/table';
import { generateMeta } from '../helpers';
import { meta } from './meta';

type BlockInfo = {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
  cell: TableCell;
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData),
  create(context: Rule.RuleContext) {
    const verifyHeaderReferences = (tree: TSESTree.JSXElement) => {
      const grid = computeGrid(context, tree);
      if (grid === null || grid.length === 0) {
        // Unknown table structures as well as empty tables should be considered valid
        return;
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
          .filter(cell => cell)
          .filter(({ isHeader, id }) => isHeader && id)
          .map(({ id }) => id) as string[];
        return new Set<string>(ids);
      });
      const allHeaders = new Set([
        ...rowHeaders.reduce((headers, acc) => new Set([...headers, ...acc]), new Set()),
        ...colHeaders.reduce((headers, acc) => new Set([...headers, ...acc]), new Set()),
      ]);

      const internalNodeToPositions = compileBlockInfo(grid);
      for (const { minRow, maxRow, minCol, maxCol, cell } of internalNodeToPositions.values()) {
        if (!cell.headers || cell.headers.length === 0) {
          continue;
        }
        const actualHeaders = [
          ...colHeaders.slice(minCol, maxCol + 1),
          ...rowHeaders.slice(minRow, maxRow + 1),
        ].reduce((headers, acc) => new Set([...headers, ...acc]), new Set());
        for (const header of cell.headers) {
          if (!actualHeaders.has(header)) {
            if (allHeaders.has(header)) {
              context.report({
                node: cell.node as unknown as estree.Node,
                message: `id "${header}" in "headers" references the header of another column/row.`,
              });
            } else {
              context.report({
                node: cell.node as unknown as estree.Node,
                message: `id "${header}" in "headers" does not reference any <th> header.`,
              });
            }
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

/**
 * Extracts an alternative representation of the blocks making up the table. Takes into account that a single block can
 * span more than just a 1x1 cell thanks to the "rowspan" and "colspan" attributes. Each block is assigned an internal
 * number during computation. Afterward, for each block, we compute its position in the resulting table.
 */
function compileBlockInfo(grid: TableCell[][]) {
  const internalNodeToPositions = new Map<number, BlockInfo>();
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const cell = grid[row][col];
      if (!cell.headers) {
        continue;
      }
      const oldValue = internalNodeToPositions.get(cell.internalNodeId);
      if (oldValue !== undefined) {
        internalNodeToPositions.set(cell.internalNodeId, {
          ...oldValue,
          maxRow: row,
          maxCol: col,
        });
      } else {
        internalNodeToPositions.set(cell.internalNodeId, {
          minRow: row,
          maxRow: row,
          minCol: col,
          maxCol: col,
          cell,
        });
      }
    }
  }
  return internalNodeToPositions;
}
